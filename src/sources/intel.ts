import type { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchRssArticles } from "../core/rss.js";

const RSS_URL = "https://newsroom.intel.com/feed";

export class IntelSource extends NewsSource {
  readonly name = "Intel";

  fetch(): Promise<Article[]> {
    return fetchRssArticles(RSS_URL, this.name, { cleanDescription: true });
  }
}
