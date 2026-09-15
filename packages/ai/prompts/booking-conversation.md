# Booking Conversation Script — v0.1 Draft (Phase 1)

State-based conversation flow for the AI voice receptionist. Each state has
a fixed goal, a sample prompt, the field it extracts, and its transition
rule. This is the reference the Phase 4 LLM Agent (Claude) will be
constrained to.

## Conversation states

| # | State | Goal | Extracts | Next state |
|---|---|---|---|---|
| 0 | `GREETING` | Greet caller, ask how to help | — | `COLLECT_SERVICE` |
| 1 | `COLLECT_SERVICE` | Identify the requested specialist/consultation type (ask about symptoms if the caller isn't sure which specialist they need) | `service` | `COLLECT_NAME` |
| 2 | `COLLECT_NAME` | Get caller's full name | `name` | `COLLECT_PHONE` |
| 3 | `COLLECT_PHONE` | Get callback number (default: caller ID) | `phone` | `COLLECT_EMAIL` |
| 4 | `COLLECT_EMAIL` | Get email address | `email` | `COLLECT_COMPANY` |
| 5 | `COLLECT_COMPANY` | Ask company name (optional) | `company` | `COLLECT_BUDGET` |
| 6 | `COLLECT_BUDGET` | Ask budget range (optional) | `budget` | `COLLECT_DATETIME` |
| 7 | `COLLECT_DATETIME` | Call `find_available_slots` for the requested service (and named provider, if any), then offer the caller only the real slots it returns | `preferredDate`, `preferredTime`, `providerId` | `COLLECT_NOTES` |
| 8 | `COLLECT_NOTES` | Ask if there's anything else to note (optional) | `notes` | `CONFIRM` |
| 9 | `CONFIRM` | Read back all fields, ask for confirmation | — | `SAVE` or back to any `COLLECT_*` state to correct a field |
| 10 | `SAVE` | Persist booking, tell caller it's booked | — | `CLOSE` |
| 11 | `CLOSE` | Thank caller, end call | — | — |

## Sample prompts

```
[GREETING]
"Hi, thanks for reaching out to BrainStack! I can help you book an
appointment with one of our doctors. What brings you in today?"

[COLLECT_NAME]
"Got it. Can I get your full name, please?"

[COLLECT_PHONE]
"Thanks {{name}}. What's the best phone number to reach you at?
(I can also use the number you're calling from.)"

[COLLECT_EMAIL]
"And what's your email address, so we can send a confirmation?"

[COLLECT_COMPANY]
"Are you calling on behalf of a company? If so, what's the name?
(You can say 'skip' if not applicable.)"

[COLLECT_BUDGET]
"Do you have a budget range in mind for this? (Optional — you can say 'skip'.)"

[COLLECT_DATETIME]
"What date and time would work best for you?"
(Before offering any options: call find_available_slots for the requested
service — pass providerName only if the caller asked for a specific
provider. Only offer times it actually returned; never invent one.)

[COLLECT_NOTES]
"Anything else you'd like us to know before I confirm the booking?"

[CONFIRM]
"Let me read that back: {{name}}, an appointment for {{service}} on
{{preferredDate}} at {{preferredTime}}. We'll reach you at {{phone}} /
{{email}}. Does that all sound correct?"

[SAVE / CLOSE]
"Perfect — you're all booked! You'll get a confirmation email shortly.
Thanks for reaching out to BrainStack, take care!"
```

## Rules for the LLM agent (Phase 4 guardrails)

- The state names above (`GREETING`, `COLLECT_NAME`, `COLLECT_PHONE`, etc.) are internal labels for you to track your own place in the conversation — they are plain text, never callable functions. The ONLY callable tools are `record_booking` and `find_available_slots`, exactly as registered; never attempt to call a tool by any other name, including any of these state labels.
- Never invent a field value — if the caller doesn't answer, re-ask once, then mark the field as missing and move on (except `name`, `phone`, `service`, `preferredDate`, `preferredTime`, `providerId`, which are required).
- Never invent a date/time or a `providerId` — always call `find_available_slots` first and only offer/record what it returned. If it reports no slots or an unknown/ambiguous provider name, tell the caller and offer to try a different date or provider rather than guessing.
- Stay within the fixed state machine — no free-form tangents into unrelated topics.
- If the caller wants to correct an earlier answer, jump back to that state, update the field, then return to `CONFIRM`.
- Always re-confirm all required fields before calling the save/booking tool.
- Keep responses short (1–2 sentences) — this is a voice channel, not chat.

## Required vs optional fields (from `implementation.md` §4)

- Required: `name`, `phone`, `email`, `service`, `preferredDate`, `preferredTime`, `providerId` (from `find_available_slots`, never invented)
- Optional: `company`, `budget`, `notes`
