"use client";

import { useEffect, useState } from "react";
import {
  APPEARANCE_CHANGE_EVENT,
  DEFAULT_APPEARANCE_PREFERENCES,
  loadAppearancePreferences,
} from "@/lib/appearance";

/**
 * Mounted once inside the protected Bloopy layout, wrapping the rest of the
 * shell. Applies `reduce-glow` / `compact-layout` classes based on saved
 * appearance preferences, and re-applies them when the settings page changes
 * a preference (via APPEARANCE_CHANGE_EVENT) without needing a full reload.
 */
export default function AppearanceProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState(DEFAULT_APPEARANCE_PREFERENCES);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
    setPreferences(loadAppearancePreferences());

    function handleChange() {
      setPreferences(loadAppearancePreferences());
    }

    window.addEventListener(APPEARANCE_CHANGE_EVENT, handleChange);
    window.addEventListener("storage", handleChange);
    return () => {
      window.removeEventListener(APPEARANCE_CHANGE_EVENT, handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  const classNames = [
    preferences.reduceGlow && "reduce-glow",
    preferences.compactLayout && "compact-layout",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classNames || undefined}>{children}</div>;
}
