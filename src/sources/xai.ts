import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";

/**
 * TODO: not yet implemented. x.ai sits behind a Cloudflare JS challenge —
 * plain fetch gets 403 on /news, /rss.xml, and even /sitemap.xml (robots.txt
 * is the only exempted path). No RSS alternative found. Would need a
 * headless browser (e.g. a Playwright-based fetch) to get past the
 * challenge — out of scope for this lightweight Node/Actions script.
 */
export class XaiSource extends NewsSource {
  readonly name = "xAI";

  async fetch(): Promise<Article[]> {
    return [];
  }
}
