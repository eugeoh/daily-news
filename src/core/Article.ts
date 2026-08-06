import type { Category } from "./category.js";
import { formatDate } from "./date.js";

/**
 * A single news item pulled from a lab's blog/news page.
 *
 * `summary` and `category` start empty and are filled in later by the
 * summarize pipeline stage — the object is created once by a source and
 * enriched as it moves through the pipeline, rather than rebuilt at each
 * stage.
 */
export class Article {
  /** Plain-English summary, populated by the summarize pipeline stage. */
  summary: string | null = null;

  /** Digest section this article belongs in, assigned during summarize. */
  category: Category | null = null;

  /** Raw scraped text used as input to summarization. May be filled in lazily. */
  rawContent: string;

  constructor(
    public readonly title: string,
    public readonly url: string,
    public readonly publishedAt: Date,
    public readonly sourceName: string,
    rawContent: string = "",
  ) {
    this.rawContent = rawContent;
  }

  /** Stable dedupe key — the canonical URL is unique per article. */
  get id(): string {
    return this.url;
  }

  /** Renders this article as one digest entry. */
  toMarkdown(): string {
    const body = this.summary ?? (this.rawContent.slice(0, 200) || "(no summary available)");
    return `### [${this.title}](${this.url})\n_${this.sourceName} · ${formatDate(this.publishedAt)}_\n\n${body}\n`;
  }
}
