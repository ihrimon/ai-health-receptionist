import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
import { HealthModule } from './health/health.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ConversationsModule } from './modules/conversations/conversations.module';
import { CallSessionsModule } from './modules/call-sessions/call-sessions.module';
import { VoiceModule } from './modules/voice/voice.module';
import { ChatModule } from './modules/chat/chat.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { AuthModule } from './modules/auth/auth.module';
import { LlmCredentialsModule } from './modules/llm-credentials/llm-credentials.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    QueueModule,
    HealthModule,
    BookingsModule,
    ConversationsModule,
    CallSessionsModule,
    VoiceModule,
    ChatModule,
    ProvidersModule,
    AuthModule,
    LlmCredentialsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
