import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const BLOG_URL = "https://replit.com/blog";
const LOOKBACK_DAYS = 7;

export class ReplitSource extends NewsSource {
  readonly name = "Replit";

  async fetch(): Promise<Article[]> {
    try {
      const html = await fetchHtml(BLOG_URL);
      const $ = cheerio.load(html);
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const byUrl = new Map<string, Article>();

      $('a[href*="/blog/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href");
        if (!href || href === "/blog" || href === "/blog/" || href.endsWith("/blog/")) return;
        // Skip category/tag links
        if (href.includes("/blog/category/")) return;

        const title = $a.find("h3, h2").first().text().trim();
        if (!title) return;

        const context = $a.text();
        const dateMatch = context.match(
          /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2},?\s+\d{4}/,
        );
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
