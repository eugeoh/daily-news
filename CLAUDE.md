# daily-news

A GitHub Actions-driven pipeline that fetches the latest news from ~17
frontier AI labs, world-model startups, dev-tool blogs, and hardware makers
(see README for the full list), summarizes and categorizes each article in
plain English via the Gemini API (chosen for its free tier — cheapest
option, no Anthropic API key involved), writes a dated digest to
`digests/`, and emails it via Resend.

## ⚠️ This repository is PUBLIC — never commit secrets

- `GEMINI_API_KEY`, `RESEND_API_KEY`, and `DIGEST_TO_EMAIL` (the recipient
  address(es) — comma-separated for more than one) must **only** ever live
  in GitHub Actions repo secrets (Settings → Secrets and variables →
  Actions), never in a committed file. Treat recipient emails as sensitive
  too — they must never appear hardcoded in `.env.example`, source, docs,
  or committed workflow output.
- `.env` is gitignored — use it for local runs only, and never `git add -f` it.
- Before every commit/push, mentally re-check the diff for anything that
  looks like a key, token, or credential. When in doubt, `git diff --staged`
  first.
- `.env.example` in this repo should only ever contain variable *names*, no
  real values.

## Architecture

- `src/core/Article.ts` — base class representing a single news item (title,
  url, date, source, summary, category).
- `src/core/NewsSource.ts` — abstract base class every source extends.
- `src/core/category.ts` — the fixed 5-category enum Gemini classifies into.
- `src/core/rss.ts` — shared RSS/Atom parser reused by most sources.
- `src/sources/*.ts` — one file per source, each a `NewsSource` subclass.
  Adding a source = new file + one line in `src/sources/index.ts`. Don't
  touch the pipeline to add a source. Two are stubs (xAI, Meta AI) —
  blocked at the network level, see README.
- `src/pipeline/*.ts` — fetch → dedupe → summarize (+ categorize, + overall
  summary) → publish → notify. Each stage does one job and is independently
  testable. `summarize.ts` retries with backoff on Gemini's free-tier 429s.
- `data/seen.json` — persisted dedupe cache, committed back by the workflow.
- `digests/` — dated markdown output, grouped by category, committed by the
  workflow.

## Running locally

```bash
npm install
cp .env.example .env   # fill in real keys locally, never commit this file
npx tsx src/run.ts
```
