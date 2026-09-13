import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from '../bookings/bookings.service';
import { ConversationsService } from '../conversations/conversations.service';
import { KnowledgeService } from '../knowledge/knowledge.service';
import { ProvidersService } from '../providers/providers.service';
import { addMinutes, combineDateAndDhakaTime } from '../providers/slot-math';
import { ChatToolExecutor } from './chat-tool-executor';
import { ChatService } from './chat.service';
import { GroqChatClient } from './groq-chat.client';

const PROVIDER_ID = '11111111-1111-4111-8111-111111111111';

const validBookingInput = {
  name: 'Jane Doe',
  phone: '+15550001111',
  email: 'jane@example.com',
  service: 'Consulting',
  preferredDate: '2026-09-01',
  preferredTime: '14:00',
  providerId: PROVIDER_ID,
};

function assistantMessage(content: string) {
  return { role: 'assistant' as const, content };
}

function toolCallMessage(
  name: 'record_booking' | 'find_available_slots',
  args: Record<string, unknown>,
  id = 'call-1',
) {
  return {
    role: 'assistant' as const,
    content: null,
    tool_calls: [
      {
        id,
        type: 'function' as const,
        function: { name, arguments: JSON.stringify(args) },
      },
    ],
  };
}

describe('ChatService', () => {
  let service: ChatService;
  let groqChatClient: { buildMessages: jest.Mock; complete: jest.Mock };
  let chatToolExecutor: { findAvailableSlots: jest.Mock };
  let conversationsService: {
    findByCallSid: jest.Mock;
    create: jest.Mock;
    appendTurn: jest.Mock;
  };
  let bookingsService: { create: jest.Mock };
  let providersService: { findOne: jest.Mock };
  let knowledgeService: { search: jest.Mock };

  beforeEach(async () => {
    groqChatClient = {
      buildMessages: jest.fn().mockReturnValue([]),
      complete: jest.fn(),
    };
    chatToolExecutor = { findAvailableSlots: jest.fn() };
    conversationsService = {
      findByCallSid: jest.fn(),
      create: jest.fn(),
      appendTurn: jest.fn(),
    };
    bookingsService = { create: jest.fn() };
    providersService = { findOne: jest.fn() };
    knowledgeService = { search: jest.fn().mockResolvedValue([]) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: GroqChatClient, useValue: groqChatClient },
        { provide: ChatToolExecutor, useValue: chatToolExecutor },
        { provide: ConversationsService, useValue: conversationsService },
        { provide: BookingsService, useValue: bookingsService },
        { provide: ProvidersService, useValue: providersService },
        { provide: KnowledgeService, useValue: knowledgeService },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('starts a fresh conversation when no sessionId is given', async () => {
    let createdCallSid = '';
    conversationsService.create.mockImplementation(
      (dto: { callSid: string }) => {
        createdCallSid = dto.callSid;
        return Promise.resolve({
          id: 'conv-1',
          transcript: null,
          bookingId: undefined,
        });
      },
    );
    groqChatClient.complete.mockResolvedValue(
      assistantMessage('Hi! What can I help you book today?'),
    );

    const result = await service.sendMessage({ message: 'Hello' });

    expect(conversationsService.findByCallSid).not.toHaveBeenCalled();
    expect(createdCallSid.startsWith('chat-')).toBe(true);
    expect(result.reply).toBe('Hi! What can I help you book today?');
    expect(result.bookingCreated).toBe(false);
    expect(result.sessionId).toBeTruthy();
  });

  it('continues an existing conversation by sessionId', async () => {
    conversationsService.findByCallSid.mockResolvedValue({
      id: 'conv-1',
      transcript: [{ role: 'user', text: 'earlier message' }],
      bookingId: undefined,
    });
    groqChatClient.complete.mockResolvedValue(assistantMessage('Got it.'));

    await service.sendMessage({
      sessionId: 'session-1',
      message: 'Hello again',
    });

    expect(conversationsService.findByCallSid).toHaveBeenCalledWith(
      'chat-session-1',
    );
    expect(conversationsService.create).not.toHaveBeenCalled();
    expect(groqChatClient.buildMessages).toHaveBeenCalledWith(
      [
        { role: 'user', text: 'earlier message' },
        { role: 'user', text: 'Hello again' },
      ],
      [],
    );
  });

  it('passes retrieved knowledge chunks through to buildMessages', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    knowledgeService.search.mockResolvedValue([
      { source: 'faq.md', content: 'We are open 9-5.', similarity: 0.9 },
    ]);
    groqChatClient.complete.mockResolvedValue(
      assistantMessage('We are open 9-5.'),
    );

    await service.sendMessage({ message: 'What are your hours?' });

    expect(knowledgeService.search).toHaveBeenCalledWith(
      'What are your hours?',
    );
    expect(groqChatClient.buildMessages).toHaveBeenCalledWith(
      expect.any(Array),
      ['We are open 9-5.'],
    );
  });

  it('falls back to no reference chunks if knowledge retrieval fails', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    knowledgeService.search.mockRejectedValue(
      new Error('relation "knowledge_chunks" does not exist'),
    );
    groqChatClient.complete.mockResolvedValue(assistantMessage('Hi there!'));

    const result = await service.sendMessage({ message: 'Hello' });

    expect(result.reply).toBe('Hi there!');
    expect(groqChatClient.buildMessages).toHaveBeenCalledWith(
      expect.any(Array),
      [],
    );
  });

  it('creates and links a booking when the tool call input is valid', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    groqChatClient.complete.mockResolvedValue(
      toolCallMessage('record_booking', validBookingInput),
    );
    providersService.findOne.mockResolvedValue({
      id: PROVIDER_ID,
      slotDurationMinutes: 30,
    });
    bookingsService.create.mockResolvedValue({ id: 'booking-1' });

    const result = await service.sendMessage({ message: 'Yes, confirm it' });

    const expectedStartsAt = combineDateAndDhakaTime(
      new Date('2026-09-01T00:00:00.000Z'),
      '14:00',
    );
    const expectedEndsAt = addMinutes(expectedStartsAt, 30);

    expect(providersService.findOne).toHaveBeenCalledWith(PROVIDER_ID);
    expect(bookingsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: PROVIDER_ID,
        startsAt: expectedStartsAt.toISOString(),
        endsAt: expectedEndsAt.toISOString(),
      }),
    );
    expect(result.bookingCreated).toBe(true);
    expect(result.booking).toEqual({ id: 'booking-1' });
    expect(conversationsService.appendTurn).toHaveBeenCalledWith(
      'conv-1',
      expect.objectContaining({ bookingId: 'booking-1' }),
    );
  });

  it('does not save a booking when the tool call input fails validation', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    groqChatClient.complete.mockResolvedValue(
      toolCallMessage('record_booking', { name: 'Jane Doe' }), // missing required fields
    );

    const result = await service.sendMessage({ message: 'Confirm' });

    expect(bookingsService.create).not.toHaveBeenCalled();
    expect(result.bookingCreated).toBe(false);
    expect(result.reply.length).toBeGreaterThan(0);
  });

  it('replies gracefully instead of crashing the turn when the Groq API call itself fails', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    groqChatClient.complete.mockRejectedValue(
      new Error(
        "Tool call validation failed: attempted to call tool 'collect_name' which was not in request.tools",
      ),
    );

    const result = await service.sendMessage({ message: 'Hello' });

    expect(result.reply).toMatch(/trouble processing/i);
    expect(result.bookingCreated).toBe(false);
    expect(conversationsService.appendTurn).toHaveBeenCalled();
  });

  it('runs the find_available_slots round trip before producing a final reply', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    groqChatClient.complete
      .mockResolvedValueOnce(
        toolCallMessage(
          'find_available_slots',
          { service: 'Consulting' },
          'call-slots',
        ),
      )
      .mockResolvedValueOnce(
        assistantMessage('We have Friday 2pm open — does that work?'),
      );
    chatToolExecutor.findAvailableSlots.mockResolvedValue({
      providerId: PROVIDER_ID,
      providerName: 'Dr. A',
      slots: [
        { date: '2026-08-28', time: '14:00', label: 'Fri, Aug 28 at 2:00 PM' },
      ],
    });

    const result = await service.sendMessage({
      message: 'What times are open?',
    });

    expect(chatToolExecutor.findAvailableSlots).toHaveBeenCalledWith({
      service: 'Consulting',
    });
    expect(groqChatClient.complete).toHaveBeenCalledTimes(2);
    expect(result.reply).toBe('We have Friday 2pm open — does that work?');
    expect(result.bookingCreated).toBe(false);
  });

  it('falls back to an apology after exceeding the max tool roundtrips', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    groqChatClient.complete.mockResolvedValue(
      toolCallMessage('find_available_slots', { service: 'Consulting' }),
    );
    chatToolExecutor.findAvailableSlots.mockResolvedValue({
      error: 'no_slots_available',
    });

    const result = await service.sendMessage({
      message: 'What times are open?',
    });

    expect(groqChatClient.complete).toHaveBeenCalledTimes(4);
    expect(result.reply).toMatch(/trouble checking availability/i);
  });

  it('replies gracefully when the confirmed providerId no longer exists', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    groqChatClient.complete.mockResolvedValue(
      toolCallMessage('record_booking', validBookingInput),
    );
    providersService.findOne.mockRejectedValue(new NotFoundException());

    const result = await service.sendMessage({ message: 'Yes, confirm it' });

    expect(bookingsService.create).not.toHaveBeenCalled();
    expect(result.bookingCreated).toBe(false);
    expect(result.reply).toMatch(/isn't available anymore/i);
  });

  it('replies gracefully when the slot was booked by someone else in the meantime', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    groqChatClient.complete.mockResolvedValue(
      toolCallMessage('record_booking', validBookingInput),
    );
    providersService.findOne.mockResolvedValue({
      id: PROVIDER_ID,
      slotDurationMinutes: 30,
    });
    bookingsService.create.mockRejectedValue(new ConflictException());

    const result = await service.sendMessage({ message: 'Yes, confirm it' });

    expect(result.bookingCreated).toBe(false);
    expect(result.reply).toMatch(/just booked by someone else/i);
  });
});
