"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  RECAP_FEELINGS,
  getRecap,
  isRecapDoneToday,
  saveRecap,
  type RecapFeeling,
} from "@/lib/bloopyRecap";
import { celebrate } from "@/lib/useBloopyReward";
import { awardEnergy } from "@/lib/bloopyEnergy";
import BloopyEnergy from "@/components/BloopyEnergy";

/**
 * End-of-Day Recap.
 *
 * A short, warm nightly reflection: how today felt, one small win, what was
 * hard, and a note for tomorrow. Saved to localStorage only — no backend, no
 * API calls, nothing sensitive. Matches the dark futuristic-cozy Bloopy theme.
 */


const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

/* ---------- Bloopy avatar (logo + neon glow ring) ---------- */

function BloopyAvatar({ className = "" }: { className?: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-[82%] w-[82%] rounded-full blur-md"
        style={{ background: COLORS.neon, opacity: 0.3 }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ border: `1.5px solid ${COLORS.glow}66`, boxShadow: `0 0 14px ${COLORS.neon}66` }}
      />
      <img
        src={LOGO_SRC}
        alt="Bloopy"
        className="relative h-[78%] w-[78%] object-contain drop-shadow-[0_4px_14px_rgba(30,144,255,0.45)]"
      />
    </div>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TOTAL_STEPS = 4;
type Step = 1 | 2 | 3 | 4 | 5; // 5 = summary

/* ---------- shared bits ---------- */

function StepHeading({ step, title }: { step: number; title: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className="flex items-center gap-3">
      <BloopyAvatar className="h-11 w-11" />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
          Step {step} of {TOTAL_STEPS}
        </p>
        <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const COLORS = useBloopyThemeColors();
  return (
    <button
      type={type}
      onClick={onClick}
      className="bloopy-tap mt-4 w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
      style={{
        background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
        color: COLORS.mainText,
        boxShadow: `0 0 18px ${COLORS.neon}88`,
      }}
    >
      {children}
    </button>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const COLORS = useBloopyThemeColors();
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ borderColor: COLORS.cardBorder, background: COLORS.cardAlt, color: COLORS.mainText, boxShadow: `0 0 0 1px ${COLORS.neon}10` }}
    >
      {children}
      <ArrowIcon className="h-4 w-4" style={{ color: COLORS.softText }} />
    </Link>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm" style={{ color: COLORS.mainText }}>
        {value}
      </p>
    </div>
  );
}

export default function RecapPage() {
  const COLORS = useBloopyThemeColors();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [feeling, setFeeling] = useState<RecapFeeling | null>(null);
  const [win, setWin] = useState("");
  const [hardThing, setHardThing] = useState("");
  const [tomorrowNote, setTomorrowNote] = useState("");
  const [alreadyDone, setAlreadyDone] = useState(false);
  // calm focus glow shared by the step inputs (only one shows at a time)
  const [inputFocused, setInputFocused] = useState(false);
  const savedRef = useRef(false);

  // Load any existing recap for today (client-only, avoids hydration mismatch).
  useEffect(() => {
    if (isRecapDoneToday()) {
      const saved = getRecap();
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
      setFeeling(saved.feeling);
      setWin(saved.win);
      setHardThing(saved.hardThing);
      setTomorrowNote(saved.tomorrowNote);
      setAlreadyDone(true);
      savedRef.current = true; // don't re-save unchanged data
      setStep(5);
    }
    setHydrated(true);
  }, []);

  // Persist once we reach the summary, if not already saved.
  useEffect(() => {
    if (step !== 5 || savedRef.current) return;
    savedRef.current = true;
    saveRecap({ feeling, win, hardThing, tomorrowNote });
    setAlreadyDone(true);
    // a bit of Bloopy energy for wrapping up the day (once per day)
    awardEnergy("recap");
    // Finishing the recap is a calm milestone: themed world particles + a warm
    // happy Bloopy pulse (hero + center nav) + a soft success chime. A recap
    // already done today loads straight to step 5 without re-running this.
    celebrate("milestone", { text: "Day wrapped. Bloopy is proud of you." });
  }, [step, feeling, win, hardThing, tomorrowNote]);

  function next() {
    setInputFocused(false); // don't carry a focus glow into the next step
    setStep((s) => (s < 5 ? ((s + 1) as Step) : s));
  }

  function back() {
    setInputFocused(false);
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  function pickFeeling(value: RecapFeeling, e?: React.MouseEvent) {
    setFeeling(value);
    // soft tap sound + a tiny themed sparkle near the chosen feeling
    celebrate("tap", { x: e?.clientX, y: e?.clientY });
    setStep(2);
  }

  function startUpdate() {
    savedRef.current = false;
    setAlreadyDone(false);
    setStep(1);
  }

  if (!hydrated) {
    return (
      <main
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
        style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
      />
    );
  }

  const progress = Math.round((Math.min(step, TOTAL_STEPS) / TOTAL_STEPS) * 100);

  return (
    <main
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
    >
      {/* faint circuit grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(${COLORS.neon} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.neon} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at 50% 20%, black, transparent 80%)",
        }}
      />

      {/* ===== Header ===== */}
      <header className="relative z-10 px-5 pt-6">
        <div className="flex items-center justify-between">
          {step > 1 && step < 5 ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors active:scale-95"
              style={{ color: COLORS.softText }}
            >
              <ChevronIcon className="h-4 w-4" />
              Back
            </button>
          ) : (
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors active:scale-95"
              style={{ color: COLORS.softText }}
            >
              <ChevronIcon className="h-4 w-4" />
              Home
            </Link>
          )}
          <span className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: COLORS.mutedText }}>
            End-of-day recap
          </span>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Wind down with Bloopy
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            A soft moment to close out today.
          </p>
        </div>

        {/* progress (hidden on the summary): a smooth bar + soft step dots */}
        {step < 5 && (
          <div className="mt-4">
            <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: COLORS.cardBorder }}>
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${COLORS.neon}, ${COLORS.glow})`, boxShadow: `0 0 10px ${COLORS.neon}88` }}
              />
            </div>
            <div className="mt-2 flex items-center gap-1.5" aria-hidden="true">
              {Array.from({ length: TOTAL_STEPS }).map((_, i) => {
                const done = i + 1 < step;
                const current = i + 1 === step;
                return (
                  <span
                    key={i}
                    className="h-1.5 rounded-full transition-all duration-300"
                    style={{
                      width: current ? 18 : 6,
                      background: done || current ? COLORS.glow : COLORS.cardBorder,
                      boxShadow: current ? `0 0 8px ${COLORS.neon}` : "none",
                      opacity: done ? 0.7 : 1,
                    }}
                  />
                );
              })}
              <span className="ml-1 text-[10px]" style={{ color: COLORS.mutedText }}>
                No rush
              </span>
            </div>
          </div>
        )}
      </header>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        <section
          className="rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          {/* keyed so each step softly transitions in as you move through */}
          <div key={step} className="bloopy-step-in">
          {/* Step 1: how today felt */}
          {step === 1 && (
            <>
              <StepHeading step={1} title="How did today feel overall?" />
              <div className="mt-5 grid grid-cols-2 gap-2.5" role="radiogroup" aria-label="How did today feel overall?">
                {RECAP_FEELINGS.map((f) => {
                  const isActive = feeling === f.value;
                  return (
                    <button
                      key={f.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      data-bloopy-sound="none"
                      onClick={(e) => pickFeeling(f.value, e)}
                      className="relative flex items-center gap-2.5 rounded-2xl border px-3 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                      style={{
                        background: isActive
                          ? `radial-gradient(circle at 30% 0%, ${COLORS.cardAlt}, ${COLORS.bgDeep})`
                          : `${COLORS.bgDeep}80`,
                        borderColor: isActive ? COLORS.glow : COLORS.cardBorder,
                        boxShadow: isActive ? `0 0 16px ${COLORS.neon}55, inset 0 0 12px ${COLORS.neon}1A` : "none",
                      }}
                    >
                      {/* soft selected ring pop (theme-aware; bloopy-pop is reduced-motion safe) */}
                      {isActive && (
                        <span
                          aria-hidden="true"
                          className="bloopy-pop pointer-events-none absolute inset-0 rounded-2xl"
                          style={{ border: `1.5px solid ${COLORS.glow}`, boxShadow: `0 0 16px ${COLORS.neon}77` }}
                        />
                      )}
                      <span className="text-xl">{f.emoji}</span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold leading-tight" style={{ color: isActive ? COLORS.mainText : COLORS.softText }}>
                          {f.value}
                        </span>
                        <span className="mt-0.5 block text-[11px] leading-tight" style={{ color: COLORS.mutedText }}>
                          {f.note}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 2: a small win */}
          {step === 2 && (
            <>
              <StepHeading step={2} title="What is one thing that went okay today?" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                <input
                  type="text"
                  value={win}
                  onChange={(e) => setWin(e.target.value)}
                  placeholder="Even something small counts…"
                  aria-label="What is one thing that went okay today?"
                  maxLength={140}
                  autoComplete="off"
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className="mt-4 w-full rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-all duration-300 bloopy-placeholder"
                  style={{
                    background: `${COLORS.bgDeep}80`,
                    borderColor: inputFocused ? COLORS.glow : COLORS.cardBorder,
                    color: COLORS.mainText,
                    boxShadow: inputFocused ? `0 0 0 1px ${COLORS.glow}55, 0 0 16px ${COLORS.neon}33, inset 0 0 12px ${COLORS.neon}14` : "none",
                  }}
                />
                <PrimaryButton type="submit">Continue</PrimaryButton>
              </form>
            </>
          )}

          {/* Step 3: what felt hard */}
          {step === 3 && (
            <>
              <StepHeading step={3} title="What felt hard or heavy today?" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                <input
                  type="text"
                  value={hardThing}
                  onChange={(e) => setHardThing(e.target.value)}
                  placeholder="It's okay to name it. Or leave it blank…"
                  aria-label="What felt hard or heavy today?"
                  maxLength={140}
                  autoComplete="off"
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className="mt-4 w-full rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-all duration-300 bloopy-placeholder"
                  style={{
                    background: `${COLORS.bgDeep}80`,
                    borderColor: inputFocused ? COLORS.glow : COLORS.cardBorder,
                    color: COLORS.mainText,
                    boxShadow: inputFocused ? `0 0 0 1px ${COLORS.glow}55, 0 0 16px ${COLORS.neon}33, inset 0 0 12px ${COLORS.neon}14` : "none",
                  }}
                />
                <PrimaryButton type="submit">Continue</PrimaryButton>
              </form>
            </>
          )}

          {/* Step 4: note for tomorrow */}
          {step === 4 && (
            <>
              <StepHeading step={4} title="What should Bloopy remember for tomorrow?" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                <input
                  type="text"
                  value={tomorrowNote}
                  onChange={(e) => setTomorrowNote(e.target.value)}
                  placeholder="A reminder, a hope, a gentle nudge…"
                  aria-label="What should Bloopy remember for tomorrow?"
                  maxLength={140}
                  autoComplete="off"
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className="mt-4 w-full rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-all duration-300 bloopy-placeholder"
                  style={{
                    background: `${COLORS.bgDeep}80`,
                    borderColor: inputFocused ? COLORS.glow : COLORS.cardBorder,
                    color: COLORS.mainText,
                    boxShadow: inputFocused ? `0 0 0 1px ${COLORS.glow}55, 0 0 16px ${COLORS.neon}33, inset 0 0 12px ${COLORS.neon}14` : "none",
                  }}
                />
                <PrimaryButton type="submit">Finish recap</PrimaryButton>
              </form>
            </>
          )}

          {/* Step 5: gentle summary */}
          {step === 5 && (
            <>
              {alreadyDone && (
                <div
                  className="mb-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed"
                  style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC`, color: COLORS.mainText }}
                >
                  <span
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px]"
                    style={{ background: COLORS.glow, color: COLORS.bgDeep, boxShadow: `0 0 8px ${COLORS.neon}` }}
                  >
                    ✓
                  </span>
                  You already wrapped up today.
                </div>
              )}

              <div className="flex items-center gap-3">
                <BloopyAvatar className="h-11 w-11" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                    Recap
                  </p>
                  <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                    You made it through today. That counts.
                  </h2>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}80` }}>
                <SummaryRow label="Today felt" value={feeling ?? "—"} />
                <SummaryRow label="Small win" value={win.trim() || "—"} />
                <SummaryRow label="Hard thing" value={hardThing.trim() || "—"} />
                <SummaryRow label="Tomorrow note" value={tomorrowNote.trim() || "—"} />
              </div>

              {/* gentle closing reassurance — warm, never pressuring */}
              <div className="mt-4 flex items-start gap-2">
                <BloopyAvatar className="h-7 w-7" />
                <p className="text-sm leading-relaxed" style={{ color: COLORS.softText }}>
                  I&rsquo;ll carry this gently into tomorrow. No need to fix everything tonight — rest is part of progress. 💙
                </p>
              </div>

              {/* today's glow — the day's energy, shown at the natural moment to
                  look back. Encouraging only: whatever the bar says, the recap
                  above already said "that counts". */}
              <BloopyEnergy />

              <div className="mt-4 flex flex-col gap-2.5">
                <NavLink href="/chat">Talk to Bloopy</NavLink>
                <NavLink href="/journal">Write journal</NavLink>
                <NavLink href="/app">Go home</NavLink>
              </div>

              <button
                type="button"
                onClick={startUpdate}
                className="mt-4 w-full rounded-full border py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                style={{ borderColor: `${COLORS.neon}55`, color: COLORS.softText, background: "transparent" }}
              >
                Update recap
              </button>
            </>
          )}
          </div>
        </section>
      </div>

      {/* component-scoped keyframes */}
      <style>{`
        /* soft step transition + summary reveal */
        @keyframes bloopyStepIn {
          0% { opacity: 0; transform: translateY(8px) scale(0.99); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bloopy-step-in { animation: bloopyStepIn 0.35s ease both; }
        @keyframes bloopyFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
          /* drop the movement, keep a soft fade only */
          .bloopy-step-in { animation: bloopyFadeIn 0.3s ease both !important; }
        }
      `}</style>
    </main>
  );
}
