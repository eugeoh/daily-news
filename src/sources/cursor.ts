import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const BLOG_URL = "https://cursor.com/blog";
const LOOKBACK_DAYS = 7;

export class CursorSource extends NewsSource {
  readonly name = "Cursor";

  async fetch(): Promise<Article[]> {
    try {
      const html = await fetchHtml(BLOG_URL);
      const $ = cheerio.load(html);
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const byUrl = new Map<string, Article>();

      $("a.blog-directory__row").each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href");
        if (!href) return;

        const dateAttr = $a.find("time").first().attr("datetime");
        const title = $a.find("p").first().text().trim();
        if (!dateAttr || !title) return;

        const publishedAt = new Date(dateAttr);
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
