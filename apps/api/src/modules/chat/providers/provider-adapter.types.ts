import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from 'groq-sdk/resources/chat/completions';
import type { HeaderReader } from '../llm-key-manager';

/**
 * Canonical, provider-agnostic message/output shape used everywhere in
 * this codebase OUTSIDE the adapters themselves (ChatService's tool loop,
 * LlmChatClient's buildMessages) — it's the OpenAI/Groq chat-completions
 * shape, chosen as the shared format because it's what this project
 * started with, not because any one provider is "the standard". Each
 * adapter's whole job is translating this shape to/from its own
 * provider's native API shape, so the rest of the app never has to know
 * which provider actually answered a given turn.
 */
export type { ChatCompletionMessage, ChatCompletionMessageParam };

export interface AdapterCompleteParams {
  apiKey: string;
  model: string;
  messages: ChatCompletionMessageParam[];
}

export interface AdapterCompleteResult {
  message: ChatCompletionMessage;
  /** Rate-limit response headers, if this provider's SDK exposes them — used for the Settings usage display. Not every provider does. */
  rateLimitHeaders?: HeaderReader;
}

export interface LlmProviderAdapter {
  complete(params: AdapterCompleteParams): Promise<AdapterCompleteResult>;
  /** Whether a thrown error represents a rate limit (429) for THIS provider's SDK — each throws a different error class. */
  isRateLimitError(err: unknown): boolean;
  /** Rate-limit headers carried on a rate-limit error, if this provider's SDK exposes them (used only after isRateLimitError(err) is true). */
  getRateLimitHeaders(err: unknown): HeaderReader | undefined;
}
