"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fredoka, Nunito } from "next/font/google";
import { createClient } from "@/lib/supabase/client";
import BloopyMark from "@/components/BloopyMark";
import { getFriendlyAuthError } from "@/lib/authErrors";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600"] });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

/** Shared input styling: dark glass with a soft neon focus glow. */
const INPUT_CLASSES =
  "rounded-2xl border px-4 py-3 text-sm font-semibold outline-none transition-all duration-200 placeholder:text-[#5d6f96] focus:border-[#1E90FF] focus:shadow-[0_0_0_1px_#1E90FF55,0_0_16px_#0A84FF33]";

/**
 * Dark futuristic-cozy Bloopy theme — matches Home, Chat, and the rest of the app.
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

export default function LoginPage() {
  const router = useRouter();
  const [passwordReset, setPasswordReset] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPasswordReset(params.get("reset") === "success");
  }, []);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(getFriendlyAuthError(error));
      setLoading(false);
      return;
    }

    router.push("/app");
    router.refresh();
  }

  return (
    <main
      className={`${nunito.className} relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden px-5 py-10 font-sans antialiased`}
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
        {/* Bloopy greeting */}
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
            <p className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
              Companion awake
            </p>
          </div>

          <h1
            className={`${fredoka.className} mt-4 text-3xl font-semibold leading-tight`}
            style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}
          >
            Welcome back ✦
          </h1>
          <p className="mt-1.5 text-sm font-semibold leading-relaxed" style={{ color: COLORS.softText }}>
            Bloopy kept your seat warm. Ready when you are.
          </p>
        </div>

        {/* form */}
        <form
          onSubmit={handleLogin}
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
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className={INPUT_CLASSES}
              style={{ background: `${COLORS.bgDeep}80`, borderColor: "#123257", color: COLORS.mainText }}
            />
          </label>

          <div className="flex justify-end">
            <Link
              href="/forgot-password"
              className="text-xs font-bold underline-offset-4 transition-colors hover:underline"
              style={{ color: COLORS.softText }}
            >
              Forgot password?
            </Link>
          </div>

          {passwordReset && !error && (
            <p
              className="rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed"
              style={{ borderColor: `${COLORS.glow}44`, background: `${COLORS.neon}12`, color: COLORS.mainText }}
            >
              Password updated. You can sign in with your new password now.
            </p>
          )}

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
            {loading ? "Waking Bloopy up…" : "Sign in"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm font-semibold" style={{ color: COLORS.mutedText }}>
          New here?{" "}
          <Link
            href="/signup"
            className="font-bold underline-offset-4 transition-colors hover:underline"
            style={{ color: COLORS.softText }}
          >
            Meet Bloopy — create an account
          </Link>
        </p>

        <p className="mt-6 text-center text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
          Your memory, moods, journal, and tasks stay safely connected to your account.
        </p>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
        }
      `}</style>
    </main>
  );
}
