"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import LogoutButton from "@/components/LogoutButton";

/**
 * Dark futuristic-cozy Bloopy theme — matches Home, Chat, Mood, Journal, and Tasks.
 */

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

/* ---------- Small content icons ---------- */

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

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M5 19c1.2-3 4-4.5 7-4.5s5.8 1.5 7 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function InsightsIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="3.4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BellIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 10a6 6 0 1 1 12 0c0 3 1 4.5 1 4.5H5S6 13 6 10Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10 17.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PaletteIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.5a8.5 8.5 0 1 0 0 17c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.4-1.1-.2-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6h1.9a3.5 3.5 0 0 0 3.5-3.5C20.2 6.8 16.5 3.5 12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="7.5" cy="10.5" r="1" fill="currentColor" />
      <circle cx="10.5" cy="7.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="7.5" r="1" fill="currentColor" />
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

function RobotIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="8" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="3.8" r="0.9" fill="currentColor" />
      <circle cx="9.5" cy="12.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="1" fill="currentColor" />
      <path d="M10 15.5h4M5 11.5H3.5M20.5 11.5H19" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function InfoIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 11v5M12 8v.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function StarIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M12 3.5l2.47 5.02 5.53.8-4 3.9.94 5.5L12 16.13l-4.94 2.6.94-5.51-4-3.9 5.53-.8L12 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

/* ---------- Settings rows ---------- */

type SettingsRow = {
  title: string;
  note: string;
  href?: string;
  icon: React.ReactNode;
};

const rows: SettingsRow[] = [
  { title: "Account", note: "Sign in & profile", href: "/settings/account", icon: <UserIcon className="h-4 w-4" /> },
  { title: "Bloopy setup", note: "Change how Bloopy supports you", href: "/onboarding", icon: <SparkIcon className="h-4 w-4" /> },
  { title: "What Bloopy knows", note: "View and control Bloopy's profile of you", href: "/profile-insights", icon: <InsightsIcon className="h-4 w-4" /> },
  { title: "Notifications", note: "Choose when Bloopy can nudge you", href: "/settings/notifications", icon: <BellIcon className="h-4 w-4" /> },
  { title: "Bloopy's memory", note: "See and manage what Bloopy remembers", href: "/memory", icon: <BrainIcon className="h-4 w-4" /> },
  { title: "Appearance", note: "Pick your Bloopy theme", href: "/settings/appearance", icon: <PaletteIcon className="h-4 w-4" /> },
  { title: "Privacy & data", note: "Manage what's stored and shared", href: "/settings/privacy", icon: <ShieldIcon className="h-4 w-4" /> },
  { title: "Physical Bloopy", note: "Live sensors, voice & body controls", href: "/robot", icon: <RobotIcon className="h-4 w-4" /> },
  { title: "Rate Bloopy", note: "Loving it? Confused? Tell us — it helps", href: "/settings/feedback", icon: <StarIcon className="h-4 w-4" /> },
  { title: "About Bloopy", note: "Version 0.2 · physical preview", href: "/settings/about", icon: <InfoIcon className="h-4 w-4" /> },
];

function RowContent({ row }: { row: SettingsRow }) {
  const COLORS = useBloopyThemeColors();
  return (
    <>
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border"
        style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.bgDeep}80`, color: COLORS.glow }}
      >
        {row.icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
          {row.title}
        </p>
        <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
          {row.note}
        </p>
      </div>
      <ChevronIcon className="h-4 w-4 shrink-0" style={{ color: row.href ? COLORS.glow : "#1b3a63" } as React.CSSProperties} />
    </>
  );
}

export default function SettingsPage() {
  const COLORS = useBloopyThemeColors();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });
  }, []);

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
          <Link
            href="/app"
            aria-label="Back to home"
            className="flex items-center gap-2.5 rounded-full transition-transform duration-200 active:scale-95"
          >
            <BloopyAvatar className="h-9 w-9" />
            <span
              className="text-sm font-semibold tracking-[0.4em]"
              style={{ color: COLORS.mainText, textShadow: `0 0 18px ${COLORS.glow}66` }}
            >
              BLOOPY
            </span>
          </Link>

          {/* status pill */}
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1"
            style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC`, boxShadow: `0 0 12px ${COLORS.neon}1A` }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: COLORS.glow }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </span>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
              Your Space
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Settings
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Make Bloopy feel like yours.
          </p>
        </div>
      </header>

      {/* ===== Scrollable content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* Profile / account card */}
        <section
          className="rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <div className="flex items-center gap-3">
            <BloopyAvatar className="h-12 w-12" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                Signed in
              </p>
              <h2 className="truncate text-base font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                {email ?? "…"}
              </h2>
            </div>
          </div>
        </section>

        {/* Settings rows */}
        <section
          className="mt-4 overflow-hidden rounded-3xl border"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <ul className="divide-y" style={{ borderColor: COLORS.cardBorder }}>
            {rows.map((row) => (
              <li key={row.title} style={{ borderColor: COLORS.cardBorder }}>
                {row.href ? (
                  <Link href={row.href} className="flex items-center gap-3 px-5 py-4 transition-colors hover:bg-white/[0.03] active:bg-white/[0.05]">
                    <RowContent row={row} />
                  </Link>
                ) : (
                  <div className="flex items-center gap-3 px-5 py-4">
                    <RowContent row={row} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* Sign out */}
        <section
          className="mt-4 rounded-3xl border p-4"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <LogoutButton />
        </section>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
