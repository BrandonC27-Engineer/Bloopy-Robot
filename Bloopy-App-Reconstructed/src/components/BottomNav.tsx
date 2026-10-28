"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { markSeen, useBloopyUnread } from "@/lib/bloopyUnread";
import { useBloopyThemeColors, useBloopyWorld } from "@/components/BloopyThemeProvider";
import { BLOOPY_REACT_EVENT, fireBloopyReaction, fireBloopyReward } from "@/lib/useBloopyReward";
import { useRobot } from "@/components/RobotProvider";
import { robotStateLabel } from "@/lib/robotConnection";

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

/* ---------- Inline nav icons (stroke = currentColor) ---------- */

function HomeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 11 12 4l8 7" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
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

function TasksIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m3.5 7 1.6 1.6L8 5.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m3.5 17 1.6 1.6L8 15.6" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 8h9M11.5 16h9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

/* ---------- Bloopy mascot (logo PNG used for the center nav button) ---------- */

function BloopyMascot({ className = "" }: { className?: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className={`relative grid place-items-center ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-[78%] w-[78%] rounded-full blur-3xl"
        style={{ background: COLORS.neon, opacity: 0.32 }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-[72%] w-[72%] rounded-full"
        style={{
          background: `radial-gradient(circle, transparent 56%, ${COLORS.glow}55 60%, transparent 72%)`,
          border: `2px solid ${COLORS.glow}66`,
          boxShadow: `0 0 28px ${COLORS.neon}66, inset 0 0 28px ${COLORS.neon}44`,
        }}
      />
      <img
        src={LOGO_SRC}
        alt="Bloopy"
        className="relative h-full w-full object-contain drop-shadow-[0_8px_30px_rgba(30,144,255,0.45)]"
      />
    </div>
  );
}

/* ---------- Bottom nav button ---------- */

function NavButton({
  children,
  label,
  href,
  active,
}: {
  children: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
}) {
  const COLORS = useBloopyThemeColors();
  return (
    <Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      data-bloopy-sound="nav"
      className="bloopy-tap relative flex flex-col items-center gap-1 rounded-2xl px-2 py-1 transition-all duration-200 hover:-translate-y-0.5 active:scale-90"
      style={{ color: active ? COLORS.glow : COLORS.mutedText }}
    >
      <span
        className="bloopy-icon-tap transition-all duration-200"
        style={active ? { filter: `drop-shadow(0 0 8px ${COLORS.neon})` } : undefined}
      >
        {children}
      </span>
      <span className="text-[10px] font-medium tracking-wide">{label}</span>
      {active && (
        <span
          aria-hidden="true"
          className="bloopy-nav-active absolute -bottom-1 h-1 w-1 rounded-full"
          style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }}
        />
      )}
    </Link>
  );
}

export default function BottomNav() {
  const pathname = usePathname();
  const unread = useBloopyUnread();
  const COLORS = useBloopyThemeColors();
  const { status: robotStatus, connected: robotConnected } = useRobot();
  const physicalState = robotStateLabel(robotStatus);

  // Center Bloopy plays a tiny happy bounce on a success/milestone reaction.
  // (Ordinary taps never fire a reaction, so it stays calm — no constant wiggle.
  // The .bloopy-celebrate animation is disabled under prefers-reduced-motion.)
  const [reacting, setReacting] = useState(false);
  useEffect(() => {
    const onReact = () => {
      setReacting(true);
      window.setTimeout(() => setReacting(false), 780);
    };
    window.addEventListener(BLOOPY_REACT_EVENT, onReact);
    return () => window.removeEventListener(BLOOPY_REACT_EVENT, onReact);
  }, []);
  // Some worlds turn the bar into tinted "glass": Beach → ocean, Desert → sand, Space → station, Underwater → deep, Forest → garden, Snowy → frosted.
  const particle = useBloopyWorld().particle;
  const isBeach = particle === "waves";
  const isDesert = particle === "sand";
  const isSpace = particle === "stars";
  const isWater = particle === "bubbles";
  const isForest = particle === "fireflies";
  const isSnow = particle === "snow";
  const isCyber = particle === "grid";
  const isVolcano = particle === "embers";
  const isCloud = particle === "clouds";
  const isMoon = particle === "craters";
  const glass = isBeach || isDesert || isSpace || isWater || isForest || isSnow || isCyber || isVolcano || isCloud || isMoon;

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2"
      aria-label="Primary"
    >
      <div
        className="relative flex items-center justify-between rounded-[28px] border px-5 py-2.5"
        style={{
          background: `${COLORS.card}F2`,
          borderColor: glass ? `${COLORS.glow}55` : COLORS.cardBorder,
          boxShadow: glass
            ? `0 -2px 30px ${COLORS.bgDeep}cc, 0 -6px 26px ${COLORS.neon}2E, 0 0 0 1px ${COLORS.glow}33, inset 0 0 22px ${COLORS.neon}1A`
            : `0 -2px 30px ${COLORS.bgDeep}cc, 0 0 0 1px ${COLORS.neon}14, inset 0 0 18px ${COLORS.neon}10`,
          backdropFilter: "blur(12px)",
        }}
      >
        {/* ocean-glass wave shimmer (Beach Paradise — decorative, behind items) */}
        {isBeach && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-0 bottom-0 h-8" style={{ background: `linear-gradient(180deg, transparent, ${COLORS.neon}18)` }} />
            <span
              className="absolute left-1/2 top-[58%] h-7 w-[150%] -translate-x-1/2 rounded-[50%] animate-[bloopyNavWave_8s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{ borderTop: `1px solid ${COLORS.glow}33` }}
            />
            <span
              className="absolute left-1/2 top-[74%] h-7 w-[150%] -translate-x-1/2 rounded-[50%] animate-[bloopyNavWave_11s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{ borderTop: `1px solid ${COLORS.glow}1F`, animationDelay: "1.2s" }}
            />
          </span>
        )}

        {/* desert-glass: warm sand underglow + drifting dune-crest shimmer */}
        {isDesert && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-0 bottom-0 h-9" style={{ background: `linear-gradient(180deg, transparent, ${COLORS.neon}1C)` }} />
            {/* rolling dune curve at the base */}
            <span className="absolute -bottom-3 left-1/2 h-7 w-[150%] -translate-x-1/2 rounded-[50%]" style={{ background: COLORS.bgDeep, opacity: 0.45 }} />
            <span
              className="absolute bottom-0.5 left-1/2 h-6 w-[150%] -translate-x-1/2 rounded-[50%] animate-[bloopyNavWave_9s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{ borderTop: `1px solid ${COLORS.glow}3A` }}
            />
            <span
              className="absolute bottom-3 left-1/2 h-6 w-[140%] -translate-x-1/2 rounded-[50%] animate-[bloopyNavWave_12s_ease-in-out_infinite] motion-reduce:animate-none"
              style={{ borderTop: `1px solid ${COLORS.glow}1F`, animationDelay: "1.4s" }}
            />
          </span>
        )}
        {/* underwater-glass: soft top light + rising bubble accents */}
        {isWater && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-0 top-0 h-8" style={{ background: `linear-gradient(180deg, ${COLORS.glow}16, transparent)` }} />
            {[
              { l: "16%", t: "52%", s: 4 }, { l: "30%", t: "30%", s: 2.5 }, { l: "70%", t: "40%", s: 3 }, { l: "84%", t: "56%", s: 2.5 }, { l: "60%", t: "26%", s: 2 },
            ].map((p, i) => (
              <span key={i} className="absolute rounded-full" style={{ left: p.l, top: p.t, width: p.s, height: p.s, border: `1px solid ${COLORS.glow}88`, boxShadow: `0 0 4px ${COLORS.neon}55` }} />
            ))}
          </span>
        )}

        {/* lunar glass: silver mist + base-panel corners + moon-dust specks */}
        {isMoon && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-0 top-0 h-9" style={{ background: `linear-gradient(180deg, ${COLORS.glow}14, transparent)` }} />
            <span className="absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.glow}55, transparent)` }} />
            {/* base-panel corner brackets */}
            <span className="absolute left-2.5 top-2 h-2.5 w-2.5 border-l border-t" style={{ borderColor: `${COLORS.glow}66` }} />
            <span className="absolute right-2.5 top-2 h-2.5 w-2.5 border-r border-t" style={{ borderColor: `${COLORS.glow}66` }} />
            {/* faint moon-dust specks */}
            {[
              { l: "22%", t: "34%" }, { l: "42%", t: "60%" }, { l: "64%", t: "32%" }, { l: "82%", t: "56%" },
            ].map((p, i) => (
              <span key={i} className="absolute h-[2px] w-[2px] rounded-full" style={{ left: p.l, top: p.t, background: COLORS.glow, opacity: 0.6, boxShadow: `0 0 4px ${COLORS.glow}` }} />
            ))}
          </span>
        )}

        {/* cloud glass: soft mist + cloud-puff corners + tiny stars */}
        {isCloud && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-0 top-0 h-9" style={{ background: `linear-gradient(180deg, ${COLORS.glow}16, transparent)` }} />
            {/* soft cloud puffs tucked into the lower corners */}
            <span className="absolute -bottom-2 left-3 h-5 w-12 rounded-full blur-[3px]" style={{ background: COLORS.glow, opacity: 0.2 }} />
            <span className="absolute -bottom-2 right-3 h-5 w-12 rounded-full blur-[3px]" style={{ background: COLORS.neon, opacity: 0.18 }} />
            {/* tiny stars (one pink) */}
            {[
              { l: "22%", t: "30%", c: COLORS.mainText }, { l: "44%", t: "58%", c: COLORS.red }, { l: "66%", t: "32%", c: COLORS.mainText }, { l: "82%", t: "54%", c: COLORS.mainText },
            ].map((p, i) => (
              <span key={i} className="absolute h-[2px] w-[2px] rounded-full" style={{ left: p.l, top: p.t, background: p.c, opacity: 0.8, boxShadow: `0 0 4px ${COLORS.glow}` }} />
            ))}
          </span>
        )}

        {/* lava-lab glass: warm heat reflection + lab-panel corners + ember dots */}
        {isVolcano && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-0 bottom-0 h-9" style={{ background: `linear-gradient(180deg, transparent, ${COLORS.red}22)` }} />
            {/* glowing lava seam along the base */}
            <span className="absolute inset-x-10 bottom-1 h-px" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.red}, ${COLORS.glow}, ${COLORS.red}, transparent)`, boxShadow: `0 0 6px ${COLORS.red}66` }} />
            {/* lab-panel corner brackets */}
            <span className="absolute left-2.5 top-2 h-2.5 w-2.5 border-l border-t" style={{ borderColor: `${COLORS.neon}88` }} />
            <span className="absolute right-2.5 top-2 h-2.5 w-2.5 border-r border-t" style={{ borderColor: `${COLORS.neon}88` }} />
            {/* ember dots */}
            {[
              { l: "24%", t: "30%" }, { l: "44%", t: "58%" }, { l: "66%", t: "34%" }, { l: "80%", t: "56%" },
            ].map((p, i) => (
              <span key={i} className="absolute h-[2.5px] w-[2.5px] rounded-full" style={{ left: p.l, top: p.t, background: i % 2 ? COLORS.glow : COLORS.red, boxShadow: `0 0 5px ${i % 2 ? COLORS.glow : COLORS.red}` }} />
            ))}
          </span>
        )}

        {/* neon-glass: cyber grid reflection + neon corner brackets + pixel dots */}
        {isCyber && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            {/* faint cyber grid reflection along the base */}
            <span className="absolute inset-x-0 bottom-0 h-6" style={{ backgroundImage: `linear-gradient(${COLORS.neon}2E 1px, transparent 1px), linear-gradient(90deg, ${COLORS.glow}24 1px, transparent 1px)`, backgroundSize: "16px 12px", maskImage: "linear-gradient(0deg, black, transparent)", WebkitMaskImage: "linear-gradient(0deg, black, transparent)" }} />
            <span className="absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.glow}66, transparent)` }} />
            {/* neon corner brackets */}
            <span className="absolute left-2.5 top-2 h-2.5 w-2.5 border-l border-t" style={{ borderColor: `${COLORS.glow}99` }} />
            <span className="absolute right-2.5 top-2 h-2.5 w-2.5 border-r border-t" style={{ borderColor: `${COLORS.red}99` }} />
            {/* pixel / signal dots (cyan + pink) */}
            {[
              { l: "22%", t: "34%", c: COLORS.glow }, { l: "40%", t: "60%", c: COLORS.red }, { l: "64%", t: "32%", c: COLORS.glow }, { l: "82%", t: "58%", c: COLORS.red },
            ].map((p, i) => (
              <span key={i} className="absolute h-[2.5px] w-[2.5px]" style={{ left: p.l, top: p.t, background: p.c, boxShadow: `0 0 5px ${p.c}` }} />
            ))}
          </span>
        )}

        {/* frosted-glass: icy top frost + snow-cap corners + falling snow dots */}
        {isSnow && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-0 top-0 h-8" style={{ background: `linear-gradient(180deg, ${COLORS.glow}18, transparent)` }} />
            {/* frosty top edge highlight */}
            <span className="absolute inset-x-6 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.glow}66, transparent)` }} />
            {/* snow-cap corners */}
            <span className="absolute left-3 top-0 h-1.5 w-6 rounded-b-full" style={{ background: `${COLORS.glow}55` }} />
            <span className="absolute right-3 top-0 h-1.5 w-6 rounded-b-full" style={{ background: `${COLORS.glow}55` }} />
            {/* a few drifting snow dots */}
            {[
              { l: "22%", t: "32%" }, { l: "40%", t: "62%" }, { l: "64%", t: "30%" }, { l: "82%", t: "58%" },
            ].map((p, i) => (
              <span key={i} className="absolute h-[2.5px] w-[2.5px] rounded-full" style={{ left: p.l, top: p.t, background: COLORS.glow, boxShadow: `0 0 4px ${COLORS.glow}` }} />
            ))}
          </span>
        )}

        {/* forest-glass: soft moss glow + leaf-tipped vine corners + firefly dots */}
        {isForest && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-0 top-0 h-8" style={{ background: `linear-gradient(180deg, ${COLORS.neon}16, transparent)` }} />
            {/* leaf marks tucked in the top corners */}
            <span className="absolute left-2 top-1.5 h-2.5 w-2.5" style={{ background: COLORS.neon, borderRadius: "0 100% 0 100%", opacity: 0.7 }} />
            <span className="absolute right-2 top-1.5 h-2.5 w-2.5" style={{ background: COLORS.neon, borderRadius: "100% 0 100% 0", opacity: 0.7 }} />
            {/* firefly dots (one warm) */}
            {[
              { l: "20%", t: "30%", c: COLORS.glow }, { l: "36%", t: "60%", c: COLORS.red }, { l: "66%", t: "34%", c: COLORS.glow }, { l: "82%", t: "58%", c: COLORS.glow },
            ].map((p, i) => (
              <span key={i} className="absolute h-[2.5px] w-[2.5px] rounded-full" style={{ left: p.l, top: p.t, background: p.c, boxShadow: `0 0 5px ${p.c}` }} />
            ))}
          </span>
        )}

        {/* space-glass: panel border, seam, and a sparse star row */}
        {isSpace && (
          <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[28px]">
            <span className="absolute inset-x-10 top-0 h-px" style={{ background: `linear-gradient(90deg, transparent, ${COLORS.glow}66, transparent)` }} />
            <span className="absolute left-2.5 top-2 h-2.5 w-2.5 rounded-tl-md" style={{ borderTop: `1px solid ${COLORS.glow}66`, borderLeft: `1px solid ${COLORS.glow}66` }} />
            <span className="absolute right-2.5 top-2 h-2.5 w-2.5 rounded-tr-md" style={{ borderTop: `1px solid ${COLORS.glow}66`, borderRight: `1px solid ${COLORS.glow}66` }} />
            {[
              { l: "20%", t: "34%" }, { l: "38%", t: "64%" }, { l: "62%", t: "30%" }, { l: "80%", t: "60%" },
            ].map((p, i) => (
              <span key={i} className="absolute h-[2px] w-[2px] rounded-full" style={{ left: p.l, top: p.t, background: i % 2 ? COLORS.glow : COLORS.softText, opacity: 0.7 }} />
            ))}
          </span>
        )}
        <NavButton label="Home" href="/app" active={pathname === "/app"}>
          <HomeIcon className="h-6 w-6" />
        </NavButton>
        <NavButton label="Mood" href="/mood" active={pathname === "/mood"}>
          <MoodIcon className="h-6 w-6" />
        </NavButton>

        {/* center Bloopy button — blinks only when Bloopy has an unseen nudge */}
        <Link
          href="/chat"
          aria-label={`${unread ? "Talk to Bloopy (new message)" : "Talk to Bloopy"}. Physical body: ${physicalState}.`}
          data-bloopy-sound="none"
          onClick={(e) => {
            markSeen();
            fireBloopyReaction();
            // cute Bloopy bloop + a tiny theme-aware ring sparkle at the tap
            fireBloopyReward({ x: e.clientX, y: e.clientY, sound: "bloopy" });
          }}
          className="relative -mt-8 grid h-16 w-16 shrink-0 place-items-center rounded-full border-2 transition-all duration-300 hover:scale-110 hover:rotate-3 active:scale-95"
          style={{
            borderColor: COLORS.glow,
            background: `radial-gradient(circle at 50% 35%, ${COLORS.cardAlt}, ${COLORS.bgDeep})`,
            boxShadow: `0 0 24px ${COLORS.neon}88, 0 0 0 6px ${COLORS.neon}14`,
          }}
        >
          {/* gentle breathing glow (calm, always-on) */}
          <span
            aria-hidden="true"
            className="bloopy-nav-breathe pointer-events-none absolute h-[118%] w-[118%] rounded-full blur-lg"
            style={{ background: COLORS.neon, opacity: 0.4 }}
          />
          {/* Space Station: a tilted orbit ring with a tiny satellite around Bloopy */}
          {isSpace && (
            <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-24" style={{ transform: "translate(-50%,-50%) rotate(-18deg) scaleY(0.82)" }}>
              <span className="absolute inset-0 rounded-full" style={{ border: `1px solid ${COLORS.glow}55` }} />
              <span className="absolute right-0 top-1/2 h-1 w-1 -translate-y-1/2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 5px ${COLORS.neon}` }} />
            </span>
          )}
          {/* Underwater: a faint water ripple expanding around Bloopy */}
          {isWater && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute h-[150%] w-[150%] rounded-full animate-[bloopyNavRipple_4.5s_ease-out_infinite] motion-reduce:hidden" style={{ border: `1px solid ${COLORS.glow}55` }} />
              <span aria-hidden="true" className="pointer-events-none absolute h-[130%] w-[130%] rounded-full motion-reduce:block hidden" style={{ border: `1px solid ${COLORS.glow}44` }} />
            </>
          )}
          {/* Forest: a soft firefly glow + two tiny fireflies orbiting Bloopy */}
          {isForest && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute h-[140%] w-[140%] rounded-full blur-md" style={{ background: COLORS.neon, opacity: 0.22 }} />
              <span aria-hidden="true" className="pointer-events-none absolute right-0 top-1 h-1 w-1 rounded-full animate-[bloopyNavBlink_3.4s_ease-in-out_infinite] motion-reduce:animate-none" style={{ background: COLORS.glow, boxShadow: `0 0 5px ${COLORS.glow}` }} />
              <span aria-hidden="true" className="pointer-events-none absolute bottom-1 left-1 h-1 w-1 rounded-full animate-[bloopyNavBlink_4.2s_ease-in-out_infinite] motion-reduce:animate-none" style={{ background: COLORS.red, boxShadow: `0 0 5px ${COLORS.red}`, animationDelay: "1s" }} />
            </>
          )}
          {/* Snowy Cabin: a subtle warm cabin glow + frosty ring around Bloopy */}
          {isSnow && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute h-[150%] w-[150%] rounded-full blur-md" style={{ background: COLORS.red, opacity: 0.14 }} />
              <span aria-hidden="true" className="pointer-events-none absolute h-[128%] w-[128%] rounded-full" style={{ border: `1px solid ${COLORS.glow}33` }} />
            </>
          )}
          {/* Cyber City: split cyan/pink city-light glow + neon ring around Bloopy */}
          {isCyber && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute h-[150%] w-[150%] rounded-full blur-md" style={{ background: `conic-gradient(from 180deg, ${COLORS.glow}, ${COLORS.neon}, ${COLORS.red}, ${COLORS.glow})`, opacity: 0.2 }} />
              <span aria-hidden="true" className="pointer-events-none absolute h-[126%] w-[126%] rounded-full" style={{ border: `1px solid ${COLORS.glow}44` }} />
            </>
          )}
          {/* Volcano Lab: a warm lava glow + molten ring around Bloopy */}
          {isVolcano && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute h-[150%] w-[150%] rounded-full blur-md" style={{ background: COLORS.red, opacity: 0.18 }} />
              <span aria-hidden="true" className="pointer-events-none absolute h-[126%] w-[126%] rounded-full" style={{ border: `1px solid ${COLORS.red}55`, boxShadow: `0 0 8px ${COLORS.red}44` }} />
            </>
          )}
          {/* Cloud Sky: a gentle moonlight glow + soft halo around Bloopy */}
          {isCloud && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute h-[150%] w-[150%] rounded-full blur-md" style={{ background: COLORS.glow, opacity: 0.18 }} />
              <span aria-hidden="true" className="pointer-events-none absolute h-[128%] w-[128%] rounded-full" style={{ border: `1px solid ${COLORS.softText}33` }} />
            </>
          )}
          {/* Moon Base: a soft silver glow + concentric crater rings around Bloopy */}
          {isMoon && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute h-[148%] w-[148%] rounded-full blur-md" style={{ background: COLORS.neon, opacity: 0.16 }} />
              <span aria-hidden="true" className="pointer-events-none absolute h-[132%] w-[132%] rounded-full" style={{ border: `1px solid ${COLORS.glow}44` }} />
              <span aria-hidden="true" className="pointer-events-none absolute h-[118%] w-[118%] rounded-full" style={{ border: `1px solid ${COLORS.glow}22` }} />
            </>
          )}
          <span
            aria-hidden="true"
            className="absolute -left-0.5 top-0.5 h-2.5 w-2.5 rounded-full border"
            title={robotConnected ? `Physical Bloopy: ${physicalState}` : "Physical Bloopy offline"}
            style={{
              background: robotConnected ? COLORS.glow : COLORS.bgDeep,
              borderColor: robotConnected ? COLORS.bgDeep : COLORS.mutedText,
              boxShadow: robotConnected ? `0 0 8px ${COLORS.neon}` : "none",
              opacity: robotConnected ? 1 : 0.65,
            }}
          />
          {unread && (
            <>
              {/* soft blue attention pulse */}
              <span
                aria-hidden="true"
                className="absolute inset-0 animate-ping rounded-full opacity-25 motion-reduce:hidden"
                style={{ background: COLORS.neon }}
              />
              <span
                aria-hidden="true"
                className="absolute -inset-1 rounded-full animate-[bloopyNavPulse_1.8s_ease-in-out_infinite]"
                style={{ border: `2px solid ${COLORS.glow}`, boxShadow: `0 0 16px ${COLORS.neon}` }}
              />
              {/* tiny unread indicator dot */}
              <span
                aria-hidden="true"
                className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full"
                style={{ background: COLORS.glow, boxShadow: `0 0 8px ${COLORS.neon}`, border: `1.5px solid ${COLORS.bgDeep}` }}
              />
            </>
          )}
          <BloopyMascot className={`h-11 w-11 ${reacting ? "bloopy-celebrate" : ""}`} />
        </Link>

        <NavButton label="Journal" href="/journal" active={pathname === "/journal"}>
          <JournalIcon className="h-6 w-6" />
        </NavButton>
        <NavButton label="Tasks" href="/reminders" active={pathname === "/reminders"}>
          <TasksIcon className="h-6 w-6" />
        </NavButton>
      </div>

      <style>{`
        /* unread: gentle ring pulse around the center Bloopy button */
        @keyframes bloopyNavPulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.12); opacity: 0.9; }
        }
        /* Beach Paradise: slow ocean-glass wave shimmer */
        @keyframes bloopyNavWave {
          0%, 100% { transform: translateX(-50%) scaleX(1); opacity: 0.7; }
          50% { transform: translateX(-50%) scaleX(1.05); opacity: 1; }
        }
        /* Underwater: a soft ripple expanding from the center Bloopy button */
        @keyframes bloopyNavRipple {
          0% { transform: scale(0.8); opacity: 0.55; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        /* Forest Garden: slow firefly blink near the center Bloopy button */
        @keyframes bloopyNavBlink {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
          .animate-\\[bloopyNavPulse_1\\.8s_ease-in-out_infinite\\] { animation: none !important; }
        }
      `}</style>
    </nav>
  );
}
