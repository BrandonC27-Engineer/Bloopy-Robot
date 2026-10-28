"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBloopyTheme, useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import { getTheme, THEME_LIST, makeCardStyle, type BloopyTheme, type BloopyThemeColors } from "@/lib/bloopyTheme";
import { WORLD_THEME_LIST, type WorldTheme } from "@/lib/bloopyWorldThemes";
import { VariationOverlayMini, WorldMiniScene } from "@/components/BloopyWorldAmbience";
import { celebrate } from "@/lib/useBloopyReward";
import {
  BLOOPY_SOUND_CHANGE_EVENT,
  isBloopySoundEnabled,
  playBloopySound,
  setBloopySoundEnabled,
} from "@/lib/bloopySound";

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Speaker icon — shows sound waves when on, a muted slash when off. */
function SoundIcon({ className = "", enabled }: { className?: string; enabled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 9v6h3l5 4V5L7 9H4Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      {enabled ? (
        <path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      ) : (
        <path d="m16 9.5 5 5M21 9.5l-5 5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      )}
    </svg>
  );
}

/** A single selectable theme row, previewed in its own palette. */
function ThemeOption({
  theme,
  active,
  onSelect,
}: {
  theme: BloopyTheme;
  active: boolean;
  onSelect: () => void;
}) {
  const c = theme.colors;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-bloopy-sound="none"
      onClick={onSelect}
      className="bloopy-card flex w-full items-center gap-3 overflow-hidden rounded-2xl border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{
        background: `linear-gradient(160deg, ${c.cardAlt} 0%, ${c.card} 100%)`,
        borderColor: active ? c.glow : c.cardBorder,
        boxShadow: active
          ? `0 0 0 1px ${c.glow}55, 0 0 18px ${c.neon}33`
          : `0 0 0 1px ${c.neon}10, 0 8px 24px ${c.bgDeep}88`,
      }}
    >
      {/* palette swatches in this theme's own colors */}
      <span className="flex shrink-0 gap-1">
        {[c.neon, c.glow, c.red].map((color, i) => (
          <span
            key={i}
            className="h-8 w-3.5 rounded-full"
            style={{ background: color, boxShadow: i === 0 ? `0 0 8px ${color}88` : "none" }}
          />
        ))}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold" style={{ color: c.mainText }}>
          {theme.name}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: c.mutedText }}>
          {theme.tagline}
        </span>
      </span>

      <span
        className="grid h-6 w-6 shrink-0 place-items-center rounded-full border"
        style={
          active
            ? { background: c.glow, color: c.bgDeep, borderColor: c.glow, boxShadow: `0 0 12px ${c.neon}88` }
            : { borderColor: `${c.neon}40`, color: "transparent" }
        }
      >
        <CheckIcon className="h-3.5 w-3.5" />
      </span>
    </button>
  );
}

/** A small selectable World Theme preview card (its own palette). */
function WorldOption({
  world,
  palette,
  active,
  onSelect,
}: {
  world: WorldTheme;
  /** Palette to preview with (world's own, or the variation's for "classic"). */
  palette: BloopyThemeColors;
  active: boolean;
  onSelect: () => void;
}) {
  const c = palette;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      data-bloopy-sound="none"
      onClick={onSelect}
      className="bloopy-card relative flex flex-col gap-2 overflow-hidden rounded-2xl border p-2.5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{
        background: `linear-gradient(160deg, ${c.cardAlt} 0%, ${c.card} 100%)`,
        borderColor: active ? c.glow : c.cardBorder,
        boxShadow: active ? `0 0 0 1px ${c.glow}55, 0 0 16px ${c.neon}33` : `0 0 0 1px ${c.neon}10`,
      }}
    >
      {/* mini ambience preview in this world's palette */}
      <span className="relative block">
        <WorldMiniScene world={world} palette={c} />
        {active && (
          <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full" style={{ background: c.glow, color: c.bgDeep, boxShadow: `0 0 10px ${c.neon}` }}>
            <CheckIcon className="h-3 w-3" />
          </span>
        )}
      </span>
      <span className="px-0.5">
        <span className="block text-[12px] font-semibold leading-tight" style={{ color: c.mainText }}>
          {world.name}
        </span>
        <span className="mt-0.5 block text-[10px] leading-tight" style={{ color: c.mutedText }}>
          {world.description}
        </span>
      </span>
    </button>
  );
}

/**
 * Sound effects on/off — a tiny, account-free preference stored in
 * localStorage (`bloopy.sound.enabled`). Hydration-safe: renders the default
 * (on) on the server and syncs the saved value after mount; stays live via the
 * change event. Flipping it on plays a soft confirmation tap.
 */
function SoundToggle({ colors }: { colors: BloopyThemeColors }) {
  const c = colors;
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
    setEnabled(isBloopySoundEnabled());
    const sync = () => setEnabled(isBloopySoundEnabled());
    window.addEventListener(BLOOPY_SOUND_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(BLOOPY_SOUND_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  function toggle() {
    const next = !enabled;
    setEnabled(next);
    setBloopySoundEnabled(next);
    if (next) playBloopySound("success"); // gentle confirmation when turning on
  }

  return (
    <section className="mt-5">
      <div
        className="flex items-center gap-3 rounded-2xl border p-3.5"
        style={{ background: `linear-gradient(160deg, ${c.cardAlt} 0%, ${c.card} 100%)`, borderColor: c.cardBorder }}
      >
        <span
          aria-hidden="true"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border"
          style={{ color: c.glow, borderColor: `${c.neon}44`, background: c.bgDeep, boxShadow: `0 0 12px ${c.neon}22` }}
        >
          <SoundIcon className="h-5 w-5" enabled={enabled} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold" style={{ color: c.mainText }}>
            Sound effects
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: c.mutedText }}>
            Gentle Bloopy taps and chimes
          </span>
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label="Sound effects"
          data-bloopy-sound="none"
          onClick={toggle}
          className="relative h-7 w-12 shrink-0 rounded-full border transition-colors duration-200"
          style={{
            borderColor: enabled ? c.glow : c.cardBorder,
            background: enabled ? `linear-gradient(90deg, ${c.neon}, ${c.glow})` : c.bgDeep,
            boxShadow: enabled ? `0 0 12px ${c.neon}55` : "none",
          }}
        >
          <span
            className="absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full transition-all duration-200"
            style={{ left: enabled ? "calc(100% - 1.375rem)" : "0.125rem", background: enabled ? c.bgDeep : c.mutedText }}
          />
        </button>
      </div>
    </section>
  );
}

export default function AppearanceSettingsPage() {
  const COLORS = useBloopyThemeColors();
  const { themeId, theme, setTheme, worldId, world, setWorld, mood } = useBloopyTheme();
  // The "classic" world previews in the active variation's own palette.
  const variationColors = getTheme(themeId).colors;

  return (
    <main
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: theme.heroStyle.gridOpacity,
          backgroundImage: `linear-gradient(${COLORS.neon} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.neon} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at 50% 20%, black, transparent 80%)",
        }}
      />

      {/* ===== Header ===== */}
      <header className="relative z-10 px-5 pt-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: COLORS.softText }}
        >
          <ChevronIcon className="h-4 w-4" />
          Settings
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Appearance
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Choose how Bloopy feels.
          </p>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* Live preview tile — reflects BOTH the world and the variation */}
        <section className="overflow-hidden rounded-3xl border" style={makeCardStyle(COLORS)}>
          <div
            className="relative flex h-32 items-center justify-center overflow-hidden"
            style={{ background: `radial-gradient(100% 120% at 50% 0%, ${COLORS.cardAlt}, ${COLORS.bgDeep})` }}
          >
            {/* Layer 1: the world's mini scene */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 scale-[1.6]">
              <WorldMiniScene world={world} palette={COLORS} />
            </div>
            {/* Layer 2: the variation's overlay */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-0">
              <VariationOverlayMini overlay={mood.overlay} C={COLORS} />
            </div>
            <div className="relative grid place-items-center">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-16 w-16 rounded-full blur-2xl"
                style={{ background: COLORS.neon, opacity: 0.4 }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-14 w-14 rounded-full"
                style={{ border: `2px solid ${COLORS.glow}66`, boxShadow: `0 0 22px ${COLORS.neon}66` }}
              />
              <img src={LOGO_SRC} alt="Bloopy" className="relative h-14 w-14 object-contain" />
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-xs" style={{ color: COLORS.softText }}>
              Live preview
            </span>
            <span className="text-[11px] font-semibold" style={{ color: COLORS.glow }}>
              {theme.name} · {world.name}
            </span>
          </div>
        </section>

        {/* Sound effects — gentle Bloopy taps and chimes (device-only setting) */}
        <SoundToggle colors={COLORS} />

        {/* Variation = what Bloopy mode you're using */}
        <div className="mt-5 mb-1.5 flex items-center gap-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
            Variation
          </span>
          <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${COLORS.neon}33, transparent)` }} />
        </div>
        <p className="mb-3 px-1 text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>
          Variation changes what Bloopy is helping with — and re-tunes the world&apos;s mood ({mood.note.toLowerCase().replace(/\.$/, "")}).
        </p>

        <section className="flex flex-col gap-2.5" role="radiogroup" aria-label="Choose a Bloopy variation">
          {THEME_LIST.map((t) => (
            <ThemeOption
              key={t.id}
              theme={t}
              active={t.id === themeId}
              onSelect={() => {
                setTheme(t.id);
                // changing the variation is a meaningful action → reward feedback
                celebrate("success", { text: "New mood" });
              }}
            />
          ))}
        </section>

        {/* World Theme = how the app looks */}
        <div className="mt-7 mb-1.5 flex items-center gap-3 px-1">
          <span className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
            World Theme
          </span>
          <span className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${COLORS.neon}33, transparent)` }} />
        </div>
        <p className="mb-3 px-1 text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>
          World Theme changes the visual world. Same layout, same features.
        </p>

        <section className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="Choose a world theme">
          {WORLD_THEME_LIST.map((w) => (
            <WorldOption
              key={w.id}
              world={w}
              palette={w.colors ?? variationColors}
              active={w.id === worldId}
              onSelect={() => {
                setWorld(w.id);
                // changing the world theme is a meaningful action → reward feedback
                celebrate("success", { text: "New world" });
              }}
            />
          ))}
        </section>

        <p className="mt-5 px-1 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
          Your variation and world theme are saved on this device and applied across Home, the Unstuck Toolkit, and Bloopy&apos;s navigation.
        </p>
      </div>
    </main>
  );
}
