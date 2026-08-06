import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";

/**
 * TODO: not yet implemented. ai.meta.com consistently returns HTTP 400 to
 * plain fetch requests (even the bare domain root, with various UA/header
 * combinations tried) — looks like Meta's edge rejects non-browser clients
 * outright rather than a bot challenge we could work around. No RSS
 * alternative found. Would need a headless browser to access.
 */
export class MetaAiSource extends NewsSource {
  readonly name = "Meta AI";

  async fetch(): Promise<Article[]> {
    return [];
  }
}
