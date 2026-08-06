import type { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchRssArticles } from "../core/rss.js";

// The AI & ML category feed, not the firehose of every GitHub product
// update — keeps this on-thesis for an AI digest.
const RSS_URL = "https://github.blog/ai-and-ml/feed/";

export class GitHubBlogSource extends NewsSource {
  readonly name = "GitHub Blog";

  fetch(): Promise<Article[]> {
    return fetchRssArticles(RSS_URL, this.name, { cleanDescription: true });
  }
}
