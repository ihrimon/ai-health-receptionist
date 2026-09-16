import OpenAI, { AuthenticationError, RateLimitError } from 'openai';
import type {
  ChatCompletionMessageParam as OpenAiMessageParam,
  ChatCompletionTool as OpenAiTool,
} from 'openai/resources/chat/completions';
import { FIND_AVAILABLE_SLOTS_TOOL } from '../find-available-slots.tool';
import { RECORD_BOOKING_TOOL } from '../record-booking.tool';
import type {
  AdapterCompleteParams,
  AdapterCompleteResult,
  LlmProviderAdapter,
} from './provider-adapter.types';

/**
 * For any provider that speaks the REAL OpenAI chat-completions REST
 * convention — `POST {baseURL}/chat/completions` — namely OpenAI itself
 * and OpenAI-compatible aggregators like OpenRouter and UnoRouter.
 *
 * Deliberately NOT `groq-sdk` with a `baseURL` override (that was this
 * project's earlier approach, see git history): `groq-sdk` hardcodes
 * Groq's own idiosyncratic resource path,
 * `/openai/v1/chat/completions`, in every request regardless of
 * `baseURL` — that only happens to produce the right URL because it's
 * also Groq's actual API shape (`https://api.groq.com` + that path).
 * Pointing `groq-sdk` at a different host via `baseURL` silently builds
 * a broken double-nested URL instead (confirmed empirically: UnoRouter
 * rejected a credential-validation call with
 * `Invalid URL (POST /v1/openai/v1/chat/completions)`). The real
 * `openai` package this class uses appends the standard
 * `/chat/completions` suffix with no hidden prefix, which is what every
 * other OpenAI-compatible provider actually expects — confirmed against
 * OpenRouter's and UnoRouter's own quickstart docs.
 *
 * Our canonical message/tool types (see provider-adapter.types.ts) are
 * typed against `groq-sdk`'s shape, not this package's — both implement
 * the same OpenAI chat-completions spec, so the casts at the boundaries
 * below are type-level only, not value conversions.
 */
export class OpenAiSdkAdapter implements LlmProviderAdapter {
  constructor(private readonly baseURL?: string) {}

  async complete({
    apiKey,
    model,
    messages,
  }: AdapterCompleteParams): Promise<AdapterCompleteResult> {
    const client = new OpenAI({ apiKey, baseURL: this.baseURL });
    const { data: completion, response } = await client.chat.completions
      .create({
        model,
        messages: messages as unknown as OpenAiMessageParam[],
        tools: [
          RECORD_BOOKING_TOOL,
          FIND_AVAILABLE_SLOTS_TOOL,
        ] as unknown as OpenAiTool[],
        tool_choice: 'auto',
        max_tokens: 1024,
      })
      .withResponse();

    return {
      message: (completion.choices[0]
        ?.message as unknown as AdapterCompleteResult['message']) ?? {
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
    // Same cross-platform Headers-typing note as OpenAiCompatibleAdapter.
    return err instanceof RateLimitError
      ? (err.headers as unknown as AdapterCompleteResult['rateLimitHeaders'])
      : undefined;
  }
}
