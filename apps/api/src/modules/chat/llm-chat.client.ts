import { Injectable, Logger } from '@nestjs/common';
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from 'groq-sdk/resources/chat/completions';
import * as fs from 'fs';
import * as path from 'path';
import {
  AllLlmKeysExhaustedError,
  LlmKeyManager,
  NoLlmCredentialsConfiguredError,
} from './llm-key-manager';
import { ProviderRegistry } from './providers/provider-registry';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

/**
 * MVP substitute for the Claude integration named in docs/implementation.md
 * — uses the `groq-sdk` client (an OpenAI-compatible chat-completions
 * client), pointed at whichever API key + model the admin configured in
 * Settings (LlmKeyManager) rather than a fixed Groq key from .env. Named
 * "Llm", not "Groq", because it's no longer tied to Groq specifically —
 * any OpenAI-compatible-endpoint provider's key/model works the same way.
 */
@Injectable()
export class LlmChatClient {
  private readonly logger = new Logger(LlmChatClient.name);
  private systemInstruction?: string;

  constructor(
    private readonly keyManager: LlmKeyManager,
    private readonly providerRegistry: ProviderRegistry,
  ) {}

  /** Pure — builds the messages array for a turn, no API call. Extend this array with assistant/tool messages between complete() calls to run a tool loop. */
  buildMessages(
    history: ChatTurn[],
    referenceChunks: string[] = [],
    providerRoster: { name: string; service: string }[] = [],
  ): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.getSystemInstruction() },
      { role: 'system', content: this.getTodayInstruction() },
    ];

    if (providerRoster.length > 0) {
      messages.push({
        role: 'system',
        content: this.getProviderRosterInstruction(providerRoster),
      });
    }

    if (referenceChunks.length > 0) {
      messages.push({
        role: 'system',
        content:
          'Reference information about the business, for answering FAQ/policy questions. ' +
          'Use ONLY facts explicitly written below — never invent specific details ' +
          "(addresses, phone numbers, emails, prices, names, dates) that aren't stated here, " +
          "even if a plausible-sounding answer seems expected. If an entry says '[NOT YET PROVIDED]', " +
          "or the question isn't covered by any entry below, say plainly that you don't have that " +
          'information yet — do not guess or make up an answer:\n\n' +
          referenceChunks.map((chunk) => `- ${chunk}`).join('\n\n'),
      });
    }

    messages.push(
      ...history.map((turn): ChatCompletionMessageParam => ({
        role: turn.role === 'model' ? 'assistant' : 'user',
        content: turn.text,
      })),
    );

    return messages;
  }

  /**
   * One logical LLM API call with both tools registered. Returns the raw
   * assistant message (content + tool_calls) — deliberately doesn't
   * interpret which tool fired or extract its args, since the caller
   * (ChatService) owns the tool loop and must branch on that itself.
   *
   * Transparently retries across the admin-configured credentials
   * (Settings page) on a 429 (RateLimitError) — the caller never sees a
   * rate-limit error unless every credential is exhausted, in which case
   * AllLlmKeysExhaustedError is thrown so ChatService can reply with
   * something friendlier than a raw error. Any other error (bad request,
   * network, etc.) is NOT retried across credentials — it isn't a quota
   * problem, another key won't fix it.
   */
  async complete(
    messages: ChatCompletionMessageParam[],
  ): Promise<ChatCompletionMessage> {
    const totalCredentials = await this.keyManager.getCredentialCount();
    if (totalCredentials === 0) {
      throw new NoLlmCredentialsConfiguredError();
    }

    for (let attempt = 0; attempt < totalCredentials; attempt++) {
      const credential = await this.keyManager.getCurrentCredential();
      if (!credential) {
        throw new AllLlmKeysExhaustedError();
      }
      const adapter = this.providerRegistry.get(credential.provider);

      try {
        const result = await adapter.complete({
          apiKey: credential.apiKey,
          model: credential.model,
          messages,
        });
        await this.keyManager.recordUsage(
          credential.id,
          result.rateLimitHeaders,
        );
        return result.message;
      } catch (err) {
        if (!adapter.isRateLimitError(err)) {
          throw err;
        }
        await this.keyManager.recordUsage(
          credential.id,
          adapter.getRateLimitHeaders(err),
        );
        if (!(await this.keyManager.rotateToNext())) {
          throw new AllLlmKeysExhaustedError();
        }
        // loop continues, retries with the newly-rotated credential
      }
    }

    throw new AllLlmKeysExhaustedError();
  }

  private getSystemInstruction(): string {
    if (!this.systemInstruction) {
      const promptPath = path.resolve(
        process.cwd(),
        '../../packages/ai/prompts/booking-conversation.md',
      );
      const script = fs.readFileSync(promptPath, 'utf-8');
      this.systemInstruction = `You are BrainStack's booking assistant, chatting over text (not voice) with a caller. Follow this conversation script exactly, including its state machine, required fields, and rules:\n\n${script}`;
      this.logger.log(`Loaded booking conversation script from ${promptPath}`);
    }
    return this.systemInstruction;
  }

  /**
   * Computed fresh per turn (never cached, unlike getSystemInstruction) —
   * "today" changes daily. Without this, the model has no grounding for
   * the actual current date and can silently guess a wrong year when the
   * caller gives a year-less date like "August 28", producing an empty
   * find_available_slots range with no error. Asia/Dhaka fixed offset
   * matches slot-math.ts's own MVP assumption.
   *
   * Also spells out the next 14 calendar dates with their weekday names,
   * for resolving an explicit date the caller gives (e.g. "August 28").
   * Bare weekday references (e.g. "Wednesday") are deliberately NOT asked
   * to be resolved via this table — in practice the model's own "today is
   * Tuesday, so next Wednesday is ___" arithmetic was unreliable even with
   * the table right there (it would land on the wrong date and then
   * report a real Wednesday as fully booked/unavailable). Instead the
   * instruction tells it to search broadly and match the weekday name
   * find_available_slots already prints in each slot's label — string
   * matching a returned label is a task the model is far more reliable
   * at than doing the date arithmetic itself.
   */
  private getTodayInstruction(): string {
    const dayNames = [
      'Sunday',
      'Monday',
      'Tuesday',
      'Wednesday',
      'Thursday',
      'Friday',
      'Saturday',
    ];
    const dhakaNow = new Date(Date.now() + 6 * 60 * 60_000);
    const todayUtcMidnight = new Date(
      Date.UTC(
        dhakaNow.getUTCFullYear(),
        dhakaNow.getUTCMonth(),
        dhakaNow.getUTCDate(),
      ),
    );
    const today = todayUtcMidnight.toISOString().slice(0, 10);

    const upcoming: string[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(todayUtcMidnight.getTime() + i * 24 * 60 * 60_000);
      const label = i === 0 ? ' (today)' : '';
      upcoming.push(
        `${date.toISOString().slice(0, 10)} ${dayNames[date.getUTCDay()]}${label}`,
      );
    }

    return (
      `Today's real date is ${today} (Asia/Dhaka time). Always use this to resolve any explicit or year-omitted date the caller gives you (e.g. "August 28") — never assume a different year, including years from your own training data. For reference, here are the next 14 calendar dates:\n${upcoming.join('\n')}\n\n` +
      `IMPORTANT — never compute a weekday-to-date mapping yourself. If the caller only names a weekday (e.g. "Wednesday", "this Saturday") without an explicit calendar date, do NOT set dateFrom/dateTo at all — call find_available_slots with just service (and providerName if given) so it searches the default upcoming window, then look through the returned slots' "label" field (which already includes the weekday name, e.g. "Wed, Sep 16 at 9:00 AM") and offer only the ones matching the requested weekday. Only set dateFrom/dateTo yourself when the caller gave an explicit calendar date or a farther-out range (e.g. "next month").`
    );
  }

  private getProviderRosterInstruction(
    roster: { name: string; service: string }[],
  ): string {
    const lines = roster
      .map((p) => `- ${p.name} — service: "${p.service}"`)
      .join('\n');
    return (
      `These are the ONLY active providers and their exact registered service names:\n${lines}\n\n` +
      `When calling find_available_slots or record_booking, the "service" value must be copied EXACTLY as written above — same spelling, capitalization, and singular/plural form — never pluralize, abbreviate, or paraphrase it, even if the caller described it differently (e.g. the caller saying "orthopedic checkup" or "bone doctor" for a provider whose service is registered as "Orthopedic" must still use "Orthopedic"). If the caller's request doesn't clearly match any service above, ask a clarifying question instead of guessing a service string.`
    );
  }
}
