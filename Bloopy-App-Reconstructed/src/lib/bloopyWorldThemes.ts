/**
 * Bloopy World Themes — a second, purely-visual customization layer.
 *
 * The app already has five *functional variations* (Bloopy Core, Cozy Room,
 * Robot Lab, Focus Mode, Doomscroll Rescue) — those decide what Bloopy *does*
 * and live in `bloopyTheme.ts`. A **World Theme** is a separate visual skin
 * ("how the app looks"): a palette + ambient mood that re-paints the same
 * layout. The two are independent and combine freely:
 *
 *   variation  → behavior / decor intensity (heroStyle) + mode name
 *   world      → the colour palette + ambient particles
 *
 * A world simply supplies a full {@link BloopyThemeColors} palette. The theme
 * provider uses it as the *effective* palette, so every surface that already
 * reads `useBloopyThemeColors()` (Home, cards, chips, weather, bottom nav)
 * re-skins automatically — no per-component rewrites, no layout changes.
 *
 * The "classic" world has `colors: null`, meaning "use the active variation's
 * own palette" — this is the default, so nothing changes until a world is
 * picked. Selection persists in localStorage and never touches auth/data/routes.
 */

import type React from "react";
import { getTheme, type BloopyThemeColors, type BloopyThemeId } from "@/lib/bloopyTheme";

export type WorldThemeId =
  | "classic"
  | "beach-paradise"
  | "desert-oasis"
  | "space-station"
  | "underwater-world"
  | "forest-garden"
  | "snowy-cabin"
  | "cyber-city"
  | "volcano-lab"
  | "cloud-sky"
  | "moon-base";

/** Which subtle ambient decoration the world renders behind the app. */
export type WorldParticle =
  | "none"
  | "waves"
  | "sand"
  | "stars"
  | "bubbles"
  | "fireflies"
  | "snow"
  | "grid"
  | "embers"
  | "clouds"
  | "craters";

export type WorldTheme = {
  id: WorldThemeId;
  name: string;
  description: string;
  /** Tiny glyph shown in the selector (no image assets needed). */
  icon: string;
  /**
   * Full palette override in the same shape every surface already consumes.
   * `null` = passthrough: use the active functional variation's own palette.
   */
  colors: BloopyThemeColors | null;
  /** Subtle ambient treatment rendered by <BloopyWorldAmbient />. */
  particle: WorldParticle;
};

export const WORLD_THEME_STORAGE_KEY = "bloopy.ui.worldTheme";
export const DEFAULT_WORLD_THEME_ID: WorldThemeId = "classic";
/** Dispatched on `window` whenever the world theme is saved (live update). */
export const WORLD_THEME_CHANGE_EVENT = "bloopy:world-theme-change";

export const WORLD_THEMES: Record<WorldThemeId, WorldTheme> = {
  classic: {
    id: "classic",
    name: "Classic Bloopy",
    description: "Your variation's original look",
    icon: "✦",
    colors: null,
    particle: "none",
  },

  "beach-paradise": {
    id: "beach-paradise",
    name: "Beach Paradise",
    description: "Ocean sunset · aqua glow · warm sand",
    icon: "🏖️",
    particle: "waves",
    colors: {
      // Richer ocean blue-teal so the world reads as real water, not flat teal.
      bg: "#08202B",
      bgDeep: "#03121A",
      // Slightly lifted teal cards with warmth in the border for sun-kissed depth.
      card: "#0C2C3A",
      cardAlt: "#103A4A",
      cardBorder: "#23697C",
      // Stronger aqua so glows + accents pop like sunlit shallows.
      neon: "#1ECFC8",
      glow: "#5BEFDD",
      softText: "#A9EBE6",
      mutedText: "#6FA2AB",
      mainText: "#F2FCFB",
      // Warm sunset-coral / sand accent (the setting sun + shoreline warmth).
      red: "#FF9E62",
    },
  },

  "desert-oasis": {
    id: "desert-oasis",
    name: "Desert Oasis",
    description: "Sunset dunes · amber glow · oasis",
    icon: "🌵",
    particle: "sand",
    colors: {
      // Richer dusk-warmed desert background (deep warm brown, not flat tan).
      bg: "#1C100A",
      bgDeep: "#0C0602",
      // Dark brown glass card surfaces.
      card: "#2A1810",
      cardAlt: "#351F12",
      // Warm amber border for sun-baked card edges.
      cardBorder: "#6B3D1C",
      // Amber → gold glow (the setting sun).
      neon: "#F4972F",
      glow: "#FFC766",
      // Soft sand / cream readable text.
      softText: "#F2D4AC",
      mutedText: "#BC9068",
      mainText: "#FCF2E6",
      // Warm sunset-coral accent.
      red: "#FF8556",
    },
  },

  "space-station": {
    id: "space-station",
    name: "Space Station",
    description: "Deep space · viewport · orbit glow",
    icon: "🚀",
    particle: "stars",
    colors: {
      // Richer deep-space navy with a faint violet cast.
      bg: "#070920",
      bgDeep: "#03040C",
      // Darker glass panel surfaces.
      card: "#0E1030",
      cardAlt: "#15193C",
      // Brighter sci-fi panel border.
      cardBorder: "#34367A",
      // Stronger blue-violet → purple glow (cyan accents live in the scene).
      neon: "#7C8CFF",
      glow: "#A879FF",
      // Readable lavender / white text.
      softText: "#C4C9FF",
      mutedText: "#8186C0",
      mainText: "#F2F4FF",
      red: "#FF6B9A",
    },
  },

  "underwater-world": {
    id: "underwater-world",
    name: "Underwater World",
    description: "Deep ocean · god rays · bubbles",
    icon: "🐚",
    particle: "bubbles",
    colors: {
      // Richer, deeper ocean blue-teal (depth, not flat teal).
      bg: "#05202E",
      bgDeep: "#020D15",
      // Darker blue-green glass card surfaces.
      card: "#082A38",
      cardAlt: "#0B3446",
      // Aqua-teal panel border.
      cardBorder: "#176079",
      // Stronger cyan → bright aqua glow.
      neon: "#19C2EC",
      glow: "#54EFE6",
      // Readable white / cyan text.
      softText: "#A6E9F2",
      mutedText: "#5F9DAD",
      mainText: "#ECFCFF",
      // Soft coral water accent.
      red: "#FF8FA6",
    },
  },

  "forest-garden": {
    id: "forest-garden",
    name: "Forest Garden",
    description: "Night garden · fireflies · vines",
    icon: "🌿",
    particle: "fireflies",
    colors: {
      // Richer deep emerald night-forest background.
      bg: "#0A1A0E",
      bgDeep: "#04100A",
      // Darker mossy card surfaces.
      card: "#0E2415",
      cardAlt: "#13301C",
      // Mossy green panel border.
      cardBorder: "#235A34",
      // Forest green → warm yellow-green firefly glow.
      neon: "#52BE63",
      glow: "#A9EE6E",
      // Readable white / light-green text.
      softText: "#BEE9C2",
      mutedText: "#74A07D",
      mainText: "#EFFBEE",
      // Warm lantern amber accent.
      red: "#FFC15E",
    },
  },

  "snowy-cabin": {
    id: "snowy-cabin",
    name: "Snowy Cabin",
    description: "Winter night · snow · cabin glow",
    icon: "❄️",
    particle: "snow",
    colors: {
      // Richer deep winter-night blue.
      bg: "#0B1320",
      bgDeep: "#05090F",
      // Darker frosty glass card surfaces.
      card: "#13243A",
      cardAlt: "#1A2E46",
      // Icy panel border.
      cardBorder: "#31506E",
      // Icy blue → pale snow-white glow.
      neon: "#74BEEC",
      glow: "#C2E6FF",
      // Readable white / pale blue text.
      softText: "#CADFF2",
      mutedText: "#8197AE",
      mainText: "#F3F9FF",
      // Warm cabin-amber accent.
      red: "#FFB877",
    },
  },

  "cyber-city": {
    id: "cyber-city",
    name: "Cyber City",
    description: "Neon skyline · purple/cyan/pink",
    icon: "🏙️",
    particle: "grid",
    colors: {
      // Richer dark city night.
      bg: "#0B0722",
      bgDeep: "#050210",
      // Darker neon-glass card surfaces.
      card: "#160C32",
      cardAlt: "#1D1242",
      // Brighter neon panel border.
      cardBorder: "#43228C",
      // Stronger purple + cyan neon (pink lives in `red`).
      neon: "#B450FF",
      glow: "#3CE6FF",
      // Readable white / lavender text.
      softText: "#D8C4FF",
      mutedText: "#8E7CBE",
      mainText: "#F6F0FF",
      // Pink neon-sign accent.
      red: "#FF4D8D",
    },
  },

  "volcano-lab": {
    id: "volcano-lab",
    name: "Volcano Lab",
    description: "Lava cracks · embers · lab glow",
    icon: "🌋",
    particle: "embers",
    colors: {
      // Richer dark volcanic background.
      bg: "#160705",
      bgDeep: "#0A0302",
      // Darker basalt-rock card surfaces.
      card: "#241009",
      cardAlt: "#301509",
      // Warm heat-glow border.
      cardBorder: "#62301A",
      // Stronger lava orange + amber glow.
      neon: "#FF6E2E",
      glow: "#FFB54A",
      // Readable warm-white text.
      softText: "#F6C3A8",
      mutedText: "#B98064",
      mainText: "#FCEFE7",
      // Lava-red accent.
      red: "#FF4231",
    },
  },

  "cloud-sky": {
    id: "cloud-sky",
    name: "Cloud Sky",
    description: "Dreamy dusk · clouds · moonlight",
    icon: "☁️",
    particle: "clouds",
    colors: {
      // Richer dreamy dusk indigo-lavender.
      bg: "#141633",
      bgDeep: "#0C0D22",
      // Darker airy glass card surfaces.
      card: "#202449",
      cardAlt: "#292E5C",
      // Soft lavender panel border.
      cardBorder: "#474E8A",
      // Periwinkle-blue + lavender glow.
      neon: "#8FA6FF",
      glow: "#CBA8FF",
      // Readable white / lavender text.
      softText: "#D2D8FF",
      mutedText: "#9095C2",
      mainText: "#F5F6FF",
      // Gentle pink sunset accent.
      red: "#FFA6C8",
    },
  },

  "moon-base": {
    id: "moon-base",
    name: "Moon Base",
    description: "Quiet lunar surface · silver glow",
    icon: "🌙",
    particle: "craters",
    colors: {
      // Richer dark, cool lunar background.
      bg: "#0D1019",
      bgDeep: "#06080D",
      // Darker moon-gray card surfaces.
      card: "#171B26",
      cardAlt: "#1E2330",
      // Soft steel panel border.
      cardBorder: "#363E50",
      // Steel-blue + pale silver glow.
      neon: "#92B2D0",
      glow: "#CBDBEC",
      // Readable white / silver text.
      softText: "#C4D0DE",
      mutedText: "#828D9E",
      mainText: "#F2F6FB",
      // Warm beacon accent.
      red: "#E68C7C",
    },
  },
};

/** Stable ordered list for the selector (classic first). */
export const WORLD_THEME_LIST: WorldTheme[] = [
  WORLD_THEMES.classic,
  WORLD_THEMES["beach-paradise"],
  WORLD_THEMES["desert-oasis"],
  WORLD_THEMES["space-station"],
  WORLD_THEMES["underwater-world"],
  WORLD_THEMES["forest-garden"],
  WORLD_THEMES["snowy-cabin"],
  WORLD_THEMES["cyber-city"],
  WORLD_THEMES["volcano-lab"],
  WORLD_THEMES["cloud-sky"],
  WORLD_THEMES["moon-base"],
];

function isWorldThemeId(value: string | null): value is WorldThemeId {
  return value !== null && Object.prototype.hasOwnProperty.call(WORLD_THEMES, value);
}

/** Resolve a world id to its full config, falling back to the default. */
export function getWorldTheme(id: WorldThemeId | null | undefined): WorldTheme {
  return id && isWorldThemeId(id) ? WORLD_THEMES[id] : WORLD_THEMES[DEFAULT_WORLD_THEME_ID];
}

/** Read the saved world id from localStorage (default on server / when unset). */
export function loadWorldThemeId(): WorldThemeId {
  if (typeof window === "undefined") return DEFAULT_WORLD_THEME_ID;
  const raw = window.localStorage.getItem(WORLD_THEME_STORAGE_KEY);
  return isWorldThemeId(raw) ? raw : DEFAULT_WORLD_THEME_ID;
}

/** Persist the selected world id and notify mounted surfaces. */
export function saveWorldThemeId(id: WorldThemeId): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORLD_THEME_STORAGE_KEY, id);
  window.dispatchEvent(new Event(WORLD_THEME_CHANGE_EVENT));
}

/* =========================================================================
 * Layer 2 — Variation "mood": how a functional variation re-shapes a world.
 *
 * A world supplies the palette + base ambience (Layer 1). The active variation
 * (Bloopy Core / Cozy Room / Robot Lab / Focus Mode / Doomscroll Rescue) then
 * re-tunes that world with a small set of knobs + a decorative overlay, so the
 * *same* world clearly differs per variation (Beach+Robot ≠ Beach+Cozy) while
 * the layout never changes.
 * ========================================================================= */

/** The variation-specific decorative overlay drawn on top of any world scene. */
export type VariationOverlay = "none" | "tech" | "protective" | "cozy" | "minimal";

export type VariationMood = {
  id: BloopyThemeId;
  label: string;
  /** Short "what this changes" line for the Appearance selector. */
  note: string;
  /** Decorative glow intensity multiplier (~0.5 calm → ~1.1 vivid). */
  glow: number;
  /** Ambient particle density 0–1 (Focus / Doomscroll thin it out). */
  density: number;
  /** Card / glow softness 0–1 (Cozy raises it). */
  softness: number;
  /** Warm comfort wash strength 0–1 (Cozy). */
  warmth: number;
  /** Which variation overlay <BloopyWorldAmbience /> layers on top. */
  overlay: VariationOverlay;
};

export const VARIATION_MOODS: Record<BloopyThemeId, VariationMood> = {
  "bloopy-core": { id: "bloopy-core", label: "Bloopy Core", note: "Balanced companion mode.", glow: 1, density: 1, softness: 0.4, warmth: 0.12, overlay: "none" },
  "cozy-room": { id: "cozy-room", label: "Cozy Room", note: "Softer, warmer, calmer.", glow: 0.95, density: 0.85, softness: 0.9, warmth: 0.75, overlay: "cozy" },
  "robot-lab": { id: "robot-lab", label: "Robot Lab", note: "Technical scanners & grids.", glow: 1.1, density: 1, softness: 0.3, warmth: 0, overlay: "tech" },
  "focus-mode": { id: "focus-mode", label: "Focus Mode", note: "Minimal, clutter-free.", glow: 0.6, density: 0.35, softness: 0.55, warmth: 0, overlay: "minimal" },
  "doomscroll-rescue": { id: "doomscroll-rescue", label: "Doomscroll Rescue", note: "Darker, protective, grounding.", glow: 0.55, density: 0.45, softness: 0.7, warmth: 0.15, overlay: "protective" },
};

export function getVariationMood(id: BloopyThemeId | null | undefined): VariationMood {
  return id && id in VARIATION_MOODS ? VARIATION_MOODS[id] : VARIATION_MOODS["bloopy-core"];
}

/** The fully-resolved visual result of combining a world + a variation. */
export type ResolvedBloopyTheme = {
  variationId: BloopyThemeId;
  worldId: WorldThemeId;
  world: WorldTheme;
  /** Effective palette: the world's colours win; classic falls back to the variation's. */
  colors: BloopyThemeColors;
  mood: VariationMood;
};

/**
 * Resolve Layer 1 (world) + Layer 2 (variation) into one visual result. The
 * world owns the palette + base ambience; the variation owns the mood + overlay.
 */
export function getResolvedBloopyTheme(variationId: BloopyThemeId, worldId: WorldThemeId): ResolvedBloopyTheme {
  const variation = getTheme(variationId);
  const world = getWorldTheme(worldId);
  return {
    variationId,
    worldId,
    world,
    colors: world.colors ?? variation.colors,
    mood: getVariationMood(variationId),
  };
}

/**
 * Expose the effective palette as `--bloopy-world-*` CSS variables, so future
 * surfaces can reference world tokens directly (e.g. `var(--bloopy-world-accent)`).
 */
export function worldCssVars(colors: BloopyThemeColors): React.CSSProperties {
  return {
    "--bloopy-world-bg": colors.bg,
    "--bloopy-world-hero": colors.cardAlt,
    "--bloopy-world-card": colors.card,
    "--bloopy-world-border": colors.cardBorder,
    "--bloopy-world-text": colors.mainText,
    "--bloopy-world-muted": colors.mutedText,
    "--bloopy-world-accent": colors.neon,
    "--bloopy-world-accent-2": colors.glow,
    "--bloopy-world-warm": colors.red,
    "--bloopy-world-glow": colors.glow,
  } as React.CSSProperties;
}
