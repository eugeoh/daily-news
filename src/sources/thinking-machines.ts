import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const BASE_URL = "https://thinkingmachines.ai";
// Thinking Machines splits posts across a research blog and a product/news
// section; both use the same listing markup, so we scrape both.
const LISTING_PATHS = ["/blog/", "/news/"];
const LOOKBACK_DAYS = 7;

export class ThinkingMachinesSource extends NewsSource {
  readonly name = "Thinking Machines";

  async fetch(): Promise<Article[]> {
    const results = await Promise.all(LISTING_PATHS.map((path) => this.fetchListing(path)));
    return results.flat();
  }

  private async fetchListing(path: string): Promise<Article[]> {
    try {
      const html = await fetchHtml(`${BASE_URL}${path}`);
      const $ = cheerio.load(html);
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const articles: Article[] = [];

      $("a.post-item-link").each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href");
        if (!href) return;

        const title = $a.find(".post-title").first().text().trim();
        const dateText = $a.find("time").first().text().trim();
        const publishedAt = new Date(dateText);
        if (!title || Number.isNaN(publishedAt.getTime())) return;
        if (publishedAt.getTime() < cutoff) return;

        const url = new URL(href, BASE_URL).toString();
        articles.push(new Article(title, url, publishedAt, this.name));
      });

      return articles;
    } catch (err) {
      console.error(`[${this.name}] fetch failed for ${path}:`, err);
      return [];
    }
  }
}
