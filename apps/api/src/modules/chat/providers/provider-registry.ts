import { Injectable } from '@nestjs/common';
import { LlmProvider } from '../../../database/entities';
import { AnthropicAdapter } from './anthropic.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter';
import type { LlmProviderAdapter } from './provider-adapter.types';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';

/** One adapter instance per provider, reused across requests — they're stateless (apiKey is passed per-call, not held). */
@Injectable()
export class ProviderRegistry {
  private readonly adapters: Record<LlmProvider, LlmProviderAdapter> = {
    [LlmProvider.GROQ]: new OpenAiCompatibleAdapter(),
    [LlmProvider.OPENAI]: new OpenAiCompatibleAdapter(OPENAI_BASE_URL),
    [LlmProvider.ANTHROPIC]: new AnthropicAdapter(),
    [LlmProvider.GEMINI]: new GeminiAdapter(),
  };

  get(provider: LlmProvider): LlmProviderAdapter {
    return this.adapters[provider];
  }
}
