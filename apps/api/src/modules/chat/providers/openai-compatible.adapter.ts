import Groq, { AuthenticationError, RateLimitError } from 'groq-sdk';
import { FIND_AVAILABLE_SLOTS_TOOL } from '../find-available-slots.tool';
import { RECORD_BOOKING_TOOL } from '../record-booking.tool';
import type {
  AdapterCompleteParams,
  AdapterCompleteResult,
  LlmProviderAdapter,
} from './provider-adapter.types';

/**
 * Shared adapter for Groq and OpenAI — both speak the identical
 * OpenAI chat-completions API shape, and `groq-sdk` is itself just an
 * OpenAI-SDK-compatible client (it exposes the same `baseURL` override
 * OpenAI's own SDK does), so one client class serves both: omit
 * `baseURL` for Groq's own endpoint, pass OpenAI's for OpenAI. No
 * message/tool-call translation needed since our canonical internal
 * shape already IS this format.
 */
export class OpenAiCompatibleAdapter implements LlmProviderAdapter {
  constructor(private readonly baseURL?: string) {}

  async complete({
    apiKey,
    model,
    messages,
  }: AdapterCompleteParams): Promise<AdapterCompleteResult> {
    const client = new Groq({ apiKey, baseURL: this.baseURL });
    const { data: completion, response } = await client.chat.completions
      .create({
        model,
        messages,
        tools: [RECORD_BOOKING_TOOL, FIND_AVAILABLE_SLOTS_TOOL],
        tool_choice: 'auto',
        max_tokens: 1024,
      })
      .withResponse();

    return {
      message: completion.choices[0]?.message ?? {
        role: 'assistant',
        content: '',
      },
      rateLimitHeaders: response.headers,
    };
  }

  isRetryableError(err: unknown): boolean {
    return err instanceof RateLimitError || err instanceof AuthenticationError;
  }

  getRateLimitHeaders(err: unknown) {
    // groq-sdk types err.headers via a cross-platform "SelectType"
    // conditional TS can't statically resolve to a concrete Headers-like
    // shape here — at runtime it's the same fetch Headers object as a
    // successful response's headers.
    return err instanceof RateLimitError
      ? (err.headers as unknown as AdapterCompleteResult['rateLimitHeaders'])
      : undefined;
  }
}
