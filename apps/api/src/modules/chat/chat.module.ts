import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
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
import { ProviderRegistryModule } from './providers/provider-registry.module';

@Module({
  imports: [
    ConversationsModule,
    BookingsModule,
    KnowledgeModule,
    ProvidersModule,
    LlmCredentialsModule,
    ProviderRegistryModule,
    AuthModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, LlmChatClient, LlmKeyManager, ChatToolExecutor],
})
export class ChatModule {}
