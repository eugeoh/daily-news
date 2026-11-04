import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const BLOG_URL = "https://mintlify.com/blog";
const LOOKBACK_DAYS = 7;

export class MintlifySource extends NewsSource {
  readonly name = "Mintlify";

  async fetch(): Promise<Article[]> {
    try {
      const html = await fetchHtml(BLOG_URL);
      const $ = cheerio.load(html);
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const byUrl = new Map<string, Article>();

      // Structure: div.group > div > div > h2 > a[href="/blog/slug"]
      // Date is in a sibling span within the same group container.
      $('a[href^="/blog/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href");
        if (!href || href === "/blog" || href === "/blog/") return;

        const title = $a.text().trim();
        if (!title || title.length < 5) return;

        // Walk up to the group container to find the date
        const $group = $a.closest('[class*="group"]');
        const context = $group.length ? $group.text() : $a.parent().parent().text();
        const dateMatch = context.match(
          /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/,
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
