import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { EmbeddingService } from './embedding.service';
import { KnowledgeService } from './knowledge.service';

describe('KnowledgeService', () => {
  let service: KnowledgeService;
  let embeddingService: { embed: jest.Mock };
  let dataSource: { query: jest.Mock };

  beforeEach(async () => {
    embeddingService = { embed: jest.fn().mockResolvedValue([0.1, 0.2, 0.3]) };
    dataSource = { query: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeService,
        { provide: EmbeddingService, useValue: embeddingService },
        { provide: DataSource, useValue: dataSource },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    service = module.get<KnowledgeService>(KnowledgeService);
  });

  it('embeds the query and searches by cosine distance, defaulting topK to 3', async () => {
    dataSource.query.mockResolvedValue([
      { source: 'faq.md', content: 'We are open 9-5.', similarity: 0.9 },
    ]);

    const results = await service.search('what are your hours?');

    expect(embeddingService.embed).toHaveBeenCalledWith('what are your hours?');
    expect(dataSource.query).toHaveBeenCalledWith(
      expect.stringContaining('ORDER BY embedding <=>'),
      ['[0.1,0.2,0.3]', 3],
    );
    expect(results).toEqual([
      { source: 'faq.md', content: 'We are open 9-5.', similarity: 0.9 },
    ]);
  });

  it('replaceAll clears existing rows then inserts an embedded row per chunk', async () => {
    await service.replaceAll([
      { source: 'faq.md', content: 'Chunk one' },
      { source: 'faq.md', content: 'Chunk two' },
    ]);

    expect(dataSource.query).toHaveBeenNthCalledWith(
      1,
      'DELETE FROM knowledge_chunks',
    );
    expect(dataSource.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO knowledge_chunks'),
      ['faq.md', 'Chunk one', '[0.1,0.2,0.3]'],
    );
    expect(dataSource.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('INSERT INTO knowledge_chunks'),
      ['faq.md', 'Chunk two', '[0.1,0.2,0.3]'],
    );
  });
});
