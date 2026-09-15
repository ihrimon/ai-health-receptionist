import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import type {
  ChatCompletionMessage,
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from 'groq-sdk/resources/chat/completions';
import { BookingsService } from '../bookings/bookings.service';
import { CreateBookingDto } from '../bookings/dto/create-booking.dto';
import { ConversationsService } from '../conversations/conversations.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ProvidersService } from '../providers/providers.service';
import { addMinutes, combineDateAndDhakaTime } from '../providers/slot-math';
import { ChatToolExecutor } from './chat-tool-executor';
import { SendChatMessageDto } from './dto/send-chat-message.dto';
import {
  AllLlmKeysExhaustedError,
  NoLlmCredentialsConfiguredError,
} from './llm-key-manager';
import { ChatTurn, LlmChatClient } from './llm-chat.client';

const CHAT_SESSION_PREFIX = 'chat-';
const MAX_TOOL_ROUNDTRIPS = 4;
const UNAVAILABLE_REPLY =
  "Sorry, I'm having trouble checking availability right now — could you try again in a moment?";
const LLM_UNAVAILABLE_REPLY =
  "Sorry, I'm having trouble processing that right now — could you try again in a moment?";
const ALL_KEYS_EXHAUSTED_REPLY =
  "I'm getting a lot of requests right now — give me a moment and try again, we'll pick up right where we left off.";
const NO_CREDENTIALS_REPLY =
  "Sorry, the AI assistant isn't set up yet — an admin needs to add an API key under Settings.";

export interface ChatReply {
  sessionId: string;
  reply: string;
  bookingCreated: boolean;
  booking?: { id: string };
}

interface LoopResult {
  text: string;
  toolInput?: Record<string, unknown>;
}

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    private readonly llmChatClient: LlmChatClient,
    private readonly chatToolExecutor: ChatToolExecutor,
    private readonly conversationsService: ConversationsService,
    private readonly bookingsService: BookingsService,
    private readonly providersService: ProvidersService,
    private readonly knowledgeService: KnowledgeService,
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

    const referenceChunks = await this.getReferenceChunks(dto.message);
    const providerRoster = await this.getProviderRoster();
    const messages = this.llmChatClient.buildMessages(
      transcript,
      referenceChunks,
      providerRoster,
    );
    const result = await this.runConversationLoop(messages);

    let bookingCreated = false;
    let booking: { id: string } | undefined;
    let replyText = result.text;

    if (result.toolInput) {
      const bookingDto = plainToInstance(CreateBookingDto, result.toolInput);
      const errors = await validate(bookingDto);
      const providerId = bookingDto.providerId;

      if (errors.length === 0 && providerId) {
        try {
          const provider = await this.providersService.findOne(providerId);
          const startsAt = combineDateAndDhakaTime(
            new Date(`${bookingDto.preferredDate}T00:00:00.000Z`),
            bookingDto.preferredTime,
          );
          bookingDto.startsAt = startsAt.toISOString();
          bookingDto.endsAt = addMinutes(
            startsAt,
            provider.slotDurationMinutes,
          ).toISOString();

          const saved = await this.bookingsService.create(bookingDto);
          bookingCreated = true;
          booking = { id: saved.id };
          conversation.bookingId = saved.id;
          if (!replyText) {
            replyText =
              "Perfect — you're all booked! You'll get a confirmation shortly.";
          }
        } catch (err) {
          if (err instanceof NotFoundException) {
            this.logger.warn(
              `record_booking referenced a providerId that no longer exists: ${bookingDto.providerId}`,
            );
            replyText =
              "Sorry, that provider isn't available anymore — could we find you a new time?";
          } else if (err instanceof ConflictException) {
            replyText =
              'Sorry, that time slot was just booked by someone else — could you pick another time?';
          } else {
            throw err;
          }
        }
      } else {
        const failedFields = errors.length
          ? errors.map((e) => e.property).join(', ')
          : 'providerId';
        this.logger.warn(
          `record_booking call failed validation: ${failedFields}`,
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

  /**
   * Runs the multi-turn tool-calling loop for one user turn: repeatedly
   * calls the LLM, executes find_available_slots itself and feeds the
   * result back, until the model either calls record_booking (terminal —
   * handled by the caller) or replies with plain text. Capped to avoid a
   * runaway loop if the model never settles.
   */
  private async runConversationLoop(
    messages: ChatCompletionMessageParam[],
  ): Promise<LoopResult> {
    for (let i = 0; i < MAX_TOOL_ROUNDTRIPS; i++) {
      let message: ChatCompletionMessage;
      try {
        message = await this.llmChatClient.complete(messages);
      } catch (err) {
        // A live LLM API call is an external dependency that can fail
        // transiently (rate limits, the model hallucinating a tool name
        // outside what was registered, network errors) — same
        // don't-crash-the-turn principle as getReferenceChunks() below.
        // AllLlmKeysExhaustedError means LlmChatClient already tried
        // every configured credential (see LlmKeyManager) — worth a
        // distinct, less alarming reply than a generic failure.
        // NoLlmCredentialsConfiguredError means Settings is empty.
        this.logger.warn(
          `LlmChatClient.complete failed: ${(err as Error).message}`,
        );
        if (err instanceof NoLlmCredentialsConfiguredError) {
          return { text: NO_CREDENTIALS_REPLY };
        }
        if (err instanceof AllLlmKeysExhaustedError) {
          return { text: ALL_KEYS_EXHAUSTED_REPLY };
        }
        return { text: LLM_UNAVAILABLE_REPLY };
      }
      const toolCalls = message.tool_calls ?? [];

      const bookingCall = toolCalls.find(
        (call) => call.function.name === 'record_booking',
      );
      if (bookingCall) {
        return {
          text: message.content ?? '',
          toolInput: this.parseToolArgs(bookingCall),
        };
      }

      const slotsCall = toolCalls.find(
        (call) => call.function.name === 'find_available_slots',
      );
      if (!slotsCall) {
        return { text: message.content ?? '' };
      }

      messages.push({
        role: 'assistant',
        content: message.content,
        tool_calls: toolCalls,
      });
      const slotsResult = await this.chatToolExecutor.findAvailableSlots(
        this.parseToolArgs(slotsCall),
      );
      messages.push({
        role: 'tool',
        tool_call_id: slotsCall.id,
        content: JSON.stringify(slotsResult),
      });
    }

    this.logger.warn('Tool loop exceeded max roundtrips');
    return { text: UNAVAILABLE_REPLY };
  }

  private toCallSid(sessionId: string): string {
    return `${CHAT_SESSION_PREFIX}${sessionId}`;
  }

  /**
   * Public — called from the post-booking star-rating modal in the chat
   * UI, which has no admin session. Looked up by the chat sessionId
   * (never the conversation's internal id, which the caller never sees)
   * so a rating can only be attached to the conversation the rater was
   * actually part of.
   */
  async rateConversation(sessionId: string, rating: number): Promise<void> {
    const conversation = await this.conversationsService.findByCallSid(
      this.toCallSid(sessionId),
    );
    if (!conversation) {
      throw new NotFoundException(`No conversation for session ${sessionId}`);
    }
    await this.conversationsService.rate(conversation.id, rating);
  }

  private async getReferenceChunks(message: string): Promise<string[]> {
    try {
      const matches = await this.knowledgeService.search(message);
      return matches.map((match) => match.content);
    } catch (err) {
      // Knowledge base scaffold is ahead of real content/migration being
      // applied everywhere yet (see packages/ai/knowledge/faq.md) — chat
      // should keep working without RAG context rather than fail the turn.
      this.logger.warn(
        `Knowledge retrieval unavailable: ${(err as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Feeds the model the exact registered `service` string per active
   * provider so it never has to guess/paraphrase one when calling
   * find_available_slots or record_booking — service matching against the
   * database is an exact string comparison, and a plausible-sounding
   * paraphrase (e.g. "Orthopedics" for a provider registered as
   * "Orthopedic") silently fails to match, reported to the caller as "no
   * provider found" even though one genuinely exists.
   */
  private async getProviderRoster(): Promise<
    { name: string; service: string }[]
  > {
    try {
      const providers = await this.providersService.findAll();
      return providers
        .filter((provider) => provider.isActive)
        .map((provider) => ({
          name: provider.name,
          service: provider.service,
        }));
    } catch (err) {
      this.logger.warn(
        `Provider roster unavailable: ${(err as Error).message}`,
      );
      return [];
    }
  }

  private parseToolArgs(
    call: ChatCompletionMessageToolCall,
  ): Record<string, unknown> {
    try {
      return JSON.parse(call.function.arguments) as Record<string, unknown>;
    } catch {
      this.logger.warn(
        `${call.function.name} call had unparseable arguments: ${call.function.arguments}`,
      );
      return {};
    }
  }
}
