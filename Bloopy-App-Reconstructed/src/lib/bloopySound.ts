"use client";

/**
 * Bloopy sound effects — tiny, gentle, *browser-generated* feedback.
 *
 * No audio files are shipped or fetched: every sound is synthesised on the fly
 * with the Web Audio API (a couple of short, soft oscillator blips). This keeps
 * the bundle tiny and lets each sound stay calm, low-volume, and under ~250ms —
 * Duolingo-style satisfaction without the harsh beeps or pressure.
 *
 * Safety rules baked in here:
 *   • SSR-safe — every entry point no-ops when there is no `window`.
 *   • Never autoplays. The AudioContext is created lazily on the first
 *     `playBloopySound(...)` call, which only ever runs from a real user
 *     gesture (click / tap), so browsers allow it and nothing plays on load.
 *   • Respects the user's `bloopy.sound.enabled` preference (default on).
 *   • Fully wrapped in try/catch — if audio is blocked or unsupported it stays
 *     silent instead of throwing.
 */

export type BloopySoundType = "tap" | "success" | "nav" | "disabled" | "bloopy";

/** localStorage key for the on/off preference (no account / DB needed). */
export const BLOOPY_SOUND_STORAGE_KEY = "bloopy.sound.enabled";

/** Dispatched on `window` whenever the preference changes, so toggles sync live. */
export const BLOOPY_SOUND_CHANGE_EVENT = "bloopy:sound-change";

/** Sound is on by default — but only ever *after* a user interaction. */
const DEFAULT_ENABLED = true;

/** Master ceiling so the whole system stays gentle no matter the sound. */
const MASTER_GAIN = 0.5;

/** Read the saved preference (default on; safe on the server). */
export function isBloopySoundEnabled(): boolean {
  if (typeof window === "undefined") return DEFAULT_ENABLED;
  try {
    const raw = window.localStorage.getItem(BLOOPY_SOUND_STORAGE_KEY);
    if (raw === null) return DEFAULT_ENABLED;
    return raw !== "false";
  } catch {
    return DEFAULT_ENABLED;
  }
}

/** Persist the preference and notify any mounted toggles. */
export function setBloopySoundEnabled(on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BLOOPY_SOUND_STORAGE_KEY, on ? "true" : "false");
    window.dispatchEvent(new Event(BLOOPY_SOUND_CHANGE_EVENT));
  } catch {
    /* storage may be unavailable (private mode) — ignore */
  }
}

/* ---------- lazy, shared audio graph ---------- */

let audioCtx: AudioContext | null = null;
let master: GainNode | null = null;

/** Create (or resume) the shared AudioContext lazily, only on user gesture. */
function getContext(): { ctx: AudioContext; out: GainNode } | null {
  if (typeof window === "undefined") return null;
  try {
    if (!audioCtx) {
      const AC: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      audioCtx = new AC();
      master = audioCtx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(audioCtx.destination);
    }
    // A gesture-triggered call can resume a context the browser auto-suspended.
    if (audioCtx.state === "suspended") void audioCtx.resume();
    if (!master) {
      master = audioCtx.createGain();
      master.gain.value = MASTER_GAIN;
      master.connect(audioCtx.destination);
    }
    return { ctx: audioCtx, out: master };
  } catch {
    return null;
  }
}

/** A single soft, enveloped blip (quick attack, exponential decay). */
function blip(
  ctx: AudioContext,
  out: GainNode,
  opts: { freq: number; freqTo?: number; type?: OscillatorType; start?: number; dur: number; gain: number }
): void {
  const t0 = ctx.currentTime + (opts.start ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.freqTo) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.freqTo), t0 + opts.dur);
  }
  // soft attack → gentle decay; floor at a tiny positive value for exp ramps
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  osc.connect(g).connect(out);
  osc.start(t0);
  osc.stop(t0 + opts.dur + 0.03);
}

/**
 * Play a gentle, generated Bloopy sound. No-op on the server, when sound is
 * disabled, or if the audio context can't be used. Always safe to call from a
 * click handler — it never throws and never blocks.
 */
export function playBloopySound(type: BloopySoundType): void {
  if (typeof window === "undefined") return;
  if (!isBloopySoundEnabled()) return;
  const audio = getContext();
  if (!audio) return;
  const { ctx, out } = audio;
  try {
    switch (type) {
      case "tap":
        // tiny soft "bloop" — a single mellow blip with a slight downward glide
        blip(ctx, out, { freq: 440, freqTo: 360, type: "sine", dur: 0.09, gain: 0.06 });
        break;
      case "success":
        // gentle two-note chime (rising major-ish) — feels like a soft little win
        blip(ctx, out, { freq: 659, type: "triangle", dur: 0.12, gain: 0.06 });
        blip(ctx, out, { freq: 988, type: "triangle", start: 0.085, dur: 0.16, gain: 0.05 });
        break;
      case "nav":
        // soft, airy tick/whoosh for moving around
        blip(ctx, out, { freq: 520, freqTo: 660, type: "sine", dur: 0.06, gain: 0.035 });
        break;
      case "disabled":
        // very soft, muted low tap — a quiet "not yet" with no chime
        blip(ctx, out, { freq: 200, freqTo: 150, type: "sine", dur: 0.08, gain: 0.03 });
        break;
      case "bloopy":
        // cute digital bloop — a playful up-glide with a tiny tail blip
        blip(ctx, out, { freq: 300, freqTo: 540, type: "sine", dur: 0.11, gain: 0.06 });
        blip(ctx, out, { freq: 660, type: "sine", start: 0.1, dur: 0.07, gain: 0.04 });
        break;
    }
  } catch {
    /* audio blocked / unsupported — stay silent */
  }
}
