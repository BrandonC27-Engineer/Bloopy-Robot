"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CHECK_IN_PREFERENCE_OPTIONS,
  ONBOARDING_COMPLETED_AT_KEY,
  SUPPORT_STYLE_OPTIONS,
  clearProfile,
  getProfile,
  saveProfile,
  type CheckInPreference,
  type SupportStyle,
} from "@/lib/bloopyProfile";
import { celebrate, fireBloopyReward } from "@/lib/useBloopyReward";

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** How Bloopy talks for each support style — drives the live preview card. */
const SUPPORT_PREVIEW: Record<SupportStyle, string> = {
  gentle: "We can take this slowly. One tiny step is enough.",
  direct: "Let's pick the next small action and do it.",
  focus: "Tiny mission time — one small step, I'll stay with you.",
  reflection: "I'm here. No pressure. Let's think it through together.",
};

/** Read the onboarding completion timestamp (read-only display). */
function loadCompletedAt(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(ONBOARDING_COMPLETED_AT_KEY);
  } catch {
    return null;
  }
}

function formatWhen(iso?: string | null) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ProfileSettingsPage() {
  const COLORS = useBloopyThemeColors();

  const [displayName, setDisplayName] = useState("");
  const [currentFocus, setCurrentFocus] = useState("");
  const [supportStyle, setSupportStyle] = useState<SupportStyle | null>(null);
  const [checkInPreference, setCheckInPreference] = useState<CheckInPreference | null>(null);
  const [completedAt, setCompletedAt] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  // Hydration-safe: render defaults on the server, load saved values after mount.
  useEffect(() => {
    const p = getProfile();
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount */
    setDisplayName(p.displayName);
    setCurrentFocus(p.currentFocus);
    setSupportStyle(p.supportStyle);
    setCheckInPreference(p.checkInPreference);
    setCompletedAt(loadCompletedAt());
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  function handleSave() {
    saveProfile({ displayName, currentFocus, supportStyle, checkInPreference });
    setStatus("Saved — Bloopy will keep this in mind. 💙");
    celebrate({ text: "Profile saved" });
  }

  function handleReset() {
    const ok = window.confirm(
      "Reset your Bloopy profile?\n\nThis clears only your name, focus, support style, and check-in preference on this device. Your journal, chat, mood, and memory notes are NOT touched."
    );
    if (!ok) return;
    clearProfile();
    setDisplayName("");
    setCurrentFocus("");
    setSupportStyle(null);
    setCheckInPreference(null);
    setCompletedAt(null);
    setStatus("Bloopy profile cleared on this device.");
    fireBloopyReward({ sound: "tap" });
  }

  const previewText = supportStyle ? SUPPORT_PREVIEW[supportStyle] : "I'm here whenever you're ready. No pressure.";
  const setUpOn = formatWhen(completedAt);

  const cardStyle = {
    background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
    borderColor: COLORS.cardBorder,
    boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px ${COLORS.bgDeep}99`,
  } as const;

  const fieldStyle = {
    background: COLORS.bgDeep,
    borderColor: COLORS.cardBorder,
  } as const;

  return (
    <main
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
    >
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
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: COLORS.softText }}
        >
          <ChevronIcon className="h-4 w-4" />
          Settings
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Profile Settings
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Tell Bloopy how to support you.
          </p>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* Profile card */}
        <section className="rounded-3xl border p-5" style={cardStyle}>
          {/* Display name */}
          <label className="block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
            What should Bloopy call you?
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name or nickname"
            maxLength={40}
            className="bloopy-input bloopy-placeholder mt-2 w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--bloopy-accent,#0a84ff)]"
            style={fieldStyle}
          />

          {/* Current focus */}
          <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
            What are you working on lately?
          </label>
          <textarea
            value={currentFocus}
            onChange={(e) => setCurrentFocus(e.target.value)}
            placeholder="A short note — e.g. “finishing my thesis”, “being kinder to myself”"
            rows={2}
            maxLength={120}
            className="bloopy-input bloopy-placeholder mt-2 w-full resize-none rounded-2xl border px-4 py-3 text-sm leading-relaxed outline-none transition-colors focus-visible:ring-2 focus-visible:ring-[var(--bloopy-accent,#0a84ff)]"
            style={fieldStyle}
          />

          {/* Support style */}
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
            How should Bloopy show up?
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2" role="radiogroup" aria-label="Support style">
            {SUPPORT_STYLE_OPTIONS.map((o) => {
              const active = supportStyle === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSupportStyle(o.value)}
                  className="rounded-2xl border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: active ? `linear-gradient(160deg, ${COLORS.neon}22, ${COLORS.card})` : COLORS.bgDeep,
                    borderColor: active ? COLORS.glow : COLORS.cardBorder,
                    boxShadow: active ? `0 0 0 1px ${COLORS.glow}55, 0 0 14px ${COLORS.neon}26` : "none",
                  }}
                >
                  <span className="block text-sm font-semibold" style={{ color: active ? COLORS.mainText : COLORS.softText }}>
                    {o.label}
                  </span>
                  <span className="mt-0.5 block text-[11px] leading-tight" style={{ color: COLORS.mutedText }}>
                    {o.note}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Check-in preference */}
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
            When should Bloopy check in?
          </p>
          <div className="mt-2 flex flex-wrap gap-2" role="radiogroup" aria-label="Check-in preference">
            {CHECK_IN_PREFERENCE_OPTIONS.map((o) => {
              const active = checkInPreference === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setCheckInPreference(o.value)}
                  className="rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-200 active:scale-[0.97]"
                  style={{
                    background: active ? `linear-gradient(160deg, ${COLORS.neon}22, ${COLORS.card})` : COLORS.bgDeep,
                    borderColor: active ? COLORS.glow : COLORS.cardBorder,
                    color: active ? COLORS.mainText : COLORS.softText,
                    boxShadow: active ? `0 0 0 1px ${COLORS.glow}55, 0 0 12px ${COLORS.neon}26` : "none",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>

          {/* Save */}
          <button
            type="button"
            onClick={handleSave}
            className="bloopy-btn mt-6 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98]"
            style={{
              background: `linear-gradient(180deg, ${COLORS.glow}, ${COLORS.neon})`,
              borderColor: COLORS.glow,
              color: COLORS.bgDeep,
              boxShadow: `0 6px 20px ${COLORS.neon}44`,
            }}
          >
            Save profile
          </button>

          {status && (
            <p className="mt-3 text-center text-xs font-medium" role="status" aria-live="polite" style={{ color: COLORS.softText }}>
              {status}
            </p>
          )}

          {setUpOn && (
            <p className="mt-2 text-center text-[11px]" style={{ color: COLORS.mutedText }}>
              Profile set up on {setUpOn}
            </p>
          )}
        </section>

        {/* Bloopy preview card */}
        <section className="mt-4 rounded-3xl border p-5" style={cardStyle}>
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
            How Bloopy will sound
          </p>
          <div
            className="mt-3 rounded-2xl border px-4 py-3"
            style={{ background: `linear-gradient(160deg, ${COLORS.neon}14, ${COLORS.bgDeep})`, borderColor: `${COLORS.neon}33` }}
          >
            <p className="text-sm leading-relaxed" style={{ color: COLORS.mainText }}>
              “{previewText}”
            </p>
          </div>
          <p className="mt-2 text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>
            A preview — Bloopy adapts its tone to the support style you pick.
          </p>
        </section>

        {/* Reset profile */}
        <section className="mt-4 rounded-3xl border p-5" style={cardStyle}>
          <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
            Reset Bloopy profile
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
            Clears only your name, focus, support style, and check-in preference on this device. Your journal, chat, mood, and memory notes stay safe.
          </p>
          <button
            type="button"
            onClick={handleReset}
            data-bloopy-sound="none"
            className="mt-4 w-full rounded-2xl border py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            style={{ background: `${COLORS.red}14`, borderColor: `${COLORS.red}55`, color: COLORS.red }}
          >
            Reset Bloopy profile
          </button>
        </section>
      </div>
    </main>
  );
}
