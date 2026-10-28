"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import { useSafeBloopyBack } from "@/lib/useSafeBloopyBack";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Memory = {
  id: string;
  content: string;
  created_at: string;
};

/**
 * Dark futuristic-cozy Bloopy theme — matches Home, Chat, Mood, Journal, and Settings.
 */

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/* ---------- Back arrow icon ---------- */

function ArrowLeftIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m11 5-6 7 6 7M5 12h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
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

export default function MemoryPage() {
  const COLORS = useBloopyThemeColors();
  const goBack = useSafeBloopyBack("/app");
  const [memories, setMemories] = useState<Memory[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // ---- load memories on first visit ----
  useEffect(() => {
    async function loadMemories() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You need to be signed in to see Bloopy's memories.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("memories")
        .select("id, content, created_at")
        .order("created_at", { ascending: false });

      if (error) {
        setError("Hmm, I couldn't open my memory banks. Try refreshing? 💙");
      } else {
        setMemories(data ?? []);
      }
      setLoading(false);
    }

    loadMemories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- save a memory ----
  async function saveMemory(e: React.FormEvent) {
    e.preventDefault();
    const content = draft.trim();
    if (!content || saving) return;

    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in to save a memory.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("memories")
      .insert({ user_id: user.id, content })
      .select("id, content, created_at")
      .single();

    if (error || !data) {
      setError("That one didn't stick. Mind trying again? 💙");
    } else {
      setMemories((prev) => [data, ...prev]);
      setDraft("");
    }
    setSaving(false);
  }

  // ---- delete a memory (optimistic, with rollback) ----
  async function deleteMemory(id: string) {
    setError(null);

    const removed = memories.find((m) => m.id === id);
    setMemories((prev) => prev.filter((m) => m.id !== id));

    const { error } = await supabase.from("memories").delete().eq("id", id);

    if (error && removed) {
      setMemories((prev) =>
        [...prev, removed].sort((a, b) =>
          b.created_at.localeCompare(a.created_at)
        )
      );
      setError("Couldn't forget that one — try again? 💙");
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
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-transform duration-200 active:scale-95"
              style={{
                borderColor: `${COLORS.glow}66`,
                background: `${COLORS.bgDeep}CC`,
                boxShadow: `0 0 14px ${COLORS.neon}66`,
                color: COLORS.softText,
              }}
            >
              <ArrowLeftIcon className="h-4 w-4" />
            </button>
            <span
              className="text-sm font-semibold tracking-[0.4em]"
              style={{ color: COLORS.mainText, textShadow: `0 0 18px ${COLORS.glow}66` }}
            >
              BLOOPY
            </span>
          </div>

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
              Memory Core
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Bloopy&rsquo;s Memory
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Little facts about you, kept safe.
          </p>
        </div>
      </header>

      {/* ===== Scrollable content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* add a memory */}
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
                Teach Bloopy
              </p>
              <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                Something to remember
              </h2>
            </div>
          </div>

          <form onSubmit={saveMemory} className="mt-4">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder='Like "I like working on Bloopy at night" ✦'
              aria-label="New memory"
              className="w-full resize-none rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-colors bloopy-placeholder"
              style={{
                background: `${COLORS.bgDeep}80`,
                borderColor: COLORS.cardBorder,
                color: COLORS.mainText,
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = COLORS.glow)}
              onBlur={(e) => (e.currentTarget.style.borderColor = COLORS.cardBorder)}
            />
            <button
              type="submit"
              disabled={!draft.trim() || saving}
              className="mt-3 w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
                color: COLORS.mainText,
                boxShadow: `0 0 18px ${COLORS.neon}88`,
              }}
            >
              {saving ? "Remembering…" : "Save memory"}
            </button>
          </form>

          {/* friendly error */}
          {error && (
            <p
              className="mt-4 rounded-2xl border px-4 py-3 text-sm leading-relaxed"
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

        {/* the memory banks */}
        <section
          className="mt-4 rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
            What I remember
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-1.5 py-6">
              <span className="bloopy-dot h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.15s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.3s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </div>
          ) : memories.length === 0 ? (
            <p className="py-4 text-center text-sm leading-relaxed" style={{ color: COLORS.mutedText }}>
              My memory banks are empty ✦ teach me something about you above.
            </p>
          ) : (
            <ul className="mt-3 flex flex-wrap gap-2">
              {memories.map((m) => (
                <li
                  key={m.id}
                  className="group flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium"
                  style={{
                    borderColor: COLORS.cardBorder,
                    background: `${COLORS.bgDeep}80`,
                    color: COLORS.mainText,
                  }}
                  title={`Remembered ${formatWhen(m.created_at)}`}
                >
                  <span>{m.content}</span>
                  <button
                    type="button"
                    onClick={() => deleteMemory(m.id)}
                    aria-label={`Forget "${m.content}"`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-white/10"
                    style={{ color: COLORS.mutedText }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {!loading && memories.length > 0 && (
            <p className="mt-4 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
              {memories.length} little {memories.length === 1 ? "thing" : "things"}{" "}
              kept safe ✦ tap × to make me forget one.
            </p>
          )}
        </section>
      </div>

      {/* loading dots + reduced-motion */}
      <style>{`
        @keyframes bloopy-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5 } 30% { transform: translateY(-4px); opacity: 1 } }
        .bloopy-dot { animation: bloopy-dot 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
          .bloopy-dot { animation: none; opacity: 0.7 }
        }
      `}</style>
    </main>
  );
}
