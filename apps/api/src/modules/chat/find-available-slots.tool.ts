import type Groq from 'groq-sdk';

/**
 * Must be called before offering any date/time to the caller — never invent
 * a date/time. Returns real, availability-checked slots (see
 * ChatToolExecutor.findAvailableSlots) that record_booking's providerId must
 * come from.
 */
export const FIND_AVAILABLE_SLOTS_TOOL: Groq.Chat.Completions.ChatCompletionTool =
  {
    type: 'function',
    function: {
      name: 'find_available_slots',
      description:
        'Look up real open appointment slots for the requested service, before offering any date/time to the caller. Never invent or guess a date/time — always call this first and only offer slots it returns. If the caller asked for a specific provider by name, pass providerName; otherwise omit it to auto-assign the first available provider.',
      parameters: {
        type: 'object',
        properties: {
          service: {
            type: 'string',
            description:
              'The requested service, exactly as the caller described it',
          },
          providerName: {
            type: 'string',
            description:
              'Optional — only if the caller asked for a specific named provider. Omit to auto-assign.',
          },
          dateFrom: {
            type: 'string',
            description:
              'Optional, YYYY-MM-DD. Start of the date range to search, if the caller expressed a date preference. Omit to search starting today.',
          },
          dateTo: {
            type: 'string',
            description:
              'Optional, YYYY-MM-DD. End of the date range to search. Omit to search a couple of weeks out.',
          },
        },
        required: ['service'],
      },
    },
  };
