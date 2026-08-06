import { Resend } from "resend";

const FROM_NAME = "Euji Daily AI Digest";

/** Minimal, dependency-free markdown→HTML for our own predictable digest
 * shape (#, ###, [text](url) links, italic source lines, --- separators).
 * Not a general markdown renderer — just enough for what `publish` emits. */
function digestMarkdownToHtml(markdown: string): string {
  const escaped = markdown
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const withLinks = escaped.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  const lines = withLinks.split("\n").map((line) => {
    if (line.startsWith("### ")) return `<h3>${line.slice(4)}</h3>`;
    if (line.startsWith("## ")) return `<h2>${line.slice(3)}</h2>`;
    if (line.startsWith("# ")) return `<h1>${line.slice(2)}</h1>`;
    if (line === "---") return "<hr/>";
    if (line.startsWith("_") && line.endsWith("_")) return `<p><em>${line.slice(1, -1)}</em></p>`;
    if (line.trim() === "") return "";
    return `<p>${line}</p>`;
  });

  return `<div style="font-family: -apple-system, sans-serif; max-width: 640px; line-height: 1.5;">${lines.join("\n")}</div>`;
}

/** Emails the day's digest. `DIGEST_TO_EMAIL` is read from the environment
 * only — never hardcode a recipient address in source, since this repo is
 * public. Accepts one or more comma-separated addresses. */
export async function notify(markdown: string, articleCount: number, dateStr: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.DIGEST_FROM_EMAIL || "onboarding@resend.dev";
  const from = `${FROM_NAME} <${fromEmail}>`;
  const to = (process.env.DIGEST_TO_EMAIL || "")
    .split(",")
    .map((address) => address.trim())
    .filter(Boolean);

  if (!apiKey) throw new Error("RESEND_API_KEY is not set");
  if (to.length === 0) throw new Error("DIGEST_TO_EMAIL is not set");

  const resend = new Resend(apiKey);
  const subject =
    articleCount > 0
      ? `Daily AI Lab Digest — ${dateStr} (${articleCount} update${articleCount === 1 ? "" : "s"})`
      : `Daily AI Lab Digest — ${dateStr} (no updates)`;

  const { error } = await resend.emails.send({
    from,
    to,
    subject,
    html: digestMarkdownToHtml(markdown),
    text: markdown,
  });

  if (error) {
    throw new Error(`Resend send failed: ${JSON.stringify(error)}`);
  }
}
