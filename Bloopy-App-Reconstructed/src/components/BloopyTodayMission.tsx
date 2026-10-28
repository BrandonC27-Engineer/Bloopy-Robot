"use client";

import Link from "next/link";
import { Fragment, useEffect, useState } from "react";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import { BLOOPY_ENERGY_EVENT, getEnergy, isEnergyActionDoneToday, type EnergySnapshot } from "@/lib/bloopyEnergy";
import { getCheckInContext } from "@/lib/bloopyPresence";
import { isRecapDoneToday } from "@/lib/bloopyRecap";
import type { Mission } from "@/lib/bloopyMission";
import { fireBloopyReaction, useBloopyTap } from "@/lib/useBloopyReward";

/**
 * The one clear daily loop, made visible: three tiny stations that fill up as
 * the day happens. "Tiny step" counts ANY meaningful action (journal, task,
 * mood, unstuck) so there's always an easy way to light it — never a specific
 * chore to feel behind on.
 */
type LoopState = { checkIn: boolean; tinyStep: boolean; windDown: boolean };

const LOOP_STEPS: { key: keyof LoopState; label: string }[] = [
  { key: "checkIn", label: "Check-in" },
  { key: "tinyStep", label: "Tiny step" },
  { key: "windDown", label: "Wind-down" },
];

function readLoopState(): LoopState {
  return {
    checkIn: getCheckInContext().doneToday,
    tinyStep: (["journal", "task", "mood", "unstuck"] as const).some(isEnergyActionDoneToday),
    windDown: isRecapDoneToday(),
  };
}

/**
 * Next tiny step — a small, calm launch-pad card for Home.
 *
 * The mission itself is computed by the parent (BloopyHomeDashboard) so there's
 * a single source of truth — that lets Home hide the older "What should we do
 * now?" suggestion whenever it would point to the same place, avoiding a
 * duplicate focus card. This card just renders that one gentle suggestion plus a
 * tiny inline energy pill, so Home stays clean and breathable.
 *
 * Tapping it gives satisfying-but-soft feedback: the existing tap sparkle/sound
 * + a quick happy Bloopy pulse (hero + center nav) — no big celebration. It
 * never pressures: copy is encouraging, there's no streak or countdown. Fully
 * theme-aware; the energy read happens after mount (and on energy change) so
 * server/client markup stays identical.
 */
export default function BloopyTodayMission({ mission }: { mission: Mission | null }) {
  const C = useBloopyThemeColors();
  const [energy, setEnergy] = useState<EnergySnapshot | null>(null);
  const [loop, setLoop] = useState<LoopState | null>(null);
  // Fires the existing tap sparkle/sound; the <Link> still navigates instantly.
  const bloopyTap = useBloopyTap();

  useEffect(() => {
    const refresh = () => {
      setEnergy(getEnergy());
      setLoop(readLoopState());
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // first read runs async so initial markup matches the server render
    const timer = setTimeout(refresh, 0);
    window.addEventListener("storage", refresh);
    window.addEventListener(BLOOPY_ENERGY_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(BLOOPY_ENERGY_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // Nothing until the parent has a mission (keeps hydration clean, no flash).
  if (!mission) return null;

  return (
    <section className="mt-5" aria-label="Next tiny step">
      <Link
        href={mission.href}
        data-bloopy-sound="none"
        onClick={(e) => {
          // soft tap sparkle + sound, then a quick happy Bloopy pulse — instant,
          // no navigation delay, no big celebration.
          bloopyTap("One tiny step counts")(e);
          fireBloopyReaction("success");
        }}
        className="bloopy-card group relative flex flex-col overflow-hidden rounded-2xl border p-3.5 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
        style={{
          background: `linear-gradient(150deg, ${C.cardAlt} 0%, ${C.card} 100%)`,
          borderColor: `${C.neon}44`,
          boxShadow: `0 0 0 1px ${C.neon}14, 0 0 18px ${C.neon}1F, 0 8px 22px #00040A88`,
        }}
      >
        <div className="flex items-center gap-3">
        {/* small theme-aware badge */}
        <span
          className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-all duration-200 group-hover:scale-105"
          style={{ color: C.glow, borderColor: `${C.neon}55`, background: C.bgDeep, boxShadow: `0 0 14px ${C.neon}33, inset 0 0 8px ${C.neon}22` }}
        >
          {/* spark glyph */}
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden="true">
            <path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: C.mutedText }}>
              {mission.id === "rest" ? "Today's loop" : "Next tiny step"}
            </p>
            {/* compact inline energy pill — reads as Bloopy's status, not a stats system */}
            {energy && (
              <span
                className="ml-auto inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
                style={{ color: C.glow, borderColor: `${C.neon}3A`, background: `${C.neon}12` }}
                aria-label={`Bloopy Energy ${energy.today}, ${energy.state.label}`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: C.glow, boxShadow: `0 0 6px ${C.neon}` }} />
                {energy.today}
                <span style={{ color: C.mutedText }}>·</span>
                <span>{energy.state.label}</span>
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-sm font-semibold" style={{ color: C.mainText }}>
            {mission.title}
          </p>
        </div>

        {/* arrow with a soft, theme-aware glow pulse (reduced-motion safe via
            bloopy-nav-breathe, which is disabled under prefers-reduced-motion) */}
        <span
          className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-200 group-hover:translate-x-0.5"
          style={{ color: C.softText, background: `${C.neon}1A`, boxShadow: `0 0 10px ${C.neon}33` }}
        >
          <span
            aria-hidden="true"
            className="bloopy-nav-breathe pointer-events-none absolute -inset-1 rounded-full blur-sm"
            style={{ background: C.glow, opacity: 0.45 }}
          />
          <svg viewBox="0 0 24 24" fill="none" className="relative h-4 w-4" aria-hidden="true">
            <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        </div>

        {/* the daily loop, visible at a glance: three stations that light up as
            the day happens. Purely informational (part of the same tap target),
            reads refresh on energy changes, and nothing dims or scolds — undone
            stations are simply "not yet". */}
        {loop && (
          <div className="mt-3 flex items-center border-t pt-2.5" style={{ borderColor: `${C.neon}1F` }}>
            {LOOP_STEPS.map((s, i) => {
              const done = loop[s.key];
              return (
                <Fragment key={s.key}>
                  {i > 0 && (
                    <span
                      aria-hidden="true"
                      className="mx-2 h-px flex-1 rounded-full transition-colors duration-500"
                      style={{
                        background: loop[LOOP_STEPS[i - 1].key]
                          ? `linear-gradient(90deg, ${C.glow}88, ${C.neon}44)`
                          : C.cardBorder,
                      }}
                    />
                  )}
                  <span className="flex shrink-0 items-center gap-1.5">
                    <span
                      className={`grid h-3.5 w-3.5 place-items-center rounded-full transition-all duration-500 ${done ? "bloopy-pop" : ""}`}
                      style={
                        done
                          ? { background: C.glow, boxShadow: `0 0 8px ${C.neon}` }
                          : { border: `1.5px solid ${C.cardBorder}`, background: `${C.bgDeep}80` }
                      }
                    >
                      {done && (
                        <svg viewBox="0 0 24 24" fill="none" className="h-2.5 w-2.5" aria-hidden="true">
                          <path d="m6 12.5 4 4L18 8" stroke={C.bgDeep} strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </span>
                    <span className="text-[10px] font-medium" style={{ color: done ? C.softText : C.mutedText }}>
                      {s.label}
                      <span className="sr-only">{done ? " done" : " not yet"}</span>
                    </span>
                  </span>
                </Fragment>
              );
            })}
          </div>
        )}
      </Link>
    </section>
  );
}
