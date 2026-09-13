import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { ProvidersModule } from '../providers/providers.module';
import { ChatToolExecutor } from './chat-tool-executor';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { GroqChatClient } from './groq-chat.client';

@Module({
  imports: [
    ConversationsModule,
    BookingsModule,
    KnowledgeModule,
    ProvidersModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, GroqChatClient, ChatToolExecutor],
})
export class ChatModule {}
