import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Provider } from '../../database/entities';
import { ProvidersService } from './providers.service';

describe('ProvidersService', () => {
  let service: ProvidersService;
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
        ProvidersService,
        { provide: getRepositoryToken(Provider), useValue: repository },
      ],
    }).compile();

    service = module.get<ProvidersService>(ProvidersService);
  });

  it('creates and saves a new provider', async () => {
    const dto = { name: 'Dr. A', email: 'a@example.com', service: 'Dentistry' };
    repository.create.mockReturnValue({ ...dto });
    repository.save.mockResolvedValue({ id: 'provider-1', ...dto });

    const result = await service.create(dto);

    expect(repository.create).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ id: 'provider-1', ...dto });
  });

  it('findOne throws NotFoundException when the provider does not exist', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(service.findOne('missing-id')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('update merges the dto onto the existing provider and saves it', async () => {
    repository.findOne.mockResolvedValue({
      id: 'provider-1',
      name: 'Dr. A',
      isActive: true,
    });
    repository.save.mockImplementation((p) => Promise.resolve(p));

    const result = await service.update('provider-1', { isActive: false });

    expect(result).toEqual({
      id: 'provider-1',
      name: 'Dr. A',
      isActive: false,
    });
  });

  it('remove deletes the provider after confirming it exists', async () => {
    const provider = { id: 'provider-1', name: 'Dr. A' };
    repository.findOne.mockResolvedValue(provider);

    await service.remove('provider-1');

    expect(repository.remove).toHaveBeenCalledWith(provider);
  });
});
