import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GeminiChatClient } from './gemini-chat.client';

@Module({
  imports: [ConversationsModule, BookingsModule],
  controllers: [ChatController],
  providers: [ChatService, GeminiChatClient],
})
export class ChatModule {}
