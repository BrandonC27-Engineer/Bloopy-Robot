/**
 * Bloopy Greeting — pure, personalized time-of-day greeting for Home.
 *
 * Uses the onboarding display name (when set) so opening the app feels like
 * Bloopy noticing *you*, and rotates through a few warm variants per time of
 * day. The variant is picked deterministically from the calendar day — it
 * changes tomorrow, never mid-session, and there is no randomness to chase.
 * No storage, no React — trivial to test and reuse.
 */

const MORNING = ["Good morning", "Morning", "A fresh start"];
const AFTERNOON = ["Good afternoon", "Hello again", "Halfway there"];
const EVENING = ["Good evening", "Evening", "Winding down"];
const LATE = ["Resting well?", "Still up?"];

/** Stable per-day index so the greeting varies day to day, not tap to tap. */
function dayIndex(): number {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

/**
 * The greeting headline for Home, e.g. "Good morning, Sam".
 * `name` may be empty/undefined — then it's just the time-of-day line.
 */
export function getGreeting(hour: number, name?: string | null): string {
  const pool = hour < 5 ? LATE : hour < 12 ? MORNING : hour < 18 ? AFTERNOON : EVENING;
  const base = pool[dayIndex() % pool.length];
  const trimmed = (name ?? "").trim();
  if (!trimmed) return base;
  // Questions ("Resting well?") read oddly with a name bolted on — keep them as-is.
  return base.endsWith("?") ? base : `${base}, ${trimmed}`;
}
