import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
} from 'groq-sdk/resources/chat/completions';
import * as fs from 'fs';
import * as path from 'path';
import { FIND_AVAILABLE_SLOTS_TOOL } from './find-available-slots.tool';
import { RECORD_BOOKING_TOOL } from './record-booking.tool';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

/**
 * MVP substitute for the Claude integration named in docs/implementation.md
 * — switched to Groq for its free tier's much higher daily request limits
 * (Gemini's free tier was capping out at ~20 requests/day). Model is
 * configurable (groq.model) so swapping providers later is a config change,
 * not a rewrite.
 */
@Injectable()
export class GroqChatClient {
  private readonly logger = new Logger(GroqChatClient.name);
  private readonly client: Groq;
  private readonly model: string;
  private systemInstruction?: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new Groq({
      apiKey: this.configService.get<string>('groq.apiKey'),
    });
    this.model =
      this.configService.get<string>('groq.model') ?? 'openai/gpt-oss-20b';
  }

  /** Pure — builds the messages array for a turn, no API call. Extend this array with assistant/tool messages between complete() calls to run a tool loop. */
  buildMessages(
    history: ChatTurn[],
    referenceChunks: string[] = [],
  ): ChatCompletionMessageParam[] {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.getSystemInstruction() },
      { role: 'system', content: this.getTodayInstruction() },
    ];

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
   * One raw Groq API call with both tools registered. Returns the raw
   * assistant message (content + tool_calls) — deliberately doesn't
   * interpret which tool fired or extract its args, since the caller
   * (ChatService) owns the tool loop and must branch on that itself.
   */
  async complete(
    messages: ChatCompletionMessageParam[],
  ): Promise<ChatCompletionMessage> {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: [RECORD_BOOKING_TOOL, FIND_AVAILABLE_SLOTS_TOOL],
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    return completion.choices[0]?.message ?? { role: 'assistant', content: '' };
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
   */
  private getTodayInstruction(): string {
    const dhakaNow = new Date(Date.now() + 6 * 60 * 60_000);
    const today = dhakaNow.toISOString().slice(0, 10);
    return `Today's real date is ${today} (Asia/Dhaka time). Always use this to resolve any relative or year-omitted date the caller gives you (e.g. "next Friday", "August 28") — never assume a different year, including years from your own training data.`;
  }
}
