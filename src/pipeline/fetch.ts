import type { Article } from "../core/Article.js";
import { sources } from "../sources/index.js";

/** Runs every registered source and flattens the results. A source that
 * throws is already caught inside its own `fetch()` (fail-soft contract on
 * `NewsSource`), so one broken lab never blocks the others. */
export async function fetchAll(): Promise<Article[]> {
  const results = await Promise.all(sources.map((source) => source.fetch()));
  return results.flat();
}
