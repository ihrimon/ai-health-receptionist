import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';
import type { ChatCompletionMessageParam } from 'groq-sdk/resources/chat/completions';
import * as fs from 'fs';
import * as path from 'path';
import { RECORD_BOOKING_TOOL } from './record-booking.tool';

export interface ChatTurn {
  role: 'user' | 'model';
  text: string;
}

export interface ChatTurnResult {
  text: string;
  toolInput?: Record<string, unknown>;
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
      this.configService.get<string>('groq.model') ?? 'llama-3.3-70b-versatile';
  }

  async sendTurn(
    history: ChatTurn[],
    referenceChunks: string[] = [],
  ): Promise<ChatTurnResult> {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.getSystemInstruction() },
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

    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: [RECORD_BOOKING_TOOL],
      tool_choice: 'auto',
      max_tokens: 1024,
    });

    const message = completion.choices[0]?.message;
    const bookingCall = message?.tool_calls?.find(
      (call) => call.function.name === 'record_booking',
    );

    let toolInput: Record<string, unknown> | undefined;
    if (bookingCall) {
      try {
        toolInput = JSON.parse(bookingCall.function.arguments) as Record<
          string,
          unknown
        >;
      } catch {
        this.logger.warn(
          `record_booking call had unparseable arguments: ${bookingCall.function.arguments}`,
        );
      }
    }

    return {
      text: message?.content ?? '',
      toolInput,
    };
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
}
