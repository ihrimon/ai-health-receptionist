import { Test, TestingModule } from '@nestjs/testing';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';

describe('ChatController', () => {
  let controller: ChatController;
  let chatService: { sendMessage: jest.Mock };

  beforeEach(async () => {
    chatService = { sendMessage: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: chatService }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it('delegates to ChatService.sendMessage and returns its result', async () => {
    const dto = { message: 'Hi, I want to book a service' };
    const expected = {
      sessionId: 'abc-123',
      reply: 'Hi! What can I help you book today?',
      bookingCreated: false,
    };
    chatService.sendMessage.mockResolvedValue(expected);

    const result = await controller.sendMessage(dto);

    expect(chatService.sendMessage).toHaveBeenCalledWith(dto);
    expect(result).toBe(expected);
  });
});
