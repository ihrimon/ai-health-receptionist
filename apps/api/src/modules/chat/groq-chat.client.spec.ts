import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GroqChatClient } from './groq-chat.client';

describe('GroqChatClient', () => {
  let client: GroqChatClient;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroqChatClient,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) =>
              key === 'groq.apiKey' ? 'test-key' : undefined,
          },
        },
      ],
    }).compile();

    client = module.get<GroqChatClient>(GroqChatClient);
  });

  describe('buildMessages', () => {
    it('grounds the model with the real current date, not a guessed one', () => {
      const messages = client.buildMessages([], []);
      const dateMessage = messages.find(
        (m) =>
          typeof m.content === 'string' &&
          m.content.includes("Today's real date"),
      );

      expect(dateMessage).toBeDefined();
      const realYear = new Date().getFullYear().toString();
      expect(dateMessage!.content as string).toContain(realYear);
    });

    it('includes conversation history as user/assistant turns', () => {
      const messages = client.buildMessages(
        [
          { role: 'user', text: 'Hello' },
          { role: 'model', text: 'Hi there' },
        ],
        [],
      );

      expect(messages).toContainEqual({ role: 'user', content: 'Hello' });
      expect(messages).toContainEqual({
        role: 'assistant',
        content: 'Hi there',
      });
    });
  });
});
