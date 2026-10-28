/**
 * Bloopy unread / proactive-nudge state — tiny, non-sensitive behavior flags.
 *
 * SAFE to store here (small cookies + a custom same-tab event):
 *   • an "unread" boolean flag for the latest proactive nudge
 *   • the timestamp of the last proactive nudge (for spacing / anti-spam)
 *   • a short, non-sensitive message *type* string (e.g. "checkin", "focus")
 *   • the timestamp of the last dismissal
 *
 * NEVER store here (privacy): full chat messages, journal entries, memory
 * contents, mood notes, private user details, or any inferred personality
 * insight. Those are sensitive and do not belong in cookies.
 *
 * Future (NOT implemented here): deep, user-controlled Bloopy personalization
 * — view what Bloopy knows, save / edit / forget an insight, pause learning —
 * will live in Supabase with explicit user control, NOT in cookies. This file
 * intentionally stays limited to ephemeral, non-sensitive UI behavior state.
 */

import { useEffect, useState } from "react";

/* ---------- cookie keys (small, non-sensitive only) ---------- */

export const UNREAD_KEY = "bloopy.unreadMessage";
export const LAST_PROACTIVE_AT_KEY = "bloopy.lastProactiveMessageAt";
export const LAST_PROACTIVE_TYPE_KEY = "bloopy.lastProactiveMessageType";
export const LAST_DISMISSED_AT_KEY = "bloopy.lastDismissedMessageAt";

/** Window event fired whenever unread state changes (same-tab reactivity). */
export const BLOOPY_UNREAD_EVENT = "bloopy:unread-change";

/** Minimum spacing between proactive nudges while the app is open (20 min). */
export const PROACTIVE_COOLDOWN_MS = 20 * 60_000;

/** Cookie lifetime — short-lived behavior state only (7 days). */
const COOKIE_MAX_AGE_S = 7 * 24 * 60 * 60;

/* ---------- tiny safe cookie helpers (no dependency) ---------- */

function setCookie(name: string, value: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE_S}; samesite=lax`;
  } catch {
    // cookies blocked — unread state simply won't persist
  }
}

function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  try {
    const prefix = `${name}=`;
    const hit = document.cookie.split("; ").find((c) => c.startsWith(prefix));
    return hit ? decodeURIComponent(hit.slice(prefix.length)) : null;
  } catch {
    return null;
  }
}

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(BLOOPY_UNREAD_EVENT));
}

/* ---------- public state API ---------- */

/** True when Bloopy has an unseen proactive message. */
export function hasUnread(): boolean {
  return getCookie(UNREAD_KEY) === "1";
}

/** The type of the last proactive message Bloopy sent, if any. */
export function getLastProactiveType(): string | null {
  return getCookie(LAST_PROACTIVE_TYPE_KEY);
}

/**
 * Record that Bloopy just sent a proactive message of `type` and flag it as
 * unread so the center nav button starts its subtle blink.
 */
export function markUnread(type: string): void {
  setCookie(UNREAD_KEY, "1");
  setCookie(LAST_PROACTIVE_AT_KEY, String(Date.now()));
  setCookie(LAST_PROACTIVE_TYPE_KEY, type);
  emitChange();
}

/** Mark the latest nudge as seen and stop the blink immediately. */
export function markSeen(): void {
  setCookie(UNREAD_KEY, "0");
  setCookie(LAST_DISMISSED_AT_KEY, String(Date.now()));
  emitChange();
}

/**
 * Whether a new proactive nudge of `type` may be shown right now:
 *  • respects the cooldown (not too often), and
 *  • never repeats the same message type back-to-back.
 */
export function canSendProactive(type: string): boolean {
  const lastAt = Number(getCookie(LAST_PROACTIVE_AT_KEY) ?? 0);
  if (Number.isFinite(lastAt) && Date.now() - lastAt < PROACTIVE_COOLDOWN_MS) return false;
  if (getCookie(LAST_PROACTIVE_TYPE_KEY) === type) return false;
  return true;
}

/**
 * Subscribe to unread-state changes. Reacts to same-tab updates (custom
 * event) and cross-tab updates (storage event, best-effort). Returns a
 * cleanup function.
 */
export function subscribeUnread(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(BLOOPY_UNREAD_EVENT, cb);
  return () => window.removeEventListener(BLOOPY_UNREAD_EVENT, cb);
}

/* ---------- React hook for components ---------- */

/**
 * Reads the unread flag and keeps it in sync. Starts `false` so the first
 * client render matches the server (no hydration mismatch); the real value is
 * read after mount and on every change.
 */
export function useBloopyUnread(): boolean {
  const [unread, setUnread] = useState(false);

  useEffect(() => {
    const sync = () => setUnread(hasUnread());
    sync();
    const off = subscribeUnread(sync);
    // returning to the tab may have changed state in another tab
    document.addEventListener("visibilitychange", sync);
    return () => {
      off();
      document.removeEventListener("visibilitychange", sync);
    };
  }, []);

  return unread;
}
