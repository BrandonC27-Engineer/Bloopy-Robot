"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import { makeCardStyle } from "@/lib/bloopyTheme";

import Link from "next/link";
import { useSafeBloopyBack } from "@/lib/useSafeBloopyBack";
import { useCallback, useEffect, useState } from "react";
import {
  CHECK_IN_PREFERENCE_OPTIONS,
  clearProfile,
  getProfile,
  supportStyleLabel,
  type BloopyProfile,
} from "@/lib/bloopyProfile";
import { clearCheckInContext, getCheckInContext, type CheckInContext } from "@/lib/bloopyPresence";
import { clearRecap, isRecapDoneToday } from "@/lib/bloopyRecap";
import { getStreak, type StreakInfo } from "@/lib/dailyStreak";
import { getUnstuckSummary, type UnstuckSummary } from "@/lib/bloopyUnstuck";

/**
 * What Bloopy Knows — a calm, trustworthy view of every local thing Bloopy
 * has learned about you, with simple controls to clear each piece. Reads and
 * clears localStorage only; Supabase memory notes are managed on /memory.
 * No API calls. Matches the dark futuristic-cozy Bloopy theme.
 */


const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

/* ---------- icons ---------- */

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

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3.5 5 6v5c0 4.5 3 7.5 7 9.5 4-2 7-5 7-9.5V6l-7-2.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="m9.5 12 1.8 1.8 3.2-3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function BrainIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 4.5a2.5 2.5 0 0 0-2.5 2.5v.2A2.5 2.5 0 0 0 4 9.5v1A2.5 2.5 0 0 0 5.5 13v1.5A2.5 2.5 0 0 0 8 17h1m3-12.5a2.5 2.5 0 0 1 2.5 2.5v.2A2.5 2.5 0 0 1 17 9.5v1A2.5 2.5 0 0 1 15.5 13v1.5A2.5 2.5 0 0 1 13 17h-1m-1-12.5v12.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function TrashIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 7h14M10 7V5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V7m-7 0 .7 11a1.5 1.5 0 0 0 1.5 1.4h5.6A1.5 1.5 0 0 0 17.3 18L18 7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EditIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 19h3l9.5-9.5a1.8 1.8 0 0 0 0-2.5l-.5-.5a1.8 1.8 0 0 0-2.5 0L5 16v3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
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

/* ---------- shared bits ---------- */

function SectionTitle({ children }: { children: React.ReactNode }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className="mb-3 flex items-center justify-between px-1">
      <h3 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
        {children}
      </h3>
      <span className="ml-4 h-px flex-1" style={{ background: `linear-gradient(90deg, ${COLORS.neon}33, transparent)` }} />
    </div>
  );
}

function InfoRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className="flex items-start justify-between gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
        {label}
      </p>
      <p className="min-w-0 break-words text-right text-sm font-medium" style={{ color: dim ? COLORS.mutedText : COLORS.mainText }}>
        {value}
      </p>
    </div>
  );
}

function LinkRow({ href, title, note, icon }: { href: string; title: string; note: string; icon: React.ReactNode }) {
  const COLORS = useBloopyThemeColors();
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}80` }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border"
        style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.bgDeep}80`, color: COLORS.glow }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold" style={{ color: COLORS.mainText }}>
          {title}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
          {note}
        </span>
      </span>
      <ArrowIcon className="h-4 w-4 shrink-0" style={{ color: COLORS.softText }} />
    </Link>
  );
}

function ClearButton({ label, note, onClick }: { label: string; note: string; onClick: () => void }) {
  const COLORS = useBloopyThemeColors();
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
      style={{ borderColor: `${COLORS.red}33`, background: `${COLORS.red}0D` }}
    >
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border"
        style={{ borderColor: `${COLORS.red}44`, background: `${COLORS.bgDeep}80`, color: COLORS.red }}
      >
        <TrashIcon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold" style={{ color: COLORS.mainText }}>
          {label}
        </span>
        <span className="mt-0.5 block text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
          {note}
        </span>
      </span>
    </button>
  );
}

export default function ProfileInsightsPage() {
  const COLORS = useBloopyThemeColors();
  const cardStyle = makeCardStyle(COLORS);
  const goBack = useSafeBloopyBack("/app");
  const [hydrated, setHydrated] = useState(false);
  const [profile, setProfile] = useState<BloopyProfile | null>(null);
  const [checkIn, setCheckIn] = useState<CheckInContext | null>(null);
  const [streak, setStreak] = useState<StreakInfo | null>(null);
  const [recapDone, setRecapDone] = useState(false);
  const [unstuck, setUnstuck] = useState<UnstuckSummary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setProfile(getProfile());
    setCheckIn(getCheckInContext());
    setStreak(getStreak());
    setRecapDone(isRecapDoneToday());
    setUnstuck(getUnstuckSummary());
  }, []);

  // Read after mount (deferred) so server and first client render stay
  // identical and we avoid a synchronous setState in the effect body.
  useEffect(() => {
    const timer = setTimeout(() => {
      refresh();
      setHydrated(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [refresh]);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 2600);
  }

  function handleClearProfile() {
    if (!window.confirm("Clear your local profile data? This removes your onboarding setup from this device. Your memory notes are not affected.")) return;
    clearProfile();
    refresh();
    flash("Profile data cleared from this device.");
  }

  function handleClearCheckIn() {
    if (!window.confirm("Clear today's check-in context (mood and focus)? Your daily streak stays intact.")) return;
    clearCheckInContext();
    refresh();
    flash("Check-in context cleared.");
  }

  function handleClearRecap() {
    if (!window.confirm("Clear today's recap? This removes the saved recap answers from this device.")) return;
    clearRecap();
    refresh();
    flash("Recap cleared.");
  }

  if (!hydrated) {
    return (
      <main
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
        style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
      />
    );
  }

  const checkInPrefLabel =
    CHECK_IN_PREFERENCE_OPTIONS.find((o) => o.value === profile?.checkInPreference)?.label ?? null;
  const noCheckIn = checkIn ? !checkIn.doneToday : true;

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
              Your Data
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            What Bloopy knows
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            You stay in control of what Bloopy knows.
          </p>
        </div>
      </header>

      {/* ===== Scrollable content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* trust banner */}
        <section className="flex items-center gap-3 rounded-3xl border p-4" style={cardStyle}>
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border"
            style={{ color: COLORS.glow, borderColor: `${COLORS.neon}55`, background: COLORS.bgDeep, boxShadow: `0 0 16px ${COLORS.neon}33, inset 0 0 10px ${COLORS.neon}22` }}
          >
            <ShieldIcon className="h-6 w-6" />
          </span>
          <p className="text-xs leading-relaxed" style={{ color: COLORS.softText }}>
            Bloopy only uses this to support you better. Everything here lives on your device, and you can clear any of it anytime.
          </p>
        </section>

        {/* ===== Onboarding profile ===== */}
        <div className="mt-6">
          <SectionTitle>Onboarding profile</SectionTitle>
          <section className="flex flex-col gap-3 rounded-3xl border p-5" style={cardStyle}>
            <InfoRow label="Display name" value={profile?.displayName || "Not set"} dim={!profile?.displayName} />
            <InfoRow label="Current focus" value={profile?.currentFocus || "Not set"} dim={!profile?.currentFocus} />
            <InfoRow label="Support style" value={supportStyleLabel(profile?.supportStyle ?? null) || "Not set"} dim={!profile?.supportStyle} />
            <InfoRow label="Check-in preference" value={checkInPrefLabel || "Not set"} dim={!checkInPrefLabel} />
          </section>
        </div>

        {/* ===== Daily context ===== */}
        <div className="mt-6">
          <SectionTitle>Today&apos;s context</SectionTitle>
          <section className="flex flex-col gap-3 rounded-3xl border p-5" style={cardStyle}>
            <InfoRow
              label="Today's focus"
              value={checkIn?.focus || (noCheckIn ? "No check-in yet today" : "—")}
              dim={!checkIn?.focus}
            />
            <InfoRow
              label="Today's mood"
              value={checkIn?.mood || (noCheckIn ? "No check-in yet today" : "—")}
              dim={!checkIn?.mood}
            />
            <InfoRow
              label="Daily streak"
              value={streak ? `${streak.count} ${streak.count === 1 ? "day" : "days"}${streak.checkedInToday ? " · today ✓" : ""}` : "—"}
              dim={!streak || streak.count === 0}
            />
            <InfoRow label="Recap completed today" value={recapDone ? "Yes" : "Not yet"} dim={!recapDone} />
          </section>
        </div>

        {/* ===== Unstuck sessions ===== */}
        <div className="mt-6">
          <SectionTitle>Unstuck sessions</SectionTitle>
          <section className="flex flex-col gap-3 rounded-3xl border p-5" style={cardStyle}>
            <InfoRow
              label="Last tiny step"
              value={unstuck?.lastTinyStep || "None yet"}
              dim={!unstuck?.lastTinyStep}
            />
            <InfoRow
              label="Doomscroll rescues"
              value={unstuck ? String(unstuck.doomscrollRescuesCount) : "0"}
              dim={!unstuck || unstuck.doomscrollRescuesCount === 0}
            />
            <InfoRow
              label="Focus sprints completed"
              value={unstuck ? String(unstuck.focusSprintsCompleted) : "0"}
              dim={!unstuck || unstuck.focusSprintsCompleted === 0}
            />
            <LinkRow
              href="/unstuck"
              title="Open Unstuck Toolkit"
              note="Find one tiny step when you feel stuck"
              icon={<ArrowIcon className="h-4 w-4" />}
            />
          </section>
        </div>

        {/* ===== Memory notes link ===== */}
        <div className="mt-6">
          <SectionTitle>Bloopy memory</SectionTitle>
          <section className="rounded-3xl border p-4" style={cardStyle}>
            <LinkRow
              href="/memory"
              title="Memory notes"
              note="Things you explicitly told Bloopy to remember"
              icon={<BrainIcon className="h-4 w-4" />}
            />
          </section>
        </div>

        {/* ===== Privacy / control ===== */}
        <div className="mt-6">
          <SectionTitle>Privacy &amp; control</SectionTitle>
          <section className="flex flex-col gap-2.5 rounded-3xl border p-4" style={cardStyle}>
            <LinkRow
              href="/onboarding"
              title="Edit setup"
              note="Update your name, focus, and how Bloopy supports you"
              icon={<EditIcon className="h-4 w-4" />}
            />
            <LinkRow
              href="/memory"
              title="Open Memory"
              note="View and delete the notes Bloopy keeps"
              icon={<BrainIcon className="h-4 w-4" />}
            />

            <div className="my-1 h-px" style={{ background: COLORS.cardBorder }} />

            <ClearButton
              label="Clear local profile data"
              note="Removes only your onboarding/profile setup"
              onClick={handleClearProfile}
            />
            <ClearButton
              label="Clear check-in context"
              note="Removes only today's mood and focus (streak stays)"
              onClick={handleClearCheckIn}
            />
            <ClearButton
              label="Clear recap context"
              note="Removes only today's saved recap answers"
              onClick={handleClearRecap}
            />

            <p className="mt-1 px-1 text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>
              These clear data saved on this device only. Your memory notes are managed on the Memory page and are never deleted from here.
            </p>
          </section>
        </div>
      </div>

      {/* transient confirmation */}
      {notice && (
        <div className="pointer-events-none fixed inset-x-0 bottom-24 z-40 mx-auto flex w-full max-w-md justify-center px-4">
          <div
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
            style={{
              borderColor: `${COLORS.neon}55`,
              background: `${COLORS.card}F2`,
              color: COLORS.mainText,
              boxShadow: `0 0 18px ${COLORS.neon}33, 0 10px 30px #00040A99`,
              backdropFilter: "blur(8px)",
            }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            {notice}
          </div>
        </div>
      )}

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
