import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ProviderAvailability } from '../../database/entities';
import { ProviderAvailabilityService } from './provider-availability.service';

describe('ProviderAvailabilityService', () => {
  let service: ProviderAvailabilityService;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    remove: jest.Mock;
  };

  beforeEach(async () => {
    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProviderAvailabilityService,
        {
          provide: getRepositoryToken(ProviderAvailability),
          useValue: repository,
        },
      ],
    }).compile();

    service = module.get<ProviderAvailabilityService>(
      ProviderAvailabilityService,
    );
  });

  it('create attaches the providerId onto the dto before saving', async () => {
    const dto = { dayOfWeek: 6, startTime: '07:00', endTime: '13:00' };
    repository.create.mockReturnValue({ ...dto, providerId: 'provider-1' });
    repository.save.mockImplementation((b) => Promise.resolve(b));

    const result = await service.create('provider-1', dto);

    expect(repository.create).toHaveBeenCalledWith({
      ...dto,
      providerId: 'provider-1',
    });
    expect(result.providerId).toBe('provider-1');
  });

  it('findAllForProvider scopes the query to the given provider, ordered by day/time', async () => {
    repository.find.mockResolvedValue([]);

    await service.findAllForProvider('provider-1');

    expect(repository.find).toHaveBeenCalledWith({
      where: { providerId: 'provider-1' },
      order: { dayOfWeek: 'ASC', startTime: 'ASC' },
    });
  });

  it('remove throws NotFoundException when the block does not belong to that provider', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.remove('provider-1', 'block-1')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('remove deletes the block when it exists for that provider', async () => {
    const block = { id: 'block-1', providerId: 'provider-1' };
    repository.findOne.mockResolvedValue(block);

    await service.remove('provider-1', 'block-1');

    expect(repository.remove).toHaveBeenCalledWith(block);
  });
});
