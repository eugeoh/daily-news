import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const RSS_URL = "https://deepmind.google/blog/rss.xml";
const LOOKBACK_DAYS = 7;

/**
 * Google DeepMind's blog serves a plain RSS feed with no bot-blocking.
 * Descriptions are present on some items and empty on others — when empty,
 * `rawContent` is left blank so the summarize stage fetches the (also
 * unblocked) article page itself.
 */
export class GoogleDeepMindSource extends NewsSource {
  readonly name = "Google DeepMind";

  async fetch(): Promise<Article[]> {
    try {
      const xml = await fetchHtml(RSS_URL);
      const $ = cheerio.load(xml, { xmlMode: true });
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const articles: Article[] = [];

      $("item").each((_, el) => {
        const $item = $(el);
        const title = $item.find("title").first().text().trim();
        const url = $item.find("link").first().text().trim();
        const description = $item.find("description").first().text().trim();
        const pubDate = $item.find("pubDate").first().text().trim();
        const publishedAt = new Date(pubDate);

        if (!title || !url || Number.isNaN(publishedAt.getTime())) return;
        if (publishedAt.getTime() < cutoff) return;

        articles.push(new Article(title, url, publishedAt, this.name, description));
      });

      return articles;
    } catch (err) {
      console.error(`[${this.name}] fetch failed:`, err);
      return [];
    }
  }
}
