/**
 * Bloopy UI theme system.
 *
 * A small, client-side selectable theme layer for the Bloopy app. Each theme is
 * a set of design tokens (colors + a few hero/decor knobs) that the themed
 * surfaces — Home dashboard, Unstuck Toolkit, bottom navigation, and the
 * Appearance settings selector — read at render time.
 *
 * Tokens map to the semantic roles used across the app:
 *   background   → `bg` / `bgDeep`   (page + deepest backdrop)
 *   card         → `card` / `cardAlt`(panel surfaces / gradient)
 *   cardBorder   → `cardBorder`      (panel borders + dividers)
 *   accent       → `neon`            (primary accent / interactive glow)
 *   glow         → `glow`            (brighter accent for highlights)
 *   mutedText    → `mutedText`       (secondary labels)
 *   dangerAccent → `red`             (tiny emotional "nudge" dots)
 *   heroStyle    → `heroStyle`       (per-theme backdrop / decor intensity)
 *
 * The selection is persisted in localStorage under `bloopy.ui.theme` and
 * defaults to `bloopy-core` (the original dark futuristic look). This layer is
 * purely visual: it never touches auth, data, routes, or app logic.
 */

import type React from "react";

export type BloopyThemeId =
  | "bloopy-core"
  | "cozy-room"
  | "robot-lab"
  | "focus-mode"
  | "doomscroll-rescue";

/** Color tokens consumed by the themed surfaces (inline styles + alpha suffixes). */
export type BloopyThemeColors = {
  bg: string;
  bgDeep: string;
  card: string;
  cardAlt: string;
  cardBorder: string;
  neon: string;
  glow: string;
  softText: string;
  mutedText: string;
  mainText: string;
  red: string;
};

/** Per-theme backdrop / decoration intensity for the hero areas. */
export type BloopyHeroStyle = {
  /** Opacity of the faint circuit-grid backdrop (0 disables it). */
  gridOpacity: number;
  /** Whether the drifting ambient particles render on Home. */
  showParticles: boolean;
  /** Whether the extra "tech room" decor renders around Bloopy on Home. */
  showRoomDecor: boolean;
};

export type BloopyTheme = {
  id: BloopyThemeId;
  name: string;
  tagline: string;
  colors: BloopyThemeColors;
  heroStyle: BloopyHeroStyle;
};

export const THEME_STORAGE_KEY = "bloopy.ui.theme";

export const DEFAULT_THEME_ID: BloopyThemeId = "bloopy-core";

/** Dispatched on `window` whenever the theme is saved, so mounted surfaces update live. */
export const THEME_CHANGE_EVENT = "bloopy:theme-change";

export const THEMES: Record<BloopyThemeId, BloopyTheme> = {
  "bloopy-core": {
    id: "bloopy-core",
    name: "Bloopy Core",
    tagline: "Dark futuristic · electric blue glow",
    colors: {
      bg: "#020712",
      bgDeep: "#00040A",
      card: "#061225",
      cardAlt: "#07182C",
      cardBorder: "#123257",
      neon: "#0A84FF",
      glow: "#1E90FF",
      softText: "#8CBFFF",
      mutedText: "#7F91B8",
      mainText: "#F4F8FF",
      red: "#FF3B4F",
    },
    heroStyle: { gridOpacity: 0.06, showParticles: true, showRoomDecor: true },
  },

  "cozy-room": {
    id: "cozy-room",
    name: "Cozy Room",
    tagline: "Warm dark tones · soft amber calm",
    colors: {
      bg: "#14100B",
      bgDeep: "#0A0703",
      card: "#1E160E",
      cardAlt: "#271C12",
      cardBorder: "#3C2D1D",
      neon: "#F0A968",
      glow: "#FFC489",
      softText: "#E7C6A4",
      mutedText: "#B0937A",
      mainText: "#FBF1E6",
      red: "#FF8A6E",
    },
    heroStyle: { gridOpacity: 0.035, showParticles: false, showRoomDecor: true },
  },

  "robot-lab": {
    id: "robot-lab",
    name: "Robot Lab",
    tagline: "Technical · strong neon · robot-core",
    colors: {
      bg: "#04090F",
      bgDeep: "#010509",
      card: "#0A1722",
      cardAlt: "#0E2032",
      cardBorder: "#16466A",
      neon: "#15C7F5",
      glow: "#45DCFF",
      softText: "#9FDFF6",
      mutedText: "#6C93AC",
      mainText: "#EAF8FF",
      red: "#FF455B",
    },
    heroStyle: { gridOpacity: 0.11, showParticles: true, showRoomDecor: true },
  },

  "focus-mode": {
    id: "focus-mode",
    name: "Focus Mode",
    tagline: "Minimal · reduced glow · fewer distractions",
    colors: {
      bg: "#0B0E13",
      bgDeep: "#060810",
      card: "#131820",
      cardAlt: "#19202A",
      cardBorder: "#2A323E",
      neon: "#7FA6C7",
      glow: "#9BBDD9",
      softText: "#AEBAC6",
      mutedText: "#76828F",
      mainText: "#ECF1F6",
      red: "#CE7A72",
    },
    heroStyle: { gridOpacity: 0.02, showParticles: false, showRoomDecor: false },
  },

  "doomscroll-rescue": {
    id: "doomscroll-rescue",
    name: "Doomscroll Rescue",
    tagline: "Calm reset · soft breathing glow · no shame",
    colors: {
      bg: "#07130F",
      bgDeep: "#030B08",
      card: "#0C1E18",
      cardAlt: "#102A21",
      cardBorder: "#1D483B",
      neon: "#34D6A6",
      glow: "#6FE9C6",
      softText: "#A6E6D2",
      mutedText: "#79A89A",
      mainText: "#ECFBF5",
      red: "#FF9C86",
    },
    heroStyle: { gridOpacity: 0.03, showParticles: false, showRoomDecor: true },
  },
};

/** Stable ordered list for rendering the selector. */
export const THEME_LIST: BloopyTheme[] = [
  THEMES["bloopy-core"],
  THEMES["cozy-room"],
  THEMES["robot-lab"],
  THEMES["focus-mode"],
  THEMES["doomscroll-rescue"],
];

function isThemeId(value: string | null): value is BloopyThemeId {
  return value !== null && Object.prototype.hasOwnProperty.call(THEMES, value);
}

/** Resolve a theme id to its full config, falling back to the default. */
export function getTheme(id: BloopyThemeId | null | undefined): BloopyTheme {
  return id && isThemeId(id) ? THEMES[id] : THEMES[DEFAULT_THEME_ID];
}

/** Read the saved theme id from localStorage (default on server / when unset). */
export function loadThemeId(): BloopyThemeId {
  if (typeof window === "undefined") return DEFAULT_THEME_ID;
  const raw = window.localStorage.getItem(THEME_STORAGE_KEY);
  return isThemeId(raw) ? raw : DEFAULT_THEME_ID;
}

/** Persist the selected theme id and notify mounted surfaces. */
export function saveThemeId(id: BloopyThemeId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(THEME_STORAGE_KEY, id);
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/**
 * Standard themed "card" surface style shared by panels across the app
 * (gradient fill, themed border, soft depth shadow).
 */
export function makeCardStyle(colors: BloopyThemeColors): React.CSSProperties {
  return {
    background: `linear-gradient(160deg, ${colors.cardAlt} 0%, ${colors.card} 100%)`,
    borderColor: colors.cardBorder,
    boxShadow: `0 0 0 1px ${colors.neon}10, 0 10px 30px ${colors.bgDeep}99`,
  };
}

/**
 * Expose a theme as CSS custom properties for a high-level wrapper, so any
 * surface can read shared tokens (e.g. `var(--bloopy-accent)`) in addition to
 * the JS color object. Mirrors the same tokens used in inline styles.
 */
export function themeCssVars(theme: BloopyTheme): React.CSSProperties {
  const c = theme.colors;
  return {
    /* surfaces */
    "--bloopy-bg": c.bg,
    "--bloopy-bg-deep": c.bgDeep,
    "--bloopy-card": c.card,
    "--bloopy-card-soft": c.cardAlt,
    "--bloopy-card-border": c.cardBorder,
    /* text — bright title → soft → muted (never a hardcoded blue-gray) */
    "--bloopy-text": c.mainText,
    "--bloopy-text-soft": c.softText,
    "--bloopy-muted": c.mutedText,
    "--bloopy-muted-strong": c.softText,
    "--bloopy-placeholder": c.mutedText,
    /* accents */
    "--bloopy-accent": c.neon,
    "--bloopy-accent-soft": c.softText,
    "--bloopy-glow": c.glow,
    "--bloopy-red": c.red,
    /* buttons */
    "--bloopy-button": c.neon,
    "--bloopy-button-hover": c.glow,
    "--bloopy-button-disabled": c.cardAlt,
    /* misc */
    "--bloopy-grid-opacity": String(theme.heroStyle.gridOpacity),
  } as React.CSSProperties;
}
