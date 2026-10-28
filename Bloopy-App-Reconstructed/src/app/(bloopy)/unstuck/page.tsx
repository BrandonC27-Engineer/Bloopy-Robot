"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSafeBloopyBack } from "@/lib/useSafeBloopyBack";
import { getCheckInContext } from "@/lib/bloopyPresence";
import { useBloopyTheme, useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import { makeCardStyle } from "@/lib/bloopyTheme";
import {
  OBSTACLE_OPTIONS,
  generateTinyStep,
  recordDoomscrollRescue,
  recordFocusSprint,
  saveTinyStep,
  type UnstuckObstacle,
} from "@/lib/bloopyUnstuck";
import { celebrate, type BloopyCelebrationLevel } from "@/lib/useBloopyReward";
import { awardEnergy } from "@/lib/bloopyEnergy";

/**
 * Bloopy Unstuck Toolkit.
 *
 * A calm, premium companion tool for when you feel stuck, overwhelmed,
 * procrastinating, or caught doomscrolling. Three modes — Tiny Step,
 * Doomscroll Rescue, and Focus Sprint — each help you restart with one small
 * action. Everything is template-based and stored in localStorage. No AI
 * calls, no backend, nothing sensitive. Matches the dark futuristic-cozy
 * Bloopy theme. Copy avoids shame, medical language, and diagnosis.
 */

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

const TASKS_HREF = "/reminders"; // the app's Tasks feature lives at /reminders

type Mode = "menu" | "tiny" | "doomscroll" | "focus";

/* ---------- icons ---------- */

function BloopyAvatar({ className = "" }: { className?: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`}>
      <span aria-hidden="true" className="pointer-events-none absolute h-[82%] w-[82%] rounded-full blur-md" style={{ background: COLORS.neon, opacity: 0.3 }} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1.5px solid ${COLORS.glow}66`, boxShadow: `0 0 14px ${COLORS.neon}66` }} />
      <img src={LOGO_SRC} alt="Bloopy" className="relative h-[78%] w-[78%] object-contain drop-shadow-[0_4px_14px_rgba(30,144,255,0.45)]" />
    </div>
  );
}

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m11 5-6 7 6 7M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StepIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 19h4v-4H5v4Zm5-6h4V9h-4v4Zm5-6h4V3h-4v4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function PhoneIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="7" y="3" width="10" height="18" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11 18h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function TargetIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" />
    </svg>
  );
}

/* ---------- shared building blocks ---------- */

function PrimaryButton({
  children,
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  const COLORS = useBloopyThemeColors();
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="bloopy-tap w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
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

function GhostButton({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  const COLORS = useBloopyThemeColors();
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ borderColor: COLORS.cardBorder, background: COLORS.cardAlt, color: COLORS.mainText, boxShadow: `0 0 0 1px ${COLORS.neon}10` }}
    >
      {children}
      <ArrowIcon className="h-4 w-4" style={{ color: COLORS.softText }} />
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

function BackToModes({ onClick }: { onClick: () => void }) {
  const COLORS = useBloopyThemeColors();
  return (
    <button
      type="button"
      onClick={onClick}
      className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.18em] transition-colors active:scale-95"
      style={{ color: COLORS.softText }}
    >
      <ChevronIcon className="h-3.5 w-3.5" />
      Modes
    </button>
  );
}

/* ---------- countdown timer ---------- */

function formatClock(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

type TimerStatus = "running" | "paused" | "finished";

/**
 * A small, calm countdown. Auto-starts on mount; remount via a `key` to run
 * again with a new duration. Calls `onComplete` exactly once when it reaches
 * zero. Clears its interval on unmount/pause.
 */
function Countdown({
  totalSeconds,
  accent: accentProp,
  finishedText = "Done. That counts.",
  onComplete,
  breathing = false,
  celebration = "success",
  celebrateText,
}: {
  totalSeconds: number;
  accent?: string;
  finishedText?: string;
  onComplete?: () => void;
  /** Show a calm breathing glow behind the clock while running. */
  breathing?: boolean;
  /** Which reward tier fires on completion (success by default; milestone for Focus). */
  celebration?: BloopyCelebrationLevel;
  /** Optional screen-reader-only label for the completion burst. */
  celebrateText?: string;
}) {
  const COLORS = useBloopyThemeColors();
  const accent = accentProp ?? COLORS.neon;
  const [remaining, setRemaining] = useState(totalSeconds);
  const [status, setStatus] = useState<TimerStatus>("running");
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // tick once per second while running
  useEffect(() => {
    if (status !== "running") return;
    const id = setInterval(() => {
      setRemaining((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [status]);

  // settle into the finished state once when the clock hits zero
  useEffect(() => {
    if (remaining === 0 && status === "running") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- timer reached zero; transition to finished a single time
      setStatus("finished");
      onCompleteRef.current?.();
      // finishing an unstuck tool is a gentle little win → reward feedback +
      // a bit of Bloopy energy (once per day). The tier/label is set per mode,
      // so it always triggers the Bloopy success reaction (hero + center-nav pulse).
      awardEnergy("unstuck");
      celebrate(celebration, celebrateText ? { text: celebrateText } : undefined);
    }
  }, [remaining, status, celebration, celebrateText]);

  const pct = totalSeconds > 0 ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  const finished = status === "finished";

  return (
    <div className="relative mt-5 flex flex-col items-center">
      {/* calm breathing glow behind the clock (reduced-motion safe) */}
      {breathing && !finished && (
        <span
          aria-hidden="true"
          className="bloopy-breathe-ring pointer-events-none absolute left-1/2 top-0 h-24 w-24 -translate-x-1/2 rounded-full blur-2xl"
          style={{ background: accent, opacity: 0.35 }}
        />
      )}
      <div className="relative text-5xl font-bold tabular-nums" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${accent}66` }}>
        {formatClock(remaining)}
      </div>
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: COLORS.cardBorder }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${COLORS.neon}, ${COLORS.glow})`, boxShadow: `0 0 10px ${accent}88` }}
        />
      </div>

      {finished ? (
        <p className="mt-4 text-center text-sm font-medium" style={{ color: COLORS.softText }}>
          {finishedText}
        </p>
      ) : (
        <div className="mt-4 flex gap-2.5">
          <button
            type="button"
            onClick={() => setStatus((s) => (s === "running" ? "paused" : "running"))}
            className="rounded-full border px-5 py-2 text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{ borderColor: `${COLORS.neon}55`, background: `${COLORS.neon}1A`, color: COLORS.softText }}
          >
            {status === "running" ? "Pause" : "Resume"}
          </button>
          <button
            type="button"
            onClick={() => {
              setRemaining(totalSeconds);
              setStatus("running");
            }}
            className="rounded-full border px-5 py-2 text-sm font-semibold transition-all duration-200 active:scale-95"
            style={{ borderColor: COLORS.cardBorder, background: "transparent", color: COLORS.mutedText }}
          >
            Reset
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Mode 1: Tiny Step ---------- */

function TinyStepMode({ onSwitchMode }: { onSwitchMode: (m: Mode) => void }) {
  const COLORS = useBloopyThemeColors();
  const cardStyle = makeCardStyle(COLORS);
  const [goal, setGoal] = useState("");
  const [obstacle, setObstacle] = useState<UnstuckObstacle | null>(null);
  const [step, setStep] = useState<string | null>(null);
  const [timerOn, setTimerOn] = useState(false);
  const [saved, setSaved] = useState(false);

  function pickObstacle(value: UnstuckObstacle) {
    const tinyStep = generateTinyStep(value);
    setObstacle(value);
    setStep(tinyStep);
    setTimerOn(false);
    setSaved(true); // generating a step already records it
    saveTinyStep(goal, value, tinyStep);
    // gentle progress feedback — a soft sparkle as Bloopy hands you a tiny step
    // (the bigger success reward is saved for finishing the 2-minute timer)
    celebrate("tap", { text: "One small step, ready" });
  }

  function saveForLater() {
    if (!step) return;
    saveTinyStep(goal, obstacle, step);
    setSaved(true);
  }

  return (
    <section className="rounded-3xl border p-5" style={cardStyle}>
      <BackToModes onClick={() => onSwitchMode("menu")} />

      <div className="flex items-center gap-3">
        <BloopyAvatar className="h-11 w-11" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
            Tiny Step
          </p>
          <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
            What are you trying to do?
          </h2>
        </div>
      </div>

      <input
        type="text"
        value={goal}
        onChange={(e) => setGoal(e.target.value)}
        placeholder="Homework, cleaning my room, working on Bloopy, studying…"
        aria-label="What are you trying to do?"
        maxLength={140}
        autoComplete="off"
        className="mt-4 w-full rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-colors bloopy-placeholder"
        style={{ background: `${COLORS.bgDeep}80`, borderColor: COLORS.cardBorder, color: COLORS.mainText }}
      />

      <p className="mt-5 text-sm font-semibold" style={{ color: COLORS.softText }}>
        What feels hardest about starting?
      </p>
      <div className="mt-3 flex flex-col gap-2.5" role="radiogroup" aria-label="What feels hardest about starting?">
        {OBSTACLE_OPTIONS.map((o) => {
          const isActive = obstacle === o.value;
          return (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              data-bloopy-sound="none"
              onClick={() => pickObstacle(o.value)}
              className="relative rounded-2xl border px-4 py-3 text-left text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: isActive ? `radial-gradient(circle at 30% 0%, ${COLORS.cardAlt}, ${COLORS.bgDeep})` : `${COLORS.bgDeep}80`,
                borderColor: isActive ? COLORS.glow : COLORS.cardBorder,
                color: isActive ? COLORS.mainText : COLORS.softText,
                boxShadow: isActive ? `0 0 16px ${COLORS.neon}55, inset 0 0 12px ${COLORS.neon}1A` : "none",
              }}
            >
              {/* soft selected ring pop (theme-aware; bloopy-pop is reduced-motion safe) */}
              {isActive && (
                <span
                  aria-hidden="true"
                  className="bloopy-pop pointer-events-none absolute inset-0 rounded-2xl"
                  style={{ border: `1.5px solid ${COLORS.glow}`, boxShadow: `0 0 18px ${COLORS.neon}77` }}
                />
              )}
              {o.label}
            </button>
          );
        })}
      </div>

      {step && (
        <div key={step} className="bloopy-reveal mt-5">
          {/* Bloopy reassurance as the step is revealed */}
          <div className="mb-3 flex items-end gap-2">
            <BloopyAvatar className="h-7 w-7" />
            <div
              className="rounded-3xl rounded-bl-md border px-4 py-2 text-sm leading-relaxed"
              style={{
                background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                borderColor: COLORS.cardBorder,
                color: COLORS.mainText,
                boxShadow: `0 0 0 1px ${COLORS.neon}10`,
              }}
            >
              Good. We made it smaller.
            </div>
          </div>
          <div
            className="rounded-2xl border p-4"
            style={{ borderColor: `${COLORS.neon}44`, background: `${COLORS.bgDeep}80`, boxShadow: `0 0 18px ${COLORS.neon}1A` }}
          >
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                Your tiny step
              </p>
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS.red, boxShadow: `0 0 6px ${COLORS.red}` }} />
            </div>
            <p className="mt-2 text-base font-semibold leading-snug" style={{ color: COLORS.mainText }}>
              {step}
            </p>
            <p className="mt-1 text-xs" style={{ color: COLORS.mutedText }}>
              Do this for 2 minutes. One small step counts.
            </p>
          </div>

          {timerOn ? (
            <Countdown totalSeconds={120} breathing finishedText="Two minutes done. That counts 💙" celebrateText="One tiny step done. That counts." />
          ) : (
            <div className="mt-4">
              <PrimaryButton onClick={() => setTimerOn(true)}>Start 2-minute timer</PrimaryButton>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-2.5">
            <GhostButton onClick={saveForLater}>{saved ? "Saved for later ✓" : "Save for later"}</GhostButton>
            <NavLink href={TASKS_HREF}>Open Tasks</NavLink>
            <NavLink href="/chat">Talk to Bloopy</NavLink>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Mode 2: Doomscroll Rescue ---------- */

const DOOMSCROLL_STEPS = [
  "Put the phone down or look away.",
  "Take one slow breath.",
  "Name the feeling.",
  "Pick one tiny next action.",
];

function DoomscrollMode({ onSwitchMode }: { onSwitchMode: (m: Mode) => void }) {
  const COLORS = useBloopyThemeColors();
  const cardStyle = makeCardStyle(COLORS);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);

  return (
    <section className="rounded-3xl border p-5" style={cardStyle}>
      <BackToModes onClick={() => onSwitchMode("menu")} />

      <div className="flex items-center gap-3">
        <BloopyAvatar className="h-11 w-11" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
            Doomscroll Rescue
          </p>
          <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
            No shame. Let&apos;s reset for 60 seconds.
          </h2>
        </div>
      </div>

      <ol className="mt-5 flex flex-col gap-2.5">
        {DOOMSCROLL_STEPS.map((s, i) => (
          <li
            key={i}
            className="bloopy-reveal flex items-center gap-3 rounded-2xl border px-4 py-3"
            style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}80`, animationDelay: `${i * 70}ms` }}
          >
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold"
              style={{ background: `${COLORS.neon}1A`, color: COLORS.glow, boxShadow: `0 0 8px ${COLORS.neon}33` }}
            >
              {i + 1}
            </span>
            <span className="text-sm" style={{ color: COLORS.softText }}>
              {s}
            </span>
          </li>
        ))}
      </ol>

      {!started && (
        <div className="mt-5">
          <PrimaryButton onClick={() => setStarted(true)}>Start 60-second reset</PrimaryButton>
        </div>
      )}

      {started && !finished && (
        <Countdown
          totalSeconds={60}
          breathing
          finishedText="You're back. Nicely done."
          celebrateText="Reset complete. No shame."
          onComplete={() => {
            recordDoomscrollRescue();
            setFinished(true);
          }}
        />
      )}

      {finished && (
        <div className="bloopy-reveal mt-6">
          <p className="text-center text-base font-semibold" style={{ color: COLORS.mainText }}>
            Reset complete. No shame.
          </p>
          <p className="mt-1 text-center text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
            One small step is enough. You don&apos;t have to fix everything right now.
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            <GhostButton onClick={() => onSwitchMode("tiny")}>Tiny Step Mode</GhostButton>
            <NavLink href={TASKS_HREF}>Open Tasks</NavLink>
            <NavLink href="/journal">Journal one sentence</NavLink>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- Mode 3: Focus Sprint ---------- */

const SPRINT_MINUTES = [2, 5, 10] as const;

function FocusSprintMode({ defaultTopic, onSwitchMode }: { defaultTopic: string; onSwitchMode: (m: Mode) => void }) {
  const COLORS = useBloopyThemeColors();
  const cardStyle = makeCardStyle(COLORS);
  const [topic, setTopic] = useState(defaultTopic);
  const [minutes, setMinutes] = useState<number>(5);
  const [phase, setPhase] = useState<"setup" | "running" | "done">("setup");
  const [runId, setRunId] = useState(0);

  function start(mins: number) {
    setMinutes(mins);
    setPhase("running");
    setRunId((n) => n + 1);
  }

  return (
    <section className="rounded-3xl border p-5" style={cardStyle}>
      <BackToModes onClick={() => onSwitchMode("menu")} />

      <div className="flex items-center gap-3">
        <BloopyAvatar className="h-11 w-11" />
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
            Focus Sprint
          </p>
          <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
            What should we focus on for the next few minutes?
          </h2>
        </div>
      </div>

      {phase === "setup" && (
        <>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="One thing you want to move forward…"
            aria-label="What should we focus on?"
            maxLength={140}
            autoComplete="off"
            className="mt-4 w-full rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-colors bloopy-placeholder"
            style={{ background: `${COLORS.bgDeep}80`, borderColor: COLORS.cardBorder, color: COLORS.mainText }}
          />

          <p className="mt-5 text-sm font-semibold" style={{ color: COLORS.softText }}>
            How long?
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2.5" role="radiogroup" aria-label="Sprint length">
            {SPRINT_MINUTES.map((m) => {
              const isActive = minutes === m;
              return (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={isActive}
                  onClick={() => setMinutes(m)}
                  className="relative rounded-2xl border py-3 text-center text-sm font-semibold transition-all duration-200 active:scale-95"
                  style={{
                    background: isActive ? `radial-gradient(circle at 30% 0%, ${COLORS.cardAlt}, ${COLORS.bgDeep})` : `${COLORS.bgDeep}80`,
                    borderColor: isActive ? COLORS.glow : COLORS.cardBorder,
                    color: isActive ? COLORS.mainText : COLORS.softText,
                    boxShadow: isActive ? `0 0 16px ${COLORS.neon}55` : "none",
                  }}
                >
                  {/* soft selected ring (theme-aware; reduced-motion safe) */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="bloopy-pop pointer-events-none absolute inset-0 rounded-2xl"
                      style={{ border: `1.5px solid ${COLORS.glow}`, boxShadow: `0 0 16px ${COLORS.neon}77` }}
                    />
                  )}
                  {m} min
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <PrimaryButton onClick={() => start(minutes)}>Start focus sprint</PrimaryButton>
          </div>
        </>
      )}

      {phase === "running" && (
        <>
          {topic.trim() && (
            <p className="mt-4 text-center text-sm" style={{ color: COLORS.softText }}>
              Focusing on <span style={{ color: COLORS.mainText }}>{topic.trim()}</span>
            </p>
          )}
          <Countdown
            key={runId}
            totalSeconds={minutes * 60}
            breathing
            finishedText="Nice. That counts."
            celebration="milestone"
            celebrateText="Focus sprint done. Bloopy is proud."
            onComplete={() => {
              recordFocusSprint(topic, minutes);
              setPhase("done");
            }}
          />
          <p className="mt-5 text-center text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
            No rush. Just stay with it until the timer ends. That counts.
          </p>
        </>
      )}

      {phase === "done" && (
        <div className="bloopy-reveal mt-6">
          <p className="text-center text-base font-semibold" style={{ color: COLORS.mainText }}>
            Focus sprint done. Bloopy is proud.
          </p>
          <p className="mt-1 text-center text-xs" style={{ color: COLORS.mutedText }}>
            Stopping here is completely okay too.
          </p>
          <div className="mt-4 flex flex-col gap-2.5">
            <GhostButton onClick={() => start(5)}>Continue 5 more minutes</GhostButton>
            <NavLink href={TASKS_HREF}>Open Tasks</NavLink>
            <NavLink href="/recap">Write a quick recap</NavLink>
          </div>
        </div>
      )}
    </section>
  );
}

/* ---------- mode menu ---------- */

type ModeCard = { mode: Exclude<Mode, "menu">; title: string; note: string; Icon: (p: { className?: string }) => React.JSX.Element };

const MODE_CARDS: ModeCard[] = [
  { mode: "tiny", title: "Tiny Step Mode", note: "Turn something big into one small action.", Icon: StepIcon },
  { mode: "doomscroll", title: "Doomscroll Rescue", note: "Reset in 60 seconds. No shame.", Icon: PhoneIcon },
  { mode: "focus", title: "Focus Sprint", note: "Start working for just a few minutes.", Icon: TargetIcon },
];

function ModeMenu({ onSwitchMode }: { onSwitchMode: (m: Mode) => void }) {
  const COLORS = useBloopyThemeColors();
  const cardStyle = makeCardStyle(COLORS);
  return (
    <div className="flex flex-col gap-3.5">
      {MODE_CARDS.map((c) => (
        <button
          key={c.mode}
          type="button"
          data-bloopy-sound="none"
          onClick={(e) => {
            // soft tap sound + themed particles near the tapped card (the burst
            // surface lives in the app shell, so it shows across the mode switch)
            celebrate("tap", { x: e.clientX, y: e.clientY });
            onSwitchMode(c.mode);
          }}
          className="bloopy-tap group flex items-center gap-3 rounded-3xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ ...cardStyle, borderColor: `${COLORS.neon}33` }}
        >
          <span
            className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border transition-all duration-200 group-hover:scale-105"
            style={{ color: COLORS.glow, borderColor: `${COLORS.neon}55`, background: COLORS.bgDeep, boxShadow: `0 0 16px ${COLORS.neon}33, inset 0 0 10px ${COLORS.neon}22` }}
          >
            <c.Icon className="h-6 w-6" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold" style={{ color: COLORS.mainText }}>
              {c.title}
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
              {c.note}
            </span>
          </span>
          <ArrowIcon className="h-4 w-4 shrink-0" style={{ color: COLORS.softText }} />
        </button>
      ))}
    </div>
  );
}

/* ---------- page ---------- */

export default function UnstuckPage() {
  const COLORS = useBloopyThemeColors();
  const { theme } = useBloopyTheme();
  const goBack = useSafeBloopyBack("/app");
  const [mode, setMode] = useState<Mode>("menu");
  const [todayFocus, setTodayFocus] = useState("");

  // Read today's focus after mount (deferred) so the first client render
  // matches the server and we avoid a synchronous setState in the effect body.
  useEffect(() => {
    const timer = setTimeout(() => {
      setTodayFocus(getCheckInContext().focus ?? "");
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
    >
      {/* faint circuit grid backdrop */}
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-transform duration-200 active:scale-95"
              style={{ borderColor: `${COLORS.glow}66`, background: `${COLORS.bgDeep}CC`, boxShadow: `0 0 14px ${COLORS.neon}66`, color: COLORS.softText }}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <BloopyAvatar className="h-8 w-8" />
            <span className="text-sm font-semibold tracking-[0.4em]" style={{ color: COLORS.mainText, textShadow: `0 0 18px ${COLORS.glow}66` }}>
              BLOOPY
            </span>
          </div>

          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1"
            style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC`, boxShadow: `0 0 12px ${COLORS.neon}1A` }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: COLORS.glow }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </span>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
              Unstuck
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Unstuck Toolkit
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            {mode === "menu" ? "No shame. Let’s restart gently — one small step counts." : "You don’t have to fix everything right now."}
          </p>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {mode === "menu" && <ModeMenu onSwitchMode={setMode} />}
        {mode === "tiny" && <TinyStepMode onSwitchMode={setMode} />}
        {mode === "doomscroll" && <DoomscrollMode onSwitchMode={setMode} />}
        {mode === "focus" && <FocusSprintMode defaultTopic={todayFocus} onSwitchMode={setMode} />}
      </div>

      <style>{`
        /* gentle reveal for generated content (tiny step, reset steps, results) */
        @keyframes bloopyReveal {
          0% { opacity: 0; transform: translateY(8px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bloopy-reveal { animation: bloopyReveal 0.4s ease both; }
        /* calm breathing glow behind a running timer */
        @keyframes bloopyBreatheRing {
          0%, 100% { transform: translateX(-50%) scale(0.9); opacity: 0.3; }
          50% { transform: translateX(-50%) scale(1.1); opacity: 0.55; }
        }
        .bloopy-breathe-ring { animation: bloopyBreatheRing 4s ease-in-out infinite; }
        @keyframes bloopyFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
          /* drop movement, keep a soft fade / static glow */
          .bloopy-reveal { animation: bloopyFadeIn 0.35s ease both !important; }
          .bloopy-breathe-ring { animation: none !important; opacity: 0.4 !important; transform: translateX(-50%) !important; }
        }
      `}</style>
    </main>
  );
}
