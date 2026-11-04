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

/** With 11 sources, a first run or a busy news day can easily exceed the
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
      const isRetryable = /429|503|RESOURCE_EXHAUSTED|UNAVAILABLE/.test(message);
      if (!isRetryable || attempt === MAX_RATE_LIMIT_RETRIES) throw err;

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
 * place, via Gemini. Falls back to "Market & Strategy" if Gemini returns
 * something outside the fixed category list. */
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
      "You summarize news for a product engineer at Mintlify (a documentation platform expanding into knowledge bases and AI agents).",
      "The reader cares about: documentation platforms, developer experience, AI agents consuming docs, knowledge management, MCP protocol, and competitive moves in this space.",
      "Write exactly two short sentences for `summary`:",
      "1. What happened, in plain language.",
      "2. Why it matters for the documentation/knowledge/agent ecosystem — what does this mean for how developers build, find, or consume knowledge? Be specific, not generic.",
      "No preamble, no headers, just the two sentences.",
      "",
      `Also classify the article into exactly one \`category\` from: ${CATEGORIES.join(", ")}.`,
      '- "Documentation & Knowledge": docs platforms, knowledge base tooling, content management systems, technical writing, developer portals, API documentation.',
      '- "AI Agents & Protocols": MCP protocol, autonomous agents, LLM capabilities/releases, agent frameworks, retrieval-augmented generation, AI-powered search.',
      '- "Developer Tools & Infrastructure": coding tools, IDEs, platforms, frameworks, runtimes, CI/CD, developer experience.',
      '- "Market & Strategy": funding rounds, partnerships, acquisitions, product launches, hiring signals, industry analysis, competitive moves.',
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
      article.category = isCategory(parsed.category) ? parsed.category : "Market & Strategy";
    } catch (err) {
      console.error(`[summarize] failed for "${article.title}":`, err);
      article.summary = null;
      article.category = "Market & Strategy";
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

  const leadershipPrompt = [
    "You are the VP of Product at Mintlify, writing a daily leadership briefing for the executive team.",
    "Mintlify is a documentation platform (22K+ customers including Anthropic, Coinbase, Replit) expanding into internal/external knowledge bases (Mintlify Base) and AI agent infrastructure (MCP servers, Autopilot). Agent traffic on the platform has surpassed human traffic.",
    "Your competitors are ReadMe and GitBook. The macro tailwind is that documentation is becoming the knowledge layer for AI agents — MCP protocol, llms.txt, and retrieval infrastructure are the battleground.",
    "",
    "Based on today's stories, write a SHORT leadership briefing with two sections:",
    "1. **What matters today** (2-3 sentences): The most important signal(s) from today's news. What should we be paying attention to? Be specific — name companies and moves. Think: what would you bring up in a 5-minute standup with the CEO?",
    "2. **Implications for us** (2-3 sentences): What does this mean for Mintlify's roadmap, positioning, or competitive strategy? Be direct and opinionated — \"we should\", \"this threatens\", \"this validates\", \"we need to watch\". Think like a leader making product bets, not a journalist reporting news.",
    "",
    "Keep it under 150 words total. No preamble. No hedging. Start directly with the content.",
    "",
    "Today's stories:",
    bulletList,
  ].join("\n\n");

  const digestPrompt = [
    "You write the opening paragraph of a daily market intelligence digest for a product engineer at Mintlify.",
    "Mintlify is a documentation platform expanding into internal/external knowledge bases and AI agents. The reader wants a pulse on the market — what competitors are doing, how AI agents are changing knowledge discovery, and where product/market fit opportunities are emerging.",
    "Voice: like a sharp, well-connected friend giving you the download over coffee — energetic and in-the-know, but plain English, no hype-speak.",
    "Write 2-4 sentences that call out the day's biggest theme(s) across the stories below. Focus on what matters for Mintlify's positioning. Don't just list every headline — synthesize.",
    "No preamble like \"Here's your summary\" — start directly with the content.",
    "",
    "Today's stories:",
    bulletList,
  ].join("\n\n");

  const [leadership, digest] = await Promise.all([
    generateWithRetry(ai, { model: MODEL, contents: leadershipPrompt })
      .then((r) => r.text?.trim() || null)
      .catch((err) => { console.error("[summarize] leadership briefing failed:", err); return null; }),
    generateWithRetry(ai, { model: MODEL, contents: digestPrompt })
      .then((r) => r.text?.trim() || null)
      .catch((err) => { console.error("[summarize] digest summary failed:", err); return null; }),
  ]);

  if (!leadership && !digest) return null;
  const parts: string[] = [];
  if (leadership) parts.push(`### Mintlify Leadership Briefing\n\n${leadership}`);
  if (digest) parts.push(digest);
  return parts.join("\n\n---\n\n");
}
