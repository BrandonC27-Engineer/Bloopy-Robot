"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { celebrate } from "@/lib/useBloopyReward";
import { isFirstMilestoneToday } from "@/lib/bloopyMilestone";
import { awardEnergy } from "@/lib/bloopyEnergy";

type MoodCheckin = {
  id: string;
  mood: number; // 0–4, matching the faces below
  note: string | null;
  created_at: string;
};

/**
 * Dark futuristic-cozy Bloopy theme — matches Home and Chat.
 */

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

const moods = [
  {
    label: "Rough",
    mouth: "M8 16 Q12 12 16 16",
    response: "i'm sorry it's heavy right now. you don't have to carry it alone 💙",
    accent: true,
  },
  {
    label: "Low",
    mouth: "M8 15 Q12 13.5 16 15",
    response: "some days are just grey ones. i'm glad you checked in anyway ☁️",
    accent: true,
  },
  {
    label: "Okay",
    mouth: "M8 15 L16 15",
    response: "okay is a perfectly fine place to be. steady counts ✦",
    accent: false,
  },
  {
    label: "Good",
    mouth: "M8 14 Q12 16.5 16 14",
    response: "ooh, a good one! i'm quietly doing a happy little robot dance 🌤️",
    accent: false,
  },
  {
    label: "Great",
    mouth: "M8 13.5 Q12 18 16 13.5",
    response: "yay!! days like this deserve to be remembered. beep beep hooray 🎉",
    accent: false,
  },
];

function formatWhen(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

/* ---------- Mood face (line style, stroke = currentColor) ---------- */

function MoodFace({ mouth, className = "" }: { mouth: string; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9.2" stroke="currentColor" strokeWidth="1.4" opacity="0.55" />
      <circle cx="9" cy="10" r="1.2" fill="currentColor" />
      <circle cx="15" cy="10" r="1.2" fill="currentColor" />
      <path d={mouth} stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" fill="none" />
    </svg>
  );
}


export default function MoodPage() {
  const COLORS = useBloopyThemeColors();
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<MoodCheckin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // id of the just-saved check-in, so only that history card plays the soft
  // entrance (not the whole list on load)
  const [newId, setNewId] = useState<string | null>(null);
  // whether the last save was the first mood check-in today (drives the message)
  const [savedFirst, setSavedFirst] = useState(false);

  const supabase = createClient();

  // ---- load recent check-ins on first visit ----
  useEffect(() => {
    async function loadHistory() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You need to be signed in to see your check-ins.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("mood_checkins")
        .select("id, mood, note, created_at")
        .order("created_at", { ascending: false })
        .limit(7);

      if (error) {
        setError("Hmm, I couldn't load your check-ins. Try refreshing? 💙");
      } else {
        setHistory(data ?? []);
      }
      setLoading(false);
    }

    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function pickMood(index: number) {
    setSelected(index);
    setSaved(false); // picking a new mood starts a fresh check-in
    // soft tap on selecting a face is handled globally by BloopyInteractionLayer
  }

  // ---- save a check-in ----
  // The optional event lets us anchor the themed sparkle near the Save button.
  async function saveCheckIn(e?: React.MouseEvent) {
    if (selected === null || saving) return;
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in to save a check-in.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("mood_checkins")
      .insert({
        user_id: user.id,
        mood: selected,
        note: note.trim() || null,
      })
      .select("id, mood, note, created_at")
      .single();

    if (error || !data) {
      setError("That check-in didn't save. Mind trying again? 💙");
    } else {
      setHistory((prev) => [data, ...prev].slice(0, 7));
      setNote("");
      setSaved(true);
      // mark just this check-in so its history card gently slides/fades in
      setNewId(data.id);
      window.setTimeout(() => setNewId((cur) => (cur === data.id ? null : cur)), 700);
      // a bit of Bloopy energy for the mood check-in (once per day)
      awardEnergy("mood");
      // The *first* check-in of the day is a rare-but-calm milestone (wider
      // themed world particles); later ones are a soft success. Both anchor the
      // sparkle near the Save button + a soft chime + the existing Bloopy success
      // reaction (hero + center-nav pulse). Sound respects the user's setting.
      const firstToday = isFirstMilestoneToday("mood");
      setSavedFirst(firstToday);
      celebrate(firstToday ? "milestone" : "success", {
        text: firstToday ? "First check-in saved. Tiny awareness counts." : "Mood saved. I'll remember today gently.",
        x: e?.clientX,
        y: e?.clientY,
      });
    }
    setSaving(false);
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
              Mood Scan
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Mood Check-In
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            A tiny check-in, whenever you feel like it.
          </p>
        </div>
      </header>

      {/* ===== Scrollable content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* prompt card with supportive Bloopy */}
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
                Bloopy is listening
              </p>
              <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                How are you feeling right now?
              </h2>
            </div>
          </div>

          {/* mood picker */}
          <div className="mt-5 grid grid-cols-5 gap-2">
            {moods.map((mood, i) => {
              const isActive = selected === i;
              const accent = mood.accent && isActive;
              return (
                <button
                  key={mood.label}
                  type="button"
                  onClick={() => pickMood(i)}
                  aria-pressed={isActive}
                  className="group relative flex flex-col items-center gap-2 rounded-2xl border px-1 py-3 transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                  style={{
                    background: isActive
                      ? `radial-gradient(circle at 50% 30%, ${COLORS.cardAlt}, ${COLORS.bgDeep})`
                      : `${COLORS.bgDeep}80`,
                    borderColor: accent ? `${COLORS.red}99` : isActive ? COLORS.glow : COLORS.cardBorder,
                    boxShadow: accent
                      ? `0 0 16px ${COLORS.red}44, inset 0 0 12px ${COLORS.red}1A`
                      : isActive
                        ? `0 0 16px ${COLORS.neon}66, inset 0 0 12px ${COLORS.neon}1A`
                        : "none",
                    color: accent ? COLORS.red : isActive ? COLORS.glow : COLORS.mutedText,
                  }}
                >
                  {/* selection: a calm one-shot ring pop (theme-aware; the
                      bloopy-pop animation is disabled under reduced motion, so
                      the ring stays as a static glow there). */}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="bloopy-pop pointer-events-none absolute inset-0 rounded-2xl"
                      style={{
                        border: `1.5px solid ${accent ? COLORS.red : COLORS.glow}`,
                        boxShadow: `0 0 18px ${accent ? COLORS.red : COLORS.neon}88`,
                      }}
                    />
                  )}
                  <MoodFace mouth={mood.mouth} className="h-7 w-7" />
                  <span className="text-[11px] font-medium" style={{ color: isActive ? COLORS.mainText : COLORS.mutedText }}>
                    {mood.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* bloopy's response — a gentle, mood-specific reaction line that
              softly fades in (and re-fades) when the selected mood changes */}
          {selected !== null && (
            <div key={selected} className="bloopy-entry-in mt-5 flex items-end gap-2">
              <BloopyAvatar className="h-7 w-7" />
              <div
                className="max-w-[78%] rounded-3xl rounded-bl-md border px-4 py-2.5 text-sm leading-relaxed"
                style={{
                  background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                  borderColor: COLORS.cardBorder,
                  color: COLORS.mainText,
                  boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 22px #00040A88`,
                }}
              >
                {moods[selected].response}
              </div>
            </div>
          )}

          {/* note + save */}
          {selected !== null && !saved && (
            <>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="What's making you feel this way? (optional)"
                aria-label="What's making you feel this way?"
                className="mt-4 w-full resize-none rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-colors bloopy-placeholder"
                style={{
                  background: `${COLORS.bgDeep}80`,
                  borderColor: COLORS.cardBorder,
                  color: COLORS.mainText,
                }}
              />
              <button
                type="button"
                onClick={(e) => saveCheckIn(e)}
                disabled={saving}
                className="bloopy-btn bloopy-tap mt-3 w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
                  color: COLORS.mainText,
                  boxShadow: `0 0 18px ${COLORS.neon}88`,
                }}
              >
                {saving ? "Saving…" : "Save check-in"}
              </button>
            </>
          )}

          {/* confirmation */}
          {saved && (
            <div
              className="bloopy-entry-in mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed"
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
              {savedFirst ? "First check-in saved. Tiny awareness counts." : "Mood saved. I'll remember today gently."}
            </div>
          )}

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

        {/* history */}
        <section
          className="mt-4 rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
            Your recent check-ins
          </p>

          {loading ? (
            <div className="flex items-center justify-center gap-1.5 py-6">
              <span className="bloopy-dot h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.15s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.3s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-4 py-6 text-center">
              <BloopyAvatar className="h-12 w-12" />
              <p className="text-sm font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                Pick one feeling. No perfect answer needed.
              </p>
              <p className="text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                Your check-ins will gather here, just for you.
              </p>
            </div>
          ) : (
            <ul className="mt-3 flex flex-col gap-2.5">
              {history.map((c) => (
                <li
                  key={c.id}
                  className={`flex items-start gap-3 rounded-2xl border p-3 ${c.id === newId ? "bloopy-entry-in" : ""}`}
                  style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}80` }}
                >
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border"
                    style={{ borderColor: COLORS.cardBorder, color: COLORS.glow }}
                  >
                    <MoodFace mouth={moods[c.mood]?.mouth ?? moods[2].mouth} className="h-6 w-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold" style={{ color: COLORS.softText }}>
                      {moods[c.mood]?.label ?? "Okay"} · {formatWhen(c.created_at)}
                    </p>
                    {c.note && (
                      <p className="mt-0.5 text-sm leading-relaxed" style={{ color: COLORS.mainText }}>
                        {c.note}
                      </p>
                    )}
                  </div>
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
        /* soft slide/fade for a newly saved mood card + reaction/confirmation */
        @keyframes bloopyEntryIn { 0% { opacity: 0; transform: translateY(-6px) scale(0.99); } 100% { opacity: 1; transform: translateY(0) scale(1); } }
        .bloopy-entry-in { animation: bloopyEntryIn 0.4s ease both; }
        @keyframes bloopyFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
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
