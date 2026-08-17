import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { EmbeddingService } from './embedding.service';

export interface KnowledgeChunkInput {
  source: string;
  content: string;
}

export interface KnowledgeMatch {
  source: string;
  content: string;
  similarity: number;
}

/**
 * `knowledge_chunks` (packages/database/migrations/002_knowledge_base.sql)
 * is deliberately NOT a TypeORM entity: DatabaseModule runs with
 * `synchronize: true` in dev, and TypeORM doesn't understand pgvector's
 * `vector` column type or how to manage an `ivfflat` index, so mixing the
 * two would fight the ORM on every app start. Raw parameterized queries via
 * the (globally available, see @nestjs/typeorm's TypeOrmCoreModule) DataSource
 * keep this table entirely migration-managed instead — same direction
 * CLAUDE.md already calls out for bookings/conversations/call_sessions
 * once `synchronize` is retired.
 */
@Injectable()
export class KnowledgeService {
  private readonly logger = new Logger(KnowledgeService.name);
  private readonly topK: number;

  constructor(
    private readonly embeddingService: EmbeddingService,
    private readonly dataSource: DataSource,
    private readonly configService: ConfigService,
  ) {
    this.topK = this.configService.get<number>('knowledge.topK') ?? 3;
  }

  /**
   * Replaces the entire knowledge base with the given chunks. Simple
   * full-replace re-ingestion is fine at FAQ-doc scale (tens of chunks);
   * revisit if the knowledge base grows large enough that re-embedding
   * everything on every edit becomes slow.
   */
  async replaceAll(chunks: KnowledgeChunkInput[]): Promise<void> {
    await this.dataSource.query('DELETE FROM knowledge_chunks');

    for (const chunk of chunks) {
      const embedding = await this.embeddingService.embed(chunk.content);
      await this.dataSource.query(
        `INSERT INTO knowledge_chunks (source, content, embedding) VALUES ($1, $2, $3::vector)`,
        [chunk.source, chunk.content, toVectorLiteral(embedding)],
      );
    }

    this.logger.log(`Ingested ${chunks.length} knowledge chunk(s).`);
  }

  async search(query: string, topK = this.topK): Promise<KnowledgeMatch[]> {
    const embedding = await this.embeddingService.embed(query);
    return this.dataSource.query(
      `SELECT source, content, 1 - (embedding <=> $1::vector) AS similarity
       FROM knowledge_chunks
       ORDER BY embedding <=> $1::vector
       LIMIT $2`,
      [toVectorLiteral(embedding), topK],
    );
  }
}

function toVectorLiteral(values: number[]): string {
  return `[${values.join(',')}]`;
}
