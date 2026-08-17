export interface MarkdownChunk {
  source: string;
  content: string;
}

/**
 * Splits FAQ/policy markdown into one chunk per `## ` section (heading +
 * body). A fixed-length token splitter isn't needed for this small,
 * structured doc format — one heading already is one topically coherent,
 * retrievable fact. Content before the first `## ` (e.g. a top-level title)
 * is dropped, since it's not itself an answerable fact.
 */
export function chunkMarkdown(
  markdown: string,
  source: string,
): MarkdownChunk[] {
  const sections = markdown.split(/\n(?=## )/g);

  return sections
    .map((section) => section.trim())
    .filter((section) => section.startsWith('## '))
    .map((content) => ({ source, content }));
}
