import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Article } from "../core/Article.js";
import { CATEGORIES } from "../core/category.js";
import { formatDate } from "../core/date.js";

const DIGESTS_DIR = path.join(process.cwd(), "digests");

/** Writes the day's digest to `digests/YYYY-MM-DD.md`, grouped into
 * sections by category (in `CATEGORIES` order; empty sections are
 * skipped), with `overallSummary` as the opening paragraph. Returns both
 * the file path and the markdown, so `notify` can reuse the same content. */
export async function publish(
  articles: Article[],
  overallSummary: string | null,
  date: Date = new Date(),
): Promise<{ path: string; markdown: string; dateStr: string }> {
  const dateStr = formatDate(date);

  const body = articles.length ? renderSections(articles) : "_No new updates from tracked labs today._\n";
  const intro = overallSummary ? `${overallSummary}\n\n` : "";
  const markdown = `# Daily AI Lab Digest — ${dateStr}\n\n${intro}${body}`;

  await mkdir(DIGESTS_DIR, { recursive: true });
  const filePath = path.join(DIGESTS_DIR, `${dateStr}.md`);
  await writeFile(filePath, markdown, "utf-8");

  return { path: filePath, markdown, dateStr };
}

function renderSections(articles: Article[]): string {
  const sections: string[] = [];

  for (const category of CATEGORIES) {
    const inCategory = articles.filter((a) => a.category === category);
    if (inCategory.length === 0) continue;
    const entries = inCategory.map((a) => a.toMarkdown()).join("\n---\n\n");
    sections.push(`## ${category}\n\n${entries}`);
  }

  // Anything Gemini failed to categorize (shouldn't normally happen —
  // summarize() defaults to "Frontier Model & Research" — but don't let a
  // bad category value silently drop an article from the digest).
  const uncategorized = articles.filter((a) => !CATEGORIES.includes(a.category as (typeof CATEGORIES)[number]));
  if (uncategorized.length > 0) {
    const entries = uncategorized.map((a) => a.toMarkdown()).join("\n---\n\n");
    sections.push(`## Other\n\n${entries}`);
  }

  return sections.join("\n\n");
}
