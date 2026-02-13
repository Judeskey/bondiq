// lib/dayKey.ts

/**
 * Returns a Date representing UTC midnight of the couple's LOCAL calendar day.
 * Example: if timezone is America/Toronto and local date is 2026-02-04,
 * this returns 2026-02-04T00:00:00.000Z (day key).
 *
 * This makes day grouping stable across DST and servers.
 */
export function dayKeyFromDate(date: Date, timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const y = Number(parts.find((p) => p.type === "year")?.value);
  const m = Number(parts.find((p) => p.type === "month")?.value);
  const d = Number(parts.find((p) => p.type === "day")?.value);

  // Use UTC midnight for that local calendar date
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

export function addDays(dayKeyUtcMidnight: Date, days: number): Date {
  return new Date(dayKeyUtcMidnight.getTime() + days * 24 * 60 * 60 * 1000);
}
