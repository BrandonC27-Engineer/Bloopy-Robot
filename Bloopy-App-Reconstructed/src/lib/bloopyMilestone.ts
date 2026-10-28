"use client";

/**
 * Bloopy milestone gate — a tiny, *purely decorative* "first time today" check.
 *
 * Rare celebrations (see `celebrate("milestone")`) should only fire for genuinely
 * bigger moments — the first check-in of the day, the first journal entry, etc.
 * This helper answers "is this the first time today for <key>?" using a single
 * localStorage date stamp per key.
 *
 * It is intentionally NOT part of any data/mood/journal/streak logic: it never
 * touches Supabase, never affects what gets saved, and carries no streak count
 * or pressure. It exists only to keep the sparkle rare so it stays special and
 * never becomes guilt-based. If storage is unavailable it simply returns false
 * (no celebration), which is the safe, calm default.
 */

const PREFIX = "bloopy.milestone.";

/** Local YYYY-MM-DD for "today" (local time, so the day flips at midnight here). */
function today(): string {
  const d = new Date();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Returns true at most once per local day for the given `key`, recording today
 * as "seen" as a side effect. Use it to gate a rare celebration:
 *
 *   celebrate(isFirstMilestoneToday("mood") ? "milestone" : "success", { text });
 */
export function isFirstMilestoneToday(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const storageKey = PREFIX + key;
    if (window.localStorage.getItem(storageKey) === today()) return false;
    window.localStorage.setItem(storageKey, today());
    return true;
  } catch {
    // private mode / storage blocked → no celebration (calm default)
    return false;
  }
}
