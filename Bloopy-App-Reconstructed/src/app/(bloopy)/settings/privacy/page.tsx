"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { clearProfile } from "@/lib/bloopyProfile";
import { clearCheckInContext } from "@/lib/bloopyPresence";
import { clearRecap } from "@/lib/bloopyRecap";
import { clearUnstuck } from "@/lib/bloopyUnstuck";
import { DEFAULT_THEME_ID, saveThemeId } from "@/lib/bloopyTheme";
import { DEFAULT_WORLD_THEME_ID, saveWorldThemeId } from "@/lib/bloopyWorldThemes";
import { setBloopySoundEnabled } from "@/lib/bloopySound";
import { fireBloopyReward } from "@/lib/useBloopyReward";

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RightChevronIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="m9 6 6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** The "nudge" daily-gating dates (documented in bloopyNudge.ts) — reset with the
 *  daily check-in so today's gentle nudges can surface again. */
const NUDGE_DATE_KEYS = [
  "bloopy.nudge.setup.date",
  "bloopy.nudge.checkIn.date",
  "bloopy.nudge.recap.date",
  "bloopy.nudge.unstuck.date",
  "bloopy.nudge.weather.date",
];

function safeRemoveKeys(keys: string[]) {
  if (typeof window === "undefined") return;
  for (const key of keys) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* localStorage unavailable — nothing to clear */
    }
  }
}

/** What Bloopy stores, in plain language (descriptions only — never raw values). */
const STORED_CATEGORIES: { title: string; note: string; where: "device" | "account" }[] = [
  { title: "Bloopy profile", note: "Your name, current focus, support style, and check-in preference.", where: "device" },
  { title: "Local daily context", note: "Today's check-in, end-of-day recap, and Unstuck Toolkit state.", where: "device" },
  { title: "Memory notes", note: "Facts you intentionally asked Bloopy to remember.", where: "account" },
  { title: "Chat data", note: "Conversations with Bloopy, saved so it can pick up where you left off.", where: "account" },
  { title: "Journal data", note: "Reflections you've written in your journal.", where: "account" },
  { title: "Mood data", note: "Mood check-ins and trends you've logged.", where: "account" },
  { title: "Account data", note: "Your sign-in email and account details.", where: "account" },
];

/* ---------- Account / database data: real, user-scoped actions ---------- */

/**
 * Local Bloopy data included in the export (descriptions only never shown).
 * Exact-match keys plus prefixes, matching what the app actually writes.
 */
const LOCAL_EXPORT_PREFIXES = [
  "bloopy.profile.",
  "bloopy.onboarding.",
  "bloopy.dailyCheckIn.",
  "bloopy.recap.",
  "bloopy.unstuck.",
  "bloopy.nudge.",
];
const LOCAL_EXPORT_EXACT = ["bloopy.sound.enabled", "bloopy.ui.theme"];

/** Tables read for the export, mapped to their export key + user-scope column. */
const EXPORT_TABLES: { key: string; table: string; column: string }[] = [
  { key: "profile", table: "profiles", column: "id" },
  { key: "chatMessages", table: "chat_messages", column: "user_id" },
  { key: "journalEntries", table: "journal_entries", column: "user_id" },
  { key: "moodCheckins", table: "mood_checkins", column: "user_id" },
  { key: "memoryNotes", table: "memories", column: "user_id" },
  { key: "reminders", table: "reminders", column: "user_id" },
];

/** The three delete actions — each scoped to ONE table by user_id only. */
type DeleteKind = "chat" | "journal" | "mood";
const DELETE_META: Record<DeleteKind, { table: string; confirm: string; done: string }> = {
  chat: {
    table: "chat_messages",
    confirm: "Delete your Bloopy chat history? This cannot be undone.",
    done: "Chat data deleted.",
  },
  journal: {
    table: "journal_entries",
    confirm: "Delete your journal entries? This cannot be undone.",
    done: "Journal data deleted.",
  },
  mood: {
    table: "mood_checkins",
    confirm: "Delete your mood check-ins? This cannot be undone.",
    done: "Mood data deleted.",
  },
};

/** Collect the whitelisted local Bloopy keys for the export (raw values stay off-screen). */
function collectLocalExport(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key) continue;
      if (LOCAL_EXPORT_EXACT.includes(key) || LOCAL_EXPORT_PREFIXES.some((p) => key.startsWith(p))) {
        out[key] = window.localStorage.getItem(key) ?? "";
      }
    }
  } catch {
    /* localStorage unavailable — export just omits local data */
  }
  return out;
}

/** Local calendar date stamp, e.g. "2026-06-18". */
function todayStamp(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Trigger a client-side JSON file download (no network, no server). */
function downloadJson(obj: unknown, filename: string): void {
  try {
    const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
    /* download blocked — handled by caller status */
  }
}

export default function PrivacySettingsPage() {
  const COLORS = useBloopyThemeColors();
  const [status, setStatus] = useState<string | null>(null);
  /** Which database action is in flight (disables its button), or null. */
  const [busy, setBusy] = useState<null | "export" | DeleteKind>(null);
  /** Optional row counts (null = unknown / not loaded), purely informational. */
  const [counts, setCounts] = useState<Partial<Record<DeleteKind, number>>>({});

  function runClear(message: string, confirmMessage: string, clear: () => void) {
    const ok = window.confirm(confirmMessage);
    if (!ok) return;
    clear();
    setStatus(message);
    fireBloopyReward({ sound: "tap" });
  }

  // Optional, best-effort counts for the three deletable tables (head-only, so
  // no rows are fetched). Any failure is swallowed and the count just stays hidden.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const tables: [DeleteKind, string][] = [
          ["chat", "chat_messages"],
          ["journal", "journal_entries"],
          ["mood", "mood_checkins"],
        ];
        const results = await Promise.all(
          tables.map(async ([kind, table]) => {
            try {
              const { count, error } = await supabase
                .from(table)
                .select("*", { count: "exact", head: true })
                .eq("user_id", user.id);
              return error ? null : ([kind, count ?? 0] as const);
            } catch {
              return null;
            }
          })
        );
        if (cancelled) return;
        const next: Partial<Record<DeleteKind, number>> = {};
        for (const r of results) if (r) next[r[0]] = r[1];
        setCounts(next);
      } catch {
        /* counts are optional — ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Export this user's database rows + whitelisted local data as a JSON download. */
  async function handleExport() {
    if (busy) return;
    setBusy("export");
    setStatus(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("You need to be signed in to export your data.");
        return;
      }

      const database: Record<string, unknown[]> = {};
      const errors: Record<string, string> = {};

      await Promise.all(
        EXPORT_TABLES.map(async ({ key, table, column }) => {
          try {
            const { data, error } = await supabase.from(table).select("*").eq(column, user.id);
            if (error) {
              errors[key] = error.message;
              database[key] = [];
            } else {
              database[key] = data ?? [];
            }
          } catch (e) {
            errors[key] = e instanceof Error ? e.message : "Could not read this table.";
            database[key] = [];
          }
        })
      );

      const payload = {
        exportedAt: new Date().toISOString(),
        app: "Bloopy",
        userId: user.id,
        accountEmail: user.email ?? null,
        database,
        local: collectLocalExport(),
        ...(Object.keys(errors).length > 0 ? { errors } : {}),
      };

      downloadJson(payload, `bloopy-data-export-${todayStamp()}.json`);
      setStatus(
        Object.keys(errors).length > 0
          ? "Your Bloopy data export is ready — but some data couldn't be exported."
          : "Your Bloopy data export is ready."
      );
    } catch {
      setStatus("Sorry — the export didn't finish. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  /** Delete ONLY the named table's rows for the current user (scoped by user_id). */
  async function handleDelete(kind: DeleteKind) {
    if (busy) return;
    const meta = DELETE_META[kind];
    if (!window.confirm(meta.confirm)) return;
    setBusy(kind);
    setStatus(null);
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setStatus("You need to be signed in to delete your data.");
        return;
      }
      // Safety: always scoped by user_id — never a global delete.
      const { error } = await supabase.from(meta.table).delete().eq("user_id", user.id);
      if (error) {
        setStatus("That didn't delete. Please try again. 💙");
      } else {
        setStatus(meta.done);
        setCounts((prev) => ({ ...prev, [kind]: 0 }));
        fireBloopyReward({ sound: "success" });
      }
    } catch {
      setStatus("That didn't delete. Please try again. 💙");
    } finally {
      setBusy(null);
    }
  }

  const cardStyle = {
    background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
    borderColor: COLORS.cardBorder,
    boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px ${COLORS.bgDeep}99`,
  } as const;

  const localActions: { title: string; note: string; confirm: string; done: string; run: () => void }[] = [
    {
      title: "Clear Bloopy profile",
      note: "Name, focus, support style, check-in preference.",
      confirm: "Clear your Bloopy profile on this device? Your journal, chat, mood, and memory notes are NOT affected.",
      done: "Bloopy profile cleared on this device.",
      run: clearProfile,
    },
    {
      title: "Clear today's check-in",
      note: "Today's mood/focus context and gentle daily nudges.",
      confirm: "Clear today's check-in context on this device?",
      done: "Today's check-in context cleared.",
      run: () => {
        clearCheckInContext();
        safeRemoveKeys(NUDGE_DATE_KEYS);
      },
    },
    {
      title: "Clear recap data",
      note: "Your end-of-day recap answers stored on this device.",
      confirm: "Clear your saved end-of-day recap on this device?",
      done: "Recap data cleared.",
      run: clearRecap,
    },
    {
      title: "Clear Unstuck Toolkit data",
      note: "Last tiny step, focus sprints, and doomscroll rescues.",
      confirm: "Clear your Unstuck Toolkit history on this device?",
      done: "Unstuck Toolkit data cleared.",
      run: clearUnstuck,
    },
  ];

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
            Privacy &amp; Data
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Control what Bloopy keeps.
          </p>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* What Bloopy stores */}
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
          What Bloopy stores
        </p>
        <section className="overflow-hidden rounded-3xl border" style={cardStyle}>
          <ul className="divide-y" style={{ borderColor: COLORS.cardBorder }}>
            {STORED_CATEGORIES.map((c) => (
              <li key={c.title} className="flex items-start gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
                    {c.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                    {c.note}
                  </p>
                </div>
                <span
                  className="mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{
                    color: c.where === "device" ? COLORS.glow : COLORS.softText,
                    borderColor: c.where === "device" ? `${COLORS.glow}55` : COLORS.cardBorder,
                    background: c.where === "device" ? `${COLORS.neon}14` : "transparent",
                  }}
                >
                  {c.where === "device" ? "This device" : "Account"}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Physical robot data */}
        <p className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
          Physical Bloopy
        </p>
        <section className="rounded-3xl border p-5" style={cardStyle}>
          <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
            Live body readings stay local by default
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
            Light, distance, tilt, motion, sound level, local camera detection, and body state are read from Bloopy&rsquo;s Raspberry Pi over a loopback-only bridge. The app does not save that live telemetry to your account.
          </p>
          <p className="mt-2 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
            When you explicitly ask Bloopy a question that needs physical context, only the relevant status/tool result may be sent to the AI service so Bloopy can answer or perform an approved action.
          </p>
        </section>

        {/* Memory link */}
        <Link
          href="/memory"
          className="mt-4 flex items-center gap-3 rounded-3xl border px-5 py-4 transition-transform duration-200 hover:-translate-y-0.5 active:scale-[0.99]"
          style={cardStyle}
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
              View Bloopy memory
            </p>
            <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
              See and manage the notes Bloopy remembers. Memory notes are added and removed there.
            </p>
          </div>
          <RightChevronIcon className="h-4 w-4 shrink-0" style={{ color: COLORS.glow }} />
        </Link>

        {/* Local personalization data — real clear actions */}
        <p className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
          Local personalization data
        </p>
        <p className="mb-2 px-2 text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>
          Stored only on this device. Clearing is instant and only removes the item named — nothing in your account is touched.
        </p>
        <section className="overflow-hidden rounded-3xl border" style={cardStyle}>
          <ul className="divide-y" style={{ borderColor: COLORS.cardBorder }}>
            {localActions.map((a) => (
              <li key={a.title} className="flex items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
                    {a.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                    {a.note}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => runClear(a.done, a.confirm, a.run)}
                  className="shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97]"
                  style={{ background: `${COLORS.red}14`, borderColor: `${COLORS.red}55`, color: COLORS.red }}
                >
                  Clear
                </button>
              </li>
            ))}
          </ul>
        </section>

        {status && (
          <p
            className="mt-3 rounded-2xl border px-4 py-2.5 text-center text-xs font-medium"
            role="status"
            aria-live="polite"
            style={{ background: `${COLORS.neon}14`, borderColor: `${COLORS.glow}44`, color: COLORS.softText }}
          >
            {status}
          </p>
        )}

        {/* Account & database data — real, user-scoped actions */}
        <p className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
          Account &amp; database data
        </p>
        <section className="overflow-hidden rounded-3xl border" style={cardStyle}>
          <ul className="divide-y" style={{ borderColor: COLORS.cardBorder }}>
            {/* Export */}
            <li className="flex items-center gap-3 px-5 py-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
                  Export data
                </p>
                <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                  Download a JSON copy of your Bloopy data.
                </p>
              </div>
              <button
                type="button"
                onClick={handleExport}
                disabled={busy !== null}
                data-bloopy-sound="none"
                className="bloopy-btn shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.97] disabled:opacity-60"
                style={{ background: `${COLORS.neon}1A`, borderColor: `${COLORS.glow}66`, color: COLORS.glow }}
              >
                {busy === "export" ? "Exporting…" : "Export"}
              </button>
            </li>

            {/* Deletes (one table each, scoped by user_id) */}
            {([
              { kind: "chat", title: "Delete chat data", note: "Remove saved conversations." },
              { kind: "journal", title: "Delete journal data", note: "Remove saved journal entries." },
              { kind: "mood", title: "Delete mood data", note: "Remove saved mood check-ins." },
            ] as { kind: DeleteKind; title: string; note: string }[]).map((row) => {
              const count = counts[row.kind];
              return (
                <li key={row.kind} className="flex items-center gap-3 px-5 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
                      {row.title}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                      {row.note}
                      {typeof count === "number" ? ` · ${count} saved` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(row.kind)}
                    disabled={busy !== null}
                    data-bloopy-sound="none"
                    className="bloopy-btn shrink-0 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.97] disabled:opacity-60"
                    style={{ background: `${COLORS.red}14`, borderColor: `${COLORS.red}55`, color: COLORS.red }}
                  >
                    {busy === row.kind ? "Deleting…" : "Delete"}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
        <p className="mt-2 px-2 text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>
          These act only on your own account data, scoped to your user ID. Deletes can&rsquo;t be undone, and they never touch your memory notes, tasks, profile, or sign-in account.
        </p>

        {/* Advanced: theme & sound reset */}
        <p className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
          Advanced
        </p>
        <section className="rounded-3xl border p-5" style={cardStyle}>
          <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
            Reset theme &amp; sound settings
          </p>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
            Resets your appearance (variation + world theme) and sound preference to their defaults. Separate from the clears above — your profile and daily data are not affected.
          </p>
          <button
            type="button"
            onClick={() =>
              runClear(
                "Theme and sound reset to defaults.",
                "Reset your theme and sound settings to defaults?",
                () => {
                  saveThemeId(DEFAULT_THEME_ID);
                  saveWorldThemeId(DEFAULT_WORLD_THEME_ID);
                  setBloopySoundEnabled(true);
                }
              )
            }
            className="mt-4 w-full rounded-2xl border py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            style={{ background: COLORS.bgDeep, borderColor: COLORS.cardBorder, color: COLORS.softText }}
          >
            Reset theme &amp; sound
          </button>
        </section>

        <p className="mt-4 px-2 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
          Bloopy never shows your stored values on this page, and clearing actions here only remove data saved on this device.
        </p>
      </div>
    </main>
  );
}
