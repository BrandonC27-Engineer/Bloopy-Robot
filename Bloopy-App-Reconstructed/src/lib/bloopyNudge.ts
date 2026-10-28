/**
 * Bloopy daily nudge gating — at most one gentle nudge per type per day.
 *
 * Three task-oriented nudges can gently surface through the Bloopy Presence
 * bubble: "set me up" (onboarding incomplete), "tiny check-in" (no check-in
 * today), and "wrap up the day" (evening + no recap). To stay respectful and
 * non-spammy, each type is allowed at most once per local calendar day.
 *
 * Only a small, non-sensitive date string per type is stored in localStorage:
 *   bloopy.nudge.setup.date
 *   bloopy.nudge.checkIn.date
 *   bloopy.nudge.recap.date
 *   bloopy.nudge.unstuck.date
 *
 * NO API calls, NO sensitive data. All access is wrapped so the app keeps
 * working if localStorage is unavailable.
 */

export type NudgeKind = "setup" | "checkIn" | "recap" | "unstuck" | "weather";

const NUDGE_DATE_KEYS: Record<NudgeKind, string> = {
  setup: "bloopy.nudge.setup.date",
  checkIn: "bloopy.nudge.checkIn.date",
  recap: "bloopy.nudge.recap.date",
  unstuck: "bloopy.nudge.unstuck.date",
  weather: "bloopy.nudge.weather.date",
};

/* ---------- safe localStorage ---------- */

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable — nudge gating just won't persist
  }
}

/** Local (not UTC) calendar day key, e.g. "2026-06-13". */
function localDateKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Maps a proactive-message `type` to its daily nudge kind, if it is one. */
export function nudgeKindForType(type: string): NudgeKind | null {
  if (type === "setup") return "setup";
  if (type === "checkin") return "checkIn";
  if (type === "recap") return "recap";
  if (type === "unstuck") return "unstuck";
  return null;
}

/** True when this nudge kind has not yet been shown today. */
export function canShowNudgeToday(kind: NudgeKind): boolean {
  return safeGet(NUDGE_DATE_KEYS[kind]) !== localDateKey();
}

/** Records that this nudge kind was shown today (blocks repeats until tomorrow). */
export function markNudgeShownToday(kind: NudgeKind): void {
  safeSet(NUDGE_DATE_KEYS[kind], localDateKey());
}
