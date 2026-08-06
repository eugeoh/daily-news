# daily-news

A daily, plain-English digest of what the frontier AI labs (and the wider
AI-adjacent dev/hardware world) shipped — fetched by a GitHub Actions cron
job, summarized and categorized by Gemini, and emailed to you.

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

| Source | Method |
|---|---|
| Anthropic | scrape (`/news` listing) |
| OpenAI | RSS |
| Thinking Machines | scrape (`/blog` + `/news` listings) |
| Google DeepMind | RSS |
| Mistral AI | RSS |
| Hugging Face | RSS |
| World Labs | scrape |
| Runway | scrape (joined against sitemap for dates) |
| Decart | scrape |
| GitHub Blog | RSS (AI & ML category only) |
| Bun | RSS |
| Vercel | RSS (filtered to `/blog/`, excludes changelog noise) |
| Cursor | scrape |
| LangChain | RSS |
| NVIDIA | RSS (generative-AI category only) |
| Intel | RSS |
| xAI | **stub** — Cloudflare-gated, no RSS found |
| Meta AI | **stub** — rejects plain HTTP requests, no RSS found |

The two stubs return `[]` and log why; picking them back up would need a
headless-browser fetch, which is out of scope for this lightweight script.

### Categories

Gemini classifies every article into one of five sections
(`src/core/category.ts`), in this order:

1. **Frontier Model & Research** — new model releases, capability/safety research
2. **Software Engineering** — dev tools, frameworks, coding agents, runtimes
3. **Hardware** — chips, GPUs, physical infrastructure
4. **World Models** — spatial/video/3D world models specifically
5. **Enterprise** — partnerships, funding, policy, personnel, industry shifts

An opening paragraph (also Gemini-generated) synthesizes the day's biggest
theme(s) across every category before the sections themselves.

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

`.github/workflows/daily-digest.yml` runs on a cron (07:00 AEST /
08:00 AEDT — GitHub Actions cron is fixed UTC and doesn't shift for daylight
saving) and supports manual runs via `workflow_dispatch`. It needs the four
secrets above set on the repo before it can send anything. Each successful
run commits that day's `digests/YYYY-MM-DD.md` and the updated
`data/seen.json` (dedupe cache) back to `main`.

## Adding a new source

1. Create `src/sources/<name>.ts` with a class extending `NewsSource`.
   - Prefer RSS/Atom if the site has one — use `fetchRssArticles()` from
     `src/core/rss.ts`, it's a few lines (see `src/sources/mistral.ts`).
   - Otherwise scrape with `cheerio` via `fetchHtml()` from `src/core/http.ts`
     (see `src/sources/anthropic.ts` or `src/sources/decart.ts` for two
     different card-markup patterns).
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
