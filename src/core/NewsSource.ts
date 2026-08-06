import type { Article } from "./Article.js";

/**
 * Base class every lab source extends. To add a new lab: create a subclass
 * implementing `fetch()`, then register one instance of it in
 * `src/sources/index.ts`. Nothing in the pipeline needs to change.
 */
export abstract class NewsSource {
  /** Human-readable label, e.g. "Anthropic". Shown in the digest. */
  abstract readonly name: string;

  /**
   * Fetch the most recent articles from this source. Implementations should
   * fail soft — if the fetch errors, log and return `[]` rather than
   * throwing, so one broken source doesn't take down the whole run.
   */
  abstract fetch(): Promise<Article[]>;
}
