import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const BLOG_URL = "https://www.worldlabs.ai/blog";
const LOOKBACK_DAYS = 7;
const DATE_PATTERN = /[A-Za-z]+ \d{1,2}, \d{4}/;

export class WorldLabsSource extends NewsSource {
  readonly name = "World Labs";

  async fetch(): Promise<Article[]> {
    try {
      const html = await fetchHtml(BLOG_URL);
      const $ = cheerio.load(html);
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const byUrl = new Map<string, Article>();

      $('a[href^="/blog/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href");
        if (!href) return;

        const title = $a.find("h2").first().text().trim();
        if (!title) return;

        // Each card's date sits in a <p> alongside a "World Labs team"
        // byline span — pull just the date substring out rather than
        // depending on DOM child order.
        const dateMatch = $a.find("p").first().text().match(DATE_PATTERN);
        if (!dateMatch) return;
        const publishedAt = new Date(dateMatch[0]);
        if (Number.isNaN(publishedAt.getTime())) return;
        if (publishedAt.getTime() < cutoff) return;

        const url = new URL(href, BLOG_URL).toString();
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
