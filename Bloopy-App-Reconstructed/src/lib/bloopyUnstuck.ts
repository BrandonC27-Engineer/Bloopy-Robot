/**
 * Bloopy Unstuck Toolkit — local helpers + template logic.
 *
 * Helps a user who feels stuck, overwhelmed, procrastinating, or doomscrolling
 * restart with one tiny step. Three modes: Tiny Step, Doomscroll Rescue, and
 * Focus Sprint. Everything here is template-based and stored in localStorage
 * for this MVP — NO backend, NO database, NO Anthropic/API calls, nothing
 * sensitive. All access is wrapped so the app keeps working if localStorage is
 * unavailable (private mode, blocked).
 */

export type UnstuckObstacle =
  | "too-big"
  | "dont-know-start"
  | "tired"
  | "avoiding"
  | "distracted";

/** The "what feels hardest about starting?" options, in display order. */
export const OBSTACLE_OPTIONS: { value: UnstuckObstacle; label: string }[] = [
  { value: "too-big", label: "It feels too big" },
  { value: "dont-know-start", label: "I don't know where to start" },
  { value: "tired", label: "I'm tired" },
  { value: "avoiding", label: "I keep avoiding it" },
  { value: "distracted", label: "I'm distracted" },
];

/** Template tiny step per obstacle — no AI, just a calm, doable nudge. */
const TINY_STEP_BY_OBSTACLE: Record<UnstuckObstacle, string> = {
  "too-big": "Pick the first small part.",
  "dont-know-start": "Open the thing.",
  tired: "Work on it for 2 minutes.",
  avoiding: "Write one messy sentence.",
  distracted: "Put your phone down for 60 seconds.",
};

/** Turns an obstacle into a single tiny action. Falls back to a gentle default. */
export function generateTinyStep(obstacle: UnstuckObstacle | null): string {
  if (obstacle && TINY_STEP_BY_OBSTACLE[obstacle]) return TINY_STEP_BY_OBSTACLE[obstacle];
  return "Work on it for 2 minutes.";
}

/** Human-readable label for a stored obstacle value. */
export function obstacleLabel(value: string | null): string | null {
  if (!value) return null;
  return OBSTACLE_OPTIONS.find((o) => o.value === value)?.label ?? value;
}

/* ---------- localStorage keys (as specified) ---------- */

export const UNSTUCK_KEYS = {
  lastGoal: "bloopy.unstuck.lastGoal",
  lastObstacle: "bloopy.unstuck.lastObstacle",
  lastTinyStep: "bloopy.unstuck.lastTinyStep",
  lastUsedAt: "bloopy.unstuck.lastUsedAt",
  doomscrollRescuesCount: "bloopy.unstuck.doomscrollRescuesCount",
  lastDoomscrollRescueAt: "bloopy.unstuck.lastDoomscrollRescueAt",
  focusSprintTopic: "bloopy.unstuck.focusSprintTopic",
  focusSprintMinutes: "bloopy.unstuck.focusSprintMinutes",
  focusSprintsCompleted: "bloopy.unstuck.focusSprintsCompleted",
  lastFocusSprintAt: "bloopy.unstuck.lastFocusSprintAt",
} as const;

/** Every Unstuck key this app writes — the exact set cleared by `clearUnstuck`. */
export const ALL_UNSTUCK_KEYS = Object.values(UNSTUCK_KEYS);

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
    // localStorage unavailable — Unstuck history just won't persist
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

function readCount(key: string): number {
  const n = Number(safeGet(key) ?? 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}

/* ---------- summary (for Profile Insights) ---------- */

export type UnstuckSummary = {
  lastGoal: string | null;
  lastObstacle: string | null;
  lastTinyStep: string | null;
  lastUsedAt: string | null;
  doomscrollRescuesCount: number;
  lastDoomscrollRescueAt: string | null;
  focusSprintTopic: string | null;
  focusSprintMinutes: number | null;
  focusSprintsCompleted: number;
  lastFocusSprintAt: string | null;
};

export function getUnstuckSummary(): UnstuckSummary {
  const minutesRaw = safeGet(UNSTUCK_KEYS.focusSprintMinutes);
  const minutes = minutesRaw ? Number(minutesRaw) : null;
  return {
    lastGoal: safeGet(UNSTUCK_KEYS.lastGoal) || null,
    lastObstacle: obstacleLabel(safeGet(UNSTUCK_KEYS.lastObstacle)),
    lastTinyStep: safeGet(UNSTUCK_KEYS.lastTinyStep) || null,
    lastUsedAt: safeGet(UNSTUCK_KEYS.lastUsedAt) || null,
    doomscrollRescuesCount: readCount(UNSTUCK_KEYS.doomscrollRescuesCount),
    lastDoomscrollRescueAt: safeGet(UNSTUCK_KEYS.lastDoomscrollRescueAt) || null,
    focusSprintTopic: safeGet(UNSTUCK_KEYS.focusSprintTopic) || null,
    focusSprintMinutes: minutes && Number.isFinite(minutes) ? minutes : null,
    focusSprintsCompleted: readCount(UNSTUCK_KEYS.focusSprintsCompleted),
    lastFocusSprintAt: safeGet(UNSTUCK_KEYS.lastFocusSprintAt) || null,
  };
}

/** True when the toolkit has ever been used (any mode). */
export function hasUsedUnstuck(): boolean {
  return Boolean(
    safeGet(UNSTUCK_KEYS.lastUsedAt) ||
      safeGet(UNSTUCK_KEYS.lastDoomscrollRescueAt) ||
      safeGet(UNSTUCK_KEYS.lastFocusSprintAt)
  );
}

/* ---------- writes ---------- */

/** Saves the most recent Tiny Step (goal, obstacle, generated step). */
export function saveTinyStep(goal: string, obstacle: UnstuckObstacle | null, tinyStep: string): void {
  safeSet(UNSTUCK_KEYS.lastGoal, goal.trim());
  if (obstacle) safeSet(UNSTUCK_KEYS.lastObstacle, obstacle);
  safeSet(UNSTUCK_KEYS.lastTinyStep, tinyStep);
  safeSet(UNSTUCK_KEYS.lastUsedAt, new Date().toISOString());
}

/** Records one completed 60-second Doomscroll Rescue. Returns the new count. */
export function recordDoomscrollRescue(): number {
  const next = readCount(UNSTUCK_KEYS.doomscrollRescuesCount) + 1;
  safeSet(UNSTUCK_KEYS.doomscrollRescuesCount, String(next));
  safeSet(UNSTUCK_KEYS.lastDoomscrollRescueAt, new Date().toISOString());
  return next;
}

/** Records one completed Focus Sprint (topic + minutes). Returns the new count. */
export function recordFocusSprint(topic: string, minutes: number): number {
  if (topic.trim()) safeSet(UNSTUCK_KEYS.focusSprintTopic, topic.trim());
  safeSet(UNSTUCK_KEYS.focusSprintMinutes, String(minutes));
  const next = readCount(UNSTUCK_KEYS.focusSprintsCompleted) + 1;
  safeSet(UNSTUCK_KEYS.focusSprintsCompleted, String(next));
  safeSet(UNSTUCK_KEYS.lastFocusSprintAt, new Date().toISOString());
  return next;
}

/** Removes ONLY the Unstuck Toolkit keys. Leaves all other Bloopy data intact. */
export function clearUnstuck(): void {
  ALL_UNSTUCK_KEYS.forEach(safeRemove);
}
