"use client";

import type React from "react";
import { useEffect, useState } from "react";
import { useBloopyThemeColors, useBloopyWorld } from "@/components/BloopyThemeProvider";
import { BLOOPY_REWARD_EVENT, type BloopyCelebrationLevel, type BloopyRewardDetail } from "@/lib/useBloopyReward";
import type { WorldParticle } from "@/lib/bloopyWorldThemes";

/**
 * BloopyRewardToast — the app-wide *sparkle* reward surface for all three
 * microinteraction tiers (see lib/useBloopyReward.ts):
 *
 *   • "tap"       → a small, soft sparkle near the press.
 *   • "success"   → a brighter themed burst + ring (a satisfying little win).
 *   • "milestone" → a wider, theme-specific particle burst (<1s) for rare big
 *                   moments, with an extra outer ring. Still calm — no confetti
 *                   overload, no flashing, no streak pressure.
 *
 * Each world skins the particles differently (shape + colour), using the active
 * theme tokens. It's fixed, aria-hidden, pointer-events-none, so it never blocks
 * clicks. Any provided label is announced through a visually hidden aria-live
 * region only (accessibility), never shown on screen. Under prefers-reduced-
 * motion every burst collapses to a brief opacity flash (see globals.css).
 *
 * Performance: particles are a handful of tiny <span>s (no canvas, no library),
 * each burst removes itself after a short timeout, and only the last few bursts
 * are ever kept on screen.
 */

type Burst = { id: number; x?: number; y?: number; level: BloopyCelebrationLevel };

let counter = 0;

/** Particle shapes the worlds can use (all cheap, CSS-only). */
type BurstShape = "dot" | "ring" | "square" | "star";

/** A 5-point star, drawn with clip-path (no assets). */
const STAR_CLIP =
  "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)";

/** 8 directions for tap / success bursts (deterministic, kept subtle). */
const SUCCESS_DIRS = [
  { tx: 0, ty: -26 },
  { tx: 22, ty: -14 },
  { tx: 26, ty: 6 },
  { tx: 14, ty: 22 },
  { tx: -14, ty: 22 },
  { tx: -26, ty: 6 },
  { tx: -22, ty: -14 },
  { tx: 0, ty: 26 },
];

/** 14 directions on a wider ring for the rare milestone burst. */
const MILESTONE_DIRS = Array.from({ length: 14 }, (_, i) => {
  const a = (i / 14) * Math.PI * 2;
  const r = i % 2 === 0 ? 46 : 34; // alternate near/far for a fuller, soft spray
  return { tx: Math.round(Math.cos(a) * r), ty: Math.round(Math.sin(a) * r) };
});

type WorldBurst = { colors: string[]; shapes: BurstShape[]; soft?: boolean };

/**
 * Theme-specific particle recipe per world, built from the active palette
 * tokens so it re-skins automatically. `soft` adds a gentle blur (firefly /
 * cloud glow).
 */
function worldBurst(particle: WorldParticle, C: ReturnType<typeof useBloopyThemeColors>): WorldBurst {
  switch (particle) {
    case "waves": // Beach Paradise — tiny shells, aqua sparkles, sunset dots
      return { colors: [C.glow, C.neon, C.red], shapes: ["dot", "ring"] };
    case "sand": // Desert Oasis — warm dust + tiny cactus sparks
      return { colors: [C.neon, C.glow, C.red], shapes: ["dot", "square"] };
    case "stars": // Space Station — stars, orbit dots, tiny satellite blips
      return { colors: [C.glow, C.neon, C.softText], shapes: ["star", "dot"] };
    case "bubbles": // Underwater — bubbles + aqua rings
      return { colors: [C.glow, C.neon], shapes: ["ring", "dot"] };
    case "fireflies": // Forest Garden — fireflies + leaf specks
      return { colors: [C.glow, C.neon, C.red], shapes: ["dot"], soft: true };
    case "snow": // Snowy Cabin — snowflakes + soft frost sparkles
      return { colors: [C.glow, C.softText], shapes: ["star", "dot"] };
    case "grid": // Cyber City — neon pixels + scanline blips
      return { colors: [C.glow, C.neon, C.red], shapes: ["square"] };
    case "embers": // Volcano Lab — ember sparks + lava glow
      return { colors: [C.red, C.glow, C.neon], shapes: ["dot", "square"] };
    case "clouds": // Cloud Sky — soft cloud puffs + lavender sparkles
      return { colors: [C.glow, C.neon, C.softText], shapes: ["dot"], soft: true };
    case "craters": // Moon Base — lunar dust, silver stars, crater rings
      return { colors: [C.glow, C.softText, C.neon], shapes: ["star", "ring", "dot"] };
    default: // Classic Bloopy — blue sparks
      return { colors: [C.neon, C.glow, C.red], shapes: ["dot", "star"] };
  }
}

/** Per-level intensity (particle set + glow size + how long it lingers). */
const LEVEL_SPEC: Record<BloopyCelebrationLevel, { dirs: { tx: number; ty: number }[]; glow: number; size: number; outerRing: boolean; ttl: number }> = {
  tap: { dirs: SUCCESS_DIRS, glow: 30, size: 2.5, outerRing: false, ttl: 700 },
  success: { dirs: SUCCESS_DIRS, glow: 40, size: 3, outerRing: false, ttl: 760 },
  milestone: { dirs: MILESTONE_DIRS, glow: 58, size: 3.5, outerRing: true, ttl: 950 },
};

/** Build the inline style for one themed particle (shape-aware). */
function particleStyle(shape: BurstShape, color: string, size: number, soft: boolean, dir: { tx: number; ty: number }, delay: number): React.CSSProperties {
  const base: React.CSSProperties = {
    left: "50%",
    top: "50%",
    marginLeft: -size / 2,
    marginTop: -size / 2,
    width: size,
    height: size,
    boxShadow: `0 0 6px ${color}`,
    filter: soft ? "blur(0.4px)" : undefined,
    ["--tx" as string]: `${dir.tx}px`,
    ["--ty" as string]: `${dir.ty}px`,
    animationDelay: `${delay}ms`,
  };
  switch (shape) {
    case "ring":
      return { ...base, background: "transparent", border: `1px solid ${color}`, borderRadius: "9999px" };
    case "square":
      return { ...base, background: color, borderRadius: 0 };
    case "star":
      return { ...base, background: color, clipPath: STAR_CLIP, boxShadow: "none", width: size + 2, height: size + 2, marginLeft: -(size + 2) / 2, marginTop: -(size + 2) / 2 };
    default: // dot
      return { ...base, background: color, borderRadius: "9999px" };
  }
}

export default function BloopyRewardToast() {
  const C = useBloopyThemeColors();
  const world = useBloopyWorld();
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [announce, setAnnounce] = useState("");

  useEffect(() => {
    const onReward = (e: Event) => {
      const d = (e as CustomEvent<BloopyRewardDetail>).detail ?? {};
      const level = d.level ?? "tap";
      const id = ++counter;
      setBursts((list) => [...list.slice(-4), { id, x: d.x, y: d.y, level }]);
      if (d.text) setAnnounce(d.text);
      window.setTimeout(() => setBursts((list) => list.filter((b) => b.id !== id)), LEVEL_SPEC[level].ttl);
    };
    window.addEventListener(BLOOPY_REWARD_EVENT, onReward);
    return () => window.removeEventListener(BLOOPY_REWARD_EVENT, onReward);
  }, []);

  const recipe = worldBurst(world.particle, C);
  const primary = recipe.colors[0];

  return (
    <>
      {/* accessibility-only: announce the action, never shown on screen */}
      <span className="sr-only" role="status" aria-live="polite">
        {announce}
      </span>

      {bursts.length > 0 && (
        <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[60]">
          {bursts.map((burst) => {
            const spec = LEVEL_SPEC[burst.level];
            const left = burst.x != null ? burst.x : "50%";
            const top = burst.y != null ? Math.max(40, burst.y) : "22%";
            return (
              <div key={burst.id} className="absolute" style={{ left, top, transform: "translate(-50%, -50%)" }}>
                {/* soft glow burst */}
                <span
                  className="bloopy-burst-glow absolute rounded-full blur-md"
                  style={{ left: "50%", top: "50%", marginLeft: -spec.glow / 2, marginTop: -spec.glow / 2, width: spec.glow, height: spec.glow, background: `radial-gradient(circle, ${primary}, transparent 70%)` }}
                />
                {/* ring pulse */}
                <span
                  className="bloopy-burst-ring absolute rounded-full"
                  style={{ left: "50%", top: "50%", marginLeft: -11, marginTop: -11, width: 22, height: 22, border: `1.5px solid ${primary}`, boxShadow: `0 0 8px ${primary}66` }}
                />
                {/* milestone only: a wider, slightly slower second ring */}
                {spec.outerRing && (
                  <span
                    className="bloopy-burst-ring-wide absolute rounded-full"
                    style={{ left: "50%", top: "50%", marginLeft: -16, marginTop: -16, width: 32, height: 32, border: `1.5px solid ${recipe.colors[1] ?? primary}`, boxShadow: `0 0 10px ${primary}55` }}
                  />
                )}
                {/* tiny themed particles (shape + colour vary per world) */}
                {spec.dirs.map((dir, i) => {
                  const shape = recipe.shapes[i % recipe.shapes.length];
                  const color = recipe.colors[i % recipe.colors.length];
                  return (
                    <span
                      key={i}
                      className="bloopy-burst-particle absolute"
                      style={particleStyle(shape, color, spec.size, !!recipe.soft, dir, (i % 4) * 20)}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
