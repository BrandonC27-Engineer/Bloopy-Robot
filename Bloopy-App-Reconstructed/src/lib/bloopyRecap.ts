/**
 * End-of-Day Recap — local, MVP, localStorage-only.
 *
 * A gentle nightly wrap-up where Bloopy helps the user reflect: how the day
 * felt, one small win, what was hard, and a note to carry into tomorrow. It
 * ties the day's threads (Mood, Journal, Tasks, Check-In, Memory) together
 * with a warm summary.
 *
 * NO backend, NO database, NO API calls. All reads/writes are wrapped so the
 * app keeps working if localStorage is unavailable. Nothing sensitive stored.
 * Uses the same UTC day-key as Daily Check-In so "today" always agrees.
 */

export type RecapFeeling =
  | "Peaceful"
  | "Productive"
  | "Hard"
  | "Tiring"
  | "Mixed"
  | "Better than expected";

export type Recap = {
  feeling: RecapFeeling | null;
  win: string;
  hardThing: string;
  tomorrowNote: string;
};

export type RecapContext = {
  /** True when today's recap is already completed. */
  doneToday: boolean;
  feeling: RecapFeeling | null;
};

/** Selectable "how did today feel" options, with a soft sub-note each. */
export const RECAP_FEELINGS: { value: RecapFeeling; emoji: string; note: string }[] = [
  { value: "Peaceful", emoji: "🌙", note: "Calm and settled" },
  { value: "Productive", emoji: "✨", note: "Got things moving" },
  { value: "Hard", emoji: "🌧️", note: "It took a lot" },
  { value: "Tiring", emoji: "😴", note: "Low on energy" },
  { value: "Mixed", emoji: "🌗", note: "A bit of everything" },
  { value: "Better than expected", emoji: "🌟", note: "Pleasantly surprised" },
];

/* ---------- localStorage keys (as specified) ---------- */

export const RECAP_DATE_KEY = "bloopy.recap.date";
export const RECAP_COMPLETED_KEY = "bloopy.recap.completedToday";
export const RECAP_FEELING_KEY = "bloopy.recap.todayFeeling";
export const RECAP_WIN_KEY = "bloopy.recap.todayWin";
export const RECAP_HARD_KEY = "bloopy.recap.todayHardThing";
export const RECAP_TOMORROW_KEY = "bloopy.recap.tomorrowNote";

/** Every recap key this app writes — the exact set cleared by `clearRecap`. */
export const RECAP_KEYS = [
  RECAP_DATE_KEY,
  RECAP_COMPLETED_KEY,
  RECAP_FEELING_KEY,
  RECAP_WIN_KEY,
  RECAP_HARD_KEY,
  RECAP_TOMORROW_KEY,
] as const;

/* ---------- day key (UTC, matches Daily Check-In) ---------- */

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
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
    // localStorage unavailable — recap just won't persist
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // localStorage unavailable — nothing to clear
  }
}

function isRecapFeeling(value: string | null): value is RecapFeeling {
  return RECAP_FEELINGS.some((f) => f.value === value);
}

/* ---------- read ---------- */

/** True when the recap has been completed for the current day. */
export function isRecapDoneToday(): boolean {
  return safeGet(RECAP_COMPLETED_KEY) === "true" && safeGet(RECAP_DATE_KEY) === todayKey();
}

/** The saved recap fields (whatever is currently stored). */
export function getRecap(): Recap {
  const feeling = safeGet(RECAP_FEELING_KEY);
  return {
    feeling: isRecapFeeling(feeling) ? feeling : null,
    win: (safeGet(RECAP_WIN_KEY) ?? "").trim(),
    hardThing: (safeGet(RECAP_HARD_KEY) ?? "").trim(),
    tomorrowNote: (safeGet(RECAP_TOMORROW_KEY) ?? "").trim(),
  };
}

/** Lightweight context for Home / Presence. */
export function getRecapContext(): RecapContext {
  const done = isRecapDoneToday();
  const saved = getRecap();
  return { doneToday: done, feeling: done ? saved.feeling : null };
}

/* ---------- write ---------- */

/** Persists the recap answers and marks today's recap complete. */
export function saveRecap(recap: Recap): void {
  if (recap.feeling) safeSet(RECAP_FEELING_KEY, recap.feeling);
  safeSet(RECAP_WIN_KEY, recap.win.trim());
  safeSet(RECAP_HARD_KEY, recap.hardThing.trim());
  safeSet(RECAP_TOMORROW_KEY, recap.tomorrowNote.trim());
  safeSet(RECAP_DATE_KEY, todayKey());
  safeSet(RECAP_COMPLETED_KEY, "true");
}

/**
 * Removes ONLY the recap keys (see `RECAP_KEYS`). Does not touch profile,
 * check-in, streak, or Supabase memory notes.
 */
export function clearRecap(): void {
  RECAP_KEYS.forEach(safeRemove);
}
