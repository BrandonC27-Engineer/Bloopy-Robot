/**
 * Bloopy Companion State — a tiny local "state of being" for Bloopy.
 *
 * Derived entirely on the client from what the app already knows: the
 * current route, online status, time of day, and Daily Check-In context.
 * No backend, no database — this just makes Bloopy feel awake. It also
 * picks the single most helpful "next action" for the Home dashboard.
 */

import { HEAVY_MOODS, type CheckInContext } from "@/lib/bloopyPresence";

export type BloopyStateId =
  | "awake"
  | "listening"
  | "thinking"
  | "focus-mode"
  | "resting"
  | "offline"
  | "robot-body";

export type BloopyState = {
  id: BloopyStateId;
  /** Short label for status pills, e.g. "Listening". */
  label: string;
  /** One soft sentence describing what Bloopy is doing. */
  blurb: string;
};

export type BloopyStateInput = {
  pathname: string;
  online: boolean;
  hour: number;
  checkInDoneToday: boolean;
  focus: string | null;
};

export const DEFAULT_BLOOPY_STATE: BloopyState = {
  id: "awake",
  label: "Awake",
  blurb: "I'm here with you. Let's take today one step at a time.",
};

export function getBloopyState(input: BloopyStateInput): BloopyState {
  if (!input.online) {
    return {
      id: "offline",
      label: "Offline Mode",
      blurb: "No signal needed — I'll stay with you right here.",
    };
  }
  if (input.pathname === "/robot") {
    return {
      id: "robot-body",
      label: "Physical Body",
      blurb: "Live sensors, voice, and safe body controls are right here.",
    };
  }
  if (input.pathname === "/chat") {
    return {
      id: "listening",
      label: "Listening",
      blurb: "Take your time. I'm not going anywhere.",
    };
  }
  if (input.pathname === "/memory") {
    return {
      id: "thinking",
      label: "Thinking",
      blurb: "Sorting through the little things you've told me.",
    };
  }
  if (input.focus && input.pathname === "/reminders") {
    return {
      id: "focus-mode",
      label: "Focus Mode",
      blurb: "One small thing at a time. That counts.",
    };
  }
  if (input.hour < 5 || input.hour >= 23) {
    return {
      id: "resting",
      label: "Resting",
      blurb: "Keeping the lights low. Be gentle with yourself.",
    };
  }
  return DEFAULT_BLOOPY_STATE;
}

/* ---------- suggested next action ---------- */

export type SuggestedAction = {
  id: string;
  title: string;
  note: string;
  href: string;
};

export function getSuggestedAction(ctx: CheckInContext, hour: number): SuggestedAction {
  if (!ctx.doneToday) {
    return {
      id: "checkin",
      title: "Start check-in",
      note: "Tell me how today feels — it takes 30 seconds.",
      href: "/check-in",
    };
  }
  if (ctx.mood && HEAVY_MOODS.includes(ctx.mood)) {
    return {
      id: "talk",
      title: "Talk to Bloopy",
      note: `Feeling ${ctx.mood.toLowerCase()} is a lot. I can sit with you.`,
      href: "/chat",
    };
  }
  if (ctx.focus) {
    return {
      id: "focus",
      title: "Work on today's focus",
      note: `"${ctx.focus}" — one small step counts.`,
      href: "/reminders",
    };
  }
  if (hour >= 18) {
    return {
      id: "journal",
      title: "Write a reflection",
      note: "One honest sentence about today is enough.",
      href: "/journal",
    };
  }
  return {
    id: "memory",
    title: "Review what Bloopy remembers",
    note: "The little things you've shared, kept safe.",
    href: "/memory",
  };
}
