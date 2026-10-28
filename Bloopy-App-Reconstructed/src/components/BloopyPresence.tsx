"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  AUTO_HIDE_MS,
  AWAY_MS,
  IDLE_MESSAGE,
  IDLE_MS,
  OFFLINE_MESSAGE,
  ONLINE_MESSAGE,
  WELCOME_BACK_MESSAGE,
  canShowPassive,
  getCheckInContext,
  getPageMessage,
  getProactiveMessage,
  recordDismissed,
  recordShown,
  type PresenceMessage,
} from "@/lib/bloopyPresence";
import { getBloopyState } from "@/lib/bloopyState";
import { canSendProactive, markSeen, markUnread } from "@/lib/bloopyUnread";
import { getProfile, isOnboardingCompleted } from "@/lib/bloopyProfile";
import { isRecapDoneToday } from "@/lib/bloopyRecap";
import { canShowNudgeToday, markNudgeShownToday, nudgeKindForType } from "@/lib/bloopyNudge";
import { getWeatherPresenceMessage } from "@/lib/bloopyWeather";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

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

/**
 * Bloopy Presence — a small ambient companion bubble.
 *
 * Reacts to the current page, time of day, Daily Check-In context, idle
 * time, returning to the tab, and online/offline status. All messages are
 * local — no API calls. Renders nothing on the server and on first client
 * render (messages only appear from timers/events), so there is no
 * hydration mismatch.
 */
export default function BloopyPresence() {
  const COLORS = useBloopyThemeColors();
  const pathname = usePathname();
  const [message, setMessage] = useState<PresenceMessage | null>(null);
  const [stateLabel, setStateLabel] = useState("Awake");
  const hiddenAtRef = useRef<number | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // companion state, captured at the moment a message is shown
  const computeStateLabel = useCallback(() => {
    const ctx = getCheckInContext();
    return getBloopyState({
      pathname,
      online: typeof navigator === "undefined" ? true : navigator.onLine,
      hour: new Date().getHours(),
      checkInDoneToday: ctx.doneToday,
      focus: ctx.focus,
    }).label;
  }, [pathname]);

  // Shows a Bloopy bubble and flags it unread (so the center nav button blinks
  // until the user sees it). `type` is a short, non-sensitive category used
  // only for spacing/anti-repeat — never any private content.
  const showMessage = useCallback(
    (msg: PresenceMessage, type: string) => {
      recordShown(msg.id);
      markUnread(type);
      setStateLabel(computeStateLabel());
      setMessage(msg);
    },
    [computeStateLabel]
  );

  // A proactive nudge respects both the exact-repeat/snooze rules and the
  // longer proactive cooldown (≤ 1 every 20 min, no same type back-to-back).
  const tryShowProactive = useCallback(
    (msg: PresenceMessage | null, type: string) => {
      if (!msg || !canShowPassive(msg.id) || !canSendProactive(type)) return;
      showMessage(msg, type);
    },
    [showMessage]
  );

  // 1. proactive opener shortly after landing — Bloopy starts the conversation
  useEffect(() => {
    const timer = setTimeout(() => {
      const ctx = getCheckInContext();
      const profile = getProfile();
      const hour = new Date().getHours();
      if (pathname === "/app") {
        const opener = getProactiveMessage(ctx, hour, profile, isRecapDoneToday(), isOnboardingCompleted());
        const kind = nudgeKindForType(opener.type);
        if (kind) {
          // Task nudges (setup / check-in / recap): at most once per day per type,
          // and still subject to the usual spacing / no-repeat rules.
          if (canShowNudgeToday(kind) && canShowPassive(opener.id) && canSendProactive(opener.type)) {
            markNudgeShownToday(kind);
            showMessage(opener, opener.type);
          }
        } else {
          // No essential task nudge is pending — Bloopy may gently use the
          // Outside Signal instead, at most once per day, never overriding
          // setup / check-in / recap. Template-only; no API calls.
          const weather = getWeatherPresenceMessage();
          if (weather && canShowNudgeToday("weather") && canShowPassive(weather.id) && canSendProactive(weather.type)) {
            markNudgeShownToday("weather");
            showMessage(weather, weather.type);
          } else {
            tryShowProactive(opener, opener.type);
          }
        }
      } else {
        tryShowProactive(getPageMessage(pathname, ctx, hour, profile), "page");
      }
    }, 1800);
    return () => clearTimeout(timer);
  }, [pathname, tryShowProactive, showMessage]);

  // 2. auto-hide whatever is showing
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => setMessage(null), AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [message]);

  // 3. idle — no activity for a while
  useEffect(() => {
    const resetIdle = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => tryShowProactive(IDLE_MESSAGE, "idle"), IDLE_MS);
    };
    const events = ["pointerdown", "pointermove", "keydown", "touchstart"] as const;
    events.forEach((name) => window.addEventListener(name, resetIdle, { passive: true }));
    // scroll doesn't bubble, so listen in the capture phase
    window.addEventListener("scroll", resetIdle, { passive: true, capture: true });
    resetIdle();
    return () => {
      events.forEach((name) => window.removeEventListener(name, resetIdle));
      window.removeEventListener("scroll", resetIdle, { capture: true });
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [tryShowProactive]);

  // 4. returning to the tab after being away
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        hiddenAtRef.current = Date.now();
      } else if (hiddenAtRef.current !== null && Date.now() - hiddenAtRef.current >= AWAY_MS) {
        hiddenAtRef.current = null;
        tryShowProactive(WELCOME_BACK_MESSAGE, "welcome");
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tryShowProactive]);

  // 5. online/offline — real state changes show immediately, no cooldown
  useEffect(() => {
    const onOffline = () => {
      recordShown(OFFLINE_MESSAGE.id);
      markUnread("offline");
      setStateLabel("Offline Mode");
      setMessage(OFFLINE_MESSAGE);
    };
    const onOnline = () => {
      recordShown(ONLINE_MESSAGE.id);
      markUnread("online");
      setStateLabel(computeStateLabel());
      setMessage(ONLINE_MESSAGE);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, [computeStateLabel]);

  function dismiss() {
    recordDismissed();
    markSeen();
    setMessage(null);
  }

  if (!message) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-30 mx-auto w-full max-w-md px-4"
      // the chat composer sits above the bottom nav, so float higher there
      style={{ bottom: pathname === "/chat" ? "11.5rem" : "7rem" }}
    >
      <div
        role="status"
        aria-live="polite"
        className="bloopy-presence-in pointer-events-auto flex items-start gap-3 rounded-3xl border p-3.5"
        style={{
          background: `linear-gradient(160deg, ${COLORS.cardAlt}F5 0%, ${COLORS.card}F5 100%)`,
          borderColor: COLORS.cardBorder,
          boxShadow: `0 0 0 1px ${COLORS.neon}14, 0 0 18px ${COLORS.neon}22, 0 10px 30px #00040A99`,
          backdropFilter: "blur(10px)",
        }}
      >
        <BloopyAvatar className="h-9 w-9" />

        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
            Bloopy · {stateLabel}
          </p>
          <p className="mt-0.5 text-sm leading-relaxed" style={{ color: COLORS.mainText }}>
            {message.text}
          </p>
          {message.action && (
            <Link
              href={message.action.href}
              onClick={() => {
                markSeen();
                setMessage(null);
              }}
              className="mt-2 inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 active:scale-95"
              style={{
                borderColor: `${COLORS.neon}55`,
                background: `${COLORS.neon}1A`,
                color: COLORS.softText,
                boxShadow: `0 0 12px ${COLORS.neon}33`,
              }}
            >
              {message.action.label}
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss Bloopy's message"
          className="grid h-6 w-6 shrink-0 place-items-center rounded-full transition-colors"
          style={{ color: COLORS.mutedText, background: `${COLORS.bgDeep}80` }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <style>{`
        @keyframes bloopyPresenceIn {
          from { opacity: 0; transform: translateY(8px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bloopy-presence-in { animation: bloopyPresenceIn 0.35s ease-out; }
        @media (prefers-reduced-motion: reduce) {
          .bloopy-presence-in { animation: none; }
        }
      `}</style>
    </div>
  );
}
