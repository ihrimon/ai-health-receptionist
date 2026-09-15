import { Module } from '@nestjs/common';
import { BookingsModule } from '../bookings/bookings.module';
import { ConversationsModule } from '../conversations/conversations.module';
import { KnowledgeModule } from '../knowledge/knowledge.module';
import { LlmCredentialsModule } from '../llm-credentials/llm-credentials.module';
import { ProvidersModule } from '../providers/providers.module';
import { ChatToolExecutor } from './chat-tool-executor';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { LlmChatClient } from './llm-chat.client';
import { LlmKeyManager } from './llm-key-manager';
import { ProviderRegistry } from './providers/provider-registry';

@Module({
  imports: [
    ConversationsModule,
    BookingsModule,
    KnowledgeModule,
    ProvidersModule,
    LlmCredentialsModule,
  ],
  controllers: [ChatController],
  providers: [
    ChatService,
    LlmChatClient,
    LlmKeyManager,
    ProviderRegistry,
    ChatToolExecutor,
  ],
})
export class ChatModule {}
