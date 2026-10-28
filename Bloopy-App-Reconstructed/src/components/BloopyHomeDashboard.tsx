"use client";

import type React from "react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { getCheckInContext, type CheckInContext } from "@/lib/bloopyPresence";
import {
  DEFAULT_BLOOPY_STATE,
  getBloopyState,
  getSuggestedAction,
  type BloopyState,
  type BloopyStateId,
  type SuggestedAction,
} from "@/lib/bloopyState";
import { getStreak, getStreakMilestone, type StreakInfo } from "@/lib/dailyStreak";
import { getProfile, isOnboardingCompleted } from "@/lib/bloopyProfile";
import { getGreeting } from "@/lib/bloopyGreeting";
import { isRecapDoneToday } from "@/lib/bloopyRecap";
import { isEnergyActionDoneToday } from "@/lib/bloopyEnergy";
import { pickMission, type Mission } from "@/lib/bloopyMission";
import { useBloopyTheme, useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import BloopyWeatherSignal from "@/components/BloopyWeatherSignal";
import BloopyWorldAmbience, { WorldCardAccent } from "@/components/BloopyWorldAmbience";
import BloopyTodayMission from "@/components/BloopyTodayMission";
import BloopyPhysicalStatus from "@/components/BloopyPhysicalStatus";
import { BLOOPY_REACT_EVENT, useBloopyTap } from "@/lib/useBloopyReward";

/**
 * Bloopy — cozy AI companion home dashboard.
 * Dark neon take on the /app home screen, adapted from the v0 design.
 * Colors and hero/decor intensity come from the active Bloopy UI theme.
 */

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

/* ---------- Inline icon set (stroke = currentColor) ---------- */

function SettingsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M19.4 13a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V19a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 13a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 6.89a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V1a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V7a1.7 1.7 0 0 0 1.56 1H23a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="12" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

function MoodIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 14.5c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function JournalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 7h2M4 12h2M4 17h2M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ReminderIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M10.5 19a1.8 1.8 0 0 0 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function RobotIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 8V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="3.6" r="1.1" fill="currentColor" />
      <circle cx="9.5" cy="13" r="1.1" fill="currentColor" />
      <circle cx="14.5" cy="13" r="1.1" fill="currentColor" />
      <path d="M9.5 16h5M4 11.5H2.5M21.5 11.5H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M16 5.5 16.6 7l1.5.6-1.5.6L16 9.7l-.6-1.5L13.9 7.6 15.4 7Z" fill="currentColor" />
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

function LifebuoyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="m6.3 6.3 2.9 2.9M14.8 14.8l2.9 2.9M17.7 6.3l-2.9 2.9M9.2 14.8l-2.9 2.9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Bloopy living companion (hero) ----------
 * Wraps the Bloopy logo and layers a lightweight, GPU-friendly animation
 * system on top: idle breathing/float, curious look-around, listening
 * reaction on hover/tap, and sleepy mode after inactivity. All motion is
 * disabled via prefers-reduced-motion.
 */
type CompanionState = "idle" | "curious" | "listening" | "sleepy" | "celebrate";

function BloopyCompanion({ className = "" }: { className?: string }) {
  const COLORS = useBloopyThemeColors();
  const [state, setState] = useState<CompanionState>("idle");
  const [reduced, setReduced] = useState(false);

  const stateRef = useRef<CompanionState>("idle");
  // eslint-disable-next-line react-hooks/refs -- mirror the latest state so async timers/callbacks read the current value
  stateRef.current = state;
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (reduced) return;
    let curiousTimeout: ReturnType<typeof setTimeout>;
    const loop = () => {
      const next = 5000 + Math.random() * 4000;
      curiousTimeout = setTimeout(() => {
        if (stateRef.current === "idle") {
          setState("curious");
          setTimeout(() => {
            if (stateRef.current === "curious") setState("idle");
          }, 1800);
        }
        loop();
      }, next);
    };
    loop();
    return () => clearTimeout(curiousTimeout);
  }, [reduced]);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    if (stateRef.current === "sleepy") setState("idle");
    idleTimer.current = setTimeout(() => {
      if (stateRef.current === "idle") setState("sleepy");
    }, 12000);
  }, []);

  useEffect(() => {
    resetIdle();
    return () => {
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [resetIdle]);

  const wake = useCallback(() => {
    resetIdle();
    setState("listening");
  }, [resetIdle]);

  const rest = useCallback(() => {
    setState("idle");
    resetIdle();
  }, [resetIdle]);

  // Happy reaction when the user does something positive (reward loop).
  useEffect(() => {
    const onReact = () => {
      setState("celebrate");
      setTimeout(() => {
        if (stateRef.current === "celebrate") setState("idle");
      }, 760);
    };
    window.addEventListener(BLOOPY_REACT_EVENT, onReact);
    return () => window.removeEventListener(BLOOPY_REACT_EVENT, onReact);
  }, []);

  const listening = state === "listening";
  const sleepy = state === "sleepy";
  const curious = state === "curious";
  const celebrate = state === "celebrate";
  const bright = listening || celebrate;

  const motionClass = reduced
    ? ""
    : celebrate
      ? "bloopy-celebrate"
      : sleepy
        ? "animate-[bloopySleep_6s_ease-in-out_infinite]"
        : curious
          ? "animate-[bloopyCurious_1.8s_ease-in-out]"
          : "animate-[bloopyBreathe_5s_ease-in-out_infinite]";

  return (
    <div
      className={`group relative grid cursor-pointer place-items-center ${className}`}
      onMouseEnter={wake}
      onMouseLeave={rest}
      onPointerDown={wake}
      onFocus={wake}
      onBlur={rest}
      role="img"
      aria-label="Bloopy the companion robot"
      tabIndex={0}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute h-[80%] w-[80%] rounded-full blur-3xl ${reduced ? "" : "animate-[bloopyGlow_5s_ease-in-out_infinite]"}`}
        style={{
          background: COLORS.neon,
          opacity: bright ? 0.55 : sleepy ? 0.16 : 0.34,
          transition: "opacity 500ms ease",
        }}
      />

      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-[72%] w-[72%] rounded-full"
        style={{
          background: `radial-gradient(circle, transparent 56%, ${COLORS.glow}55 60%, transparent 72%)`,
          border: `2px solid ${COLORS.glow}${bright ? "AA" : "66"}`,
          boxShadow: `0 0 ${bright ? 40 : 28}px ${COLORS.neon}${bright ? "99" : "66"}, inset 0 0 28px ${COLORS.neon}44`,
          transition: "box-shadow 400ms ease, border-color 400ms ease",
        }}
      />

      {/* happy reaction sparkles */}
      {celebrate && !reduced && (
        <>
          {[
            { left: "20%", top: "24%", d: "0s" },
            { left: "76%", top: "30%", d: "0.1s" },
            { left: "30%", top: "70%", d: "0.18s" },
            { left: "70%", top: "66%", d: "0.08s" },
          ].map((p, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="bloopy-sparkle pointer-events-none absolute h-1.5 w-1.5 rounded-full"
              style={{ left: p.left, top: p.top, background: i % 2 ? COLORS.red : "#CFE8FF", boxShadow: `0 0 8px ${COLORS.glow}, 0 0 14px ${COLORS.neon}`, animationDelay: p.d }}
            />
          ))}
        </>
      )}

      {listening && !reduced && (
        <>
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-[60%] w-[60%] rounded-full animate-[bloopyRing_1.6s_ease-out_infinite]"
            style={{ border: `1.5px solid ${COLORS.glow}` }}
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute h-[60%] w-[60%] rounded-full animate-[bloopyRing_1.6s_ease-out_infinite]"
            style={{ border: `1.5px solid ${COLORS.glow}`, animationDelay: "0.8s" }}
          />
        </>
      )}

      {curious && !reduced && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-[22%] top-[30%] h-2 w-2 rounded-full animate-[bloopySparkle_1.8s_ease-in-out]"
          style={{ background: "#CFE8FF", boxShadow: `0 0 10px ${COLORS.glow}, 0 0 18px ${COLORS.neon}` }}
        />
      )}

      <div className={`relative h-full w-full ${motionClass}`}>
        <img
          src={LOGO_SRC}
          alt=""
          aria-hidden="true"
          className="relative h-full w-full object-contain drop-shadow-[0_8px_30px_rgba(30,144,255,0.45)]"
          style={{ opacity: sleepy ? 0.92 : 1, transition: "opacity 500ms ease" }}
          draggable={false}
        />
      </div>

      {sleepy && !reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute right-[16%] top-[14%]">
          <span
            className="absolute text-sm font-bold animate-[bloopyZ_3s_ease-in-out_infinite]"
            style={{ color: COLORS.softText, textShadow: `0 0 10px ${COLORS.neon}` }}
          >
            z
          </span>
          <span
            className="absolute text-base font-bold animate-[bloopyZ_3s_ease-in-out_infinite]"
            style={{ color: COLORS.softText, textShadow: `0 0 10px ${COLORS.neon}`, animationDelay: "1s", left: "8px" }}
          >
            z
          </span>
          <span
            className="absolute text-lg font-bold animate-[bloopyZ_3s_ease-in-out_infinite]"
            style={{ color: COLORS.softText, textShadow: `0 0 10px ${COLORS.neon}`, animationDelay: "2s", left: "18px" }}
          >
            z
          </span>
        </div>
      )}
    </div>
  );
}

/* ---------- Bloopy's cozy tech room (hero framing) ----------
 * Lightweight 2D futuristic "room" that frames Bloopy in the hero. The
 * background decor (glowing wall, accent strips, floor glow, ring pulse, red
 * accent + status dots) is aria-hidden / pointer-events-none. Layered on top
 * are two functional, clickable panels driven by real app context:
 *   • LEFT  "STATUS" — Bloopy's derived live state → opens /chat
 *   • RIGHT "TODAY"  — today's focus / mood / check-in → /check-in or /mood
 * Animations are subtle and disabled under prefers-reduced-motion.
 */
type BloopyRoomProps = {
  statusLabel: string;
  statusId: BloopyStateId;
  focus: string | null;
  mood: string | null;
  checkInDone: boolean;
};

/** A short, single-word second line for the STATUS panel, derived from Bloopy's state. */
function statusSubline(id: BloopyStateId): string {
  switch (id) {
    case "listening":
      return "Listening";
    case "resting":
      return "Resting";
    case "thinking":
      return "Thinking";
    case "focus-mode":
      return "Focused";
    case "offline":
      return "Offline";
    case "robot-body":
      return "Body";
    default:
      return "Companion";
  }
}

function BloopyRoom({ statusLabel, statusId, focus, mood, checkInDone }: BloopyRoomProps) {
  const COLORS = useBloopyThemeColors();
  const { theme } = useBloopyTheme();
  const showRoomDecor = theme.heroStyle.showRoomDecor;
  const todayHref = checkInDone ? "/mood" : "/check-in";

  return (
    <div className="relative mx-auto flex h-52 w-full max-w-[22rem] items-center justify-center">
      {/* ----- room decor (all behind Bloopy) ----- */}
      {showRoomDecor && (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {/* glowing back wall panel + faint circuit grid */}
        <div
          className="absolute left-1/2 top-2 h-32 w-44 -translate-x-1/2 rounded-2xl"
          style={{
            border: `1px solid ${COLORS.neon}22`,
            background: `linear-gradient(180deg, ${COLORS.neon}10, transparent 70%)`,
            boxShadow: `inset 0 0 34px ${COLORS.neon}12`,
          }}
        >
          <div
            className="absolute inset-0 rounded-2xl opacity-[0.18]"
            style={{
              backgroundImage: `linear-gradient(${COLORS.neon} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.neon} 1px, transparent 1px)`,
              backgroundSize: "16px 16px",
              maskImage: "radial-gradient(circle at 50% 40%, black, transparent 75%)",
            }}
          />
        </div>
        {/* side accent strips on the wall */}
        <div
          className="absolute left-[20%] top-5 h-20 w-1 rounded-full"
          style={{ background: `linear-gradient(${COLORS.glow}88, transparent)`, boxShadow: `0 0 8px ${COLORS.neon}66` }}
        />
        <div
          className="absolute right-[20%] top-7 h-16 w-1 rounded-full"
          style={{ background: `linear-gradient(${COLORS.glow}66, transparent)`, boxShadow: `0 0 8px ${COLORS.neon}55` }}
        />

        {/* soft floor glow + platform disc under Bloopy */}
        <div
          className="absolute bottom-5 left-1/2 h-9 w-48 -translate-x-1/2 rounded-[50%] blur-xl animate-[bloopyFloorPulse_5s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ background: COLORS.neon, opacity: 0.26 }}
        />
        <div
          className="absolute bottom-6 left-1/2 h-6 w-36 -translate-x-1/2 rounded-[50%]"
          style={{
            border: `1px solid ${COLORS.glow}55`,
            background: `radial-gradient(ellipse at center, ${COLORS.neon}30, transparent 70%)`,
            boxShadow: `0 0 22px ${COLORS.neon}30`,
          }}
        />
        {/* subtle ring pulse under Bloopy */}
        <div
          className="absolute bottom-7 left-1/2 h-20 w-20 -translate-x-1/2 rounded-full animate-[bloopyRoomRing_4.5s_ease-out_infinite] motion-reduce:hidden"
          style={{ border: `1px solid ${COLORS.glow}55` }}
        />

        {/* tiny red accent light */}
        <span
          className="absolute right-[26%] bottom-9 h-1.5 w-1.5 rounded-full animate-[bloopyBlink_3.2s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ background: COLORS.red, boxShadow: `0 0 7px ${COLORS.red}, 0 0 12px ${COLORS.red}88` }}
        />
        {/* floating status indicator dots */}
        <span
          className="absolute left-[30%] top-7 h-1 w-1 rounded-full animate-[bloopyBlink_2.8s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }}
        />
        <span
          className="absolute right-[32%] top-12 h-1 w-1 rounded-full animate-[bloopyBlink_2.2s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}`, animationDelay: "0.7s" }}
        />
      </div>
      )}

      {/* ----- LEFT: Bloopy live status → Chat ----- */}
      <Link
        href="/chat"
        aria-label={`Bloopy status: ${statusLabel}, ${statusSubline(statusId)}. Open chat.`}
        className="group absolute left-0 top-10 z-20 w-[4.5rem] rounded-lg p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--bloopy-accent,#1E5A9E)] active:scale-95 sm:w-20"
        style={{
          border: `1px solid ${COLORS.neon}3A`,
          background: `${COLORS.bgDeep}D9`,
          boxShadow: `0 0 12px ${COLORS.neon}1E`,
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="h-1 w-1 shrink-0 rounded-full animate-[bloopyBlink_2.4s_ease-in-out_infinite] motion-reduce:animate-none"
            style={{ background: COLORS.glow, boxShadow: `0 0 5px ${COLORS.neon}` }}
          />
          <span className="text-[8px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
            Status
          </span>
        </div>
        <p className="mt-1 truncate text-[11px] font-semibold leading-tight" style={{ color: COLORS.mainText }}>
          {statusLabel}
        </p>
        <p className="text-[10px] leading-tight" style={{ color: COLORS.softText }}>
          {statusSubline(statusId)}
        </p>
      </Link>

      {/* ----- RIGHT: today's signal → Check-in or Mood ----- */}
      <Link
        href={todayHref}
        aria-label={`Today: focus ${focus ?? "not set"}, mood ${mood ?? "unknown"}, check-in ${checkInDone ? "done" : "pending"}.`}
        className="group absolute right-0 top-9 z-20 w-[4.5rem] rounded-lg p-2 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--bloopy-accent,#1E5A9E)] active:scale-95 sm:w-20"
        style={{
          border: `1px solid ${COLORS.glow}44`,
          background: `${COLORS.card}D9`,
          boxShadow: `0 0 14px ${COLORS.neon}22`,
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="h-1 w-1 shrink-0 rounded-full"
            style={{ background: COLORS.red, boxShadow: `0 0 5px ${COLORS.red}` }}
          />
          <span className="text-[8px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
            Today
          </span>
        </div>
        <p className="mt-1 truncate text-[9px] leading-tight" style={{ color: COLORS.softText }}>
          <span style={{ color: COLORS.mutedText }}>Focus </span>
          {focus ?? "Not set"}
        </p>
        <p className="truncate text-[9px] leading-tight" style={{ color: COLORS.softText }}>
          <span style={{ color: COLORS.mutedText }}>Mood </span>
          {mood ?? "Unknown"}
        </p>
        <p className="truncate text-[9px] leading-tight" style={{ color: checkInDone ? COLORS.glow : COLORS.softText }}>
          <span style={{ color: COLORS.mutedText }}>Check-in </span>
          {checkInDone ? "Done" : "Pending"}
        </p>
      </Link>

      {/* ----- Outside Signal: tiny optional weather chip (lower-left) ----- */}
      <BloopyWeatherSignal />

      {/* ----- Bloopy on top (slightly smaller so the room frames him) ----- */}
      <BloopyCompanion className="relative z-10 h-32 w-32" />
    </div>
  );
}

/* ---------- Feature cards data ---------- */

type Feature = {
  key: string;
  title: string;
  desc: string;
  href: string;
  Icon: (p: { className?: string }) => React.JSX.Element;
};

const FEATURES: Feature[] = [
  { key: "chat", title: "Chat", desc: "Talk it through with Bloopy", href: "/chat", Icon: ChatIcon },
  { key: "mood", title: "Mood", desc: "Check in on how you feel", href: "/mood", Icon: MoodIcon },
  { key: "journal", title: "Journal", desc: "Capture today's thoughts", href: "/journal", Icon: JournalIcon },
  { key: "reminders", title: "Reminders", desc: "Gentle nudges that care", href: "/reminders", Icon: ReminderIcon },
  { key: "robot", title: "Physical Bloopy", desc: "Live sensors & body controls", href: "/robot", Icon: RobotIcon },
];

/* ---------- Ambient neon particles (subtle, decorative) ---------- */

const PARTICLES = [
  { left: "12%", top: "18%", size: 3, delay: "0s", dur: "9s" },
  { left: "85%", top: "12%", size: 2, delay: "2s", dur: "11s" },
  { left: "70%", top: "32%", size: 2.5, delay: "4s", dur: "10s" },
  { left: "20%", top: "48%", size: 2, delay: "1s", dur: "12s" },
  { left: "90%", top: "55%", size: 3, delay: "5s", dur: "9s" },
  { left: "8%", top: "72%", size: 2, delay: "3s", dur: "11s" },
];

/**
 * Reads Daily Check-In context and derives Bloopy's companion state and the
 * suggested next action. Reads happen after mount (and on online/offline
 * changes) so server and first client render stay identical.
 */
function useAliveContext() {
  const [ctx, setCtx] = useState<CheckInContext | null>(null);
  const [aliveState, setAliveState] = useState<BloopyState>(DEFAULT_BLOOPY_STATE);
  const [suggestion, setSuggestion] = useState<SuggestedAction | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  // null = unknown (not read yet) so nothing flashes before the client read
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);
  // suggest the end-of-day recap in the evening while it's still undone
  const [recapSuggested, setRecapSuggested] = useState(false);
  // the single "Next tiny step" mission — owned here so we can hide the older
  // suggestion card when it points to the same place (no duplicate focus card)
  const [mission, setMission] = useState<Mission | null>(null);

  useEffect(() => {
    const refresh = () => {
      const checkIn = getCheckInContext();
      const hour = new Date().getHours();
      setCtx(checkIn);
      setOnboardingDone(isOnboardingCompleted());
      const recapDone = isRecapDoneToday();
      setRecapSuggested(hour >= 18 && !recapDone);
      setAliveState(
        getBloopyState({
          pathname: "/app",
          online: navigator.onLine,
          hour,
          checkInDoneToday: checkIn.doneToday,
          focus: checkIn.focus,
        })
      );
      setSuggestion(getSuggestedAction(checkIn, hour));
      setMission(
        pickMission({
          checkInDoneToday: checkIn.doneToday,
          focus: checkIn.focus,
          journalDoneToday: isEnergyActionDoneToday("journal"),
          recapDoneToday: recapDone,
          hour,
        })
      );
      setStreak(getStreak());
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    // first read runs async so the initial markup matches the server render
    const timer = setTimeout(refresh, 0);
    window.addEventListener("online", refresh);
    window.addEventListener("offline", refresh);
    // re-read when returning to Home (e.g. after completing a check-in)
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("online", refresh);
      window.removeEventListener("offline", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return { ctx, aliveState, suggestion, streak, onboardingDone, recapSuggested, mission };
}

function useGreeting() {
  const [greeting, setGreeting] = useState("Hello");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- derive greeting from local time + profile after mount to keep SSR/client markup identical
    setGreeting(getGreeting(new Date().getHours(), getProfile().displayName));
  }, []);
  return greeting;
}

/* ---------- Main dashboard ---------- */

export default function BloopyHomeDashboard() {
  const greeting = useGreeting();
  const COLORS = useBloopyThemeColors();
  const { theme } = useBloopyTheme();
  const heroStyle = theme.heroStyle;
  const { ctx, aliveState, suggestion, streak, onboardingDone, recapSuggested, mission } = useAliveContext();
  // Fires the sparkle + Bloopy reaction on tap; the <Link> navigates instantly.
  const bloopyTap = useBloopyTap();

  return (
    <main
      className="relative mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden font-sans"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
    >
      {/* faint circuit grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: heroStyle.gridOpacity,
          backgroundImage: `linear-gradient(${COLORS.neon} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.neon} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at 50% 30%, black, transparent 80%)",
        }}
      />

      {/* World Theme ambience (waves / stars / bubbles / … — subtle, decorative) */}
      <BloopyWorldAmbience />

      {/* drifting neon particles */}
      {heroStyle.showParticles && (
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 motion-reduce:hidden">
        {PARTICLES.map((p, i) => (
          <span
            key={i}
            className="absolute rounded-full animate-[bloopyParticle_var(--dur)_ease-in-out_infinite]"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background: COLORS.glow,
                boxShadow: `0 0 6px ${COLORS.neon}, 0 0 12px ${COLORS.neon}66`,
                animationDelay: p.delay,
                "--dur": p.dur,
              } as React.CSSProperties
            }
          />
        ))}
      </div>
      )}

      {/* ===== Top bar ===== */}
      <header className="relative z-10 flex items-center justify-between px-5 pt-6">
        <Link
          href="/app"
          className="flex items-center gap-2 text-sm font-semibold tracking-[0.5em]"
          style={{ color: COLORS.mainText, textShadow: `0 0 18px ${COLORS.glow}66` }}
        >
          BLOOPY
        </Link>

        <Link
          href="/settings"
          aria-label="Settings"
          className="relative grid h-10 w-10 place-items-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-90"
          style={{ borderColor: COLORS.cardBorder, background: COLORS.card, color: COLORS.softText, boxShadow: `0 0 14px ${COLORS.neon}22` }}
        >
          <SettingsIcon className="h-5 w-5" />
        </Link>
      </header>

      {/* ===== Scrollable content =====
          Extra bottom padding clears the floating bottom nav (its rounded bar +
          safe-area inset) so the Energy card and lower cards never hide behind it. */}
      <div className="relative z-10 flex-1 overflow-y-auto px-5 pt-4 [padding-bottom:calc(10rem+env(safe-area-inset-bottom))]">
        {/* Hero */}
        <section className="flex flex-col items-center pt-2 text-center">
          <BloopyRoom
            statusLabel={aliveState.label}
            statusId={aliveState.id}
            focus={ctx?.focus ?? null}
            mood={ctx?.mood ?? null}
            checkInDone={ctx?.doneToday ?? false}
          />

          {/* status chip */}
          <div
            className="mt-3 flex items-center gap-2 rounded-full border px-3 py-1"
            style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC`, boxShadow: `0 0 12px ${COLORS.neon}1A` }}
          >
            <span className="relative flex h-2 w-2">
              <span
                className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                style={{ background: COLORS.glow }}
              />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </span>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
              {aliveState.label}
            </p>
          </div>

          <h2
            className="mt-3 text-[2rem] font-semibold leading-tight text-balance [font-family:var(--font-fredoka)]"
            style={{ color: COLORS.mainText, textShadow: `0 0 30px ${COLORS.neon}40` }}
          >
            {greeting}
          </h2>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-pretty" style={{ color: COLORS.softText }}>
            {aliveState.blurb}
          </p>
        </section>

        {/* Compact daily launch pad — one "next tiny step" with a small inline
            energy pill. Kept intentionally small so Home stays clean; the richer
            habit feedback now lives inside each feature page. */}
        <BloopyTodayMission mission={mission} />

        {/* Physical body — live status from the Raspberry Pi brain. */}
        <BloopyPhysicalStatus />

        {/* First-time setup — only while onboarding is incomplete */}
        {onboardingDone === false && (
          <section className="mt-6" aria-label="Set up Bloopy">
            <Link
              href="/onboarding"
              className="group relative flex items-center gap-3 overflow-hidden rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                borderColor: `${COLORS.neon}55`,
                boxShadow: `0 0 0 1px ${COLORS.neon}1A, 0 0 22px ${COLORS.neon}2A, 0 8px 24px #00040A88`,
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: COLORS.neon }}
              />
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-all duration-200 group-hover:scale-105"
                style={{
                  color: COLORS.glow,
                  borderColor: `${COLORS.neon}55`,
                  background: COLORS.bgDeep,
                  boxShadow: `0 0 16px ${COLORS.neon}33, inset 0 0 10px ${COLORS.neon}22`,
                }}
              >
                <SparkIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold" style={{ color: COLORS.mainText }}>
                    Set up Bloopy
                  </h3>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: COLORS.red, boxShadow: `0 0 6px ${COLORS.red}` }}
                  />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                  Help Bloopy understand how to support you.
                </p>
              </div>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-200 group-hover:translate-x-0.5"
                style={{ color: COLORS.softText, background: `${COLORS.neon}1A`, boxShadow: `0 0 10px ${COLORS.neon}33` }}
              >
                <ArrowIcon className="h-4 w-4" />
              </span>
            </Link>
          </section>
        )}

        {/* Daily Check-In — only while today's check-in isn't done yet */}
        {ctx && !ctx.doneToday && (
        <section className="mt-6">
          <Link
            href="/check-in"
            className="group relative flex items-center gap-3 overflow-hidden rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--bloopy-accent,#1E5A9E)] active:scale-[0.98]"
            style={{
              background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
              borderColor: COLORS.cardBorder,
              boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 24px #00040A88`,
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: COLORS.neon }}
            />
            {/* themed world corner ornament */}
            <WorldCardAccent className="right-3 top-3" />
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-all duration-200 group-hover:scale-105"
              style={{
                color: COLORS.glow,
                borderColor: `${COLORS.neon}55`,
                background: COLORS.bgDeep,
                boxShadow: `0 0 16px ${COLORS.neon}33, inset 0 0 10px ${COLORS.neon}22`,
              }}
            >
              <SparkIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-semibold" style={{ color: COLORS.mainText }}>
                Daily Check-In
              </h3>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                A tiny moment with Bloopy
              </p>
            </div>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-200 group-hover:translate-x-0.5"
              style={{ color: COLORS.softText, background: `${COLORS.neon}1A` }}
            >
              <ArrowIcon className="h-4 w-4" />
            </span>
          </Link>
        </section>
        )}

        {/* End-of-day recap — subtle, evening-only while it's still undone */}
        {recapSuggested && (
          <section className="mt-4" aria-label="End-of-day recap">
            <Link
              href="/recap"
              className="group relative flex items-center gap-3 overflow-hidden rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                borderColor: COLORS.cardBorder,
                boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 24px #00040A88`,
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: COLORS.neon }}
              />
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-all duration-200 group-hover:scale-105"
                style={{
                  color: COLORS.glow,
                  borderColor: `${COLORS.neon}55`,
                  background: COLORS.bgDeep,
                  boxShadow: `0 0 16px ${COLORS.neon}33, inset 0 0 10px ${COLORS.neon}22`,
                }}
              >
                <MoonIcon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-semibold" style={{ color: COLORS.mainText }}>
                    End-of-day recap
                  </h3>
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{ background: COLORS.red, boxShadow: `0 0 6px ${COLORS.red}` }}
                  />
                </div>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                  Wrap up today with Bloopy.
                </p>
              </div>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-200 group-hover:translate-x-0.5"
                style={{ color: COLORS.softText, background: `${COLORS.neon}1A` }}
              >
                <ArrowIcon className="h-4 w-4" />
              </span>
            </Link>
          </section>
        )}

        {/* I feel stuck — quick way into the Unstuck Toolkit */}
        <section className="mt-4" aria-label="Feeling stuck">
          <Link
            href="/unstuck"
            data-bloopy-sound="none"
            onClick={bloopyTap("Let's restart, gently")}
            className="bloopy-card group relative flex items-center gap-3 overflow-hidden rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-[var(--bloopy-accent,#1E5A9E)] active:scale-[0.98]"
            style={{
              background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
              borderColor: COLORS.cardBorder,
              boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 24px #00040A88`,
            }}
          >
            <span
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
              style={{ background: COLORS.neon }}
            />
            {/* themed world corner ornament */}
            <WorldCardAccent className="right-3 top-3" />
            <span
              className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-all duration-200 group-hover:scale-105"
              style={{
                color: COLORS.glow,
                borderColor: `${COLORS.neon}55`,
                background: COLORS.bgDeep,
                boxShadow: `0 0 16px ${COLORS.neon}33, inset 0 0 10px ${COLORS.neon}22`,
              }}
            >
              <LifebuoyIcon className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold" style={{ color: COLORS.mainText }}>
                  I feel stuck
                </h3>
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS.red, boxShadow: `0 0 6px ${COLORS.red}` }} />
              </div>
              <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                Let Bloopy help you restart.
              </p>
            </div>
            <span
              className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-200 group-hover:translate-x-0.5"
              style={{ color: COLORS.softText, background: `${COLORS.neon}1A` }}
            >
              <ArrowIcon className="h-4 w-4" />
            </span>
          </Link>
        </section>

        {/* What should we do now? — Bloopy's suggested next step.
            Hidden when it would just repeat the "Next tiny step" card above
            (same destination), so Home never shows a duplicate focus card. */}
        {suggestion && suggestion.href !== mission?.href && (
          <section className="mt-4" aria-label="Suggested next step">
            <div className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                What should we do now?
              </h3>
              <span className="ml-4 h-px flex-1" style={{ background: `linear-gradient(90deg, ${COLORS.neon}33, transparent)` }} />
            </div>
            <Link
              href={suggestion.href}
              data-bloopy-sound="none"
              onClick={bloopyTap("Nice, one step counts")}
              className="bloopy-card group relative flex items-center gap-3 overflow-hidden rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.98]"
              style={{
                background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                borderColor: `${COLORS.neon}44`,
                boxShadow: `0 0 0 1px ${COLORS.neon}1A, 0 0 20px ${COLORS.neon}22, 0 8px 24px #00040A88`,
              }}
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                style={{ background: COLORS.neon }}
              />
              {/* themed world corner ornament */}
              <WorldCardAccent className="right-3 top-3" />
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-semibold" style={{ color: COLORS.mainText }}>
                  {suggestion.title}
                </h3>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                  {suggestion.note}
                </p>
              </div>
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full transition-all duration-200 group-hover:translate-x-0.5"
                style={{ color: COLORS.softText, background: `${COLORS.neon}1A`, boxShadow: `0 0 10px ${COLORS.neon}33` }}
              >
                <ArrowIcon className="h-4 w-4" />
              </span>
            </Link>
          </section>
        )}

        {/* Feature grid */}
        <section className="mt-9" aria-label="Bloopy features">
          <div className="mb-3.5 flex items-center justify-between px-1">
            <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
              Spend time together
            </h3>
            <span className="h-px flex-1 ml-4" style={{ background: `linear-gradient(90deg, ${COLORS.neon}33, transparent)` }} />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            {FEATURES.map((f, i) => {
              const isWide = i === FEATURES.length - 1 && FEATURES.length % 2 === 1;
              return (
                <Link
                  key={f.key}
                  href={f.href}
                  className={`bloopy-card group relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl border p-4 text-left transition-all duration-300 hover:-translate-y-1 hover:border-[var(--bloopy-accent,#1E5A9E)] active:scale-[0.98] ${isWide ? "col-span-2" : ""}`}
                  style={{
                    background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                    borderColor: COLORS.cardBorder,
                    boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 24px #00040A88`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                    style={{ background: COLORS.neon }}
                  />
                  {/* themed world corner ornament */}
                  <WorldCardAccent className="right-3 top-3" />
                  <span
                    className="grid h-11 w-11 place-items-center rounded-2xl border transition-all duration-200 group-hover:scale-105"
                    style={{
                      color: COLORS.glow,
                      borderColor: `${COLORS.neon}55`,
                      background: COLORS.bgDeep,
                      boxShadow: `0 0 16px ${COLORS.neon}33, inset 0 0 10px ${COLORS.neon}22`,
                    }}
                  >
                    <f.Icon className="h-6 w-6" />
                  </span>

                  <div className="flex w-full items-end justify-between gap-2">
                    <div>
                      <h3 className="text-base font-semibold" style={{ color: COLORS.mainText }}>
                        {f.title}
                      </h3>
                      <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                        {f.desc}
                      </p>
                    </div>
                    <span
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-all duration-200 group-hover:translate-x-0.5"
                      style={{ color: COLORS.softText, background: `${COLORS.neon}1A` }}
                    >
                      <ArrowIcon className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Lower card: streak + focus */}
        <section className="mt-4">
          <div
            className="relative overflow-hidden rounded-3xl border p-4"
            style={{
              background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
              borderColor: COLORS.cardBorder,
              boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 24px #00040A88`,
            }}
          >
            <div className="flex items-stretch gap-3">
              {/* streak */}
              <div className="flex flex-1 items-center gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{ color: COLORS.red, background: `${COLORS.red}14`, boxShadow: `0 0 14px ${COLORS.red}22` }}
                >
                  <FlameIcon className="h-6 w-6 bloopy-flame" />
                </span>
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: COLORS.mutedText }}>
                    Daily streak
                  </p>
                  <p key={streak?.count ?? "none"} className="bloopy-pop text-lg font-bold" style={{ color: COLORS.mainText }}>
                    {streak ? streak.count : "—"}{" "}
                    <span className="text-sm font-medium" style={{ color: COLORS.softText }}>
                      {streak && streak.count === 1 ? "day" : "days"}
                    </span>
                  </p>
                  {streak && (
                    <p className="mt-0.5 text-[11px]" style={{ color: streak.checkedInToday ? COLORS.glow : COLORS.mutedText }}>
                      {streak.checkedInToday
                        ? (getStreakMilestone(streak.count) ?? "Checked in today ✓")
                        : streak.count > 0
                          ? "Check in today to keep your streak"
                          : "Check in today to start your streak"}
                    </p>
                  )}
                </div>
              </div>

              <div className="w-px self-stretch" style={{ background: COLORS.cardBorder }} />

              {/* focus — from today's Daily Check-In when available */}
              <div className="flex flex-1 flex-col justify-center pl-1">
                <p className="text-xs uppercase tracking-wide" style={{ color: COLORS.mutedText }}>
                  {"Today's focus"}
                </p>
                <p
                  className="text-base font-semibold transition-all duration-500"
                  style={{ color: ctx?.doneToday ? COLORS.softText : COLORS.softText, textShadow: ctx?.doneToday ? `0 0 12px ${COLORS.neon}66` : "none" }}
                >
                  {ctx?.focus ?? (ctx && !ctx.doneToday ? "Check in to set one" : "Be kind to you")}
                </p>
                {ctx && (
                  <p className="mt-0.5 text-[11px]" style={{ color: ctx.doneToday ? COLORS.glow : COLORS.mutedText }}>
                    {ctx.doneToday ? "Checked in today ✓" : "No check-in yet today"}
                  </p>
                )}
              </div>
            </div>

            {/* streak dots — lit up to the last 7 days of the current streak */}
            <div className="mt-4 flex items-center gap-1.5">
              {Array.from({ length: 7 }).map((_, i) => {
                const lit = streak ? i < Math.min(streak.count, 7) : false;
                return (
                  <span
                    key={i}
                    className={`h-1.5 flex-1 rounded-full transition-opacity ${lit ? "bloopy-pop" : ""}`}
                    style={{
                      background: lit ? COLORS.glow : COLORS.cardBorder,
                      boxShadow: lit ? `0 0 8px ${COLORS.neon}88` : "none",
                      opacity: lit ? 0.6 + i / 14 : 0.5,
                      animationDelay: lit ? `${i * 70}ms` : undefined,
                    }}
                  />
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* component-scoped keyframes */}
      <style>{`
        /* idle breathing/float — gentle 2–4px lift, calm not bouncy */
        @keyframes bloopyBreathe {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-4px) scale(1.012); }
        }
        /* slow glow pulse */
        @keyframes bloopyGlow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.45; transform: scale(1.06); }
        }
        /* curious — subtle look-around tilt + shift */
        @keyframes bloopyCurious {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          30% { transform: translateX(-3px) rotate(-2deg); }
          65% { transform: translateX(3px) rotate(2deg); }
        }
        /* listening rings expand outward */
        @keyframes bloopyRing {
          0% { transform: scale(0.85); opacity: 0.7; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        /* curious sparkle */
        @keyframes bloopySparkle {
          0%, 100% { opacity: 0; transform: scale(0.4); }
          40%, 60% { opacity: 1; transform: scale(1); }
        }
        /* sleepy — slower, slightly sunken drift */
        @keyframes bloopySleep {
          0%, 100% { transform: translateY(2px) rotate(-1.5deg); }
          50% { transform: translateY(-2px) rotate(-1.5deg); }
        }
        /* ambient drifting particles */
        @keyframes bloopyParticle {
          0%, 100% { transform: translate(0, 0); opacity: 0.25; }
          25% { opacity: 0.7; }
          50% { transform: translate(8px, -16px); opacity: 0.45; }
          75% { opacity: 0.7; }
        }
        /* room: soft floor glow breathing */
        @keyframes bloopyFloorPulse {
          0%, 100% { opacity: 0.2; transform: translateX(-50%) scale(0.96); }
          50% { opacity: 0.34; transform: translateX(-50%) scale(1.04); }
        }
        /* room: ring pulse expanding under Bloopy */
        @keyframes bloopyRoomRing {
          0% { transform: translateX(-50%) scale(0.8); opacity: 0.55; }
          100% { transform: translateX(-50%) scale(1.35); opacity: 0; }
        }
        /* room: tiny status dots blink */
        @keyframes bloopyBlink {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        /* floating z's */
        @keyframes bloopyZ {
          0% { opacity: 0; transform: translate(0, 0) scale(0.6); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: translate(10px, -22px) scale(1.1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
