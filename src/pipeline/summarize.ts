import { GoogleGenAI } from "@google/genai";
import * as cheerio from "cheerio";
import type { Article } from "../core/Article.js";
import { CATEGORIES, isCategory } from "../core/category.js";
import { fetchHtml } from "../core/http.js";

// Cheap/free-tier-friendly model — this is a low-stakes, low-volume job
// (a handful of short summaries once a day), so the lite tier is plenty.
// Pinned model IDs get retired over time (gemini-2.5-flash-lite already has
// been) — the "-latest" alias tracks whatever the current lite model is.
const MODEL = "gemini-flash-lite-latest";
const MAX_ARTICLE_CHARS = 6000;

const ARTICLE_RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    summary: { type: "string" },
    category: { type: "string", enum: [...CATEGORIES] },
  },
  required: ["summary", "category"],
} as const;

const MAX_RATE_LIMIT_RETRIES = 6;
const DEFAULT_RETRY_DELAY_MS = 20_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** With 17+ sources, a first run or a busy news day can easily exceed the
 * Gemini free tier's 15-requests-per-minute cap. Rather than tune our own
 * conservative throttle, react to the real 429 and back off for however
 * long Gemini's error actually says to wait. */
async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI["models"]["generateContent"]>[0],
): Promise<Awaited<ReturnType<GoogleGenAI["models"]["generateContent"]>>> {
  for (let attempt = 1; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isRateLimit = /429|RESOURCE_EXHAUSTED/.test(message);
      if (!isRateLimit || attempt === MAX_RATE_LIMIT_RETRIES) throw err;

      const match = message.match(/"retryDelay":"(\d+)s"/);
      const waitMs = match ? (Number(match[1]) + 1) * 1000 : DEFAULT_RETRY_DELAY_MS;
      console.warn(
        `[summarize] rate limited, waiting ${Math.round(waitMs / 1000)}s (attempt ${attempt}/${MAX_RATE_LIMIT_RETRIES})...`,
      );
      await sleep(waitMs);
    }
  }
  throw new Error("unreachable");
}

/** Best-effort fetch of an article's readable body text, for summarization
 * input. Only called for articles that survived dedupe (i.e. rarely). */
async function fetchArticleText(url: string): Promise<string> {
  try {
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);
    $("script, style, nav, header, footer").remove();
    const root = $("main").first().length ? $("main").first() : $("body");
    // cheerio's .text() concatenates every element's contents with no
    // separator, so adjacent tags mash together ("AnnouncementsTitle...").
    // Inserting a space after each element keeps words apart.
    root.find("*").after(" ");
    return root.text().replace(/\s+/g, " ").trim().slice(0, MAX_ARTICLE_CHARS);
  } catch (err) {
    console.error(`[summarize] failed to fetch article text for ${url}:`, err);
    return "";
  }
}

/** Fills in `article.summary` and `article.category` for each article, in
 * place, via Gemini. Falls back to the "Frontier Model & Research" bucket
 * if Gemini returns something outside the fixed category list. */
export async function summarize(articles: Article[]): Promise<void> {
  if (articles.length === 0) return;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });

  for (const article of articles) {
    if (!article.rawContent) {
      article.rawContent = await fetchArticleText(article.url);
    }

    const prompt = [
      "You summarize AI industry news for a general, non-technical reader who doesn't follow the AI industry closely.",
      "Write exactly two short sentences for `summary`:",
      "1. What happened, in plain language — no jargon, no marketing tone.",
      "2. Why it's relevant or important — explained simply, as if to a smart friend outside the industry. Don't just restate sentence 1; say what it actually means for users, the company, or the field.",
      "No preamble, no headers, just the two sentences.",
      "",
      `Also classify the article into exactly one \`category\` from: ${CATEGORIES.join(", ")}.`,
      '- "Frontier Model & Research": new model releases, capability or safety research/benchmarks.',
      '- "Software Engineering": developer tools, frameworks, coding agents, infrastructure/runtime releases.',
      '- "Hardware": chips, GPUs, physical infrastructure.',
      '- "World Models": spatial/video/3D world models specifically (not general LLM releases).',
      '- "Enterprise": partnerships, funding, policy, personnel moves, market/industry shifts.',
      "If more than one could apply, pick the single best fit.",
      "",
      `Title: ${article.title}`,
      `Source: ${article.sourceName}`,
      "Article text:",
      article.rawContent || "(not available — summarize from the title alone, briefly noting detail is limited)",
    ].join("\n\n");

    try {
      const response = await generateWithRetry(ai, {
        model: MODEL,
        contents: prompt,
        config: { responseMimeType: "application/json", responseSchema: ARTICLE_RESPONSE_SCHEMA },
      });
      const parsed = JSON.parse(response.text ?? "{}") as { summary?: string; category?: string };
      article.summary = parsed.summary?.trim() || null;
      article.category = isCategory(parsed.category) ? parsed.category : "Frontier Model & Research";
    } catch (err) {
      console.error(`[summarize] failed for "${article.title}":`, err);
      article.summary = null;
      article.category = "Frontier Model & Research";
    }
  }
}

/** Generates a short cross-cutting overview of the day's digest, written
 * after every article has its own summary + category. Returns `null` if
 * generation fails — the digest still works fine without it. */
export async function generateOverallSummary(articles: Article[]): Promise<string | null> {
  if (articles.length === 0) return null;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set");
  const ai = new GoogleGenAI({ apiKey });

  const bulletList = articles
    .map((a) => `- [${a.category ?? "Uncategorized"}] ${a.title} (${a.sourceName}): ${a.summary ?? "(no summary)"}`)
    .join("\n");

  const prompt = [
    "You write the opening paragraph of a daily AI industry digest for a general reader.",
    "Voice: like a sharp, well-connected friend in San Francisco giving you the download over coffee — energetic and in-the-know, but still plain English, no hype-speak, no jargon.",
    "Write 2-4 sentences that call out the day's biggest theme(s) across the stories below. Don't just list every headline — synthesize.",
    "No preamble like \"Here's your summary\" — start directly with the content.",
    "",
    "Today's stories:",
    bulletList,
  ].join("\n\n");

  try {
    const response = await generateWithRetry(ai, { model: MODEL, contents: prompt });
    return response.text?.trim() || null;
  } catch (err) {
    console.error("[summarize] failed to generate overall summary:", err);
    return null;
  }
}
