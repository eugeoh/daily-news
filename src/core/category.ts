/**
 * Digest sections. Order here is the order sections render in.
 * "Frontier Model & Research" exists because most frontier-lab news (model
 * releases, capability/safety research) doesn't fit the other four —
 * "Enterprise" is deliberately scoped tight to partnerships/funding/policy/
 * industry-shift stories, not a catch-all.
 */
export const CATEGORIES = [
  "Frontier Model & Research",
  "Software Engineering",
  "Hardware",
  "World Models",
  "Enterprise",
] as const;

export type Category = (typeof CATEGORIES)[number];

export function isCategory(value: unknown): value is Category {
  return typeof value === "string" && (CATEGORIES as readonly string[]).includes(value);
}
