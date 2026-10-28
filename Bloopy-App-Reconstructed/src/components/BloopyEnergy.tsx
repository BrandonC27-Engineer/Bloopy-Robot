"use client";

import { useEffect, useState } from "react";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import { BLOOPY_ENERGY_EVENT, ENERGY_GOAL, getEnergy, type EnergySnapshot, type EnergyStateId } from "@/lib/bloopyEnergy";

/** A soft, emotional line per energy state — encouraging, never guilt-based. */
const ENERGY_LINES: Record<EnergyStateId, string> = {
  resting: "Bloopy is resting. One tiny step can wake him up.",
  awake: "Bloopy is waking up with you.",
  curious: "Bloopy is curious about your next step.",
  proud: "Bloopy is proud of the tiny steps you took.",
  glowing: "Bloopy is glowing from today's progress.",
};

/**
 * Bloopy Energy card — a calm visual of the day's momentum.
 *
 * Shows today's energy as a 0–100 bar plus a reaction-state pill
 * (Resting → Awake → Curious → Proud → Glowing). It's purely encouraging: no
 * streak, no loss, no pressure — "Bloopy feels more awake when you take tiny
 * steps." When an action adds energy elsewhere it dispatches
 * {@link BLOOPY_ENERGY_EVENT}; this card listens and gently pops the number
 * (the success sparkle/sound is already fired at the action site, so we don't
 * double up here). Reads happen after mount to stay hydration-safe, and the
 * whole thing is theme-aware via the active world palette tokens.
 */
export default function BloopyEnergy() {
  const C = useBloopyThemeColors();
  const [energy, setEnergy] = useState<EnergySnapshot | null>(null);
  // bump changes on each increase so the number re-triggers its pop animation
  const [bump, setBump] = useState(0);

  useEffect(() => {
    const refresh = () => setEnergy(getEnergy());
    const onChange = () => {
      setEnergy(getEnergy());
      setBump((n) => n + 1);
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // first read runs async so initial markup matches the server render
    const timer = setTimeout(refresh, 0);
    window.addEventListener(BLOOPY_ENERGY_EVENT, onChange);
    window.addEventListener("storage", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(BLOOPY_ENERGY_EVENT, onChange);
      window.removeEventListener("storage", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Nothing until the client read (hydration-safe, no flash).
  if (!energy) return null;

  const pct = Math.max(0, Math.min(100, (energy.today / ENERGY_GOAL) * 100));
  // glow grows softly as Bloopy wakes up (subtle, never harsh)
  const glowStrength = 0.25 + (pct / 100) * 0.5;

  return (
    <section className="mt-4" aria-label="Bloopy Energy">
      <div
        className="relative overflow-hidden rounded-3xl border p-4"
        style={{
          background: `linear-gradient(160deg, ${C.cardAlt} 0%, ${C.card} 100%)`,
          borderColor: C.cardBorder,
          boxShadow: `0 0 0 1px ${C.neon}10, 0 8px 24px #00040A88`,
        }}
      >
        {/* header: label + reaction-state pill */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="grid h-9 w-9 place-items-center rounded-2xl"
              style={{ color: C.glow, background: `${C.neon}14`, boxShadow: `0 0 14px ${C.neon}22` }}
            >
              {/* spark glyph */}
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
                <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
              </svg>
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em]" style={{ color: C.mutedText }}>
                Bloopy Energy
              </p>
              <p
                key={bump}
                className="bloopy-pop text-lg font-bold leading-tight"
                style={{ color: C.mainText, textShadow: `0 0 16px ${C.neon}55` }}
              >
                {energy.today}
                <span className="text-sm font-medium" style={{ color: C.softText }}>
                  {" "}/ {ENERGY_GOAL}
                </span>
              </p>
            </div>
          </div>

          <span
            className="rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{
              color: C.glow,
              borderColor: `${C.neon}44`,
              background: `${C.neon}12`,
              boxShadow: `0 0 12px ${C.neon}22`,
            }}
          >
            {energy.state.label}
          </span>
        </div>

        {/* progress bar 0 → 100 for today (with a soft energy pulse at the tip) */}
        <div className="relative mt-3">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={ENERGY_GOAL}
            aria-valuenow={Math.round(energy.today)}
            aria-label="Today's Bloopy Energy"
            style={{ background: C.cardBorder }}
          >
            <div
              className="h-full rounded-full transition-[width] duration-700 ease-out"
              style={{
                width: `${pct}%`,
                background: `linear-gradient(90deg, ${C.neon}, ${C.glow})`,
                boxShadow: `0 0 12px ${C.neon}${Math.round(glowStrength * 255).toString(16).padStart(2, "0")}`,
              }}
            />
          </div>
          {/* subtle, theme-aware glow pulse riding the fill tip. `bloopy-flame`
              is a gentle scale/opacity pulse that's disabled under reduced motion
              (see globals.css), so it stays calm and accessible. */}
          <span
            aria-hidden="true"
            className="bloopy-flame pointer-events-none absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[2px]"
            style={{ left: `${pct}%`, background: C.glow, boxShadow: `0 0 10px ${C.glow}, 0 0 16px ${C.neon}88`, opacity: 0.9 }}
          />
        </div>

        {/* emotional reaction line (changes with state) + a gentle, safe tagline */}
        <p className="mt-3 text-sm leading-relaxed" style={{ color: C.softText }}>
          {ENERGY_LINES[energy.state.id]}
        </p>
        <p className="mt-1 text-xs leading-relaxed" style={{ color: C.mutedText }}>
          Tiny progress is still progress.
        </p>
      </div>
    </section>
  );
}
