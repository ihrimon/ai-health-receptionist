import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LlmCredential, LlmProvider } from '../../database/entities';
import { ProviderRegistry } from '../chat/providers/provider-registry';
import { LlmCredentialsService } from './llm-credentials.service';

describe('LlmCredentialsService', () => {
  let service: LlmCredentialsService;
  let repository: {
    find: jest.Mock;
    findOne: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    remove: jest.Mock;
    createQueryBuilder: jest.Mock;
  };
  let providerRegistry: { get: jest.Mock };
  let adapter: { complete: jest.Mock };

  beforeEach(async () => {
    adapter = { complete: jest.fn().mockResolvedValue({ message: {} }) };
    providerRegistry = { get: jest.fn().mockReturnValue(adapter) };
    repository = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: null }),
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmCredentialsService,
        { provide: getRepositoryToken(LlmCredential), useValue: repository },
        { provide: ProviderRegistry, useValue: providerRegistry },
      ],
    }).compile();

    service = module.get<LlmCredentialsService>(LlmCredentialsService);
  });

  describe('create', () => {
    const dto = {
      provider: LlmProvider.GEMINI,
      apiKey: 'test-key',
      model: 'gemini-3.6-flash',
    };

    it('validates the credential against the real provider before saving', async () => {
      repository.create.mockReturnValue({ ...dto });
      repository.save.mockResolvedValue({ id: 'cred-1', ...dto });

      await service.create(dto);

      expect(providerRegistry.get).toHaveBeenCalledWith(LlmProvider.GEMINI);
      expect(adapter.complete).toHaveBeenCalledWith(
        expect.objectContaining({ apiKey: 'test-key', model: dto.model }),
      );
      expect(repository.save).toHaveBeenCalled();
    });

    it('rejects with the provider error when the key/model is invalid, without saving', async () => {
      adapter.complete.mockRejectedValue(
        new Error('[404 Not Found] This model is no longer available'),
      );

      await expect(service.create(dto)).rejects.toThrow(BadRequestException);
      expect(repository.save).not.toHaveBeenCalled();
    });
  });

  describe('update', () => {
    it('re-validates when the model changes', async () => {
      repository.findOne.mockResolvedValue({
        id: 'cred-1',
        provider: LlmProvider.GROQ,
        apiKey: 'existing-key',
        model: 'old-model',
      });
      repository.save.mockImplementation((c: unknown) => Promise.resolve(c));

      await service.update('cred-1', { model: 'new-model' });

      expect(adapter.complete).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'existing-key',
          model: 'new-model',
        }),
      );
    });

    it('does not re-validate a pure isActive toggle', async () => {
      repository.findOne.mockResolvedValue({
        id: 'cred-1',
        provider: LlmProvider.GROQ,
        apiKey: 'existing-key',
        model: 'old-model',
        isActive: true,
      });
      repository.save.mockImplementation((c: unknown) => Promise.resolve(c));

      await service.update('cred-1', { isActive: false });

      expect(adapter.complete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown id', async () => {
      repository.findOne.mockResolvedValue(null);

      await expect(service.update('missing', { model: 'x' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
