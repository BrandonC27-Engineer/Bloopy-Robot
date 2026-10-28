/**
 * Bloopy Context Bridge.
 *
 * Collects a SHORT, safe summary of the user's existing Bloopy context so the
 * real chat can feel personal — without extra AI calls and without leaking
 * private data.
 *
 *  • `collectClientContext()` runs in the browser and reads only a small,
 *    whitelisted set of localStorage-backed values (onboarding profile,
 *    today's check-in, today's recap). It never reads journals or full recaps.
 *  • `formatBloopyContext()` is pure and runs on the server (in the chat API
 *    route). It sanitizes + bounds everything, folds in a few explicit memory
 *    notes, and produces a tiny prompt section plus gentle usage instructions.
 *
 * If nothing is available, both sides degrade to "no context" and chat behaves
 * exactly as before.
 */

import {
  CHECK_IN_PREFERENCE_OPTIONS,
  getProfile,
  supportStyleLabel,
} from "@/lib/bloopyProfile";
import { getCheckInContext } from "@/lib/bloopyPresence";
import { getRecap, isRecapDoneToday } from "@/lib/bloopyRecap";
import { getStreak } from "@/lib/dailyStreak";

/** A plain, serializable bundle of safe context fields (no sensitive data). */
export type BloopyClientContext = {
  displayName?: string;
  currentFocus?: string;
  supportStyle?: string;
  checkInPreference?: string;
  todayMood?: string;
  todayFocus?: string;
  recapFeeling?: string;
  recapTomorrowNote?: string;
  /** Current daily check-in streak, e.g. "3 days (checked in today)". */
  streak?: string;
};

/** Per-field character cap and memory limits — keeps the prompt tiny and safe. */
const MAX_FIELD = 120;
const MAX_MEMORIES = 8;

/**
 * Reads the safe context from localStorage. Client-only — the underlying
 * helpers already guard `window`, and any failure collapses to `{}` so chat
 * never breaks.
 */
export function collectClientContext(): BloopyClientContext {
  try {
    const profile = getProfile();
    const checkIn = getCheckInContext();
    const recap = isRecapDoneToday() ? getRecap() : null;
    const checkInPreference = CHECK_IN_PREFERENCE_OPTIONS.find(
      (o) => o.value === profile.checkInPreference
    )?.label;
    const streak = getStreak();

    return {
      displayName: profile.displayName || undefined,
      currentFocus: profile.currentFocus || undefined,
      supportStyle: supportStyleLabel(profile.supportStyle) ?? undefined,
      checkInPreference: checkInPreference ?? undefined,
      todayMood: checkIn.mood ?? undefined,
      todayFocus: checkIn.focus ?? undefined,
      recapFeeling: recap?.feeling ?? undefined,
      recapTomorrowNote: recap?.tomorrowNote || undefined,
      streak:
        streak.count > 0
          ? `${streak.count} day${streak.count === 1 ? "" : "s"}${streak.checkedInToday ? " (checked in today)" : " (no check-in yet today)"}`
          : undefined,
    };
  } catch {
    return {};
  }
}

/** Trims, collapses whitespace, and caps length. Returns null for empty/invalid. */
function clean(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const t = value.replace(/\s+/g, " ").trim();
  if (!t) return null;
  return t.length > MAX_FIELD ? `${t.slice(0, MAX_FIELD - 1).trimEnd()}…` : t;
}

/**
 * Builds the tiny "Bloopy context" system-prompt section from the (untrusted)
 * client context plus a few explicit memory notes. Everything is sanitized and
 * length-bounded here, on the server. Returns null when there's nothing to add,
 * so the caller can fall back to the plain personality prompt.
 */
export function formatBloopyContext(
  ctx: BloopyClientContext | null | undefined,
  memories: string[] = []
): string | null {
  const c = ctx ?? {};
  const lines: string[] = [];

  const add = (label: string, value: unknown) => {
    const cleaned = clean(value);
    if (cleaned) lines.push(`- ${label}: ${cleaned}`);
  };

  add("Name", c.displayName);
  add("Current focus", c.currentFocus);
  add("Preferred support style", c.supportStyle);
  add("Check-in preference", c.checkInPreference);
  add("Today's mood", c.todayMood);
  add("Today's focus", c.todayFocus);
  add("Recent recap feeling", c.recapFeeling);
  add("Recap note for tomorrow", c.recapTomorrowNote);
  add("Daily check-in streak", c.streak);

  const safeMemories = (Array.isArray(memories) ? memories : [])
    .map((m) => clean(m))
    .filter((m): m is string => !!m)
    .slice(0, MAX_MEMORIES);

  if (safeMemories.length > 0) {
    lines.push(`- Saved memories: ${safeMemories.join("; ")}`);
  }

  if (lines.length === 0) return null;

  return `Bloopy context for this user:
${lines.join("\n")}

Use this context gently and naturally to be more personal and helpful. Don't over-mention or recite it, and don't overuse their name. Only rely on what's listed here — never claim to know things that aren't, and never say you know everything about them. Never explain how you know this (no app settings, storage, or database talk). If something isn't listed, don't invent it. If a streak is listed you may celebrate it warmly when it fits the moment — but never guilt them about missed days or pressure them to keep it.`;
}
