import { Test, TestingModule } from '@nestjs/testing';
import { AvailabilityService } from '../providers/availability.service';
import { ProvidersService } from '../providers/providers.service';
import { ChatToolExecutor } from './chat-tool-executor';

describe('ChatToolExecutor', () => {
  let executor: ChatToolExecutor;
  let availabilityService: {
    computeAvailableSlots: jest.Mock;
    findAvailableProviderForService: jest.Mock;
  };
  let providersService: { findActiveByExactNameAndService: jest.Mock };

  beforeEach(async () => {
    availabilityService = {
      computeAvailableSlots: jest.fn(),
      findAvailableProviderForService: jest.fn(),
    };
    providersService = { findActiveByExactNameAndService: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatToolExecutor,
        { provide: AvailabilityService, useValue: availabilityService },
        { provide: ProvidersService, useValue: providersService },
      ],
    }).compile();

    executor = module.get<ChatToolExecutor>(ChatToolExecutor);
  });

  it('returns missing_service when the model omits service', async () => {
    const result = await executor.findAvailableSlots({});

    expect(result).toEqual({ error: 'missing_service' });
    expect(
      availabilityService.findAvailableProviderForService,
    ).not.toHaveBeenCalled();
  });

  it('auto-assigns via findAvailableProviderForService when no providerName is given', async () => {
    availabilityService.findAvailableProviderForService.mockResolvedValue({
      providerId: 'provider-1',
      providerName: 'Dr. A',
      slotDurationMinutes: 30,
      slots: [
        {
          start: new Date('2026-08-28T08:00:00.000Z'), // 14:00 Dhaka
          end: new Date('2026-08-28T08:30:00.000Z'),
        },
      ],
    });

    const result = await executor.findAvailableSlots({ service: 'Dentistry' });

    expect(
      providersService.findActiveByExactNameAndService,
    ).not.toHaveBeenCalled();
    expect(result).toMatchObject({
      providerId: 'provider-1',
      providerName: 'Dr. A',
      service: 'Dentistry',
      timezone: 'Asia/Dhaka',
    });
    expect((result as { slots: unknown[] }).slots).toEqual([
      { date: '2026-08-28', time: '14:00', label: 'Fri, Aug 28 at 2:00 PM' },
    ]);
  });

  it('resolves a named provider and returns their slots', async () => {
    providersService.findActiveByExactNameAndService.mockResolvedValue([
      { id: 'provider-2', name: 'Dr. B' },
    ]);
    availabilityService.computeAvailableSlots.mockResolvedValue({
      providerId: 'provider-2',
      providerName: 'Dr. B',
      slotDurationMinutes: 45,
      slots: [],
    });

    const result = await executor.findAvailableSlots({
      service: 'Dentistry',
      providerName: 'Dr. B',
    });

    expect(availabilityService.computeAvailableSlots).toHaveBeenCalledWith(
      'provider-2',
      expect.any(String),
      expect.any(String),
    );
    expect(result).toMatchObject({
      error: 'no_slots_available',
      providerId: 'provider-2',
      providerName: 'Dr. B',
    });
  });

  it('reports provider_not_found for an unknown provider name', async () => {
    providersService.findActiveByExactNameAndService.mockResolvedValue([]);

    const result = await executor.findAvailableSlots({
      service: 'Dentistry',
      providerName: 'Dr. Nobody',
    });

    expect(result).toEqual({
      error: 'provider_not_found',
      providerName: 'Dr. Nobody',
      service: 'Dentistry',
    });
  });

  it('reports ambiguous_provider when multiple providers share a name', async () => {
    providersService.findActiveByExactNameAndService.mockResolvedValue([
      { id: 'provider-1', name: 'Dr. A' },
      { id: 'provider-3', name: 'Dr. A' },
    ]);

    const result = await executor.findAvailableSlots({
      service: 'Dentistry',
      providerName: 'Dr. A',
    });

    expect(result).toEqual({
      error: 'ambiguous_provider',
      providerName: 'Dr. A',
      candidates: ['Dr. A', 'Dr. A'],
    });
    expect(availabilityService.computeAvailableSlots).not.toHaveBeenCalled();
  });

  it('reports no_provider_for_service when auto-assign finds nothing', async () => {
    availabilityService.findAvailableProviderForService.mockResolvedValue(null);

    const result = await executor.findAvailableSlots({ service: 'Massage' });

    expect(result).toEqual({
      error: 'no_provider_for_service',
      service: 'Massage',
    });
  });

  it('caps returned slots and marks truncation', async () => {
    const manySlots = Array.from({ length: 20 }, (_, i) => ({
      start: new Date(Date.UTC(2026, 7, 28, 8 + i, 0)),
      end: new Date(Date.UTC(2026, 7, 28, 8 + i, 30)),
    }));
    availabilityService.findAvailableProviderForService.mockResolvedValue({
      providerId: 'provider-1',
      providerName: 'Dr. A',
      slotDurationMinutes: 30,
      slots: manySlots,
    });

    const result = (await executor.findAvailableSlots({
      service: 'Dentistry',
    })) as { slots: unknown[]; truncated: boolean };

    expect(result.slots).toHaveLength(15);
    expect(result.truncated).toBe(true);
  });

  it('returns lookup_failed instead of throwing when a dependency rejects', async () => {
    availabilityService.findAvailableProviderForService.mockRejectedValue(
      new Error('db down'),
    );

    const result = await executor.findAvailableSlots({ service: 'Dentistry' });

    expect(result).toEqual({ error: 'lookup_failed' });
  });
});
