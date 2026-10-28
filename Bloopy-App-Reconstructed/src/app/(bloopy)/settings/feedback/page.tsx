"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { celebrate } from "@/lib/useBloopyReward";

/**
 * Rate Bloopy — a small, warm feedback form (Settings → Rate Bloopy).
 *
 * Entirely user-initiated: no popups, no nagging, no re-asking. Saves to the
 * `app_feedback` table (see supabase/migrations/20260702_app_feedback.sql);
 * RLS lets users insert/read only their own rows, and DB CHECK constraints
 * enforce the rating range and length caps server-side. A soft local cooldown
 * (12h) just skips straight to the thank-you state on revisit — updating your
 * feedback is always one tap away.
 */

const LAST_SUBMIT_KEY = "bloopy.feedback.lastSubmittedAt";
const COOLDOWN_MS = 12 * 60 * 60 * 1000;
const MAX_MESSAGE = 500;

const CATEGORIES = [
  { value: "companion", label: "Bloopy himself 💙" },
  { value: "design", label: "Look & feel" },
  { value: "usefulness", label: "Usefulness" },
  { value: "bugs", label: "Something's broken" },
  { value: "confusing", label: "Confusing" },
  { value: "other", label: "Other" },
] as const;

type Category = (typeof CATEGORIES)[number]["value"];

const RATING_LINES: Record<number, string> = {
  1: "Oh no — tell me what went wrong 💧",
  2: "Hmm, we can do better.",
  3: "Okay is a fine place to start.",
  4: "Yay, that's lovely to hear!",
  5: "Beep beep!! You made Bloopy's day 🎉",
};

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function StarIcon({ className = "", filled }: { className?: string; filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M12 3.5l2.47 5.02 5.53.8-4 3.9.94 5.5L12 16.13l-4.94 2.6.94-5.51-4-3.9 5.53-.8L12 3.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FeedbackPage() {
  const COLORS = useBloopyThemeColors();
  const [rating, setRating] = useState(0);
  const [hovered, setHovered] = useState(0);
  const [category, setCategory] = useState<Category | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [ratedRecently, setRatedRecently] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // If they shared feedback in the last 12h, open on the thank-you state
  // instead of asking again (updating is still one tap). Client-only read.
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(LAST_SUBMIT_KEY) ?? 0);
      if (last && Date.now() - last < COOLDOWN_MS) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
        setDone(true);
        setRatedRecently(true);
      }
    } catch {
      // storage unavailable — just show the form
    }
  }, []);

  async function submit() {
    if (!rating || saving) return;
    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in to share feedback.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("app_feedback").insert({
      user_id: user.id,
      rating,
      category,
      message: message.trim() ? message.trim().slice(0, MAX_MESSAGE) : null,
      route: "/settings/feedback",
    });

    if (insertError) {
      setError("Hmm, that didn't save. Mind trying again in a moment? 💙");
      setSaving(false);
      return;
    }

    try {
      localStorage.setItem(LAST_SUBMIT_KEY, String(Date.now()));
    } catch {
      // storage unavailable — cooldown just won't persist
    }
    celebrate("success", { text: "Feedback sent" });
    setRatedRecently(false);
    setDone(true);
    setSaving(false);
  }

  const shownRating = hovered || rating;

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
            Rate Bloopy
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Honest words help Bloopy grow. Takes 20 seconds.
          </p>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        <section
          className="rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          {done ? (
            /* ---- thank-you state ---- */
            <div className="flex flex-col items-center py-4 text-center">
              <div className="flex items-center gap-1.5" style={{ color: COLORS.glow }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <StarIcon key={n} className="h-6 w-6" filled={ratedRecently ? true : n <= rating} />
                ))}
              </div>
              <h2 className="mt-4 text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                {ratedRecently ? "You shared feedback recently — thank you 💙" : "Thank you 💙"}
              </h2>
              <p className="mt-1.5 max-w-xs text-sm leading-relaxed" style={{ color: COLORS.softText }}>
                Bloopy reads every word. It genuinely helps him grow.
              </p>
              <div className="mt-5 flex w-full flex-col gap-2.5">
                <Link
                  href="/app"
                  className="w-full rounded-full py-3 text-center text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                  style={{
                    background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
                    color: COLORS.mainText,
                    boxShadow: `0 0 18px ${COLORS.neon}88`,
                  }}
                >
                  Back home
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setDone(false);
                    setRatedRecently(false);
                  }}
                  className="w-full rounded-full border py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                  style={{ borderColor: `${COLORS.neon}55`, color: COLORS.softText, background: "transparent" }}
                >
                  {ratedRecently ? "Update my feedback" : "Send more feedback"}
                </button>
              </div>
            </div>
          ) : (
            /* ---- form ---- */
            <>
              {/* stars */}
              <p className="text-center text-sm font-semibold" style={{ color: COLORS.mainText }}>
                How is Bloopy doing?
              </p>
              <div
                role="radiogroup"
                aria-label="Rate Bloopy from 1 to 5 stars"
                className="mt-3 flex items-center justify-center gap-2"
                onMouseLeave={() => setHovered(0)}
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const lit = n <= shownRating;
                  return (
                    <button
                      key={n}
                      type="button"
                      role="radio"
                      aria-checked={rating === n}
                      aria-label={`${n} star${n > 1 ? "s" : ""}`}
                      onClick={() => setRating(n)}
                      onMouseEnter={() => setHovered(n)}
                      className="rounded-xl p-1 transition-transform duration-150 hover:-translate-y-0.5 hover:scale-110 active:scale-95"
                      style={{
                        color: lit ? COLORS.glow : COLORS.cardBorder,
                        filter: lit ? `drop-shadow(0 0 8px ${COLORS.neon}88)` : "none",
                      }}
                    >
                      <StarIcon className="h-9 w-9" filled={lit} />
                    </button>
                  );
                })}
              </div>
              <p
                className="mt-2 min-h-5 text-center text-xs leading-relaxed"
                style={{ color: rating ? COLORS.softText : COLORS.mutedText }}
                aria-live="polite"
              >
                {rating ? RATING_LINES[rating] : "Tap a star to start"}
              </p>

              {/* category chips */}
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                What&apos;s it about? <span className="normal-case tracking-normal">(optional)</span>
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {CATEGORIES.map((c) => {
                  const active = category === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setCategory(active ? null : c.value)}
                      className="rounded-full border px-3 py-1.5 text-xs font-semibold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                      style={{
                        borderColor: active ? COLORS.glow : COLORS.cardBorder,
                        background: active ? `${COLORS.neon}1F` : `${COLORS.bgDeep}80`,
                        color: active ? COLORS.mainText : COLORS.softText,
                        boxShadow: active ? `0 0 12px ${COLORS.neon}44` : "none",
                      }}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* message */}
              <p className="mt-5 text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                Anything else? <span className="normal-case tracking-normal">(optional)</span>
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={MAX_MESSAGE}
                placeholder="What do you love? What's confusing? What's missing?"
                aria-label="Written feedback (optional)"
                className="mt-2.5 w-full resize-none rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-colors bloopy-placeholder"
                style={{ background: `${COLORS.bgDeep}80`, borderColor: COLORS.cardBorder, color: COLORS.mainText }}
              />
              <p className="mt-1 text-right text-[10px]" style={{ color: COLORS.mutedText }}>
                {message.length}/{MAX_MESSAGE}
              </p>

              {error && (
                <p
                  className="mt-2 rounded-2xl border px-4 py-3 text-sm leading-relaxed"
                  style={{ borderColor: `${COLORS.red}33`, background: `${COLORS.red}14`, color: COLORS.softText }}
                >
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={submit}
                disabled={!rating || saving}
                className="bloopy-btn mt-4 w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
                  color: COLORS.mainText,
                  boxShadow: `0 0 18px ${COLORS.neon}88`,
                }}
              >
                {saving ? "Sending to Bloopy…" : "Send feedback"}
              </button>
              <p className="mt-3 text-center text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                Private to the Bloopy team — never shown publicly.
              </p>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
