/**
 * Lightweight client-side appearance preferences, backed by localStorage.
 *
 * These control small visual toggles across the protected Bloopy app
 * (reduced glow, compact spacing) via classes applied by AppearanceProvider,
 * plus a "cozy dark theme" preference that currently just confirms the app's
 * existing dark theme (light theme is coming later).
 */

export type AppearancePreferences = {
  cozyDarkTheme: boolean;
  reduceGlow: boolean;
  compactLayout: boolean;
};

export const DEFAULT_APPEARANCE_PREFERENCES: AppearancePreferences = {
  cozyDarkTheme: true,
  reduceGlow: false,
  compactLayout: false,
};

const STORAGE_KEYS: Record<keyof AppearancePreferences, string> = {
  cozyDarkTheme: "bloopy.appearance.cozyDark",
  reduceGlow: "bloopy.appearance.reduceGlow",
  compactLayout: "bloopy.appearance.compactLayout",
};

/** Dispatched on `window` whenever a preference is saved, so other mounted components can pick up the change. */
export const APPEARANCE_CHANGE_EVENT = "bloopy:appearance-change";

export function loadAppearancePreferences(): AppearancePreferences {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE_PREFERENCES;

  function read(key: keyof AppearancePreferences): boolean {
    const raw = window.localStorage.getItem(STORAGE_KEYS[key]);
    if (raw === null) return DEFAULT_APPEARANCE_PREFERENCES[key];
    return raw === "true";
  }

  return {
    cozyDarkTheme: read("cozyDarkTheme"),
    reduceGlow: read("reduceGlow"),
    compactLayout: read("compactLayout"),
  };
}

export function saveAppearancePreference(key: keyof AppearancePreferences, value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEYS[key], String(value));
  window.dispatchEvent(new Event(APPEARANCE_CHANGE_EVENT));
}
