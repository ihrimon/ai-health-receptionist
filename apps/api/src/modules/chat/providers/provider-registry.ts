import { Injectable } from '@nestjs/common';
import { LlmProvider } from '../../../database/entities';
import { AnthropicAdapter } from './anthropic.adapter';
import { GeminiAdapter } from './gemini.adapter';
import { OpenAiCompatibleAdapter } from './openai-compatible.adapter';
import { OpenAiSdkAdapter } from './openai-sdk.adapter';
import type { LlmProviderAdapter } from './provider-adapter.types';

const OPENAI_BASE_URL = 'https://api.openai.com/v1';
// Both aggregators are OpenAI-compatible gateways to 100+ third-party
// models, including ":free"-suffixed free-tier ones — see
// llm-credential.entity.ts's LlmProvider doc comment. Use OpenAiSdkAdapter
// (the real `openai` package) for these, NOT OpenAiCompatibleAdapter
// (`groq-sdk`) — see openai-sdk.adapter.ts's doc comment for why
// `groq-sdk` silently breaks against any host that isn't Groq itself.
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const UNOROUTER_BASE_URL = 'https://api.unorouter.com/v1';

/** One adapter instance per provider, reused across requests — they're stateless (apiKey is passed per-call, not held). */
@Injectable()
export class ProviderRegistry {
  private readonly adapters: Record<LlmProvider, LlmProviderAdapter> = {
    [LlmProvider.GROQ]: new OpenAiCompatibleAdapter(),
    [LlmProvider.OPENAI]: new OpenAiSdkAdapter(OPENAI_BASE_URL),
    [LlmProvider.ANTHROPIC]: new AnthropicAdapter(),
    [LlmProvider.GEMINI]: new GeminiAdapter(),
    [LlmProvider.OPENROUTER]: new OpenAiSdkAdapter(OPENROUTER_BASE_URL),
    [LlmProvider.UNOROUTER]: new OpenAiSdkAdapter(UNOROUTER_BASE_URL),
  };

  get(provider: LlmProvider): LlmProviderAdapter {
    return this.adapters[provider];
  }
}
