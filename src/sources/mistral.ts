import type { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchRssArticles } from "../core/rss.js";

const RSS_URL = "https://mistral.ai/news/rss";

export class MistralSource extends NewsSource {
  readonly name = "Mistral AI";

  fetch(): Promise<Article[]> {
    return fetchRssArticles(RSS_URL, this.name);
  }
}
