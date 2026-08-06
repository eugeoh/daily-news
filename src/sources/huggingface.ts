import type { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchRssArticles } from "../core/rss.js";

const RSS_URL = "https://huggingface.co/blog/feed.xml";

export class HuggingFaceSource extends NewsSource {
  readonly name = "Hugging Face";

  fetch(): Promise<Article[]> {
    return fetchRssArticles(RSS_URL, this.name);
  }
}
