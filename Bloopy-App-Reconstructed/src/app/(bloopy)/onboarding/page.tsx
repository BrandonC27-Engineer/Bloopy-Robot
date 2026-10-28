"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  CHECK_IN_PREFERENCE_OPTIONS,
  SUPPORT_STYLE_OPTIONS,
  completeOnboarding,
  getProfile,
  saveProfile,
  type CheckInPreference,
  type SupportStyle,
} from "@/lib/bloopyProfile";
import { celebrate } from "@/lib/useBloopyReward";

/**
 * First-time Bloopy onboarding.
 *
 * A short, friendly setup that teaches Bloopy a few non-sensitive
 * preferences (name, current focus, support style, check-in timing). Saved to
 * localStorage only — no backend, no API calls, nothing sensitive. Matches the
 * dark futuristic-cozy Bloopy theme used across the app.
 */


const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

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

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ArrowIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m5 12.5 4.5 4.5L19 7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TOTAL_STEPS = 5;
type Step = 1 | 2 | 3 | 4 | 5;

/* ---------- shared bits ---------- */

function StepHeading({ step, title }: { step: number; title: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className="flex items-center gap-3">
      <BloopyAvatar className="h-11 w-11" />
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
          Step {step} of {TOTAL_STEPS}
        </p>
        <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
          {title}
        </h2>
      </div>
    </div>
  );
}

function PrimaryButton({
  children,
  onClick,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
}) {
  const COLORS = useBloopyThemeColors();
  return (
    <button
      type={type}
      onClick={onClick}
      className="mt-4 w-full rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
      style={{
        background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
        color: COLORS.mainText,
        boxShadow: `0 0 18px ${COLORS.neon}88`,
      }}
    >
      {children}
    </button>
  );
}

function OptionList<T extends string>({
  options,
  value,
  onPick,
  ariaLabel,
}: {
  options: { value: T; label: string; note: string }[];
  value: T | null;
  onPick: (value: T) => void;
  ariaLabel: string;
}) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className="mt-4 flex flex-col gap-2.5" role="radiogroup" aria-label={ariaLabel}>
      {options.map((o) => {
        const isActive = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => onPick(o.value)}
            className="flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]"
            style={{
              background: isActive
                ? `radial-gradient(circle at 30% 0%, ${COLORS.cardAlt}, ${COLORS.bgDeep})`
                : `${COLORS.bgDeep}80`,
              borderColor: isActive ? COLORS.glow : COLORS.cardBorder,
              boxShadow: isActive ? `0 0 16px ${COLORS.neon}55, inset 0 0 12px ${COLORS.neon}1A` : "none",
            }}
          >
            <span
              className="grid h-5 w-5 shrink-0 place-items-center rounded-full border"
              style={{
                borderColor: isActive ? COLORS.glow : "#1b3a63",
                background: isActive ? COLORS.glow : "transparent",
                color: COLORS.bgDeep,
              }}
            >
              {isActive && <CheckIcon className="h-3 w-3" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold" style={{ color: COLORS.mainText }}>
                {o.label}
              </span>
              <span className="mt-0.5 block text-xs" style={{ color: COLORS.mutedText }}>
                {o.note}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

export default function OnboardingPage() {
  const COLORS = useBloopyThemeColors();
  const [hydrated, setHydrated] = useState(false);
  const [step, setStep] = useState<Step>(1);
  const [displayName, setDisplayName] = useState("");
  const [currentFocus, setCurrentFocus] = useState("");
  const [supportStyle, setSupportStyle] = useState<SupportStyle | null>(null);
  const [checkInPreference, setCheckInPreference] = useState<CheckInPreference | null>(null);
  const savedRef = useRef(false);

  // Prefill from any existing profile (e.g. revisiting from Settings) — client
  // only, so server and first client render stay identical.
  useEffect(() => {
    const profile = getProfile();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
    setDisplayName(profile.displayName);
    setCurrentFocus(profile.currentFocus);
    setSupportStyle(profile.supportStyle);
    setCheckInPreference(profile.checkInPreference);
    setHydrated(true);
  }, []);

  // Persist the profile as soon as we reach the confirmation step.
  useEffect(() => {
    if (step !== 5 || savedRef.current) return;
    savedRef.current = true;
    saveProfile({ displayName, currentFocus, supportStyle, checkInPreference });
    completeOnboarding();
    // Meeting Bloopy is a real moment — one warm milestone burst (savedRef
    // guards this to a single fire; revisits load straight into step 5 later).
    celebrate("milestone", { text: "Bloopy is all set up" });
  }, [step, displayName, currentFocus, supportStyle, checkInPreference]);

  function next() {
    setStep((s) => (s < TOTAL_STEPS ? ((s + 1) as Step) : s));
  }

  function back() {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  }

  if (!hydrated) {
    return (
      <main
        className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
        style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
      />
    );
  }

  const progress = Math.round((step / TOTAL_STEPS) * 100);

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
          {step > 1 && step < 5 ? (
            <button
              type="button"
              onClick={back}
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors active:scale-95"
              style={{ color: COLORS.softText }}
            >
              <ChevronIcon className="h-4 w-4" />
              Back
            </button>
          ) : (
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors active:scale-95"
              style={{ color: COLORS.softText }}
            >
              <ChevronIcon className="h-4 w-4" />
              Home
            </Link>
          )}
          <span className="text-[11px] font-medium uppercase tracking-[0.22em]" style={{ color: COLORS.mutedText }}>
            Bloopy setup
          </span>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Let&apos;s set up Bloopy
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            A few tiny questions so I can support you better.
          </p>
        </div>

        {/* progress bar */}
        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full" style={{ background: COLORS.cardBorder }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progress}%`, background: `linear-gradient(90deg, ${COLORS.neon}, ${COLORS.glow})`, boxShadow: `0 0 10px ${COLORS.neon}88` }}
          />
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
          {/* Step 1: display name */}
          {step === 1 && (
            <>
              <StepHeading step={1} title="What should Bloopy call you?" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="A name or nickname…"
                  aria-label="What should Bloopy call you?"
                  maxLength={40}
                  autoComplete="off"
                  className="mt-4 w-full rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-colors bloopy-placeholder"
                  style={{ background: `${COLORS.bgDeep}80`, borderColor: COLORS.cardBorder, color: COLORS.mainText }}
                />
                <PrimaryButton type="submit">Continue</PrimaryButton>
              </form>
            </>
          )}

          {/* Step 2: current focus */}
          {step === 2 && (
            <>
              <StepHeading step={2} title="What are you working on lately?" />
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  next();
                }}
              >
                <input
                  type="text"
                  value={currentFocus}
                  onChange={(e) => setCurrentFocus(e.target.value)}
                  placeholder="Building Bloopy, school, fitness, learning robotics…"
                  aria-label="What are you working on lately?"
                  maxLength={80}
                  autoComplete="off"
                  className="mt-4 w-full rounded-2xl border px-3 py-3 text-sm leading-relaxed outline-none transition-colors bloopy-placeholder"
                  style={{ background: `${COLORS.bgDeep}80`, borderColor: COLORS.cardBorder, color: COLORS.mainText }}
                />
                <PrimaryButton type="submit">Continue</PrimaryButton>
              </form>
            </>
          )}

          {/* Step 3: support style */}
          {step === 3 && (
            <>
              <StepHeading step={3} title="How should Bloopy support you?" />
              <OptionList
                options={SUPPORT_STYLE_OPTIONS}
                value={supportStyle}
                onPick={(v) => setSupportStyle(v)}
                ariaLabel="How should Bloopy support you?"
              />
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
            </>
          )}

          {/* Step 4: check-in preference */}
          {step === 4 && (
            <>
              <StepHeading step={4} title="When should Bloopy usually check in?" />
              <OptionList
                options={CHECK_IN_PREFERENCE_OPTIONS}
                value={checkInPreference}
                onPick={(v) => setCheckInPreference(v)}
                ariaLabel="When should Bloopy usually check in?"
              />
              <PrimaryButton onClick={next}>Continue</PrimaryButton>
            </>
          )}

          {/* Step 5: confirmation */}
          {step === 5 && (
            <>
              <div className="flex items-center gap-3">
                <BloopyAvatar className="h-11 w-11" />
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                    All set
                  </p>
                  <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                    {displayName.trim()
                      ? `Nice to meet you, ${displayName.trim()} 💙`
                      : "Nice to meet you 💙"}
                  </h2>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                    I&apos;ll use this to show up the way you like.
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 rounded-2xl border p-4" style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}80` }}>
                <SummaryRow label="Calls you" value={displayName.trim() || "—"} />
                <SummaryRow label="Working on" value={currentFocus.trim() || "—"} />
                <SummaryRow
                  label="Support style"
                  value={SUPPORT_STYLE_OPTIONS.find((o) => o.value === supportStyle)?.label ?? "—"}
                />
                <SummaryRow
                  label="Check-ins"
                  value={CHECK_IN_PREFERENCE_OPTIONS.find((o) => o.value === checkInPreference)?.label ?? "—"}
                />
              </div>

              <Link
                href="/app"
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
                  color: COLORS.mainText,
                  boxShadow: `0 0 18px ${COLORS.neon}88`,
                }}
              >
                Start with Bloopy
                <ArrowIcon className="h-4 w-4" style={{ color: COLORS.mainText }} />
              </Link>

              <button
                type="button"
                onClick={() => {
                  savedRef.current = false;
                  setStep(1);
                }}
                className="mt-3 w-full rounded-full border py-3 text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
                style={{ borderColor: `${COLORS.neon}55`, color: COLORS.softText, background: "transparent" }}
              >
                Edit answers
              </button>
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
        {label}
      </p>
      <p className="mt-0.5 break-words text-sm" style={{ color: COLORS.mainText }}>
        {value}
      </p>
    </div>
  );
}
