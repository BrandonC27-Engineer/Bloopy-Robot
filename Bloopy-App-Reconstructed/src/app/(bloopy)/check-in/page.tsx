"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getStreak, getStreakMilestone, recordCheckIn, type StreakInfo } from "@/lib/dailyStreak";
import { celebrate } from "@/lib/useBloopyReward";
import { awardEnergy, ENERGY_REWARDS } from "@/lib/bloopyEnergy";
import { isFirstMilestoneToday } from "@/lib/bloopyMilestone";

/**
 * Dark futuristic-cozy Bloopy theme — matches Home, Chat, Mood, and Journal.
 */

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

const DATE_KEY = "bloopy.dailyCheckIn.date";
const MOOD_KEY = "bloopy.dailyCheckIn.mood";
const FOCUS_KEY = "bloopy.dailyCheckIn.todayFocus";

const MOODS = [
  { label: "Calm", emoji: "😌" },
  { label: "Happy", emoji: "😊" },
  { label: "Tired", emoji: "😴" },
  { label: "Stressed", emoji: "😣" },
  { label: "Sad", emoji: "😢" },
  { label: "Anxious", emoji: "😬" },
];

/** Warm, mood-aware completion line so step 3 responds to *you*, not a form. */
const MOOD_RESPONSES: Record<string, string> = {
  Calm: "Calm looks good on you. Let's keep today gentle.",
  Happy: "Yay! Let's keep that little glow going.",
  Tired: "Low battery is okay. We'll go slow today.",
  Stressed: "One thing at a time. I've got you.",
  Sad: "I'm right here. Today can be soft.",
  Anxious: "Deep breath. We'll take today in tiny pieces.",
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

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

function FlameIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.7 1.3-3.6C8.9 9.9 9 11 10 11.5 9.7 9 11 5 12 3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

type Step = 1 | 2 | 3;

export default function CheckInPage() {
  const COLORS = useBloopyThemeColors();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [mood, setMood] = useState<string | null>(null);
  const [focus, setFocus] = useState("");
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);
  // the streak as of this visit/save — drives the "Day N together" reward strip
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  // true only when THIS save actually added energy (returning visits stay calm)
  const [energyGained, setEnergyGained] = useState(false);

  // load any existing check-in for today (client-only, avoids hydration mismatch)
  useEffect(() => {
    const savedDate = localStorage.getItem(DATE_KEY);
    if (savedDate === todayKey()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
      setMood(localStorage.getItem(MOOD_KEY));
      setFocus(localStorage.getItem(FOCUS_KEY) ?? "");
      setStep(3);
      setAlreadyCheckedIn(true);
      setStreak(getStreak());
    }
    setHydrated(true);
  }, []);

  function pickMood(label: string) {
    setMood(label);
    setStep(2);
  }

  function saveFocus() {
    localStorage.setItem(DATE_KEY, todayKey());
    if (mood) localStorage.setItem(MOOD_KEY, mood);
    localStorage.setItem(FOCUS_KEY, focus.trim());
    const updated = recordCheckIn(); // update the daily streak (idempotent for the same day)
    setStreak(updated);
    // gentle little win + a bit of Bloopy energy (once per day)
    const award = awardEnergy("checkin");
    setEnergyGained(award.awarded);
    // The first check-in of the day is the anchor of the daily loop — it gets
    // the rare milestone burst; landing on a streak milestone does too.
    // Re-saving the same day stays a calm "success" (no double celebration).
    const milestone = getStreakMilestone(updated.count);
    const firstToday = isFirstMilestoneToday("checkin");
    celebrate(firstToday || (milestone && award.awarded) ? "milestone" : "success", {
      text: milestone ?? "Check-in done",
    });
    setAlreadyCheckedIn(true);
    setStep(3);
  }

  function startUpdate() {
    setAlreadyCheckedIn(false);
    setEnergyGained(false);
    setStep(1);
  }

  const milestoneLine = streak ? getStreakMilestone(streak.count) : null;

  if (!hydrated) {
    return (
      <main
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
        style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
      />
    );
  }

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
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: COLORS.softText }}
        >
          <ChevronIcon className="h-4 w-4" />
          Home
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Daily Check-In
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            A tiny moment with Bloopy, just for today.
          </p>
        </div>
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
          {/* Step 1: mood */}
          {step === 1 && (
            <>
              <div className="flex items-center gap-3">
                <BloopyAvatar className="h-11 w-11" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                    Step 1 of 3
                  </p>
                  <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                    How are you feeling right now?
                  </h2>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                {MOODS.map((m) => {
                  const isActive = mood === m.label;
                  return (
                    <button
                      key={m.label}
                      type="button"
                      onClick={() => pickMood(m.label)}
                      aria-pressed={isActive}
                      className="flex flex-col items-center gap-1.5 rounded-2xl border px-2 py-3 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                      style={{
                        background: isActive
                          ? `radial-gradient(circle at 50% 30%, ${COLORS.cardAlt}, ${COLORS.bgDeep})`
                          : `${COLORS.bgDeep}80`,
                        borderColor: isActive ? COLORS.glow : COLORS.cardBorder,
                        boxShadow: isActive ? `0 0 16px ${COLORS.neon}66, inset 0 0 12px ${COLORS.neon}1A` : "none",
                      }}
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <span className="text-[11px] font-medium" style={{ color: isActive ? COLORS.mainText : COLORS.mutedText }}>
                        {m.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {/* Step 2: today's focus */}
          {step === 2 && (
            <>
              <div className="flex items-center gap-3">
                <BloopyAvatar className="h-11 w-11" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                    Step 2 of 3
                  </p>
                  <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                    What&apos;s one small thing you want to do today?
                  </h2>
                </div>
              </div>

              <input
                type="text"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
                placeholder="e.g. Drink some water, take a short walk…"
                maxLength={80}
                aria-label="Today's focus"
                className="mt-4 w-full rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-colors bloopy-placeholder"
                style={{
                  background: `${COLORS.bgDeep}80`,
                  borderColor: COLORS.cardBorder,
                  color: COLORS.mainText,
                }}
              />

              <button
                type="button"
                onClick={saveFocus}
                className="mt-3 w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
                  color: COLORS.mainText,
                  boxShadow: `0 0 18px ${COLORS.neon}88`,
                }}
              >
                Continue
              </button>
            </>
          )}

          {/* Step 3: supportive response + actions */}
          {step === 3 && (
            <>
              {alreadyCheckedIn && (
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
                  You already checked in today.
                </div>
              )}

              <div className="flex items-center gap-3">
                <BloopyAvatar className="h-11 w-11" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                    Step 3 of 3
                  </p>
                  <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                    {(mood && MOOD_RESPONSES[mood]) ?? "Got it. We'll take it one step at a time."}
                  </h2>
                </div>
              </div>

              {/* streak reward strip — the instant "that counted" moment */}
              {streak && streak.count > 0 && (
                <div
                  className="mt-4 flex items-center gap-3 rounded-2xl border p-3.5"
                  style={{
                    borderColor: `${COLORS.neon}44`,
                    background: `linear-gradient(150deg, ${COLORS.cardAlt} 0%, ${COLORS.bgDeep} 100%)`,
                    boxShadow: `0 0 0 1px ${COLORS.neon}14, 0 0 18px ${COLORS.neon}1F`,
                  }}
                >
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl"
                    style={{ color: COLORS.red, background: `${COLORS.red}14`, boxShadow: `0 0 14px ${COLORS.red}22` }}
                  >
                    <FlameIcon className="h-5 w-5 bloopy-flame" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p key={streak.count} className="bloopy-pop text-base font-bold leading-tight" style={{ color: COLORS.mainText }}>
                      Day {streak.count} together
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: milestoneLine ? COLORS.glow : COLORS.mutedText }}>
                      {milestoneLine ?? "Showing up is the whole game."}
                    </p>
                  </div>
                  {energyGained && (
                    <span
                      className="bloopy-pop inline-flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-semibold"
                      style={{
                        color: COLORS.glow,
                        borderColor: `${COLORS.neon}44`,
                        background: `${COLORS.neon}12`,
                        boxShadow: `0 0 12px ${COLORS.neon}22`,
                        animationDelay: "0.25s",
                      }}
                    >
                      +{ENERGY_REWARDS.checkin} energy
                    </span>
                  )}
                </div>
              )}

              <div className="mt-4 flex flex-col gap-2.5 rounded-2xl border p-4" style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}80` }}>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                    Mood
                  </p>
                  <p className="mt-0.5 text-sm" style={{ color: COLORS.mainText }}>
                    {mood ?? "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                    Today&apos;s focus
                  </p>
                  <p className="mt-0.5 text-sm" style={{ color: COLORS.mainText }}>
                    {focus.trim() || "—"}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-2.5">
                <Link
                  href="/chat"
                  className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ borderColor: COLORS.cardBorder, background: `${COLORS.cardAlt}`, color: COLORS.mainText, boxShadow: `0 0 0 1px ${COLORS.neon}10` }}
                >
                  Talk to Bloopy
                  <ArrowIcon className="h-4 w-4" style={{ color: COLORS.softText }} />
                </Link>
                <Link
                  href="/journal"
                  className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ borderColor: COLORS.cardBorder, background: `${COLORS.cardAlt}`, color: COLORS.mainText, boxShadow: `0 0 0 1px ${COLORS.neon}10` }}
                >
                  Write a reflection
                  <ArrowIcon className="h-4 w-4" style={{ color: COLORS.softText }} />
                </Link>
                <Link
                  href="/reminders"
                  className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
                  style={{ borderColor: COLORS.cardBorder, background: `${COLORS.cardAlt}`, color: COLORS.mainText, boxShadow: `0 0 0 1px ${COLORS.neon}10` }}
                >
                  Add/see tasks
                  <ArrowIcon className="h-4 w-4" style={{ color: COLORS.softText }} />
                </Link>
              </div>

              {alreadyCheckedIn && (
                <button
                  type="button"
                  onClick={startUpdate}
                  className="mt-4 w-full rounded-full border py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                  style={{ borderColor: `${COLORS.neon}55`, color: COLORS.softText, background: "transparent" }}
                >
                  Update check-in
                </button>
              )}
            </>
          )}
        </section>
      </div>
    </main>
  );
}
