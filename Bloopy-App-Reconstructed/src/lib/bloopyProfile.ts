/**
 * Bloopy Onboarding Profile — first-time, MVP, localStorage-only.
 *
 * A tiny, non-sensitive profile Bloopy learns the first time you open the
 * app: what to call you, what you're working on, how you like to be
 * supported, and when you'd like check-ins. It feeds the Bloopy Presence
 * Engine so messages feel a little more personal from the start.
 *
 * NO backend, NO database, NO API calls. All reads/writes are wrapped so the
 * app keeps working if localStorage is unavailable (private mode, blocked).
 * Nothing sensitive is stored here.
 */

export type SupportStyle = "gentle" | "direct" | "focus" | "reflection";
export type CheckInPreference = "morning" | "afternoon" | "evening" | "whenever";

export type BloopyProfile = {
  /** What Bloopy should call you. May be empty. */
  displayName: string;
  /** A short, non-sensitive note on what you're working on lately. May be empty. */
  currentFocus: string;
  /** How you'd like Bloopy to show up for you. */
  supportStyle: SupportStyle | null;
  /** When Bloopy should usually check in. */
  checkInPreference: CheckInPreference | null;
};

/* ---------- localStorage keys (as specified) ---------- */

export const DISPLAY_NAME_KEY = "bloopy.profile.displayName";
export const CURRENT_FOCUS_KEY = "bloopy.profile.currentFocus";
export const SUPPORT_STYLE_KEY = "bloopy.profile.supportStyle";
export const CHECK_IN_PREFERENCE_KEY = "bloopy.profile.checkInPreference";
export const ONBOARDING_COMPLETED_KEY = "bloopy.onboarding.completed";
export const ONBOARDING_COMPLETED_AT_KEY = "bloopy.onboarding.completedAt";

/** Every onboarding/profile key this app writes — the exact set cleared by `clearProfile`. */
export const PROFILE_KEYS = [
  DISPLAY_NAME_KEY,
  CURRENT_FOCUS_KEY,
  SUPPORT_STYLE_KEY,
  CHECK_IN_PREFERENCE_KEY,
  ONBOARDING_COMPLETED_KEY,
  ONBOARDING_COMPLETED_AT_KEY,
] as const;

/* ---------- selectable options (label + value) ---------- */

export const SUPPORT_STYLE_OPTIONS: { value: SupportStyle; label: string; note: string }[] = [
  { value: "gentle", label: "Gentle encouragement", note: "Soft, warm nudges" },
  { value: "direct", label: "Direct reminders", note: "Clear, to the point" },
  { value: "focus", label: "Focus partner", note: "Keep me on one small step" },
  { value: "reflection", label: "Reflection buddy", note: "Help me think it through" },
];

export const CHECK_IN_PREFERENCE_OPTIONS: { value: CheckInPreference; label: string; note: string }[] = [
  { value: "morning", label: "Morning", note: "Start the day together" },
  { value: "afternoon", label: "Afternoon", note: "A midday moment" },
  { value: "evening", label: "Evening", note: "Wind down together" },
  { value: "whenever", label: "Whenever I open the app", note: "No fixed time" },
];

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
    // localStorage unavailable — onboarding just won't persist
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

function isSupportStyle(value: string | null): value is SupportStyle {
  return value === "gentle" || value === "direct" || value === "focus" || value === "reflection";
}

function isCheckInPreference(value: string | null): value is CheckInPreference {
  return value === "morning" || value === "afternoon" || value === "evening" || value === "whenever";
}

/* ---------- read ---------- */

export function getProfile(): BloopyProfile {
  const supportStyle = safeGet(SUPPORT_STYLE_KEY);
  const checkInPreference = safeGet(CHECK_IN_PREFERENCE_KEY);
  return {
    displayName: (safeGet(DISPLAY_NAME_KEY) ?? "").trim(),
    currentFocus: (safeGet(CURRENT_FOCUS_KEY) ?? "").trim(),
    supportStyle: isSupportStyle(supportStyle) ? supportStyle : null,
    checkInPreference: isCheckInPreference(checkInPreference) ? checkInPreference : null,
  };
}

export function isOnboardingCompleted(): boolean {
  return safeGet(ONBOARDING_COMPLETED_KEY) === "true";
}

/* ---------- write ---------- */

/** Persists the profile fields. Empty strings clear the matching key. */
export function saveProfile(profile: BloopyProfile): void {
  safeSet(DISPLAY_NAME_KEY, profile.displayName.trim());
  safeSet(CURRENT_FOCUS_KEY, profile.currentFocus.trim());
  if (profile.supportStyle) safeSet(SUPPORT_STYLE_KEY, profile.supportStyle);
  if (profile.checkInPreference) safeSet(CHECK_IN_PREFERENCE_KEY, profile.checkInPreference);
}

/** Marks onboarding finished and stamps the completion time. */
export function completeOnboarding(): void {
  safeSet(ONBOARDING_COMPLETED_KEY, "true");
  safeSet(ONBOARDING_COMPLETED_AT_KEY, new Date().toISOString());
}

/**
 * Removes ONLY the onboarding/profile keys (see `PROFILE_KEYS`). Does not
 * touch check-in, recap, streak, or Supabase memory notes.
 */
export function clearProfile(): void {
  PROFILE_KEYS.forEach(safeRemove);
}

/** A short, non-sensitive label for the chosen support style. */
export function supportStyleLabel(style: SupportStyle | null): string | null {
  if (!style) return null;
  return SUPPORT_STYLE_OPTIONS.find((o) => o.value === style)?.label ?? null;
}
