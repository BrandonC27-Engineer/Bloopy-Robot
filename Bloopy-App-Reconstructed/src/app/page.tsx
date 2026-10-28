import Link from "next/link";
import { Fredoka, Nunito } from "next/font/google";
import BloopyMark from "@/components/BloopyMark";

const fredoka = Fredoka({ subsets: ["latin"], weight: ["400", "500", "600"] });
const nunito = Nunito({ subsets: ["latin"], weight: ["400", "600", "700", "800"] });

/**
 * Bloopy landing page — dark futuristic-cozy, matching the in-app UI.
 *
 * Server component on purpose: all motion is CSS-only (and removed under
 * prefers-reduced-motion), so the page stays static, fast, and calm. Every
 * call-to-action routes to the real /signup and /login flows.
 */

const C = {
  bg: "#020712",
  bgDeep: "#00040A",
  card: "#061225",
  cardAlt: "#07182C",
  cardBorder: "#123257",
  neon: "#0A84FF",
  glow: "#1E90FF",
  softText: "#8CBFFF",
  mutedText: "#7F91B8",
  mainText: "#F4F8FF",
  red: "#FF3B4F",
};

/* ---------- Inline icons (stroke = currentColor, same set as the app) ---------- */

function ChatIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="9" cy="11" r="1" fill="currentColor" />
      <circle cx="12" cy="11" r="1" fill="currentColor" />
      <circle cx="15" cy="11" r="1" fill="currentColor" />
    </svg>
  );
}

function MoodIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 14.5c.9 1.1 2.1 1.7 3.5 1.7s2.6-.6 3.5-1.7" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="9" cy="10" r="1" fill="currentColor" />
      <circle cx="15" cy="10" r="1" fill="currentColor" />
    </svg>
  );
}

function JournalIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M4 7h2M4 12h2M4 17h2M9 8h6M9 12h6M9 16h3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ReminderIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M10.5 19a1.8 1.8 0 0 0 3 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function FlameIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 3s5 4 5 9a5 5 0 0 1-10 0c0-1.5.6-2.7 1.3-3.6C8.9 9.9 9 11 10 11.5 9.7 9 11 5 12 3Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function RobotIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="8" width="16" height="11" rx="3" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M12 8V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="3.6" r="1.1" fill="currentColor" />
      <circle cx="9.5" cy="13" r="1.1" fill="currentColor" />
      <circle cx="14.5" cy="13" r="1.1" fill="currentColor" />
      <path d="M9.5 16h5M4 11.5H2.5M21.5 11.5H20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ArrowIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- tiny building blocks ---------- */

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em]" style={{ color: C.softText }}>
      {children}
    </p>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2
      className={`${fredoka.className} text-2xl font-semibold text-balance sm:text-3xl`}
      style={{ color: C.mainText, textShadow: `0 0 26px ${C.neon}40` }}
    >
      {children}
    </h2>
  );
}

/** Dark neon preview card shell (matches the in-app card language). */
function PreviewCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <article
      className="rounded-3xl border p-5 transition-transform duration-300 hover:-translate-y-1"
      style={{
        background: `linear-gradient(160deg, ${C.cardAlt} 0%, ${C.card} 100%)`,
        borderColor: C.cardBorder,
        boxShadow: `0 0 0 1px ${C.neon}10, 0 10px 30px #00040A99`,
      }}
    >
      <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: C.mutedText }}>
        {label}
      </p>
      {children}
    </article>
  );
}

/* ---------- feature list data ---------- */

const FEATURES = [
  { title: "Supportive chat", desc: "A warm little AI friend who listens, any hour.", Icon: ChatIcon },
  { title: "Mood check-ins", desc: "30 seconds to say how today feels. That's it.", Icon: MoodIcon },
  { title: "Journal", desc: "One honest sentence counts as a reflection.", Icon: JournalIcon },
  { title: "Tasks & reminders", desc: "Gentle nudges — never nagging, never guilt.", Icon: ReminderIcon },
  { title: "Streaks & energy", desc: "Tiny steps light Bloopy up. Missing a day is okay.", Icon: FlameIcon },
  { title: "Physical Bloopy", desc: "Live sensors, voice, vision, and safe body controls.", Icon: RobotIcon },
];

const LOOP_STEPS = [
  {
    step: "1",
    title: "Morning check-in",
    desc: "Tell Bloopy how you feel and pick one small focus. 30 seconds, no pressure.",
  },
  {
    step: "2",
    title: "One tiny step",
    desc: "A task, a thought, a chat — anything counts. Bloopy glows a little brighter.",
  },
  {
    step: "3",
    title: "Evening wind-down",
    desc: "Wrap the day softly. Bloopy remembers the good parts for tomorrow.",
  },
];

export default function Home() {
  return (
    <main
      className={`${nunito.className} relative min-h-screen overflow-hidden antialiased`}
      style={{
        background: `radial-gradient(120% 80% at 50% -10%, ${C.card} 0%, ${C.bg} 45%, ${C.bgDeep} 100%)`,
        color: C.mainText,
      }}
    >
      {/* motion (all removed under prefers-reduced-motion) */}
      <style>{`
        @keyframes landingParticle { 0%,100% { transform: translate(0,0); opacity: 0.25 } 50% { transform: translate(8px,-16px); opacity: 0.6 } }
        @keyframes landingBlink { 0%,100% { opacity: 0.3 } 50% { opacity: 1 } }
        .landing-particle { animation: landingParticle var(--dur, 10s) ease-in-out infinite; }
        .landing-blink { animation: landingBlink 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .landing-particle, .landing-blink { animation: none; }
          .animate-ping { animation: none !important; }
        }
      `}</style>

      {/* faint circuit grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `linear-gradient(${C.neon} 1px, transparent 1px), linear-gradient(90deg, ${C.neon} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at 50% 20%, black, transparent 80%)",
        }}
      />

      {/* drifting neon particles */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {[
          { left: "10%", top: "14%", size: 3, delay: "0s", dur: "9s" },
          { left: "86%", top: "10%", size: 2, delay: "2s", dur: "11s" },
          { left: "72%", top: "30%", size: 2.5, delay: "4s", dur: "10s" },
          { left: "16%", top: "46%", size: 2, delay: "1s", dur: "12s" },
          { left: "90%", top: "58%", size: 3, delay: "5s", dur: "9s" },
          { left: "6%", top: "76%", size: 2, delay: "3s", dur: "11s" },
        ].map((p, i) => (
          <span
            key={i}
            className="landing-particle absolute rounded-full"
            style={
              {
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
                background: C.glow,
                boxShadow: `0 0 6px ${C.neon}, 0 0 12px ${C.neon}66`,
                animationDelay: p.delay,
                "--dur": p.dur,
              } as React.CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative mx-auto max-w-md px-5 pb-16 pt-6 sm:max-w-2xl lg:max-w-5xl">
        {/* ===== nav ===== */}
        <header className="mb-12 flex items-center justify-between">
          <span
            className="text-sm font-bold tracking-[0.5em]"
            style={{ color: C.mainText, textShadow: `0 0 18px ${C.glow}66` }}
          >
            BLOOPY
          </span>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-bold transition-colors hover:text-white"
              style={{ color: C.softText }}
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-full px-5 py-2 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${C.glow}, ${C.neon})`,
                color: C.mainText,
                boxShadow: `0 0 18px ${C.neon}66`,
              }}
            >
              Get started
            </Link>
          </nav>
        </header>

        {/* ===== hero ===== */}
        <section className="flex flex-col items-center gap-10 text-center lg:flex-row lg:items-center lg:gap-16 lg:text-left">
          <div className="flex flex-1 flex-col items-center lg:items-start">
            {/* status pill */}
            <div
              className="flex items-center gap-2 rounded-full border px-3 py-1"
              style={{ borderColor: `${C.neon}33`, background: `${C.card}CC`, boxShadow: `0 0 12px ${C.neon}1A` }}
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: C.glow }} />
                <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: C.glow, boxShadow: `0 0 6px ${C.neon}` }} />
              </span>
              <p className="text-[10px] font-semibold uppercase tracking-[0.22em]" style={{ color: C.softText }}>
                Companion awake
              </p>
            </div>

            <h1
              className={`${fredoka.className} mt-5 text-4xl font-semibold leading-tight text-balance sm:text-5xl`}
              style={{ color: C.mainText, textShadow: `0 0 30px ${C.neon}40` }}
            >
              A tiny friend for{" "}
              <span style={{ color: C.glow, textShadow: `0 0 24px ${C.neon}88` }}>big little days.</span>
            </h1>
            <p className="mt-4 max-w-md text-base leading-relaxed text-pretty" style={{ color: C.softText }}>
              Bloopy checks in on your mood, listens when you need to talk, nudges you gently through
              your tasks, and remembers the small things that matter to you — one tiny step at a time.
            </p>

            <div className="mt-7 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Link
                href="/signup"
                className="rounded-full px-8 py-3.5 text-center text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: `radial-gradient(circle at 50% 35%, ${C.glow}, ${C.neon})`,
                  color: C.mainText,
                  boxShadow: `0 0 24px ${C.neon}88`,
                }}
              >
                Meet Bloopy — it&rsquo;s free
              </Link>
              <a
                href="#day"
                className="rounded-full border px-8 py-3.5 text-center text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
                style={{ borderColor: C.cardBorder, background: `${C.card}CC`, color: C.softText }}
              >
                See a day together
              </a>
            </div>

            <p className="mt-4 text-xs font-semibold" style={{ color: C.mutedText }}>
              No pressure, no streak guilt. Your moods and journal stay yours.
            </p>
          </div>

          {/* Bloopy in his little room */}
          <div className="relative flex flex-1 items-center justify-center">
            {/* speech bubble */}
            <div
              className="absolute -top-4 left-1/2 z-10 -translate-x-1/2 rounded-3xl rounded-bl-md border px-5 py-2.5 lg:-top-8"
              style={{
                background: `linear-gradient(160deg, ${C.cardAlt} 0%, ${C.card} 100%)`,
                borderColor: C.cardBorder,
                boxShadow: `0 0 0 1px ${C.neon}10, 0 8px 22px ${C.bgDeep}88`,
              }}
            >
              <p className="whitespace-nowrap text-sm font-semibold" style={{ color: C.mainText }}>
                hi! i&rsquo;m bloopy <span style={{ color: C.glow }}>✦</span> how&rsquo;s your heart today?
              </p>
            </div>

            <div className="relative mt-10 grid place-items-center">
              {/* floor glow + platform */}
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-2 h-9 w-52 rounded-[50%] blur-xl"
                style={{ background: C.neon, opacity: 0.26 }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-1 h-6 w-40 rounded-[50%]"
                style={{
                  border: `1px solid ${C.glow}55`,
                  background: `radial-gradient(ellipse at center, ${C.neon}30, transparent 70%)`,
                  boxShadow: `0 0 22px ${C.neon}30`,
                }}
              />
              {/* tiny status lights */}
              <span
                aria-hidden="true"
                className="landing-blink absolute -left-6 top-10 h-1.5 w-1.5 rounded-full"
                style={{ background: C.glow, boxShadow: `0 0 6px ${C.neon}` }}
              />
              <span
                aria-hidden="true"
                className="landing-blink absolute -right-4 top-20 h-1.5 w-1.5 rounded-full"
                style={{ background: C.red, boxShadow: `0 0 7px ${C.red}`, animationDelay: "1.1s" }}
              />
              <BloopyMark size={192} />
            </div>
          </div>
        </section>

        {/* ===== how your day with Bloopy works ===== */}
        <section className="mt-24" aria-label="How your day with Bloopy works">
          <div className="text-center">
            <Eyebrow>One gentle loop</Eyebrow>
            <SectionHeading>How your day with Bloopy works</SectionHeading>
          </div>

          <div className="relative mt-9 flex flex-col gap-4 lg:flex-row lg:gap-5">
            {LOOP_STEPS.map((s, i) => (
              <div key={s.step} className="relative flex flex-1 items-start gap-4 lg:flex-col lg:items-center lg:text-center">
                {/* connector (vertical on mobile, horizontal on desktop) */}
                {i < LOOP_STEPS.length - 1 && (
                  <>
                    <span
                      aria-hidden="true"
                      className="absolute left-[1.35rem] top-12 h-[calc(100%-1.5rem)] w-px lg:hidden"
                      style={{ background: `linear-gradient(${C.glow}66, ${C.neon}22)` }}
                    />
                    <span
                      aria-hidden="true"
                      className="absolute right-[-0.75rem] top-5 hidden h-px w-6 lg:block"
                      style={{ background: `linear-gradient(90deg, ${C.glow}66, ${C.neon}22)` }}
                    />
                  </>
                )}
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full border text-sm font-bold"
                  style={{
                    color: C.glow,
                    borderColor: `${C.neon}55`,
                    background: C.bgDeep,
                    boxShadow: `0 0 16px ${C.neon}33, inset 0 0 10px ${C.neon}22`,
                  }}
                >
                  {s.step}
                </span>
                <div>
                  <h3 className="text-base font-bold" style={{ color: C.mainText }}>
                    {s.title}
                  </h3>
                  <p className="mt-1 max-w-xs text-sm leading-relaxed" style={{ color: C.mutedText }}>
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <p className="mt-8 text-center text-sm font-semibold" style={{ color: C.softText }}>
            Do all three and the loop completes. Miss a day? Tomorrow is a fresh, calm start. 💙
          </p>
        </section>

        {/* ===== a day with bloopy (feature preview) ===== */}
        <section id="day" className="mt-24 scroll-mt-8">
          <div className="text-center">
            <Eyebrow>A day with Bloopy</Eyebrow>
            <SectionHeading>Small moments, gently held</SectionHeading>
          </div>

          <div className="mt-9 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* chat */}
            <PreviewCard label="Supportive chat">
              <div className="flex flex-col gap-2.5 text-sm font-semibold">
                <div
                  className="max-w-[85%] self-start rounded-2xl rounded-bl-md border px-4 py-2.5"
                  style={{ background: `${C.bgDeep}80`, borderColor: C.cardBorder, color: C.mainText }}
                >
                  rough morning, huh? want to talk it out or just vibe quietly? ☁️
                </div>
                <div
                  className="max-w-[85%] self-end rounded-2xl rounded-br-md px-4 py-2.5"
                  style={{
                    background: `linear-gradient(160deg, ${C.glow} 0%, ${C.neon} 100%)`,
                    color: C.mainText,
                    boxShadow: `0 6px 18px ${C.neon}44`,
                  }}
                >
                  quietly, but stay close
                </div>
                <div
                  className="max-w-[85%] self-start rounded-2xl rounded-bl-md border px-4 py-2.5"
                  style={{ background: `${C.bgDeep}80`, borderColor: C.cardBorder, color: C.mainText }}
                >
                  always. i&rsquo;m right here. 💙
                </div>
              </div>
            </PreviewCard>

            {/* mood check-in */}
            <PreviewCard label="Mood check-in">
              <p className="mb-4 text-sm font-semibold" style={{ color: C.mainText }}>
                How are you feeling right now?
              </p>
              <div className="flex items-center justify-between">
                {[
                  { mouth: "M8 16 Q12 12 16 16", active: false },
                  { mouth: "M8 15 Q12 13.5 16 15", active: false },
                  { mouth: "M8 15 L16 15", active: false },
                  { mouth: "M8 14 Q12 16.5 16 14", active: true },
                  { mouth: "M8 13.5 Q12 18 16 13.5", active: false },
                ].map((m, i) => (
                  <span
                    key={i}
                    className="flex h-11 w-11 items-center justify-center rounded-full border transition-transform"
                    style={
                      m.active
                        ? {
                            borderColor: C.glow,
                            background: `radial-gradient(circle at 50% 30%, ${C.cardAlt}, ${C.bgDeep})`,
                            boxShadow: `0 0 16px ${C.neon}66`,
                            transform: "scale(1.12)",
                            color: C.glow,
                          }
                        : { borderColor: C.cardBorder, background: `${C.bgDeep}80`, color: C.mutedText }
                    }
                  >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <circle cx="8" cy="9" r="1.6" fill="currentColor" />
                      <circle cx="16" cy="9" r="1.6" fill="currentColor" />
                      <path d={m.mouth} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
                    </svg>
                  </span>
                ))}
              </div>
              <p
                className="mt-4 rounded-2xl border px-4 py-2.5 text-sm font-semibold"
                style={{ borderColor: `${C.neon}33`, background: `${C.neon}12`, color: C.softText }}
              >
                Pretty good — day 3 together 🌤️
              </p>
            </PreviewCard>

            {/* reminders / tasks */}
            <PreviewCard label="Gentle reminders">
              <ul className="flex flex-col gap-2.5 text-sm font-semibold">
                {[
                  { text: "Drink some water", done: true },
                  { text: "Step outside for 5 minutes", done: true },
                  { text: "Text Sam back 💌", done: false },
                ].map((t) => (
                  <li
                    key={t.text}
                    className="flex items-center gap-3 rounded-2xl border px-4 py-2.5"
                    style={{
                      borderColor: t.done ? `${C.neon}2A` : C.cardBorder,
                      background: `${C.bgDeep}80`,
                      color: t.done ? C.mutedText : C.mainText,
                      textDecoration: t.done ? "line-through" : "none",
                    }}
                  >
                    {t.done ? (
                      <span
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold"
                        style={{ background: C.glow, color: C.bgDeep, boxShadow: `0 0 8px ${C.neon}` }}
                      >
                        ✓
                      </span>
                    ) : (
                      <span className="h-5 w-5 shrink-0 rounded-full border-2" style={{ borderColor: C.cardBorder }} />
                    )}
                    {t.text}
                  </li>
                ))}
              </ul>
            </PreviewCard>

            {/* reflection */}
            <PreviewCard label="Daily reflection">
              <div
                className="rounded-2xl border p-4"
                style={{
                  borderColor: `${C.neon}33`,
                  background: `linear-gradient(135deg, ${C.neon}1A, ${C.card})`,
                  boxShadow: `inset 0 0 24px ${C.neon}12`,
                }}
              >
                <p className={`${fredoka.className} text-lg font-medium`} style={{ color: C.mainText }}>
                  &ldquo;What&rsquo;s one tiny thing that made today softer?&rdquo;
                </p>
                <p className="mt-2 text-sm font-semibold" style={{ color: C.mutedText }}>
                  Tonight&rsquo;s prompt · 1 min
                </p>
              </div>
            </PreviewCard>

            {/* memory */}
            <PreviewCard label="Bloopy remembers">
              <div className="flex flex-wrap gap-2 text-sm font-bold">
                {["your dog is named Miso 🐾", "big interview Friday", "tea > coffee", "Sundays are for resting"].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border px-3.5 py-1.5"
                    style={{ borderColor: `${C.neon}3A`, background: `${C.neon}12`, color: C.softText }}
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold" style={{ color: C.mutedText }}>
                The little things you mention — kept safe, never forgotten.
              </p>
            </PreviewCard>

            {/* streak / energy */}
            <PreviewCard label="Tiny steps add up">
              <div className="flex items-center gap-3">
                <span
                  className="grid h-11 w-11 place-items-center rounded-2xl"
                  style={{ color: C.red, background: `${C.red}14`, boxShadow: `0 0 14px ${C.red}22` }}
                >
                  <FlameIcon className="h-6 w-6" />
                </span>
                <div>
                  <p className="text-base font-bold" style={{ color: C.mainText }}>
                    Day 7 together 💙
                  </p>
                  <p className="text-sm font-semibold" style={{ color: C.mutedText }}>
                    A whole week of showing up.
                  </p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5" aria-hidden="true">
                {Array.from({ length: 7 }).map((_, i) => (
                  <span
                    key={i}
                    className="h-1.5 flex-1 rounded-full"
                    style={{ background: C.glow, boxShadow: `0 0 8px ${C.neon}88`, opacity: 0.6 + i / 14 }}
                  />
                ))}
              </div>
              <p className="mt-3 text-sm font-semibold" style={{ color: C.mutedText }}>
                Streaks celebrate you — they never scold you.
              </p>
            </PreviewCard>
          </div>
        </section>

        {/* ===== everything a tiny companion should do ===== */}
        <section className="mt-24" aria-label="Bloopy features">
          <div className="text-center">
            <Eyebrow>Everything, gently</Eyebrow>
            <SectionHeading>What Bloopy can do</SectionHeading>
          </div>

          <div className="mt-9 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group flex items-start gap-3.5 rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-1"
                style={{
                  background: `linear-gradient(160deg, ${C.cardAlt} 0%, ${C.card} 100%)`,
                  borderColor: C.cardBorder,
                  boxShadow: `0 0 0 1px ${C.neon}10, 0 8px 24px #00040A88`,
                }}
              >
                <span
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition-transform duration-200 group-hover:scale-105"
                  style={{
                    color: C.glow,
                    borderColor: `${C.neon}55`,
                    background: C.bgDeep,
                    boxShadow: `0 0 16px ${C.neon}33, inset 0 0 10px ${C.neon}22`,
                  }}
                >
                  <f.Icon className="h-6 w-6" />
                </span>
                <div>
                  <h3 className="text-base font-bold" style={{ color: C.mainText }}>
                    {f.title}
                  </h3>
                  <p className="mt-0.5 text-sm leading-relaxed" style={{ color: C.mutedText }}>
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ===== closing CTA ===== */}
        <section
          className="relative mt-24 overflow-hidden rounded-[2rem] border px-6 py-12 text-center"
          style={{
            background: `linear-gradient(160deg, ${C.cardAlt} 0%, ${C.card} 60%, ${C.bgDeep} 100%)`,
            borderColor: `${C.neon}33`,
            boxShadow: `0 0 0 1px ${C.neon}14, 0 0 40px ${C.neon}22, 0 20px 50px #00040A99`,
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -top-20 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full blur-3xl"
            style={{ background: C.neon, opacity: 0.2 }}
          />
          <div className="relative mx-auto mb-5 w-fit">
            <BloopyMark size={96} />
          </div>
          <h2
            className={`${fredoka.className} relative text-2xl font-semibold sm:text-3xl`}
            style={{ color: C.mainText, textShadow: `0 0 26px ${C.neon}40` }}
          >
            Ready when you are.
          </h2>
          <p className="relative mx-auto mt-3 max-w-xs text-sm font-semibold" style={{ color: C.softText }}>
            No pressure, no streak guilt. Just a tiny robot who&rsquo;s glad you&rsquo;re here.
          </p>
          <div className="relative mt-7 flex flex-col items-center gap-3">
            <Link
              href="/signup"
              className="inline-flex items-center gap-2 rounded-full px-9 py-3.5 text-sm font-bold transition-all duration-200 hover:-translate-y-0.5 active:scale-95"
              style={{
                background: `radial-gradient(circle at 50% 35%, ${C.glow}, ${C.neon})`,
                color: C.mainText,
                boxShadow: `0 0 26px ${C.neon}88`,
              }}
            >
              Create your account
              <ArrowIcon className="h-4 w-4" />
            </Link>
            <Link href="/login" className="text-sm font-bold transition-colors hover:text-white" style={{ color: C.softText }}>
              Already friends with Bloopy? Sign in
            </Link>
          </div>
        </section>

        {/* ===== footer ===== */}
        <footer className="mt-12 text-center text-xs font-semibold" style={{ color: C.mutedText }}>
          <p>made with care · bloopy © {new Date().getFullYear()}</p>
        </footer>
      </div>
    </main>
  );
}
