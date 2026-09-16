import type Groq from 'groq-sdk';

/**
 * Mirrors CreateBookingDto's fields/required set. The model calls this
 * exactly once, after the CONFIRM step in
 * packages/ai/prompts/booking-conversation.md.
 */
export const RECORD_BOOKING_TOOL: Groq.Chat.Completions.ChatCompletionTool = {
  type: 'function',
  function: {
    name: 'record_booking',
    description:
      'Save the completed booking once the caller has confirmed every detail in the CONFIRM step. Call this exactly once, only after confirmation, and include a short confirmation sentence alongside the call.',
    parameters: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Caller's full name" },
        phone: { type: 'string', description: 'Callback phone number' },
        email: { type: 'string', description: 'Email address' },
        company: { type: 'string', description: 'Company name (optional)' },
        service: { type: 'string', description: 'Requested service' },
        budget: { type: 'string', description: 'Budget range (optional)' },
        preferredDate: {
          type: 'string',
          description: 'Preferred date, YYYY-MM-DD',
        },
        preferredTime: {
          type: 'string',
          description:
            'Preferred time, 24-hour HH:MM — must be copied exactly from a find_available_slots result, never invented',
        },
        notes: { type: 'string', description: 'Additional notes (optional)' },
        providerId: {
          type: 'string',
          description:
            'The providerId returned by find_available_slots for the chosen slot — never invent this value.',
        },
      },
      required: [
        'name',
        'phone',
        'email',
        'service',
        'preferredDate',
        'preferredTime',
        'providerId',
      ],
    },
  },
};
