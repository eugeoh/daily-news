import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const RSS_URL = "https://openai.com/news/rss.xml";
/** Same rationale as AnthropicSource: bound the very first run. */
const LOOKBACK_DAYS = 7;

/**
 * OpenAI's `/news` and individual article pages sit behind a Cloudflare JS
 * challenge (plain fetch gets a 403), but `/news/rss.xml` is served openly
 * and includes a short description per item — good enough to summarize
 * from directly, so we don't need to fetch the (blocked) article pages.
 */
export class OpenAISource extends NewsSource {
  readonly name = "OpenAI";

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
