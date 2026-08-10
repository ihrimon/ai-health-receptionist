import { Test, TestingModule } from '@nestjs/testing';
import { BookingsService } from '../bookings/bookings.service';
import { ConversationsService } from '../conversations/conversations.service';
import { ChatService } from './chat.service';
import { GeminiChatClient } from './gemini-chat.client';

const validBookingInput = {
  name: 'Jane Doe',
  phone: '+15550001111',
  email: 'jane@example.com',
  service: 'Consulting',
  preferredDate: '2026-09-01',
  preferredTime: '14:00',
};

describe('ChatService', () => {
  let service: ChatService;
  let geminiChatClient: { sendTurn: jest.Mock };
  let conversationsService: {
    findByCallSid: jest.Mock;
    create: jest.Mock;
    appendTurn: jest.Mock;
  };
  let bookingsService: { create: jest.Mock };

  beforeEach(async () => {
    geminiChatClient = { sendTurn: jest.fn() };
    conversationsService = {
      findByCallSid: jest.fn(),
      create: jest.fn(),
      appendTurn: jest.fn(),
    };
    bookingsService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: GeminiChatClient, useValue: geminiChatClient },
        { provide: ConversationsService, useValue: conversationsService },
        { provide: BookingsService, useValue: bookingsService },
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
    geminiChatClient.sendTurn.mockResolvedValue({
      text: 'Hi! What can I help you book today?',
    });

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
    geminiChatClient.sendTurn.mockResolvedValue({ text: 'Got it.' });

    await service.sendMessage({
      sessionId: 'session-1',
      message: 'Hello again',
    });

    expect(conversationsService.findByCallSid).toHaveBeenCalledWith(
      'chat-session-1',
    );
    expect(conversationsService.create).not.toHaveBeenCalled();
    expect(geminiChatClient.sendTurn).toHaveBeenCalledWith([
      { role: 'user', text: 'earlier message' },
      { role: 'user', text: 'Hello again' },
    ]);
  });

  it('creates and links a booking when the tool call input is valid', async () => {
    conversationsService.create.mockResolvedValue({
      id: 'conv-1',
      transcript: null,
      bookingId: undefined,
    });
    geminiChatClient.sendTurn.mockResolvedValue({
      text: "Let me read that back to confirm — you're all booked!",
      toolInput: validBookingInput,
    });
    bookingsService.create.mockResolvedValue({ id: 'booking-1' });

    const result = await service.sendMessage({ message: 'Yes, confirm it' });

    expect(bookingsService.create).toHaveBeenCalled();
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
    geminiChatClient.sendTurn.mockResolvedValue({
      text: '',
      toolInput: { name: 'Jane Doe' }, // missing required fields
    });

    const result = await service.sendMessage({ message: 'Confirm' });

    expect(bookingsService.create).not.toHaveBeenCalled();
    expect(result.bookingCreated).toBe(false);
    expect(result.reply.length).toBeGreaterThan(0);
  });
});
