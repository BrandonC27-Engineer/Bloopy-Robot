/**
 * Bloopy Presence Engine — pure helpers.
 *
 * Picks small companion messages based on the current page, time of day,
 * and the Daily Check-In context saved in localStorage. Also owns the
 * anti-spam rules (cooldown between passive messages, no quick repeats of
 * the same message, snooze after a dismissal). All storage access is
 * wrapped so the app keeps working if localStorage is unavailable.
 *
 * Messages are lightly personalized from the optional onboarding profile
 * (display name, current focus, support style) when it's available — still
 * template-only, no API calls, no sensitive data.
 */

import type { BloopyProfile, SupportStyle } from "@/lib/bloopyProfile";

export type PresenceAction = {
  label: string;
  href: string;
};

export type PresenceMessage = {
  id: string;
  text: string;
  action?: PresenceAction;
};

export type CheckInContext = {
  doneToday: boolean;
  mood: string | null;
  focus: string | null;
};

/** Check-in moods that deserve a softer touch and a nudge toward Chat. */
export const HEAVY_MOODS = ["Stressed", "Anxious", "Sad"];

// Daily Check-In keys (written by /check-in)
const CHECKIN_DATE_KEY = "bloopy.dailyCheckIn.date";
const CHECKIN_MOOD_KEY = "bloopy.dailyCheckIn.mood";
const CHECKIN_FOCUS_KEY = "bloopy.dailyCheckIn.todayFocus";

// Presence engine keys
const LAST_PASSIVE_KEY = "bloopy.presence.lastPassiveAt";
const HISTORY_KEY = "bloopy.presence.history";
const SNOOZE_KEY = "bloopy.presence.snoozedUntil";

/** Minimum gap between passive (non-event) messages. */
export const PASSIVE_COOLDOWN_MS = 90_000;
/** A given message id will not repeat within this window. */
export const REPEAT_WINDOW_MS = 10 * 60_000;
/** Dismissing a message pauses all passive messages for this long. */
export const DISMISS_SNOOZE_MS = 5 * 60_000;
/** A shown message hides itself after this long. */
export const AUTO_HIDE_MS = 12_000;
/** No user activity for this long counts as idle. */
export const IDLE_MS = 90_000;
/** Tab hidden at least this long counts as "away". */
export const AWAY_MS = 30_000;

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
    // localStorage unavailable (private mode, blocked) — presence just won't persist
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

/** Today's Daily Check-In context keys — the exact set cleared by `clearCheckInContext`. */
export const CHECK_IN_KEYS = [CHECKIN_DATE_KEY, CHECKIN_MOOD_KEY, CHECKIN_FOCUS_KEY] as const;

/**
 * Removes ONLY the Daily Check-In context keys (today's date, mood, focus).
 * Leaves the daily streak, profile, recap, and Supabase memory notes untouched.
 */
export function clearCheckInContext(): void {
  CHECK_IN_KEYS.forEach(safeRemove);
}

/* ---------- Daily Check-In context ---------- */

export function getCheckInContext(): CheckInContext {
  const today = new Date().toISOString().slice(0, 10);
  const doneToday = safeGet(CHECKIN_DATE_KEY) === today;
  return {
    doneToday,
    mood: doneToday ? safeGet(CHECKIN_MOOD_KEY) : null,
    focus: doneToday ? safeGet(CHECKIN_FOCUS_KEY) || null : null,
  };
}

/* ---------- message catalog ---------- */

export const IDLE_MESSAGE: PresenceMessage = {
  id: "idle",
  text: "Still here with you.",
};

export const WELCOME_BACK_MESSAGE: PresenceMessage = {
  id: "welcome-back",
  text: "Welcome back.",
};

export const OFFLINE_MESSAGE: PresenceMessage = {
  id: "offline",
  text: "Looks like you're offline. I'll still stay with you here.",
};

export const ONLINE_MESSAGE: PresenceMessage = {
  id: "online",
  text: "You're back online.",
};

/* ---------- onboarding personalization helpers ---------- */

/** A short, safe greeting that uses the onboarding display name when present. */
function greeting(profile?: BloopyProfile): string {
  const name = profile?.displayName?.trim();
  return name ? `Hey ${name}` : "Hey";
}

/** A closing line lightly flavored by the chosen support style. */
function supportLine(style: SupportStyle | null | undefined): string {
  switch (style) {
    case "direct":
      return "I'm here. Want to knock out one small thing?";
    case "focus":
      return "I'm here. Want to lock in on one thing together?";
    case "reflection":
      return "I'm here whenever you want to think something through.";
    case "gentle":
    default:
      return "I'm here whenever you want to talk.";
  }
}

export function getPageMessage(
  pathname: string,
  ctx: CheckInContext,
  hour: number,
  profile?: BloopyProfile
): PresenceMessage | null {
  if (pathname === "/app") {
    const name = profile?.displayName?.trim();
    const hey = greeting(profile);
    if (!ctx.doneToday) {
      return {
        id: "home-checkin",
        text: name
          ? `${hey}, want to do a tiny check-in before we start?`
          : "Want to do a tiny check-in before we start?",
        action: { label: "Check in", href: "/check-in" },
      };
    }
    if (ctx.mood && HEAVY_MOODS.includes(ctx.mood)) {
      return {
        id: "home-heavy-mood",
        text: `Today felt ${ctx.mood.toLowerCase()}. We can go gently — I'm right here.`,
        action: { label: "Talk to Bloopy", href: "/chat" },
      };
    }
    if (ctx.focus) {
      return {
        id: "home-focus",
        text: `I remember today's focus: ${ctx.focus}. We can keep it small.`,
      };
    }
    const currentFocus = profile?.currentFocus?.trim();
    if (currentFocus) {
      return {
        id: "home-current-focus",
        text: `${hey}, want to take one small step on ${currentFocus} today?`,
        action: { label: "Open Tasks", href: "/reminders" },
      };
    }
    if (hour < 5) {
      return { id: "home-late", text: "It's late. We can keep things soft and slow." };
    }
    if (hour < 12) {
      return {
        id: "home-morning",
        text: name ? `Morning, ${name}. One step at a time?` : "Morning. Want to take today one step at a time?",
      };
    }
    if (hour < 18) {
      return { id: "home-afternoon", text: supportLine(profile?.supportStyle) };
    }
    return { id: "home-evening", text: "Evening. We can wind down one small step at a time." };
  }
  if (pathname === "/chat") {
    return { id: "chat", text: "You can tell me what's going on. I'll stay with you." };
  }
  if (pathname === "/mood") {
    return { id: "mood", text: "Let's name the feeling first. No pressure." };
  }
  if (pathname === "/journal") {
    return { id: "journal", text: "One honest sentence is enough." };
  }
  if (pathname === "/reminders") {
    return { id: "tasks", text: "Pick one small thing. That counts." };
  }
  if (pathname === "/memory") {
    return { id: "memory", text: "I'll keep the little things safe." };
  }
  if (pathname === "/profile-insights") {
    return { id: "profile-insights", text: "You can review what I know anytime." };
  }
  if (pathname === "/check-in") {
    return { id: "checkin-page", text: "Tiny check-ins help me understand your day." };
  }
  if (pathname === "/robot") {
    return {
      id: "robot",
      text: "This is my live body view — sensors, voice, and safe controls in one place.",
    };
  }
  if (pathname.startsWith("/settings")) {
    return { id: "settings", text: "You can adjust how I show up for you." };
  }
  return null;
}

/* ---------- proactive openers (Bloopy starts the conversation) ---------- */

/** A proactive message carries a short, non-sensitive `type` for spacing. */
export type ProactiveMessage = PresenceMessage & { type: string };

/**
 * Picks a proactive "opener" — Bloopy gently starting the conversation.
 * Template-only and lightly personalized from the Daily Check-In context and
 * time of day. NO API calls and NO sensitive data. Spacing / no-repeat rules
 * are enforced by the caller via the cooldown helpers in `bloopyUnread`.
 */
export function getProactiveMessage(
  ctx: CheckInContext,
  hour: number,
  profile?: BloopyProfile,
  recapDoneToday = false,
  onboardingDone = true
): ProactiveMessage {
  const name = profile?.displayName?.trim();
  const hey = greeting(profile);
  // First things first — if Bloopy isn't set up yet, gently invite onboarding
  // so it can support the user better. (Daily-gated by the caller.)
  if (!onboardingDone) {
    return {
      id: "proactive-setup",
      type: "setup",
      text: "Want to set me up so I can support you better?",
      action: { label: "Set up Bloopy", href: "/onboarding" },
    };
  }
  // Evening wind-down takes the lead once the day is closing and the recap
  // isn't done yet — the natural moment to wrap up together.
  if (hour >= 18 && !recapDoneToday) {
    return {
      id: "proactive-recap",
      type: "recap",
      text: name ? `${hey}, want to wrap up the day together?` : "Want to wrap up the day together?",
      action: { label: "End-of-day recap", href: "/recap" },
    };
  }
  if (!ctx.doneToday) {
    return {
      id: "proactive-checkin",
      type: "checkin",
      text: name
        ? `${hey}, want to do a tiny check-in before we start?`
        : "Want to do a tiny check-in before we start?",
      action: { label: "Check in", href: "/check-in" },
    };
  }
  if (ctx.mood && HEAVY_MOODS.includes(ctx.mood)) {
    return {
      id: "proactive-mood",
      type: "mood",
      text: "I noticed today might feel heavy. Want to talk for a minute?",
      action: { label: "Talk", href: "/chat" },
    };
  }
  if (ctx.focus) {
    return {
      id: "proactive-focus",
      type: "focus",
      text: `I remember today's focus: ${ctx.focus}. Want to take one small step?`,
      action: { label: "Open Tasks", href: "/reminders" },
    };
  }
  const currentFocus = profile?.currentFocus?.trim();
  if (currentFocus) {
    return {
      id: "proactive-current-focus",
      type: "focus",
      text: `${hey}, want to take one small step on ${currentFocus} today?`,
      action: { label: "Open Tasks", href: "/reminders" },
    };
  }
  if (hour >= 18) {
    return {
      id: "proactive-journal",
      type: "journal",
      text: "Want to write one honest sentence from today?",
      action: { label: "Journal", href: "/journal" },
    };
  }
  if (hour < 5) {
    return { id: "proactive-late", type: "timeofday", text: "It's late. I'm here if you'd like some quiet company." };
  }
  if (hour < 12) {
    return {
      id: "proactive-morning",
      type: "timeofday",
      text: name ? `Morning, ${name}. One small step at a time?` : "Morning. Want to take today one small step at a time?",
    };
  }
  // Midday lull — gently offer the Unstuck Toolkit. Daily-gated by the caller
  // (at most once per day) so it never nags.
  return {
    id: "proactive-unstuck",
    type: "unstuck",
    text: "Feeling stuck? I can help you find one tiny step.",
    action: { label: "Get unstuck", href: "/unstuck" },
  };
}

/* ---------- cooldown / anti-spam ---------- */

type History = Record<string, number>;

function readHistory(): History {
  const raw = safeGet(HISTORY_KEY);
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as History;
    }
  } catch {
    // corrupt entry — start fresh
  }
  return {};
}

export function canShowPassive(id: string): boolean {
  const now = Date.now();
  const snoozedUntil = Number(safeGet(SNOOZE_KEY) ?? 0);
  if (now < snoozedUntil) return false;
  const lastPassiveAt = Number(safeGet(LAST_PASSIVE_KEY) ?? 0);
  if (now - lastPassiveAt < PASSIVE_COOLDOWN_MS) return false;
  const shownAt = readHistory()[id];
  if (typeof shownAt === "number" && now - shownAt < REPEAT_WINDOW_MS) return false;
  return true;
}

export function recordShown(id: string): void {
  const now = Date.now();
  safeSet(LAST_PASSIVE_KEY, String(now));
  const history = readHistory();
  for (const key of Object.keys(history)) {
    if (now - history[key] > REPEAT_WINDOW_MS) delete history[key];
  }
  history[id] = now;
  safeSet(HISTORY_KEY, JSON.stringify(history));
}

export function recordDismissed(): void {
  safeSet(SNOOZE_KEY, String(Date.now() + DISMISS_SNOOZE_MS));
}
