"use client";

import { useEffect } from "react";
import { fireBloopyReward } from "@/lib/useBloopyReward";
import { playBloopySound, type BloopySoundType } from "@/lib/bloopySound";

/**
 * BloopyInteractionLayer — one global, delegated interaction layer.
 *
 * Instead of wiring a tap effect onto every button forever, this mounts a
 * single capture-phase `pointerdown` (and `keydown`) listener on the document.
 * When a press lands on a common interactive target it plays a soft, gentle
 * sound and a theme-aware sparkle near the pointer — reusing the existing
 * reward bus (so the sparkle is themed and already has a reduced-motion
 * opacity-flash fallback) and the existing Web Audio engine.
 *
 * It is deliberately non-intrusive:
 *   • The listener is `passive` and never calls preventDefault — the real
 *     click/navigation happens exactly as before, with zero delay (no
 *     setTimeout around routing anywhere).
 *   • Elements that already provide their own feedback opt out declaratively:
 *       data-bloopy-sound="none"   → this layer ignores the element entirely
 *       data-bloopy-sound="success|nav|bloopy|tap|disabled" → use that sound
 *       data-bloopy-effect="none"  → play the sound but skip the sparkle
 *   • Disabled controls get at most a very soft muted tap — never a success
 *     chime or sparkle — and the CSS keeps them `cursor-not-allowed`.
 *   • Typing is never interrupted: keystrokes don't trigger the pointer path,
 *     and the keyboard path bails for inputs / textareas / selects / editables.
 */

/** Common clickable targets that should feel alive by default. */
const INTERACTIVE_SELECTOR = [
  "button",
  "a[href]",
  '[role="button"]',
  'input[type="button"]',
  'input[type="submit"]',
  'input[type="checkbox"]',
  'input[type="radio"]',
  "select",
  "[data-bloopy-tap]",
  "[data-bloopy-interactive]",
  ".cursor-pointer",
].join(",");

/** Text-entry fields — a soft tap on first focus, but never a sparkle. */
const TEXT_FIELD_SELECTOR =
  'input:not([type="button"]):not([type="submit"]):not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]), textarea';

/** Targets the keyboard path may activate (no text fields here). */
const KEY_ACTIVATABLE = 'button, a[href], [role="button"], [data-bloopy-tap], [data-bloopy-interactive]';

const NAMED_SOUNDS = new Set<BloopySoundType>(["tap", "success", "nav", "bloopy", "disabled"]);

/** Resolve the nearest declared sound (default soft "tap"). */
function resolveSound(el: Element): BloopySoundType {
  const holder = el.closest("[data-bloopy-sound]");
  const value = holder?.getAttribute("data-bloopy-sound") ?? "";
  return NAMED_SOUNDS.has(value as BloopySoundType) ? (value as BloopySoundType) : "tap";
}

function isDisabledControl(el: Element): boolean {
  return (el as HTMLButtonElement).disabled === true || el.getAttribute("aria-disabled") === "true";
}

export default function BloopyInteractionLayer() {
  useEffect(() => {
    function feedback(el: Element, sound: BloopySoundType, x?: number, y?: number) {
      // `data-bloopy-effect="none"` → sound only (used where a custom sparkle
      // already plays, or where a sparkle would be visually noisy).
      if (el.closest('[data-bloopy-effect="none"]')) {
        playBloopySound(sound);
      } else {
        fireBloopyReward({ x, y, sound });
      }
    }

    function onPointerDown(e: PointerEvent) {
      // primary press only (ignore right/middle button)
      if (e.button > 0) return;
      const start = e.target as Element | null;
      if (!start?.closest) return;

      // Text fields: a soft tap on *first* focus only — never while clicking
      // around inside an already-focused field, and never a sparkle over text.
      const field = start.closest(TEXT_FIELD_SELECTOR);
      if (field) {
        if (document.activeElement !== field) playBloopySound("tap");
        return;
      }

      const el = start.closest(INTERACTIVE_SELECTOR);
      if (!el) return;

      // Opt out: the element (or an ancestor) handles its own feedback.
      if (start.closest('[data-bloopy-sound="none"]')) return;

      // Disabled: a very soft muted tap, nothing celebratory.
      if (isDisabledControl(el)) {
        playBloopySound("disabled");
        return;
      }

      feedback(el, resolveSound(el), e.clientX, e.clientY);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.repeat) return;
      if (e.key !== "Enter" && e.key !== " ") return;
      const active = document.activeElement as HTMLElement | null;
      if (!active?.closest) return;
      // Don't interfere with typing / selecting / editing.
      if (active.closest(TEXT_FIELD_SELECTOR) || active.tagName === "SELECT" || active.isContentEditable) return;

      const el = active.closest(KEY_ACTIVATABLE);
      if (!el) return;
      if (el.closest('[data-bloopy-sound="none"]')) return;
      if (isDisabledControl(el)) return;

      // Anchor the sparkle at the focused control's center (no pointer coords).
      const r = el.getBoundingClientRect();
      feedback(el, resolveSound(el), r.left + r.width / 2, r.top + r.height / 2);
    }

    // Capture phase + passive: we observe presses early, never block them.
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
    document.addEventListener("keydown", onKeyDown, { capture: true });
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true });
      document.removeEventListener("keydown", onKeyDown, { capture: true });
    };
  }, []);

  return null;
}
