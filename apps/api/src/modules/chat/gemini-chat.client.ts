import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type { Content } from '@google/genai';
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
 * — switched to Gemini for Google AI Studio's free tier. Model is
 * configurable (gemini.model) so swapping providers later is a config
 * change, not a rewrite.
 */
@Injectable()
export class GeminiChatClient {
  private readonly logger = new Logger(GeminiChatClient.name);
  private readonly client: GoogleGenAI;
  private readonly model: string;
  private systemInstruction?: string;

  constructor(private readonly configService: ConfigService) {
    this.client = new GoogleGenAI({
      apiKey: this.configService.get<string>('gemini.apiKey'),
    });
    this.model =
      this.configService.get<string>('gemini.model') ?? 'gemini-2.5-flash';
  }

  async sendTurn(history: ChatTurn[]): Promise<ChatTurnResult> {
    const contents: Content[] = history.map((turn) => ({
      role: turn.role,
      parts: [{ text: turn.text }],
    }));

    const response = await this.client.models.generateContent({
      model: this.model,
      contents,
      config: {
        systemInstruction: this.getSystemInstruction(),
        maxOutputTokens: 1024,
        tools: [{ functionDeclarations: [RECORD_BOOKING_TOOL] }],
      },
    });

    const bookingCall = response.functionCalls?.find(
      (call) => call.name === 'record_booking',
    );

    return {
      text: response.text ?? '',
      toolInput: bookingCall?.args,
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
