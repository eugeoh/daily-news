import { loadDotEnvIfPresent } from "./core/loadEnv.js";
import { dedupe, markSeen } from "./pipeline/dedupe.js";
import { fetchAll } from "./pipeline/fetch.js";
import { notify } from "./pipeline/notify.js";
import { publish } from "./pipeline/publish.js";
import { generateOverallSummary, summarize } from "./pipeline/summarize.js";

async function main(): Promise<void> {
  await loadDotEnvIfPresent();

  console.log("Fetching sources...");
  const candidates = await fetchAll();
  console.log(`Fetched ${candidates.length} candidate article(s).`);

  const { fresh, seen } = await dedupe(candidates);
  console.log(`${fresh.length} new article(s) after dedupe.`);

  await summarize(fresh);
  const overallSummary = await generateOverallSummary(fresh);

  const { path, markdown, dateStr } = await publish(fresh, overallSummary);
  console.log(`Wrote digest to ${path}`);

  await notify(markdown, fresh.length, dateStr);
  console.log("Digest emailed.");

  await markSeen(seen, fresh);
  console.log("Updated data/seen.json.");
}

main().catch((err) => {
  console.error("daily-news run failed:", err);
  process.exitCode = 1;
});
