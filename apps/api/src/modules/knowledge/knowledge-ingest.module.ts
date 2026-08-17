import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from '../../config/configuration';
import { DatabaseModule } from '../../database/database.module';
import { KnowledgeModule } from './knowledge.module';

/**
 * Minimal bootstrap module for the `knowledge:ingest` CLI script —
 * deliberately NOT the full AppModule. VoiceModule's MediaStreamGateway
 * attaches to the HTTP server via HttpAdapterHost in onModuleInit(), which
 * throws ("Cannot read properties of null (reading 'getHttpServer')") when
 * bootstrapped through NestFactory.createApplicationContext(), since that
 * mode never creates an HTTP server. The ingestion script only needs
 * config + DB + knowledge retrieval, so it skips Voice/Queue/Chat entirely.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../../.env', '.env'],
    }),
    DatabaseModule,
    KnowledgeModule,
  ],
})
export class KnowledgeIngestModule {}
