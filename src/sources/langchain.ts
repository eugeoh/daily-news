import type { Article } from "../core/Article.js";
import { NewsSource } from "../core/NewsSource.js";
import { fetchRssArticles } from "../core/rss.js";

const RSS_URL = "https://www.langchain.com/blog/rss.xml";

export class LangChainSource extends NewsSource {
  readonly name = "LangChain";

  fetch(): Promise<Article[]> {
    return fetchRssArticles(RSS_URL, this.name);
  }
}
