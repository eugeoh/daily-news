import type { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchRssArticles } from "../core/rss.js";

// Vercel's only feed mixes real blog posts with granular product-changelog
// entries (e.g. "Set your own project avatars") — filter to /blog/ URLs
// only, or every changelog tweak would flood the digest.
const RSS_URL = "https://vercel.com/atom";

export class VercelSource extends NewsSource {
  readonly name = "Vercel";

  fetch(): Promise<Article[]> {
    return fetchRssArticles(RSS_URL, this.name, {
      linkFilter: (url) => new URL(url).pathname.startsWith("/blog/"),
    });
  }
}
