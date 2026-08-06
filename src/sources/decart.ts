import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const BLOG_URL = "https://decart.ai/blog";
const LOOKBACK_DAYS = 7;

export class DecartSource extends NewsSource {
  readonly name = "Decart";

  async fetch(): Promise<Article[]> {
    try {
      const html = await fetchHtml(BLOG_URL);
      const $ = cheerio.load(html);
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const articles: Article[] = [];

      $(".publication_card").each((_, el) => {
        const $card = $(el);
        const href = $card.find('a[href^="/publications/"]').first().attr("href");
        const title = $card.find(".publications_details > div").eq(1).text().trim();
        const dateText = $card.find(".blog_date").first().text().trim();
        if (!href || !title || !dateText) return;

        const publishedAt = new Date(dateText);
        if (Number.isNaN(publishedAt.getTime())) return;
        if (publishedAt.getTime() < cutoff) return;

        const url = new URL(href, BLOG_URL).toString();
        articles.push(new Article(title, url, publishedAt, this.name));
      });

      return articles;
    } catch (err) {
      console.error(`[${this.name}] fetch failed:`, err);
      return [];
    }
  }
}
