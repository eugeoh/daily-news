# Eug's Daily Digest

Market intelligence for Mintlify — a daily, plain-English digest of what's
happening across documentation platforms, AI agents, and developer tools.
Fetched by a GitHub Actions cron job, summarized and categorized by Gemini,
and emailed to you. If there are no new articles, no email is sent.

## How it works

```
sources (fetch)  →  dedupe  →  summarize + categorize (Gemini)  →  publish (digests/*.md)  →  notify (email)
```

Each stage is one file in `src/pipeline/`, run in order by `src/run.ts`. A
GitHub Actions workflow (`.github/workflows/daily-digest.yml`) runs this
once a day, then commits the new digest and updated dedupe cache back to
the repo.

### Sources

Every source is a small class extending `NewsSource`
(`src/core/NewsSource.ts`) that implements one method — `fetch(): Promise<Article[]>`.
They're registered in `src/sources/index.ts`.

| Source | Method | Why |
|---|---|---|
| Mintlify | scrape | Own product — track launches, positioning |
| ReadMe | scrape | Direct competitor |
| GitBook | scrape | Direct competitor |
| Anthropic | scrape (`/news` listing) | MCP creator, biggest Mintlify customer |
| OpenAI | RSS | Agent ecosystem, ChatGPT/Codex |
| LangChain | RSS | Agent frameworks, RAG tooling |
| Hugging Face | RSS | Open AI ecosystem, model releases |
| Cursor | scrape | AI coding, heavy docs consumer |
| Vercel | RSS (filtered to `/blog/`) | Developer platform ecosystem |
| GitHub Blog | RSS (AI & ML category) | Developer tools, Copilot |
| Replit | scrape | Mintlify customer, AI coding platform |

### Categories

Gemini classifies every article into one of four sections
(`src/core/category.ts`), in this order:

1. **Documentation & Knowledge** — docs platforms, knowledge bases, content tooling
2. **AI Agents & Protocols** — MCP, agents, LLMs, agent frameworks
3. **Developer Tools & Infrastructure** — coding tools, platforms, frameworks, runtimes
4. **Market & Strategy** — funding, partnerships, product launches, industry shifts

An opening paragraph (also Gemini-generated) synthesizes the day's biggest
theme(s) through the lens of Mintlify's market position.

## Setup

```bash
npm install
cp .env.example .env   # fill in real values locally — never commit this file
npm run digest          # runs the full pipeline once, end-to-end
```

### Required environment variables

| Variable | Purpose |
|---|---|
| `GEMINI_API_KEY` | Summarization + categorization. Free tier at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). |
| `RESEND_API_KEY` | Email delivery. Free tier at [resend.com/api-keys](https://resend.com/api-keys). |
| `DIGEST_TO_EMAIL` | Recipient(s) — one address, or several comma-separated. |
| `DIGEST_FROM_EMAIL` | Sender address. Until you verify a domain at [resend.com/domains](https://resend.com/domains), Resend's sandbox only delivers to your own Resend signup address. Once a domain is verified, any local part on it works (e.g. `digest@yourdomain.com`) — it doesn't need a real inbox, it's just a sender identity. |

In production these live **only** as GitHub Actions repo secrets (Settings
→ Secrets and variables → Actions) — see `CLAUDE.md` for why (this repo is
public).

## Running the daily job

`.github/workflows/daily-digest.yml` runs on a cron (21:00 UTC) and
supports manual runs via `workflow_dispatch`. It needs the four secrets
above set on the repo before it can send anything. Each successful run
commits that day's `digests/YYYY-MM-DD.md` and the updated
`data/seen.json` (dedupe cache) back to `main`.

## Adding a new source

1. Create `src/sources/<name>.ts` with a class extending `NewsSource`.
   - Prefer RSS/Atom if the site has one — use `fetchRssArticles()` from
     `src/core/rss.ts`, it's a few lines (see `src/sources/langchain.ts`).
   - Otherwise scrape with `cheerio` via `fetchHtml()` from `src/core/http.ts`
     (see `src/sources/anthropic.ts` or `src/sources/mintlify.ts`).
   - Bound the very first run with a `LOOKBACK_DAYS` cutoff (7 is the
     convention here) so an empty dedupe cache doesn't try to summarize
     years of back-catalog.
2. Add one line to `src/sources/index.ts`.
3. That's it — dedupe, summarization, categorization, and email all pick
   it up automatically.

## Local testing tips

- `npx tsc --noEmit` typechecks without running anything.
- To force a fresh run (bypass dedupe), reset `data/seen.json` to `[]`.
- Gemini's free tier caps at 15 requests/minute — a big backfill (first run,
  or many sources posting the same day) can hit that. `summarize()` already
  retries with backoff on 429s, so it just takes longer, not fails.
