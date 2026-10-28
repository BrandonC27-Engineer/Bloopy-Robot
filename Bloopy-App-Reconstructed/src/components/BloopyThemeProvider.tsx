"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_THEME_ID,
  getTheme,
  loadThemeId,
  saveThemeId,
  themeCssVars,
  THEME_CHANGE_EVENT,
  type BloopyTheme,
  type BloopyThemeColors,
  type BloopyThemeId,
} from "@/lib/bloopyTheme";
import {
  DEFAULT_WORLD_THEME_ID,
  getResolvedBloopyTheme,
  getWorldTheme,
  loadWorldThemeId,
  saveWorldThemeId,
  worldCssVars,
  WORLD_THEME_CHANGE_EVENT,
  type VariationMood,
  type WorldTheme,
  type WorldThemeId,
} from "@/lib/bloopyWorldThemes";

/**
 * Provides the active Bloopy UI theme to the protected app shell.
 *
 * Two independent layers combine here:
 *   • the functional *variation* (Bloopy Core / Cozy Room / …) — behavior +
 *     hero decor intensity, persisted as `bloopy.ui.theme`.
 *   • the visual *world theme* (Beach Paradise / Space Station / …) — a palette
 *     skin, persisted as `bloopy.ui.worldTheme`.
 *
 * The provider resolves an *effective* palette: when a non-classic world is
 * active its colours win; otherwise the variation's own colours are used. That
 * effective palette is what `useBloopyThemeColors()` returns, so every surface
 * already reading it re-skins automatically — no layout or per-component change.
 *
 * To stay hydration-safe, the first render always uses the defaults (matching
 * the server markup); saved values are read from localStorage after mount and
 * applied. Saves elsewhere update every mounted surface live via the change
 * events, and cross-tab changes via "storage".
 */

type BloopyThemeContextValue = {
  /** Functional variation id (what Bloopy mode you're using). */
  themeId: BloopyThemeId;
  /** Effective theme: the variation, with the world's palette merged in. */
  theme: BloopyTheme;
  setTheme: (id: BloopyThemeId) => void;
  /** Visual world id (how the app looks). */
  worldId: WorldThemeId;
  world: WorldTheme;
  setWorld: (id: WorldThemeId) => void;
  /** How the active variation re-shapes the world (glow/density/overlay). */
  mood: VariationMood;
};

const defaultVariation = getTheme(DEFAULT_THEME_ID);
const defaultResolved = getResolvedBloopyTheme(DEFAULT_THEME_ID, DEFAULT_WORLD_THEME_ID);

const BloopyThemeContext = createContext<BloopyThemeContextValue>({
  themeId: DEFAULT_THEME_ID,
  theme: defaultVariation,
  setTheme: () => {},
  worldId: DEFAULT_WORLD_THEME_ID,
  world: getWorldTheme(DEFAULT_WORLD_THEME_ID),
  setWorld: () => {},
  mood: defaultResolved.mood,
});

export default function BloopyThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeId, setThemeId] = useState<BloopyThemeId>(DEFAULT_THEME_ID);
  const [worldId, setWorldId] = useState<WorldThemeId>(DEFAULT_WORLD_THEME_ID);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount */
    setThemeId(loadThemeId());
    setWorldId(loadWorldThemeId());
    /* eslint-enable react-hooks/set-state-in-effect */

    function handleChange() {
      setThemeId(loadThemeId());
      setWorldId(loadWorldThemeId());
    }

    window.addEventListener(THEME_CHANGE_EVENT, handleChange);
    window.addEventListener(WORLD_THEME_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(THEME_CHANGE_EVENT, handleChange);
      window.removeEventListener(WORLD_THEME_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const value = useMemo<BloopyThemeContextValue>(() => {
    const variation = getTheme(themeId);
    // Resolve Layer 1 (world) + Layer 2 (variation) into one visual result.
    const resolved = getResolvedBloopyTheme(themeId, worldId);
    const colors: BloopyThemeColors = resolved.colors;
    const theme: BloopyTheme = resolved.world.colors ? { ...variation, colors } : variation;

    return {
      themeId,
      theme,
      setTheme: (id: BloopyThemeId) => {
        setThemeId(id);
        saveThemeId(id);
      },
      worldId,
      world: resolved.world,
      setWorld: (id: WorldThemeId) => {
        setWorldId(id);
        saveWorldThemeId(id);
      },
      mood: resolved.mood,
    };
  }, [themeId, worldId]);

  return (
    <BloopyThemeContext.Provider value={value}>
      {/* Expose the effective theme as CSS variables on a transparent wrapper so
          any surface can read shared tokens (var(--bloopy-*) / var(--bloopy-world-*)).
          display:contents keeps the wrapper out of layout so page sizing is unaffected. */}
      <div
        data-bloopy-theme={value.themeId}
        data-bloopy-world={value.worldId}
        style={{ display: "contents", ...themeCssVars(value.theme), ...worldCssVars(value.theme.colors) }}
      >
        {children}
      </div>
    </BloopyThemeContext.Provider>
  );
}

/** Full theme context: active ids, resolved configs, and setters. */
export function useBloopyTheme(): BloopyThemeContextValue {
  return useContext(BloopyThemeContext);
}

/** Convenience accessor for just the active (effective) color tokens. */
export function useBloopyThemeColors(): BloopyThemeColors {
  return useContext(BloopyThemeContext).theme.colors;
}

/** Convenience accessor for the active world theme (id, palette, particle). */
export function useBloopyWorld(): WorldTheme {
  return useContext(BloopyThemeContext).world;
}

/** The active variation's mood: how it re-shapes the world (glow/density/overlay). */
export function useBloopyMood(): VariationMood {
  return useContext(BloopyThemeContext).mood;
}
