import * as cheerio from "cheerio";
import { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchHtml } from "../core/http.js";

const RESEARCH_URL = "https://runway.com/research";
const SITEMAP_URL = "https://runway.com/sitemap.xml";
const LOOKBACK_DAYS = 7;

/**
 * Runway's research listing has no visible publish dates, so we join it
 * against the sitemap's `<lastmod>` (keyed by URL) to get a date per post.
 */
export class RunwaySource extends NewsSource {
  readonly name = "Runway";

  async fetch(): Promise<Article[]> {
    try {
      const [listingHtml, sitemapXml] = await Promise.all([
        fetchHtml(RESEARCH_URL),
        fetchHtml(SITEMAP_URL),
      ]);

      const lastmodByUrl = this.parseSitemap(sitemapXml);
      const $ = cheerio.load(listingHtml);
      const cutoff = Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000;
      const byUrl = new Map<string, Article>();

      $('a[href^="/research/"]').each((_, el) => {
        const $a = $(el);
        const href = $a.attr("href");
        const title = $a.find("h4").first().text().trim();
        if (!href || !title) return;

        const url = new URL(href, RESEARCH_URL).toString();
        const publishedAt = lastmodByUrl.get(url);
        if (!publishedAt || publishedAt.getTime() < cutoff) return;

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

  private parseSitemap(xml: string): Map<string, Date> {
    const $ = cheerio.load(xml, { xmlMode: true });
    const map = new Map<string, Date>();
    $("url").each((_, el) => {
      const loc = $(el).find("loc").first().text().trim();
      const lastmod = $(el).find("lastmod").first().text().trim();
      const date = new Date(lastmod);
      if (loc && !Number.isNaN(date.getTime())) map.set(loc, date);
    });
    return map;
  }
}
