import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const NEWS_URL = "https://www.anthropic.com/news";
/** Only consider articles published within this window, to keep the very
 * first run (empty dedupe cache) from summarizing years of back-catalog. */
const LOOKBACK_DAYS = 7;

export class AnthropicSource extends NewsSource {
  readonly name = "Anthropic";

  async fetch(): Promise<Article[]> {
    try {
      const html = await fetchHtml(NEWS_URL);
      const $ = cheerio.load(html);
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const byUrl = new Map<string, Article>();

      $('a[href^="/news/"]').each((_, el) => {
        const $a = $(el);
        // The chronological publication list has a <time> element inside
        // each entry; the "featured" grid above it does not — this filters
        // us down to just the dated list without depending on hashed CSS
        // module class names.
        const dateText = $a.find("time").first().text().trim();
        if (!dateText) return;

        const href = $a.attr("href");
        if (!href) return;

        const title = $a.children("span").last().text().trim() || $a.text().trim();
        const publishedAt = new Date(dateText);
        if (!title || Number.isNaN(publishedAt.getTime())) return;
        if (publishedAt.getTime() < cutoff) return;

        const url = new URL(href, NEWS_URL).toString();
        if (byUrl.has(url)) return;
        byUrl.set(url, new Article(title, url, publishedAt, this.name));
      });

      return [...byUrl.values()].sort(
        (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
      );
    } catch (err) {
      console.error(`[${this.name}] fetch failed:`, err);
      return [];
    }
  }
}
