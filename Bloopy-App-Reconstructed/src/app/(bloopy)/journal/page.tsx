"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { celebrate } from "@/lib/useBloopyReward";
import { isFirstMilestoneToday } from "@/lib/bloopyMilestone";
import { awardEnergy } from "@/lib/bloopyEnergy";

type Reflection = {
  id: string;
  text: string;
  created_at: string;
};

/**
 * Dark futuristic-cozy Bloopy theme — matches Home, Chat, and Mood.
 */

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

const WRITING_PROMPTS = [
  "What's one thing on your mind today?",
  "What's one small win from today?",
  "Who or what are you grateful for right now?",
  "Describe a moment that made you smile.",
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ---------- Inline nav icons (stroke = currentColor) ---------- */

function JournalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 7h2M4 12h2M4 17h2M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Small content icons ---------- */

function SparkIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function DeleteIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
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

export default function JournalPage() {
  const COLORS = useBloopyThemeColors();
  const [reflections, setReflections] = useState<Reflection[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePrompt, setActivePrompt] = useState(WRITING_PROMPTS[0]);
  // id of the just-saved entry, so only that one plays the soft entrance (not
  // the whole list on load)
  const [newId, setNewId] = useState<string | null>(null);
  // calm focus glow on the text area (no particles, no animation while typing)
  const [writing, setWriting] = useState(false);
  // whether the last save was the first journal of the day (drives the message)
  const [savedFirst, setSavedFirst] = useState(false);

  const supabase = createClient();

  // ---- load entries on first visit ----
  useEffect(() => {
    async function loadReflections() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You need to be signed in to see your reflections.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("journal_entries")
        .select("id, text, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Hmm, I couldn't load your reflections. Try refreshing? 💙");
      } else {
        setReflections(data ?? []);
      }
      setLoading(false);
    }

    loadReflections();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- save ----
  // The optional event lets us anchor the themed sparkle near the Save button
  // (which sits right above the saved entry) instead of the screen center.
  async function saveReflection(e?: React.MouseEvent) {
    const text = draft.trim();
    if (!text || saving) return;

    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in to save a reflection.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("journal_entries")
      .insert({ user_id: user.id, text })
      .select("id, text, created_at")
      .single();

    if (error || !data) {
      setError("That reflection didn't save. Mind trying again? 💙");
    } else {
      setReflections((prev) => [data, ...prev]);
      setDraft("");
      setJustSaved(true);
      // mark just this entry so it gently slides/fades in (cleared after it plays)
      setNewId(data.id);
      window.setTimeout(() => setNewId((cur) => (cur === data.id ? null : cur)), 700);
      // a bit of Bloopy energy for journaling (once per day)
      awardEnergy("journal");
      // The *first* reflection of the day is a rare-but-calm milestone (wider
      // themed world particles); later ones are a soft success. Both anchor the
      // sparkle near the Save button (just above the new entry) + a soft chime +
      // the existing Bloopy success reaction. Sound respects the user's setting.
      const firstToday = isFirstMilestoneToday("journal");
      setSavedFirst(firstToday);
      celebrate(firstToday ? "milestone" : "success", {
        text: firstToday ? "First thought saved today. Bloopy is proud." : "Saved. Tiny thoughts count.",
        x: e?.clientX,
        y: e?.clientY,
      });
    }
    setSaving(false);
  }

  // ---- delete (optimistic, with rollback) ----
  async function deleteReflection(id: string) {
    setError(null);

    const removed = reflections.find((r) => r.id === id);
    setReflections((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase
      .from("journal_entries")
      .delete()
      .eq("id", id);

    if (error && removed) {
      setReflections((prev) =>
        [...prev, removed].sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        )
      );
      setError("Couldn't delete that one — try again? 💙");
    }
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
              Daily Journal
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Reflection
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Let&apos;s reflect on your day, one thought at a time.
          </p>
        </div>
      </header>

      {/* ===== Scrollable content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* Main entry card with supportive Bloopy */}
        <section
          className="rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <div className="flex items-center gap-3">
            <BloopyAvatar className="h-11 w-11" />
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                Bloopy is here with you
              </p>
              <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                What&apos;s on your mind today?
              </h2>
            </div>
          </div>

          {/* active prompt chip */}
          <div
            className="mt-4 flex items-center gap-2 rounded-2xl border px-3 py-2"
            style={{ borderColor: `${COLORS.neon}2E`, background: `${COLORS.bgDeep}80` }}
          >
            <SparkIcon className="h-4 w-4 shrink-0" style={{ color: COLORS.glow } as React.CSSProperties} />
            {/* keyed so the prompt text gently fades when a chip is tapped */}
            <p key={activePrompt} className="bloopy-fade-in text-xs leading-relaxed" style={{ color: COLORS.softText }}>
              {activePrompt}
            </p>
          </div>

          {/* text area — a calm, soft border glow on focus; no particles or
              animation while typing so writing stays distraction-free */}
          <textarea
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
              setJustSaved(false);
            }}
            onFocus={() => setWriting(true)}
            onBlur={() => setWriting(false)}
            rows={6}
            maxLength={4000}
            placeholder="Write as little or as much as you like…"
            aria-label="Your reflection"
            className="mt-3 w-full resize-none rounded-2xl border bg-transparent p-4 text-sm leading-relaxed outline-none transition-all duration-300 bloopy-placeholder"
            style={{
              borderColor: writing ? COLORS.glow : COLORS.cardBorder,
              background: `${COLORS.bgDeep}66`,
              color: COLORS.mainText,
              boxShadow: writing ? `0 0 0 1px ${COLORS.glow}55, 0 0 18px ${COLORS.neon}33, inset 0 0 14px ${COLORS.neon}14` : "none",
            }}
          />

          <div className="mt-2 flex items-center justify-between">
            <span className="text-[11px]" style={{ color: COLORS.mutedText }}>
              {draft.trim() ? `${draft.trim().split(/\s+/).length} words` : "Your space, no pressure"}
            </span>
            <span className="text-[11px]" style={{ color: COLORS.mutedText }}>
              Private to you
            </span>
          </div>

          {/* save button */}
          <button
            type="button"
            onClick={(e) => saveReflection(e)}
            disabled={!draft.trim() || saving}
            className="bloopy-btn bloopy-tap mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98]"
            style={{
              color: COLORS.mainText,
              borderColor: COLORS.glow,
              background: `linear-gradient(180deg, ${COLORS.glow}, ${COLORS.neon})`,
              boxShadow: `0 0 22px ${COLORS.neon}66, inset 0 0 14px ${COLORS.glow}33`,
            }}
          >
            <JournalIcon className="h-4 w-4" />
            {saving ? "Saving…" : "Save Entry"}
          </button>

          {justSaved && (
            <div
              className="bloopy-entry-in mt-3 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed"
              style={{
                borderColor: `${COLORS.neon}33`,
                background: `${COLORS.card}CC`,
                color: COLORS.mainText,
              }}
            >
              <span
                className="flex h-5 w-5 items-center justify-center rounded-full text-[10px]"
                style={{ background: COLORS.glow, color: COLORS.bgDeep, boxShadow: `0 0 8px ${COLORS.neon}` }}
              >
                ✓
              </span>
              {savedFirst ? "First thought saved today. Bloopy is proud." : "Saved. I'll keep this safe with you."}
            </div>
          )}

          {error && (
            <p
              className="mt-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed"
              style={{
                borderColor: `${COLORS.red}33`,
                background: `${COLORS.red}14`,
                color: COLORS.softText,
              }}
            >
              {error}
            </p>
          )}
        </section>

        {/* Writing prompts */}
        <section
          className="mt-4 rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <div className="flex items-center gap-2">
            <SparkIcon className="h-4 w-4" style={{ color: COLORS.glow } as React.CSSProperties} />
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
              Writing Prompts
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {WRITING_PROMPTS.map((p) => {
              const isActive = p === activePrompt;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setActivePrompt(p)}
                  aria-pressed={isActive}
                  className="bloopy-tap rounded-full border px-3 py-1.5 text-left text-xs leading-snug transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{
                    borderColor: isActive ? COLORS.glow : COLORS.cardBorder,
                    background: isActive ? `radial-gradient(circle at 50% 30%, ${COLORS.cardAlt}, ${COLORS.bgDeep})` : `${COLORS.bgDeep}66`,
                    color: isActive ? COLORS.mainText : COLORS.mutedText,
                    boxShadow: isActive ? `0 0 14px ${COLORS.neon}55` : "none",
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </section>

        {/* Past reflections */}
        <section
          className="mt-4 rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
            Past reflections
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-1.5 py-6">
              <span className="bloopy-dot h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.15s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.3s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </div>
          ) : reflections.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
              <BloopyAvatar className="h-12 w-12" />
              <p className="text-sm font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                Write one tiny thought. No pressure.
              </p>
              <p className="text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                Whatever you save stays here, safe in your little archive.
              </p>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {reflections.map((r) => (
                <li
                  key={r.id}
                  className={`rounded-2xl border p-4 ${r.id === newId ? "bloopy-entry-in" : ""}`}
                  style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}80` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-xs font-semibold" style={{ color: COLORS.softText }}>
                      {formatWhen(r.created_at)}
                    </p>
                    <button
                      type="button"
                      onClick={() => deleteReflection(r.id)}
                      aria-label={`Delete reflection from ${formatWhen(r.created_at)}`}
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
                      style={{ color: COLORS.mutedText }}
                    >
                      <DeleteIcon />
                    </button>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.mainText }}>
                    {r.text}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* typing dots animation */}
      <style>{`
        @keyframes bloopy-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5 } 30% { transform: translateY(-4px); opacity: 1 } }
        .bloopy-dot { animation: bloopy-dot 1.1s ease-in-out infinite; }
        /* soft slide/fade for a newly saved reflection */
        @keyframes bloopyEntryIn { 0% { opacity: 0; transform: translateY(-6px) scale(0.99); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .bloopy-entry-in { animation: bloopyEntryIn 0.4s ease both; }
        @keyframes bloopyFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        /* gentle fade when the active writing prompt changes */
        .bloopy-fade-in { animation: bloopyFadeIn 0.25s ease both; }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
          .bloopy-dot { animation: none; opacity: 0.7 }
          /* drop movement, keep a soft fade */
          .bloopy-entry-in { animation: bloopyFadeIn 0.35s ease both !important; }
        }
      `}</style>
    </main>
  );
}
