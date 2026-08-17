import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { NestFactory } from '@nestjs/core';
import { chunkMarkdown } from './chunk-markdown';
import { KnowledgeIngestModule } from './knowledge-ingest.module';
import { KnowledgeService } from './knowledge.service';

/**
 * One-off ingestion CLI: reads packages/ai/knowledge/faq.md, chunks it by
 * `## ` section, embeds each chunk locally, and replaces the
 * `knowledge_chunks` table's contents. Re-run this after editing the FAQ
 * source file — there's no file-watcher/auto-sync.
 *
 * Usage: pnpm --filter api knowledge:ingest
 */
async function main() {
  const faqPath = path.resolve(
    process.cwd(),
    '../../packages/ai/knowledge/faq.md',
  );
  const markdown = fs.readFileSync(faqPath, 'utf-8');
  const chunks = chunkMarkdown(markdown, 'faq.md');

  if (chunks.length === 0) {
    console.warn(`No "## " sections found in ${faqPath} — nothing to ingest.`);
    return;
  }

  const app = await NestFactory.createApplicationContext(
    KnowledgeIngestModule,
    { logger: ['error', 'warn'] },
  );

  try {
    const knowledgeService = app.get(KnowledgeService);
    console.log(
      `Embedding and storing ${chunks.length} chunk(s) from ${faqPath}...`,
    );
    await knowledgeService.replaceAll(chunks);
    console.log('Done.');
  } finally {
    await app.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
