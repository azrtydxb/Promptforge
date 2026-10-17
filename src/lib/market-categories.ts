/** Canonical Prompt Market categories (shared by server actions and UI). */
export const MARKET_CATEGORIES = [
  "Writing",
  "Engineering",
  "Marketing",
  "Sales",
  "Support",
  "Data",
] as const;

export type MarketCategory = (typeof MARKET_CATEGORIES)[number];

/** Coerce an arbitrary category string to a known category. */
export function normalizeCategory(category?: string): string {
  return (
    MARKET_CATEGORIES.find(
      (c) => c.toLowerCase() === (category ?? "").trim().toLowerCase()
    ) ?? "Writing"
  );
}
