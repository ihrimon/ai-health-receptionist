import { Module } from '@nestjs/common';
import { EmbeddingService } from './embedding.service';
import { KnowledgeService } from './knowledge.service';

@Module({
  providers: [EmbeddingService, KnowledgeService],
  exports: [KnowledgeService],
})
export class KnowledgeModule {}
