import type { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchRssArticles } from "../core/rss.js";

// The generative-AI category feed rather than NVIDIA's entire blog (which
// also covers gaming, automotive, etc. — off-thesis for this digest).
const RSS_URL = "https://blogs.nvidia.com/blog/category/generative-ai/feed/";

export class NvidiaSource extends NewsSource {
  readonly name = "NVIDIA";

  fetch(): Promise<Article[]> {
    return fetchRssArticles(RSS_URL, this.name, { cleanDescription: true });
  }
}
