"use client";

/**
 * Bloopy Energy — a soft, local-only habit loop.
 *
 * Taking a tiny step (check-in, journal, task, mood, recap, unstuck) gives
 * Bloopy a little energy for the day. It's a *gentle* sense of momentum, never
 * pressure: there is no streak to lose, no countdown, no guilt. If you do
 * nothing, nothing bad happens — energy simply rests at 0 and tomorrow is a
 * fresh, calm start.
 *
 * Everything here is localStorage-only and self-contained:
 *   • NO backend, NO Supabase, NO API calls, nothing sensitive.
 *   • It never touches auth / check-in / journal / mood / task / recap logic —
 *     it only *reads its own* keys and reacts to actions those flows already
 *     complete.
 *   • All storage access is wrapped, so the app keeps working if localStorage
 *     is blocked (private mode): energy just won't persist.
 *
 * Keys (as specified):
 *   bloopy.energy.total            — cumulative all-time energy (number)
 *   bloopy.energy.today            — energy earned for the current day (number)
 *   bloopy.energy.lastUpdatedDate  — day-key of `today` (YYYY-MM-DD)
 *   bloopy.energy.history          — { "YYYY-MM-DD": number } (last ~14 days)
 *   bloopy.energy.daily.<action>   — day-key an action last counted (dedupe)
 */

export const ENERGY_TOTAL_KEY = "bloopy.energy.total";
export const ENERGY_TODAY_KEY = "bloopy.energy.today";
export const ENERGY_DATE_KEY = "bloopy.energy.lastUpdatedDate";
export const ENERGY_HISTORY_KEY = "bloopy.energy.history";
/** Per-action daily marker key (`+ action` → the day-key it last counted). */
const DAILY_PREFIX = "bloopy.energy.daily.";

/** Dispatched on `window` whenever energy increases, so Home updates live. */
export const BLOOPY_ENERGY_EVENT = "bloopy:energy-change";

/** The daily bar fills toward this (doing every tiny step reaches ~90–100). */
export const ENERGY_GOAL = 100;

/**
 * How much each meaningful action adds — once per day each (see {@link awardEnergy}).
 * The amounts are tuned so a full, gentle day sums to exactly the bar's goal.
 */
export const ENERGY_REWARDS = {
  checkin: 10, // daily check-in completed
  mood: 10, // mood check-in completed
  journal: 15, // journal entry saved
  task: 20, // a task completed
  recap: 25, // end-of-day recap completed
  unstuck: 10, // an unstuck action completed
  chat: 10, // first chat message sent to Bloopy
} as const;

export type EnergyAction = keyof typeof ENERGY_REWARDS;

export type EnergyStateId = "resting" | "awake" | "curious" | "proud" | "glowing";
export type EnergyState = { id: EnergyStateId; label: string };

export type EnergySnapshot = {
  total: number;
  today: number;
  date: string;
  state: EnergyState;
};

export type EnergyAwardResult = {
  /** False when the action already counted today (no double-count). */
  awarded: boolean;
  gained: number;
  today: number;
  total: number;
  state: EnergyState;
};

/* ---------- day key (UTC, matches Daily Check-In + Recap) ---------- */

function dayKey(): string {
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
    // storage blocked — energy just won't persist
  }
}

function readNum(key: string): number {
  const raw = safeGet(key);
  const n = raw == null ? 0 : Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function readHistory(): Record<string, number> {
  const raw = safeGet(ENERGY_HISTORY_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, number>;
    }
  } catch {
    // corrupt entry — start fresh
  }
  return {};
}

function writeHistory(history: Record<string, number>): void {
  // keep only the most recent ~14 days so the entry stays tiny
  const keys = Object.keys(history).sort();
  while (keys.length > 14) {
    const oldest = keys.shift();
    if (oldest) delete history[oldest];
  }
  safeSet(ENERGY_HISTORY_KEY, JSON.stringify(history));
}

/**
 * Roll the day over if the stored date isn't today: archive the finished day's
 * energy into history and reset `today` to 0. Per-action daily markers expire
 * on their own (we compare their stored date to today), so there's nothing else
 * to clear.
 */
function syncDay(): void {
  const today = dayKey();
  const last = safeGet(ENERGY_DATE_KEY);
  if (last === today) return;
  if (last) {
    const prevToday = readNum(ENERGY_TODAY_KEY);
    if (prevToday > 0) {
      const history = readHistory();
      history[last] = prevToday;
      writeHistory(history);
    }
  }
  safeSet(ENERGY_TODAY_KEY, "0");
  safeSet(ENERGY_DATE_KEY, today);
}

/* ---------- reaction state (drives the status pill + glow) ---------- */

/** Map today's energy to Bloopy's reaction state. */
export function getEnergyState(today: number): EnergyState {
  if (today < 10) return { id: "resting", label: "Resting" };
  if (today < 30) return { id: "awake", label: "Awake" };
  if (today < 60) return { id: "curious", label: "Curious" };
  if (today < 90) return { id: "proud", label: "Proud" };
  return { id: "glowing", label: "Glowing" };
}

/* ---------- read ---------- */

/** Current energy snapshot (applies the day rollover first). Safe on server. */
export function getEnergy(): EnergySnapshot {
  syncDay();
  const total = readNum(ENERGY_TOTAL_KEY);
  const today = readNum(ENERGY_TODAY_KEY);
  return { total, today, date: safeGet(ENERGY_DATE_KEY) ?? dayKey(), state: getEnergyState(today) };
}

/** True when `action` has already added energy today (used to dedupe + for missions). */
export function isEnergyActionDoneToday(action: EnergyAction): boolean {
  return safeGet(DAILY_PREFIX + action) === dayKey();
}

/* ---------- write ---------- */

/**
 * Add this action's energy — but only once per day per action. If the action
 * already counted today, it's a no-op (`awarded: false`), so the same action
 * repeated (e.g. completing several tasks) never inflates the bar or double-
 * celebrates. On a real increase it dispatches {@link BLOOPY_ENERGY_EVENT} so
 * the Home Energy card updates live.
 *
 * It deliberately does NOT play any celebration itself — call it right where
 * the action's existing success/milestone `celebrate(...)` already fires, so
 * the sparkle + sound are reused without doubling up.
 */
export function awardEnergy(action: EnergyAction): EnergyAwardResult {
  syncDay();
  const today0 = readNum(ENERGY_TODAY_KEY);
  const total0 = readNum(ENERGY_TOTAL_KEY);

  if (typeof window === "undefined" || isEnergyActionDoneToday(action)) {
    return { awarded: false, gained: 0, today: today0, total: total0, state: getEnergyState(today0) };
  }

  const gained = ENERGY_REWARDS[action];
  const today = today0 + gained;
  const total = total0 + gained;
  safeSet(ENERGY_TODAY_KEY, String(today));
  safeSet(ENERGY_TOTAL_KEY, String(total));
  safeSet(DAILY_PREFIX + action, dayKey());

  // keep history in step with today's running value
  const history = readHistory();
  history[dayKey()] = today;
  writeHistory(history);

  const state = getEnergyState(today);
  try {
    window.dispatchEvent(new CustomEvent(BLOOPY_ENERGY_EVENT, { detail: { action, gained, today, total } }));
  } catch {
    // dispatch failed (very old browser) — the next Home read still reflects it
  }
  return { awarded: true, gained, today, total, state };
}
