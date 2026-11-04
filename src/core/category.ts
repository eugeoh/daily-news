/**
 * Digest sections. Order here is the order sections render in.
 *
 * "Documentation & Knowledge" covers Mintlify's direct competitive landscape —
 * docs platforms, knowledge bases, content tooling.
 *
 * "AI Agents & Protocols" captures the macro trend driving Mintlify's strategy —
 * MCP, autonomous agents, LLM capabilities.
 *
 * "Developer Tools & Infrastructure" tracks the broader ecosystem Mintlify
 * operates in — coding tools, platforms, frameworks.
 *
 * "Market & Strategy" is for funding, partnerships, product launches, and
 * industry shifts that signal where the market is heading.
 */
export const CATEGORIES = [
  "Documentation & Knowledge",
  "AI Agents & Protocols",
  "Developer Tools & Infrastructure",
  "Market & Strategy",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
