"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fredoka, Nunito } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import BloopyMark from "@/components/BloopyMark";
import { getFriendlyAuthError } from "@/lib/authErrors";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600"] });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

/**
 * Dark futuristic-cozy Bloopy theme — matches the landing page, /login, and
 * the in-app UI. Auth logic is unchanged: Supabase signUp with the
 * email-confirmation branch preserved.
 */
const COLORS = {
  bg: "#020712",
  bgDeep: "#00040A",
  card: "#061225",
  cardAlt: "#07182C",
  neon: "#0A84FF",
  glow: "#1E90FF",
  softText: "#8CBFFF",
  mutedText: "#7F91B8",
  mainText: "#F4F8FF",
  red: "#FF3B4F",
};

/** Shared input styling: dark glass with a soft neon focus glow. */
const INPUT_CLASSES =
  "rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-all duration-200 placeholder:text-[#5d6f96] focus:border-[#1E90FF] focus:shadow-[0_0_0_1px_#1E90FF55,0_0_16px_#0A84FF33]";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkEmail, setCheckEmail] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Passwords need at least 8 characters — a little armor for your journal 💙");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(getFriendlyAuthError(error));
      setLoading(false);
      return;
    }

    // If email confirmation is ON in Supabase, there's no session yet —
    // the user needs to click the link in their inbox first.
    if (!data.session) {
      setCheckEmail(true);
      setLoading(false);
      return;
    }

    // Email confirmation is OFF — they're signed in right away.
    router.push("/app");
    router.refresh();
  }

  return (
    <main
      className={`${nunito.className} relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 py-10 antialiased`}
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

      <div className="relative z-10 flex w-full flex-1 flex-col justify-center">
        {checkEmail ? (
          /* ---- confirmation state: a small, glowing "almost there" moment ---- */
          <div className="flex flex-col items-center text-center">
            <BloopyMark size={96} />

            <div
              className="mt-4 flex items-center gap-2 rounded-full border px-3 py-1"
              style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC`, boxShadow: `0 0 12px ${COLORS.neon}1A` }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: COLORS.glow }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
                One step left
              </p>
            </div>

            <h1
              className={`${fredoka.className} mt-4 text-3xl font-semibold`}
              style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}
            >
              Check your inbox ✦
            </h1>
            <p className="mt-2 max-w-xs text-sm font-semibold leading-relaxed" style={{ color: COLORS.softText }}>
              I sent a confirmation link to{" "}
              <span style={{ color: COLORS.glow }}>{email}</span>. Click it, then come back and sign
              in — I&rsquo;ll be waiting!
            </p>
            <Link
              href="/login"
              className="mt-6 rounded-full px-8 py-3.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
                color: COLORS.mainText,
                boxShadow: `0 0 18px ${COLORS.neon}88`,
              }}
            >
              Go to sign in
            </Link>
          </div>
        ) : (
          /* ---- signup form ---- */
          <>
            <div className="flex flex-col items-center text-center">
              <BloopyMark size={96} />

              {/* status pill */}
              <div
                className="mt-4 flex items-center gap-2 rounded-full border px-3 py-1"
                style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC`, boxShadow: `0 0 12px ${COLORS.neon}1A` }}
              >
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: COLORS.glow }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
                </span>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
                  New friend detected
                </p>
              </div>

              <h1
                className={`${fredoka.className} mt-4 text-3xl font-semibold leading-tight`}
                style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}
              >
                Hi, I&rsquo;m Bloopy ✦
              </h1>
              <p className="mt-1.5 text-sm font-semibold leading-relaxed" style={{ color: COLORS.softText }}>
                Make an account and let&rsquo;s get through the days together.
              </p>
            </div>

            <form
              onSubmit={handleSignup}
              className="mt-8 flex flex-col gap-3 rounded-3xl border p-5"
              style={{
                background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                borderColor: "#123257",
                boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
              }}
            >
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                  Email
                </span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={INPUT_CLASSES}
                  style={{ background: `${COLORS.bgDeep}80`, borderColor: "#123257", color: COLORS.mainText }}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                  Password
                </span>
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={INPUT_CLASSES}
                  style={{ background: `${COLORS.bgDeep}80`, borderColor: "#123257", color: COLORS.mainText }}
                />
              </label>

              {error && (
                <p
                  className="rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed"
                  style={{ borderColor: `${COLORS.red}33`, background: `${COLORS.red}14`, color: COLORS.softText }}
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-1 rounded-full py-3.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] disabled:opacity-50 disabled:hover:translate-y-0"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
                  color: COLORS.mainText,
                  boxShadow: `0 0 18px ${COLORS.neon}88`,
                }}
              >
                {loading ? "Waking up your Bloopy…" : "Create account"}
              </button>

              <p className="mt-1 text-center text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                One tiny step — and Bloopy will remember you from here on. 💙
              </p>
            </form>

            <p className="mt-5 text-center text-sm font-semibold" style={{ color: COLORS.mutedText }}>
              Already friends with Bloopy?{" "}
              <Link
                href="/login"
                className="font-bold underline-offset-4 transition-colors hover:underline"
                style={{ color: COLORS.softText }}
              >
                Sign in
              </Link>
            </p>

            <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
              No spam, no pressure. Your moods, journal, and memories stay yours.
            </p>
          </>
        )}
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
