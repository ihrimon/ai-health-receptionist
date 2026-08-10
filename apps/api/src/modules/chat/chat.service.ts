import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import { ChatTurn, GeminiChatClient } from './gemini-chat.client';

const CHAT_SESSION_PREFIX = 'chat-';

export interface ChatReply {
  sessionId: string;
  reply: string;
  bookingCreated: boolean;
  booking?: { id: string };
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly geminiChatClient: GeminiChatClient,
    private readonly conversationsService: ConversationsService,
    private readonly bookingsService: BookingsService,
  ) {}

  async sendMessage(dto: SendChatMessageDto): Promise<ChatReply> {
    let conversation = dto.sessionId
      ? await this.conversationsService.findByCallSid(
          this.toCallSid(dto.sessionId),
        )
      : null;
    const sessionId = conversation ? dto.sessionId! : randomUUID();

    if (!conversation) {
      conversation = await this.conversationsService.create({
        callSid: this.toCallSid(sessionId),
      });
    }

    const transcript: ChatTurn[] = [
      ...((conversation.transcript as ChatTurn[] | undefined) ?? []),
      { role: 'user', text: dto.message },
    ];

    const result = await this.geminiChatClient.sendTurn(transcript);

    let bookingCreated = false;
    let booking: { id: string } | undefined;
    let replyText = result.text;

    if (result.toolInput) {
      const bookingDto = plainToInstance(CreateBookingDto, result.toolInput);
      const errors = await validate(bookingDto);

      if (errors.length === 0) {
        const saved = await this.bookingsService.create(bookingDto);
        bookingCreated = true;
        booking = { id: saved.id };
        conversation.bookingId = saved.id;
        if (!replyText) {
          replyText =
            "Perfect — you're all booked! You'll get a confirmation shortly.";
        }
      } else {
        this.logger.warn(
          `record_booking call failed validation: ${errors
            .map((e) => e.property)
            .join(', ')}`,
        );
        if (!replyText) {
          replyText =
            "I couldn't quite save that — could you confirm the missing details?";
        }
      }
    }

    const transcriptToSave: ChatTurn[] = [
      ...transcript,
      { role: 'model', text: replyText },
    ];

    await this.conversationsService.appendTurn(conversation.id, {
      transcript: transcriptToSave as unknown as Record<string, unknown>[],
      bookingId: conversation.bookingId,
    });

    return { sessionId, reply: replyText, bookingCreated, booking };
  }

  private toCallSid(sessionId: string): string {
    return `${CHAT_SESSION_PREFIX}${sessionId}`;
  }
}
