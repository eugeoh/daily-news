import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Article } from "../core/Article.js";

const SEEN_PATH = path.join(process.cwd(), "data", "seen.json");

async function loadSeen(): Promise<Set<string>> {
  try {
    const raw = await readFile(SEEN_PATH, "utf-8");
    return new Set(JSON.parse(raw) as string[]);
  } catch {
    return new Set();
  }
}

/** Filters out articles already included in a past digest. Returns the
 * loaded `seen` set too, so `markSeen` can update it without re-reading. */
export async function dedupe(
  articles: Article[],
): Promise<{ fresh: Article[]; seen: Set<string> }> {
  const seen = await loadSeen();
  const fresh = articles.filter((article) => !seen.has(article.id));
  return { fresh, seen };
}

/** Persists newly-digested article ids so tomorrow's run skips them. */
export async function markSeen(seen: Set<string>, newlyDigested: Article[]): Promise<void> {
  for (const article of newlyDigested) seen.add(article.id);
  await mkdir(path.dirname(SEEN_PATH), { recursive: true });
  await writeFile(SEEN_PATH, `${JSON.stringify([...seen].sort(), null, 2)}\n`, "utf-8");
}
