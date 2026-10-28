"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";


function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const INFO_ROWS: { title: string; note: string }[] = [
  { title: "App name", note: "Bloopy" },
  { title: "Version", note: "0.2 · Physical preview" },
  { title: "Built by", note: "Bloopy Labs" },
  { title: "Support", note: "Coming soon" },
  { title: "Terms & policies", note: "Coming soon" },
];

export default function AboutSettingsPage() {
  const COLORS = useBloopyThemeColors();
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
            About Bloopy
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Version 0.2 &middot; physical preview.
          </p>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* Description & mission */}
        <section
          className="rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <p className="text-sm leading-relaxed" style={{ color: COLORS.mainText }}>
            Bloopy is a daily companion app and physical robot interface designed to help you remember, reflect, focus, and feel less alone.
          </p>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: COLORS.mutedText }}>
            The app now connects to Bloopy's Raspberry Pi body for live sensors, camera/perception state, voice status, and approved low-risk controls.
          </p>
        </section>

        {/* Info rows */}
        <section
          className="mt-4 overflow-hidden rounded-3xl border"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <ul className="divide-y" style={{ borderColor: COLORS.cardBorder }}>
            {INFO_ROWS.map((row) => (
              <li key={row.title} className="flex items-center justify-between gap-3 px-5 py-4">
                <p className="text-sm font-medium" style={{ color: COLORS.mutedText }}>
                  {row.title}
                </p>
                <p className="truncate text-sm font-semibold" style={{ color: COLORS.mainText }}>
                  {row.note}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
