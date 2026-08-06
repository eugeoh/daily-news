/**
 * Shared fetch helper for scraping sources. Sends a realistic browser
 * User-Agent since several lab sites block/limit bare `fetch` requests.
 */
export async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml",
    },
  });
  if (!res.ok) {
    throw new Error(`fetchHtml: ${url} responded ${res.status} ${res.statusText}`);
  }
  return res.text();
}
