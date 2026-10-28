"use client";

import { useState } from "react";
import Link from "next/link";
import { Fredoka, Nunito } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import { getFriendlyAuthError } from "@/lib/authErrors";
import BloopyMark from "@/components/BloopyMark";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600"] });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

const INPUT_CLASSES =
  "rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-all duration-200 placeholder:text-[#5d6f96] focus:border-[#1E90FF] focus:shadow-[0_0_0_1px_#1E90FF55,0_0_16px_#0A84FF33]";

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
  green: "#4DE3A3",
};

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = createClient();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectTo = `${appUrl}/auth/callback?next=/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      });

      if (error) {
        setError(getFriendlyAuthError(error));
        return;
      }

      // Supabase intentionally does not reveal whether an address exists.
      setSent(true);
    } catch (err) {
      setError(getFriendlyAuthError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className={`${nunito.className} relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 py-10 antialiased`}
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

      <div className="relative z-10 flex w-full flex-1 flex-col justify-center">
        <div className="flex flex-col items-center text-center">
          <BloopyMark size={96} />
          <div
            className="mt-4 flex items-center gap-2 rounded-full border px-3 py-1"
            style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC`, boxShadow: `0 0 12px ${COLORS.neon}1A` }}
          >
            <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
              Recovery link
            </p>
          </div>
          <h1
            className={`${fredoka.className} mt-4 text-3xl font-semibold leading-tight`}
            style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}
          >
            Let’s get you back in ✦
          </h1>
          <p className="mt-1.5 max-w-sm text-sm font-semibold leading-relaxed" style={{ color: COLORS.softText }}>
            Enter your account email and Bloopy will send a secure password reset link.
          </p>
        </div>

        <form
          onSubmit={handleReset}
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

          {error && (
            <p
              className="rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed"
              style={{ borderColor: `${COLORS.red}33`, background: `${COLORS.red}14`, color: COLORS.softText }}
            >
              {error}
            </p>
          )}

          {sent && (
            <p
              className="rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed"
              style={{ borderColor: `${COLORS.green}44`, background: `${COLORS.green}12`, color: COLORS.mainText }}
            >
              Check your inbox. If that email belongs to an account, Bloopy sent a reset link.
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
            {loading ? "Sending reset link…" : sent ? "Send another link" : "Send reset link"}
          </button>
        </form>

        <Link
          href="/login"
          className="mt-5 text-center text-sm font-bold underline-offset-4 transition-colors hover:underline"
          style={{ color: COLORS.softText }}
        >
          Back to sign in
        </Link>
      </div>
    </main>
  );
}
