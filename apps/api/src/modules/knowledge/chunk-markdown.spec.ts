import { chunkMarkdown } from './chunk-markdown';

describe('chunkMarkdown', () => {
  it('splits into one chunk per ## section, dropping content before the first heading', () => {
    const markdown = [
      '# FAQ',
      '',
      'Intro text that is not itself a fact.',
      '',
      '## What are your hours?',
      'We are open 9-5, Mon-Fri.',
      '',
      '## What is your cancellation policy?',
      'Free cancellation up to 24 hours before.',
      '',
    ].join('\n');

    const chunks = chunkMarkdown(markdown, 'faq.md');

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({
      source: 'faq.md',
      content: '## What are your hours?\nWe are open 9-5, Mon-Fri.',
    });
    expect(chunks[1].content).toContain('cancellation policy');
    expect(chunks.every((chunk) => chunk.source === 'faq.md')).toBe(true);
  });

  it('returns an empty array for markdown with no ## sections', () => {
    expect(
      chunkMarkdown('# Just a title\n\nNo sections here.', 'x.md'),
    ).toEqual([]);
  });
});
