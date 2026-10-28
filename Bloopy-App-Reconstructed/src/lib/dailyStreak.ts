/**
 * Daily Streak — local, check-in-driven streak tracking.
 *
 * A streak counts consecutive days the user completes a Daily Check-In.
 * Everything is derived from two localStorage keys and the calendar day,
 * using the same UTC day-key format the Daily Check-In itself uses
 * (`new Date().toISOString().slice(0, 10)`) so "today" always agrees.
 *
 * Rules:
 *  - Completing a check-in on a new day increments the streak.
 *  - Completing again the same day does NOT increment it.
 *  - Checked in yesterday + today → streak + 1.
 *  - Missed more than one day → streak resets to 1 on the next check-in.
 *  - Never checked in → streak 0.
 */

const COUNT_KEY = "bloopy.dailyStreak.count";
const LAST_KEY = "bloopy.dailyStreak.lastCompletedDate";

export type StreakInfo = {
  /** Effective current streak. 0 when broken or never started. */
  count: number;
  /** True when today's check-in is already recorded. */
  checkedInToday: boolean;
};

/* ---------- day keys (UTC, matches Daily Check-In) ---------- */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayKey(): string {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

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
    // localStorage unavailable — streak just won't persist
  }
}

function readCount(): number {
  const raw = Number(safeGet(COUNT_KEY) ?? 0);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0;
}

/* ---------- public API ---------- */

/**
 * The streak as it stands right now, without changing anything. Safe to call
 * on the client after mount. Returns 0 when the streak is broken (last
 * check-in was older than yesterday) or has never been started.
 */
export function getStreak(): StreakInfo {
  const last = safeGet(LAST_KEY);
  if (!last) return { count: 0, checkedInToday: false };

  if (last === todayKey()) {
    return { count: Math.max(readCount(), 1), checkedInToday: true };
  }
  if (last === yesterdayKey()) {
    // alive but today isn't done yet — checking in today keeps it going
    return { count: Math.max(readCount(), 1), checkedInToday: false };
  }
  // last completed more than a day ago — streak is broken
  return { count: 0, checkedInToday: false };
}

/**
 * Milestone days worth a small extra celebration. Purely decorative: nothing
 * unlocks, nothing is lost, and non-milestone days never mention them — so a
 * streak stays motivating without ever becoming pressure.
 */
const STREAK_MILESTONES: Record<number, string> = {
  3: "Three days together — a little rhythm is forming 🌱",
  7: "A whole week together 💙",
  14: "Two weeks of tiny steps ✨",
  21: "Three weeks of showing up 🌿",
  30: "A whole month together. Bloopy is so glad 🌙",
  50: "Fifty days of tiny steps ⭐",
  100: "One hundred days. Quietly amazing 🎉",
};

/**
 * A warm milestone line when `count` lands exactly on a milestone day,
 * otherwise null. Used by the check-in reward moment and the Home streak card.
 */
export function getStreakMilestone(count: number): string | null {
  return STREAK_MILESTONES[count] ?? null;
}

/**
 * Records that the user completed a Daily Check-In today and returns the
 * updated streak. Idempotent within the same day (no double counting).
 * Call this from the check-in completion flow.
 */
export function recordCheckIn(): StreakInfo {
  const today = todayKey();
  const last = safeGet(LAST_KEY);

  let count: number;
  if (last === today) {
    count = Math.max(readCount(), 1); // already counted today
  } else if (last === yesterdayKey()) {
    count = readCount() + 1; // consecutive day
  } else {
    count = 1; // first ever, or streak was broken
  }

  safeSet(COUNT_KEY, String(count));
  safeSet(LAST_KEY, today);
  return { count, checkedInToday: true };
}
