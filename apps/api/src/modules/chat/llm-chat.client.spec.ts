import { Test, TestingModule } from '@nestjs/testing';
import { LlmProvider } from '../../database/entities';
import {
  AllLlmKeysExhaustedError,
  LlmKeyManager,
  NoLlmCredentialsConfiguredError,
} from './llm-key-manager';
import { LlmChatClient } from './llm-chat.client';
import { ProviderRegistry } from './providers/provider-registry';

function assistantMessage(content: string) {
  return { role: 'assistant' as const, content };
}

describe('LlmChatClient', () => {
  let client: LlmChatClient;
  let keyManager: {
    getCredentialCount: jest.Mock;
    getCurrentCredential: jest.Mock;
    rotateToNext: jest.Mock;
    recordUsage: jest.Mock;
  };
  let adapter: {
    complete: jest.Mock;
    isRateLimitError: jest.Mock;
    getRateLimitHeaders: jest.Mock;
  };
  let providerRegistry: { get: jest.Mock };

  beforeEach(async () => {
    keyManager = {
      getCredentialCount: jest.fn(),
      getCurrentCredential: jest.fn(),
      rotateToNext: jest.fn(),
      recordUsage: jest.fn(),
    };
    adapter = {
      complete: jest.fn(),
      isRateLimitError: jest.fn().mockReturnValue(false),
      getRateLimitHeaders: jest.fn(),
    };
    providerRegistry = { get: jest.fn().mockReturnValue(adapter) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LlmChatClient,
        { provide: LlmKeyManager, useValue: keyManager },
        { provide: ProviderRegistry, useValue: providerRegistry },
      ],
    }).compile();

    client = module.get<LlmChatClient>(LlmChatClient);
  });

  it('throws NoLlmCredentialsConfiguredError when Settings is empty', async () => {
    keyManager.getCredentialCount.mockResolvedValue(0);

    await expect(client.complete([])).rejects.toThrow(
      NoLlmCredentialsConfiguredError,
    );
    expect(providerRegistry.get).not.toHaveBeenCalled();
  });

  it("dispatches to the adapter matching the current credential's provider", async () => {
    keyManager.getCredentialCount.mockResolvedValue(1);
    keyManager.getCurrentCredential.mockResolvedValue({
      id: 'cred-1',
      provider: LlmProvider.ANTHROPIC,
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-5',
    });
    adapter.complete.mockResolvedValue({
      message: assistantMessage('Hi there!'),
      rateLimitHeaders: undefined,
    });

    const result = await client.complete([{ role: 'user', content: 'hello' }]);

    expect(providerRegistry.get).toHaveBeenCalledWith(LlmProvider.ANTHROPIC);
    expect(adapter.complete).toHaveBeenCalledWith({
      apiKey: 'sk-ant-test',
      model: 'claude-sonnet-5',
      messages: [{ role: 'user', content: 'hello' }],
    });
    expect(result).toEqual(assistantMessage('Hi there!'));
    expect(keyManager.recordUsage).toHaveBeenCalledWith('cred-1', undefined);
  });

  it('rotates to the next credential on a rate-limit error and retries', async () => {
    keyManager.getCredentialCount.mockResolvedValue(2);
    keyManager.getCurrentCredential
      .mockResolvedValueOnce({
        id: 'cred-1',
        provider: LlmProvider.GROQ,
        apiKey: 'key-a',
        model: 'model-a',
      })
      .mockResolvedValueOnce({
        id: 'cred-2',
        provider: LlmProvider.GROQ,
        apiKey: 'key-b',
        model: 'model-b',
      });
    const rateLimitErr = new Error('429');
    adapter.complete
      .mockRejectedValueOnce(rateLimitErr)
      .mockResolvedValueOnce({ message: assistantMessage('ok now') });
    adapter.isRateLimitError.mockReturnValue(true);
    adapter.getRateLimitHeaders.mockReturnValue(undefined);
    keyManager.rotateToNext.mockResolvedValue(true);

    const result = await client.complete([]);

    expect(result).toEqual(assistantMessage('ok now'));
    expect(keyManager.rotateToNext).toHaveBeenCalledTimes(1);
    expect(adapter.complete).toHaveBeenCalledTimes(2);
  });

  it('throws AllLlmKeysExhaustedError when rotation has nowhere left to go', async () => {
    keyManager.getCredentialCount.mockResolvedValue(1);
    keyManager.getCurrentCredential.mockResolvedValue({
      id: 'cred-1',
      provider: LlmProvider.GROQ,
      apiKey: 'key-a',
      model: 'model-a',
    });
    adapter.complete.mockRejectedValue(new Error('429'));
    adapter.isRateLimitError.mockReturnValue(true);
    keyManager.rotateToNext.mockResolvedValue(false);

    await expect(client.complete([])).rejects.toThrow(AllLlmKeysExhaustedError);
  });

  it('does not retry a non-rate-limit error across credentials', async () => {
    keyManager.getCredentialCount.mockResolvedValue(2);
    keyManager.getCurrentCredential.mockResolvedValue({
      id: 'cred-1',
      provider: LlmProvider.GROQ,
      apiKey: 'key-a',
      model: 'model-a',
    });
    const badRequestErr = new Error('bad request');
    adapter.complete.mockRejectedValue(badRequestErr);
    adapter.isRateLimitError.mockReturnValue(false);

    await expect(client.complete([])).rejects.toThrow(badRequestErr);
    expect(keyManager.rotateToNext).not.toHaveBeenCalled();
  });
});
