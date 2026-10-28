"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
};

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function prepareRecoverySession() {
      try {
        const supabase = createClient();
        const { data, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (!data.session) {
          throw new Error("This reset link is invalid or expired. Request a new link and try again.");
        }

        if (active) {
          setReady(true);
        }
      } catch (err) {
        if (active) setError(getFriendlyAuthError(err));
      }
    }

    void prepareRecoverySession();
    return () => {
      active = false;
    };
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Use at least 8 characters for your new password.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Those passwords don’t match yet.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setError(getFriendlyAuthError(error));
        return;
      }

      await supabase.auth.signOut();
      router.replace("/login?reset=success");
      router.refresh();
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
          <h1
            className={`${fredoka.className} mt-5 text-3xl font-semibold leading-tight`}
            style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}
          >
            Pick a new password ✦
          </h1>
          <p className="mt-1.5 max-w-sm text-sm font-semibold leading-relaxed" style={{ color: COLORS.softText }}>
            Make it something only you know. Bloopy will take it from here.
          </p>
        </div>

        <div
          className="mt-8 rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: "#123257",
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          {!ready && !error && (
            <p className="text-center text-sm font-semibold" style={{ color: COLORS.softText }}>
              Checking your recovery link…
            </p>
          )}

          {error && (
            <>
              <p
                className="rounded-2xl border px-4 py-3 text-sm font-semibold leading-relaxed"
                style={{ borderColor: `${COLORS.red}33`, background: `${COLORS.red}14`, color: COLORS.softText }}
              >
                {error}
              </p>
              <Link
                href="/forgot-password"
                className="mt-4 block text-center text-sm font-bold underline-offset-4 hover:underline"
                style={{ color: COLORS.softText }}
              >
                Request a new reset link
              </Link>
            </>
          )}

          {ready && (
            <form onSubmit={handleUpdate} className="flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                  New password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className={INPUT_CLASSES}
                  style={{ background: `${COLORS.bgDeep}80`, borderColor: "#123257", color: COLORS.mainText }}
                />
              </label>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                  Confirm password
                </span>
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Type it again"
                  className={INPUT_CLASSES}
                  style={{ background: `${COLORS.bgDeep}80`, borderColor: "#123257", color: COLORS.mainText }}
                />
              </label>

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
                {loading ? "Updating password…" : "Save new password"}
              </button>
            </form>
          )}
        </div>

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
