"use client";

import type React from "react";
import { useCallback } from "react";
import { playBloopySound, type BloopySoundType } from "@/lib/bloopySound";

/**
 * Bloopy reward feedback — a tiny, decorative event bus for the "satisfying
 * little win" loop: action → sparkle burst + soft sound + (optional) Bloopy
 * reaction.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE 3-LEVEL MICROINTERACTION API (use this from any page)
 *
 *   celebrate("tap")        → Tiny feedback for ordinary taps.
 *                             Soft sparkle + gentle tap sound. No Bloopy bounce,
 *                             so nothing wiggles on every press.
 *
 *   celebrate("success")    → Reward feedback for completing a meaningful action
 *                             (saved a journal entry, finished a check-in,
 *                             completed a task, changed theme, finished an
 *                             unstuck tool). Brighter themed burst + soft success
 *                             chime + a small happy Bloopy bounce.
 *
 *   celebrate("milestone")  → Rare celebration for a bigger moment (first
 *                             check-in / journal of the day, all tasks done,
 *                             end-of-day recap finished). A wider, theme-specific
 *                             particle burst (<1s) + a happy Bloopy pulse. Use
 *                             sparingly — gate it (see lib/bloopyMilestone.ts) so
 *                             it never becomes guilt-y streak pressure.
 *
 * Each call takes optional `opts`:
 *   { text?, x?, y?, sound? }
 *     • text   — screen-reader-only announcement (never shown on screen).
 *     • x, y   — viewport coords to anchor the burst near the tap (omit to
 *                center it; pass an event's clientX/clientY).
 *     • sound  — override the level's default sound, or `null` to stay silent.
 *
 * Example:
 *   const firstToday = isFirstMilestoneToday("journal");
 *   celebrate(firstToday ? "milestone" : "success", { text: "Reflection saved" });
 * ─────────────────────────────────────────────────────────────────────────
 *
 * It's intentionally lightweight (two window events, no state library, no DB):
 *   • BLOOPY_REWARD_EVENT → <BloopyRewardToast /> plays a themed sparkle burst.
 *   • BLOOPY_REACT_EVENT  → the hero + center-nav Bloopy play a happy bounce.
 *
 * Safety / accessibility (all enforced downstream):
 *   • Motion is CSS-driven and has prefers-reduced-motion fallbacks: the burst
 *     becomes a soft opacity/glow flash instead of moving particles.
 *   • Sound respects the user's `bloopy.sound.enabled` setting and only ever
 *     plays from these gesture-driven calls — never on load.
 *   • It never delays navigation: feedback fires synchronously and lets a
 *     native <Link> / router.push route immediately (no setTimeout around it).
 */

export const BLOOPY_REWARD_EVENT = "bloopy:reward";
export const BLOOPY_REACT_EVENT = "bloopy:react";

/** The three microinteraction tiers. See {@link celebrate}. */
export type BloopyCelebrationLevel = "tap" | "success" | "milestone";

export type BloopyRewardDetail = {
  /** Optional, screen-reader-only label (never shown visually). */
  text?: string;
  /** Optional viewport coordinates to anchor the sparkle burst near the tap. */
  x?: number;
  y?: number;
  /**
   * Gentle sound to play alongside the sparkle. Defaults to a soft "tap"; pass
   * `null` to stay silent (the visual burst still plays).
   */
  sound?: BloopySoundType | null;
  /**
   * Visual intensity tier of the burst (drives particle count / spread in
   * <BloopyRewardToast />). Defaults to "tap".
   */
  level?: BloopyCelebrationLevel;
};

/** Options accepted by {@link celebrate} (everything except the level itself). */
export type BloopyCelebrateOptions = Omit<BloopyRewardDetail, "level">;

/** Which Bloopy reaction (if any) each level triggers. */
export type BloopyReactionLevel = "success" | "milestone";

/** Default sound per level (override per-call via `opts.sound`). */
const LEVEL_SOUND: Record<BloopyCelebrationLevel, BloopySoundType> = {
  tap: "tap",
  success: "success",
  milestone: "success",
};

/** Fire a sparkle burst (optionally anchored near a tap) + a soft sound. */
export function fireBloopyReward(detail: BloopyRewardDetail): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<BloopyRewardDetail>(BLOOPY_REWARD_EVENT, { detail }));
  // undefined → default soft "tap"; explicit null → silent.
  const sound = detail.sound === undefined ? "tap" : detail.sound;
  if (sound) playBloopySound(sound);
}

/**
 * Ask Bloopy (the hero on Home + the center nav button) to play a happy
 * reaction. Only ever called for "success"/"milestone" — ordinary taps never
 * trigger it, so Bloopy doesn't constantly wiggle.
 */
export function fireBloopyReaction(level: BloopyReactionLevel = "success"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<{ level: BloopyReactionLevel }>(BLOOPY_REACT_EVENT, { detail: { level } }));
}

/**
 * The main microinteraction entry point. Pick a level (see the file header for
 * the full guide) and optionally pass `{ text, x, y, sound }`.
 *
 *   celebrate("tap", { x, y })             // ordinary tap
 *   celebrate("success", { text: "Saved" }) // meaningful action
 *   celebrate("milestone", { text: "..." }) // rare big moment
 *
 * Back-compat: older call sites pass a detail object directly
 * (`celebrate({ text: "Saved" })`); that's still treated as a "success".
 */
export function celebrate(
  level: BloopyCelebrationLevel | BloopyRewardDetail = "success",
  opts: BloopyCelebrateOptions = {}
): void {
  // Legacy object form → a "success" reward.
  if (typeof level === "object") {
    celebrate("success", level);
    return;
  }
  const sound = opts.sound === undefined ? LEVEL_SOUND[level] : opts.sound;
  fireBloopyReward({ ...opts, level, sound });
  // Tiny taps stay calm (no Bloopy bounce); success/milestone get a reaction.
  if (level !== "tap") fireBloopyReaction(level === "milestone" ? "milestone" : "success");
}

/**
 * Returns a click handler for ordinary action cards/buttons (the "tap" tier):
 * it pulses the tapped element's glow and fires a themed sparkle burst + soft
 * sound — and nothing else, so a native <Link> navigates immediately with zero
 * delay and Bloopy doesn't bounce on every press. The optional `text` is a
 * screen-reader-only announcement; `sound` defaults to the soft "tap".
 */
export function useBloopyTap() {
  return useCallback(
    (text?: string, sound: BloopySoundType | null = "tap") => (e: React.MouseEvent) => {
      const el = e.currentTarget as HTMLElement | null;
      if (el) {
        el.classList.add("bloopy-card-burst");
        window.setTimeout(() => el.classList.remove("bloopy-card-burst"), 600);
      }
      fireBloopyReward({ text, x: e.clientX, y: e.clientY, sound, level: "tap" });
    },
    []
  );
}
