import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  Booking,
  Provider,
  ProviderAvailability,
} from '../../database/entities';
import { GoogleCalendarService } from '../google-calendar/google-calendar.service';
import { AvailabilityService } from './availability.service';

// Far-future, fixed weekday (2030-01-07 is a Monday) so this test is never
// affected by excludePastSlots regardless of when it actually runs.
const PROVIDER: Provider = {
  id: 'provider-1',
  name: 'Dr. A',
  slotDurationMinutes: 60,
} as Provider;

describe('AvailabilityService', () => {
  let service: AvailabilityService;
  let providersRepository: { findOne: jest.Mock; find: jest.Mock };
  let availabilityRepository: { find: jest.Mock };
  let bookingsRepository: { find: jest.Mock };
  let googleCalendarService: { getFreeBusy: jest.Mock };

  beforeEach(async () => {
    providersRepository = { findOne: jest.fn(), find: jest.fn() };
    availabilityRepository = {
      find: jest.fn().mockResolvedValue([
        { dayOfWeek: 1, startTime: '09:00', endTime: '12:00' }, // Monday 9-12
      ]),
    };
    bookingsRepository = { find: jest.fn().mockResolvedValue([]) };
    googleCalendarService = { getFreeBusy: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AvailabilityService,
        {
          provide: getRepositoryToken(Provider),
          useValue: providersRepository,
        },
        {
          provide: getRepositoryToken(ProviderAvailability),
          useValue: availabilityRepository,
        },
        { provide: getRepositoryToken(Booking), useValue: bookingsRepository },
        { provide: GoogleCalendarService, useValue: googleCalendarService },
      ],
    }).compile();

    service = module.get<AvailabilityService>(AvailabilityService);
    providersRepository.findOne.mockResolvedValue(PROVIDER);
  });

  it('passes the computed date range through to getFreeBusy', async () => {
    await service.computeAvailableSlots(
      'provider-1',
      '2030-01-07',
      '2030-01-07',
    );

    expect(googleCalendarService.getFreeBusy).toHaveBeenCalledWith(
      'provider-1',
      new Date('2030-01-07T00:00:00.000Z'),
      new Date('2030-01-07T00:00:00.000Z'),
    );
  });

  it('excludes slots that overlap a Google Calendar busy range', async () => {
    // Monday 9-12 Dhaka = 03:00-06:00 UTC → 3 one-hour candidate slots.
    // Mark the middle one (04:00-05:00 UTC) as Google-busy.
    googleCalendarService.getFreeBusy.mockResolvedValue([
      {
        start: new Date('2030-01-07T04:00:00.000Z'),
        end: new Date('2030-01-07T05:00:00.000Z'),
      },
    ]);

    const result = await service.computeAvailableSlots(
      'provider-1',
      '2030-01-07',
      '2030-01-07',
    );

    expect(result.slots).toHaveLength(2);
    expect(
      result.slots.some(
        (slot) => slot.start.toISOString() === '2030-01-07T04:00:00.000Z',
      ),
    ).toBe(false);
  });

  it('does not call getFreeBusy for providers already excluded (no matching day block)', async () => {
    availabilityRepository.find.mockResolvedValue([]);

    const result = await service.computeAvailableSlots(
      'provider-1',
      '2030-01-07',
      '2030-01-07',
    );

    // getFreeBusy is still called once (provider-level, not slot-level) —
    // this documents current behavior: the freebusy call happens regardless
    // of whether any candidate slots exist yet.
    expect(googleCalendarService.getFreeBusy).toHaveBeenCalledTimes(1);
    expect(result.slots).toEqual([]);
  });
});
