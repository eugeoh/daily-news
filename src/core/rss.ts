import * as cheerio from "cheerio";
import { Article } from "./Article.js";
import { fetchHtml } from "./http.js";

export interface RssOptions {
  lookbackDays?: number;
  /** Keep only entries whose URL passes this check — e.g. a combined feed
   * that mixes blog posts with unrelated changelog entries. */
  linkFilter?: (url: string) => boolean;
  /** Strip HTML tags and WordPress's "The post X appeared first on Y"
   * boilerplate out of the description before using it as summarizer input. */
  cleanDescription?: boolean;
}

/** Shared RSS/Atom parser for the many sources that just need title, link,
 * description, and a publish date. Handles both `<item>` (RSS) and
 * `<entry>` (Atom) shapes. Fails soft — a broken feed returns `[]`. */
export async function fetchRssArticles(
  feedUrl: string,
  sourceName: string,
  opts: RssOptions = {},
): Promise<Article[]> {
  const lookbackDays = opts.lookbackDays ?? 7;

  try {
    const xml = await fetchHtml(feedUrl);
    const $ = cheerio.load(xml, { xmlMode: true });
    const cutoff = Date.now() - lookbackDays * 24 * 60 * 60 * 1000;
    const articles: Article[] = [];

    $("item, entry").each((_, el) => {
      const $item = $(el);
      const title = $item.find("title").first().text().trim();

      let url = $item.find("link").first().text().trim();
      if (!url) url = $item.find("link").first().attr("href") ?? "";

      let description = $item.find("description").first().text().trim();
      if (!description) description = $item.find("summary, content").first().text().trim();

      const dateText = $item.find("pubDate, updated, published").first().text().trim();
      const publishedAt = new Date(dateText);

      if (!title || !url || Number.isNaN(publishedAt.getTime())) return;
      if (publishedAt.getTime() < cutoff) return;
      if (opts.linkFilter && !opts.linkFilter(url)) return;

      const rawContent = opts.cleanDescription ? cleanHtmlDescription(description) : description;
      articles.push(new Article(title, url, publishedAt, sourceName, rawContent));
    });

    return articles;
  } catch (err) {
    console.error(`[${sourceName}] RSS fetch failed for ${feedUrl}:`, err);
    return [];
  }
}

function cleanHtmlDescription(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&#8217;/g, "’")
    .replace(/&#8216;/g, "‘")
    .replace(/&#8220;/g, "“")
    .replace(/&#8221;/g, "”")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .replace(/The post .* appeared first on .*\.?\s*$/i, "")
    .trim();
}
