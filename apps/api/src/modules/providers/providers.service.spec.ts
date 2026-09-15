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
    createQueryBuilder: jest.Mock;
  };
  let queryBuilder: {
    where: jest.Mock;
    andWhere: jest.Mock;
    getMany: jest.Mock;
  };

  beforeEach(async () => {
    queryBuilder = {
      where: jest.fn(),
      andWhere: jest.fn(),
      getMany: jest.fn(),
    };
    queryBuilder.where.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);

    repository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
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

  describe('findActiveByExactNameAndService', () => {
    it('returns an empty array when no provider matches', async () => {
      queryBuilder.getMany.mockResolvedValue([]);

      const result = await service.findActiveByExactNameAndService(
        'Dr. Unknown',
        'Dentistry',
      );

      expect(result).toEqual([]);
      expect(queryBuilder.where).toHaveBeenCalledWith(
        'LOWER(provider.name) = LOWER(:name)',
        { name: 'Dr. Unknown' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'LOWER(TRIM(provider.service)) = LOWER(TRIM(:service))',
        { service: 'Dentistry' },
      );
      expect(queryBuilder.andWhere).toHaveBeenCalledWith(
        'provider.isActive = true',
      );
    });

    it('returns the single matching provider', async () => {
      const provider = {
        id: 'provider-1',
        name: 'Dr. A',
        service: 'Dentistry',
      };
      queryBuilder.getMany.mockResolvedValue([provider]);

      const result = await service.findActiveByExactNameAndService(
        'dr. a',
        'Dentistry',
      );

      expect(result).toEqual([provider]);
    });

    it('returns every match when names collide (caller must handle ambiguity)', async () => {
      const providers = [
        { id: 'provider-1', name: 'Dr. A', service: 'Dentistry' },
        { id: 'provider-2', name: 'Dr. A', service: 'Dentistry' },
      ];
      queryBuilder.getMany.mockResolvedValue(providers);

      const result = await service.findActiveByExactNameAndService(
        'Dr. A',
        'Dentistry',
      );

      expect(result).toEqual(providers);
    });
  });
});
