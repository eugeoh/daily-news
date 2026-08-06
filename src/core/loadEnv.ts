import { readFile } from "node:fs/promises";

/**
 * Loads `.env` into `process.env` if the file exists, without adding a
 * `dotenv` dependency. In GitHub Actions there's no `.env` file — real
 * secrets are already in `process.env` — so this is a silent no-op there.
 * Existing environment variables always win over the file.
 */
export async function loadDotEnvIfPresent(path = ".env"): Promise<void> {
  let raw: string;
  try {
    raw = await readFile(path, "utf-8");
  } catch {
    return;
  }

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    if (!(key in process.env)) process.env[key] = value;
  }
}
