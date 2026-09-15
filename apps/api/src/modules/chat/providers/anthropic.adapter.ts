import Anthropic from '@anthropic-ai/sdk';
import type {
  ContentBlockParam,
  Message,
  MessageParam,
  Tool,
} from '@anthropic-ai/sdk/resources/messages';
import { FIND_AVAILABLE_SLOTS_TOOL } from '../find-available-slots.tool';
import { RECORD_BOOKING_TOOL } from '../record-booking.tool';
import type {
  AdapterCompleteParams,
  AdapterCompleteResult,
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  LlmProviderAdapter,
} from './provider-adapter.types';

// Both tool constants are `{ type: 'function', function: {...} }` literals
// (never any other Groq.ChatCompletionTool variant), so `function` is
// always present despite the SDK's general type marking it optional.
const TOOLS: Tool[] = [RECORD_BOOKING_TOOL, FIND_AVAILABLE_SLOTS_TOOL].map(
  (tool) => ({
    name: tool.function!.name,
    description: tool.function!.description,
    input_schema: tool.function!.parameters as Tool['input_schema'],
  }),
);

/**
 * Claude's Messages API has its own shape — a separate top-level `system`
 * string instead of a system role in the messages array, tool calls as
 * `tool_use` content blocks instead of a `tool_calls` array, and tool
 * results as user-role `tool_result` blocks instead of a `tool` role
 * message. This adapter translates our canonical OpenAI-shape messages
 * to/from that, so ChatService's tool loop never has to know which
 * provider it's talking to.
 */
export class AnthropicAdapter implements LlmProviderAdapter {
  async complete({
    apiKey,
    model,
    messages,
  }: AdapterCompleteParams): Promise<AdapterCompleteResult> {
    const client = new Anthropic({ apiKey });
    const { system, messages: anthropicMessages } =
      toAnthropicMessages(messages);

    const { data: message, response } = await client.messages
      .create({
        model,
        system,
        messages: anthropicMessages,
        tools: TOOLS,
        max_tokens: 1024,
      })
      .withResponse();

    return {
      message: fromAnthropicMessage(message),
      rateLimitHeaders: response.headers,
    };
  }

  isRetryableError(err: unknown): boolean {
    return (
      err instanceof Anthropic.RateLimitError ||
      err instanceof Anthropic.AuthenticationError
    );
  }

  getRateLimitHeaders(err: unknown) {
    return err instanceof Anthropic.RateLimitError ? err.headers : undefined;
  }
}

function toAnthropicMessages(messages: ChatCompletionMessageParam[]): {
  system: string;
  messages: MessageParam[];
} {
  const systemParts: string[] = [];
  const anthropicMessages: MessageParam[] = [];

  for (const message of messages) {
    if (message.role === 'system') {
      if (typeof message.content === 'string')
        systemParts.push(message.content);
      continue;
    }

    if (message.role === 'user') {
      anthropicMessages.push({
        role: 'user',
        content: typeof message.content === 'string' ? message.content : '',
      });
      continue;
    }

    if (message.role === 'assistant') {
      const toolCalls = message.tool_calls ?? [];
      if (toolCalls.length === 0) {
        anthropicMessages.push({
          role: 'assistant',
          content: typeof message.content === 'string' ? message.content : '',
        });
        continue;
      }
      const blocks: ContentBlockParam[] = [];
      if (typeof message.content === 'string' && message.content) {
        blocks.push({ type: 'text', text: message.content });
      }
      for (const call of toolCalls) {
        blocks.push({
          type: 'tool_use',
          id: call.id,
          name: call.function.name,
          input: safeJsonParse(call.function.arguments),
        });
      }
      anthropicMessages.push({ role: 'assistant', content: blocks });
      continue;
    }

    if (message.role === 'tool') {
      anthropicMessages.push({
        role: 'user',
        content: [
          {
            type: 'tool_result',
            tool_use_id: message.tool_call_id,
            content: typeof message.content === 'string' ? message.content : '',
          },
        ],
      });
    }
  }

  return { system: systemParts.join('\n\n'), messages: anthropicMessages };
}

function fromAnthropicMessage(message: Message): ChatCompletionMessage {
  const textParts: string[] = [];
  const toolCalls: NonNullable<ChatCompletionMessage['tool_calls']> = [];

  for (const block of message.content) {
    if (block.type === 'text') {
      textParts.push(block.text);
    } else if (block.type === 'tool_use') {
      toolCalls.push({
        id: block.id,
        type: 'function',
        function: {
          name: block.name,
          arguments: JSON.stringify(block.input ?? {}),
        },
      });
    }
  }

  return {
    role: 'assistant',
    content: textParts.length > 0 ? textParts.join('\n') : null,
    ...(toolCalls.length > 0 ? { tool_calls: toolCalls } : {}),
  };
}

function safeJsonParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return {};
  }
}
