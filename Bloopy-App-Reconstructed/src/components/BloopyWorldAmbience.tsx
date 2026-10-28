"use client";

import type React from "react";
import { useBloopyMood, useBloopyThemeColors, useBloopyWorld } from "@/components/BloopyThemeProvider";
import type { BloopyThemeColors } from "@/lib/bloopyTheme";
import type { VariationOverlay as VariationOverlayId, WorldParticle, WorldTheme } from "@/lib/bloopyWorldThemes";

/**
 * BloopyWorldAmbience — decorative-only atmosphere for each World Theme.
 *
 * Renders a subtle, art-directed scene behind the Home hero so a world reads at
 * a glance (beach feels like a beach, space like space) without touching the
 * layout. Pure CSS / divs / tiny shapes — no images, canvas, or WebGL. The
 * layer is aria-hidden, pointer-events-none, low-opacity, confined to a top
 * band (so cards/text below stay clean), and fully calm under
 * prefers-reduced-motion. Positions are static, so it's hydration-safe.
 *
 * A separate compact <WorldMiniScene /> reuses the same vocabulary for the
 * Settings → Appearance world preview cards.
 */

/* deterministic position sets (kept small so it stays premium, not busy) */
const TWINKLES = [
  { l: "10%", t: 24, s: 2, d: "0s", u: "4.5s" },
  { l: "82%", t: 18, s: 1.5, d: "1.1s", u: "5.5s" },
  { l: "66%", t: 42, s: 2.5, d: "2.2s", u: "4s" },
  { l: "26%", t: 72, s: 1.5, d: "0.6s", u: "6s" },
  { l: "90%", t: 100, s: 2, d: "1.6s", u: "5s" },
  { l: "44%", t: 14, s: 1.5, d: "3s", u: "4.8s" },
  { l: "16%", t: 124, s: 1.5, d: "2.4s", u: "6.2s" },
  { l: "74%", t: 134, s: 2, d: "0.4s", u: "5.4s" },
];

const RISERS = [
  { l: "18%", d: "0s", u: "7s", s: 6 },
  { l: "34%", d: "1.4s", u: "8.5s", s: 4 },
  { l: "52%", d: "2.6s", u: "7.6s", s: 7 },
  { l: "68%", d: "0.8s", u: "9s", s: 5 },
  { l: "84%", d: "3.2s", u: "8s", s: 4 },
  { l: "26%", d: "4s", u: "9.4s", s: 5 },
];

const FALLERS = [
  { l: "12%", d: "0s", u: "8s" },
  { l: "30%", d: "1.5s", u: "9.5s" },
  { l: "46%", d: "3s", u: "8.6s" },
  { l: "62%", d: "0.7s", u: "10s" },
  { l: "78%", d: "2.2s", u: "9s" },
  { l: "90%", d: "4s", u: "11s" },
];

/* ---- Beach Paradise building blocks (static silhouettes, reused by Scene) -- */

/** A fan of palm-frond blades anchored to a top corner; sways under motion. */
function PalmFrond({ side, C }: { side: "left" | "right"; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  const blades = [6, 24, 44, 66, 90];
  return (
    <span
      aria-hidden="true"
      className="absolute top-[-14px]"
      style={{ ...(side === "right" ? { right: -6 } : { left: -6 }), opacity: 0.5, transform: side === "right" ? "scaleX(-1)" : undefined, transformOrigin: "top" }}
    >
      {blades.map((deg, i) => (
        <span
          key={i}
          className="absolute left-0 top-0 animate-[ambSway_7s_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ width: 96 - i * 8, height: 15, transformOrigin: "0 0", transform: `rotate(${deg}deg)`, background: `linear-gradient(90deg, ${sil}, ${sil}88 55%, transparent)`, borderRadius: "0 80% 80% 0 / 0 100% 100% 0", animationDelay: `${i * 0.18}s` }}
        />
      ))}
    </span>
  );
}

const STARFISH_CLIP = "polygon(50% 0,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)";

/** Tiny warm starfish ornament for the shoreline corners. */
function Starfish({ className, C }: { className: string; C: BloopyThemeColors }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute ${className}`}
      style={{ width: 16, height: 16, background: `radial-gradient(circle at 50% 40%, ${C.red}, ${C.red}99)`, opacity: 0.5, clipPath: STARFISH_CLIP }}
    />
  );
}

/** Tiny scalloped shell ornament with soft ridges. */
function Shell({ className, C }: { className: string; C: BloopyThemeColors }) {
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: 18, height: 16, opacity: 0.5 }}>
      <span className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${C.glow}, ${C.neon}99)`, clipPath: "polygon(50% 100%,0 32%,12% 8%,30% 0,50% 6%,70% 0,88% 8%,100% 32%)" }} />
      {[30, 50, 70].map((l, i) => (
        <span key={i} className="absolute bottom-px top-[3px] w-px" style={{ left: `${l}%`, background: `${C.bgDeep}99` }} />
      ))}
    </span>
  );
}

/* ---- Desert Oasis building blocks ---------------------------------------- */

/** Small splash of oasis teal — intentionally outside the warm palette so the
 *  water reads as a cool accent against the sand (not a new theme token). */
const OASIS_TEAL = "#3FB6A8";

/** A clean saguaro-cactus silhouette built from rounded bars (crisp, app-like). */
function Cactus({ className, C }: { className: string; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ opacity: 0.55 }}>
      {/* trunk */}
      <span className="absolute bottom-0 left-1/2 h-[46px] w-[7px] -translate-x-1/2 rounded-full" style={{ background: sil }} />
      {/* left arm: elbow + riser */}
      <span className="absolute bottom-[22px] left-1/2 h-[6px] w-[12px] -translate-x-[16px] rounded-full" style={{ background: sil }} />
      <span className="absolute bottom-[22px] left-1/2 h-[15px] w-[6px] -translate-x-[19px] rounded-full" style={{ background: sil }} />
      {/* right arm: elbow + riser */}
      <span className="absolute bottom-[28px] left-1/2 h-[6px] w-[12px] translate-x-[5px] rounded-full" style={{ background: sil }} />
      <span className="absolute bottom-[28px] left-1/2 h-[17px] w-[6px] translate-x-[11px] rounded-full" style={{ background: sil }} />
    </span>
  );
}

/* ---- Space Station building blocks --------------------------------------- */

/** Cyan spark accent — intentionally outside the violet palette so the station
 *  reads as purple + cyan (not a new theme token). */
const SPACE_CYAN = "#46E0FF";

/** Deterministic, static starfield (depth behind the twinkling stars). */
const STARFIELD = [
  { l: "8%", t: 18, s: 1.5 }, { l: "22%", t: 60, s: 1 }, { l: "33%", t: 30, s: 1 },
  { l: "47%", t: 96, s: 1.5 }, { l: "58%", t: 24, s: 1 }, { l: "71%", t: 64, s: 1.5 },
  { l: "88%", t: 40, s: 1 }, { l: "14%", t: 150, s: 1 }, { l: "30%", t: 198, s: 1.5 },
  { l: "52%", t: 168, s: 1 }, { l: "66%", t: 220, s: 1 }, { l: "80%", t: 150, s: 1.5 },
  { l: "92%", t: 198, s: 1 }, { l: "40%", t: 252, s: 1 }, { l: "76%", t: 268, s: 1.5 },
  { l: "18%", t: 256, s: 1 },
];

/** Spaceship viewport HUD that brackets Bloopy: panel frame, status ticks,
 *  corner brackets, side struts and seams — reads as a real station window. */
function Viewport({ C, cyan }: { C: BloopyThemeColors; cyan: string }) {
  return (
    <span aria-hidden="true" className="absolute left-1/2 top-[60px] h-[226px] w-[270px] -translate-x-1/2">
      {/* outer panel */}
      <span className="absolute inset-0 rounded-[30px]" style={{ border: `1px solid ${C.cardBorder}`, boxShadow: `inset 0 0 50px ${C.neon}16, 0 0 26px ${C.neon}10`, background: `radial-gradient(120% 100% at 50% 0%, ${cyan}0C, transparent 60%)` }} />
      {/* inner glass bevel */}
      <span className="absolute inset-[10px] rounded-[24px]" style={{ border: `1px solid ${C.neon}22` }} />
      {/* top HUD status bar with tick marks */}
      <span className="absolute left-1/2 top-[11px] flex -translate-x-1/2 items-center gap-[3px]">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} style={{ width: 1, height: i === 3 ? 9 : 6, background: i === 3 ? `${cyan}CC` : `${C.neon}66` }} />
        ))}
      </span>
      {/* corner brackets */}
      <span className="absolute left-[7px] top-[7px] h-5 w-5 rounded-tl-[12px]" style={{ borderTop: `1.5px solid ${cyan}99`, borderLeft: `1.5px solid ${cyan}99` }} />
      <span className="absolute right-[7px] top-[7px] h-5 w-5 rounded-tr-[12px]" style={{ borderTop: `1.5px solid ${cyan}99`, borderRight: `1.5px solid ${cyan}99` }} />
      <span className="absolute bottom-[7px] left-[7px] h-5 w-5 rounded-bl-[12px]" style={{ borderBottom: `1.5px solid ${cyan}77`, borderLeft: `1.5px solid ${cyan}77` }} />
      <span className="absolute bottom-[7px] right-[7px] h-5 w-5 rounded-br-[12px]" style={{ borderBottom: `1.5px solid ${cyan}77`, borderRight: `1.5px solid ${cyan}77` }} />
      {/* side struts (panel hardware) */}
      <span className="absolute left-[-1px] top-1/2 h-10 w-[3px] -translate-y-1/2 rounded-full" style={{ background: `${C.neon}40` }} />
      <span className="absolute right-[-1px] top-1/2 h-10 w-[3px] -translate-y-1/2 rounded-full" style={{ background: `${C.neon}40` }} />
      {/* bottom panel seam */}
      <span className="absolute inset-x-10 bottom-[15px] h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.neon}44, transparent)` }} />
    </span>
  );
}

/** Tilted, concentric orbit rings around Bloopy with one quiet satellite dot. */
function OrbitField({ C, cyan }: { C: BloopyThemeColors; cyan: string }) {
  return (
    <span aria-hidden="true" className="absolute left-1/2 top-[178px]">
      <span className="absolute h-[160px] w-[248px] rounded-[50%]" style={{ transform: "translate(-50%,-50%) rotate(-16deg)", border: `1px solid ${cyan}3A` }} />
      <span className="absolute h-[120px] w-[196px] rounded-[50%]" style={{ transform: "translate(-50%,-50%) rotate(-16deg)", border: `1px solid ${C.glow}2E` }} />
      <span
        className="absolute h-1.5 w-1.5 rounded-full animate-[ambTwinkle_4.5s_ease-in-out_infinite] motion-reduce:animate-none"
        style={{ transform: "translate(92px,-44px)", background: cyan, boxShadow: `0 0 6px ${cyan}` }}
      />
      <span className="absolute h-1 w-1 rounded-full" style={{ transform: "translate(-86px,38px)", background: C.glow, boxShadow: `0 0 5px ${C.glow}` }} />
    </span>
  );
}

/* ---- Underwater World building blocks ------------------------------------ */

/** Soft vertical light rays ("god rays") fanning down from the surface. */
function WaterRays({ C }: { C: BloopyThemeColors }) {
  const rays = [
    { l: "16%", w: 22, r: -17, o: "1C" }, { l: "30%", w: 44, r: -9, o: "2A" }, { l: "46%", w: 30, r: -3, o: "22" },
    { l: "58%", w: 50, r: 6, o: "2E" }, { l: "72%", w: 26, r: 13, o: "1C" }, { l: "86%", w: 18, r: 20, o: "16" },
  ];
  return (
    <>
      {rays.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute top-[-30px] h-[330px] animate-[ambRay_var(--u)_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ left: p.l, width: p.w, background: `linear-gradient(180deg, ${C.glow}${p.o}, transparent 78%)`, transform: `rotate(${p.r}deg)`, transformOrigin: "top center", filter: "blur(5px)", ["--u" as string]: `${6 + i}s`, animationDelay: `${i * 0.7}s` } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/** Faint horizontal caustic light lines (rippling surface light on the depths). */
function Caustics({ C }: { C: BloopyThemeColors }) {
  const lines = [
    { t: 60, w: "60%", l: "20%", u: "7s", d: "0s" },
    { t: 120, w: "80%", l: "10%", u: "8.5s", d: "1s" },
    { t: 188, w: "70%", l: "16%", u: "7.6s", d: "0.5s" },
    { t: 252, w: "86%", l: "8%", u: "9s", d: "1.4s" },
  ];
  return (
    <>
      {lines.map((p, i) => (
        <span
          key={i}
          aria-hidden="true"
          className="absolute h-px rounded-full animate-[ambCaustic_var(--u)_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ top: p.t, left: p.l, width: p.w, background: `linear-gradient(90deg, transparent, ${C.glow}55, transparent)`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties}
        />
      ))}
    </>
  );
}

/** A deliberate cluster of ring-bubbles (varied sizes) anchored to a point. */
function BubbleCluster({ className, C }: { className: string; C: BloopyThemeColors }) {
  const bubbles = [
    { x: 0, y: 10, s: 6 }, { x: 9, y: 0, s: 4 }, { x: 14, y: 12, s: 3 }, { x: 4, y: 19, s: 2.5 },
  ];
  return (
    <span aria-hidden="true" className={`absolute ${className}`}>
      {bubbles.map((b, i) => (
        <span key={i} className="absolute rounded-full" style={{ left: b.x, top: b.y, width: b.s, height: b.s, border: `1px solid ${C.glow}88`, boxShadow: `0 0 4px ${C.neon}66`, background: `radial-gradient(circle at 35% 30%, ${C.glow}33, transparent 70%)` }} />
      ))}
    </span>
  );
}

/** A coral / seaweed cluster (swaying fronds + rounded coral knobs) for an edge. */
function Coral({ side, C }: { side: "left" | "right"; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  const fronds = [
    { x: 0, h: 54, w: 7, d: "0s", u: "6s" },
    { x: 10, h: 38, w: 6, d: "0.8s", u: "7s" },
    { x: 19, h: 66, w: 7, d: "0.4s", u: "6.5s" },
    { x: 29, h: 46, w: 6, d: "1.2s", u: "7.5s" },
  ];
  return (
    <span aria-hidden="true" className="absolute top-[300px] h-[80px] w-[44px]" style={{ ...(side === "right" ? { right: 6 } : { left: 6 }), transform: side === "right" ? "scaleX(-1)" : undefined, opacity: 0.6 }}>
      {fronds.map((f, i) => (
        <span
          key={i}
          className="absolute bottom-0 rounded-full animate-[ambSway_var(--u)_ease-in-out_infinite] motion-reduce:animate-none"
          style={{ left: f.x, width: f.w, height: f.h, background: `linear-gradient(180deg, transparent, ${sil} 62%)`, transformOrigin: "bottom center", ["--u" as string]: f.u, animationDelay: f.d } as React.CSSProperties}
        />
      ))}
      <span className="absolute bottom-1 left-[2px] h-2.5 w-2.5 rounded-full" style={{ background: sil }} />
      <span className="absolute bottom-2 left-[22px] h-2 w-2 rounded-full" style={{ background: sil }} />
    </span>
  );
}

/** A tiny fish silhouette (oval body + tail) drifting in the mid-water. */
function Fish({ className, C, flip = false }: { className: string; C: BloopyThemeColors; flip?: boolean }) {
  const sil = C.bgDeep;
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ opacity: 0.5, transform: flip ? "scaleX(-1)" : undefined }}>
      <span className="absolute h-2 w-3.5 rounded-[50%]" style={{ background: sil }} />
      <span className="absolute left-[12px] top-[2px] h-1.5 w-1.5" style={{ background: sil, clipPath: "polygon(0 50%, 100% 0, 100% 100%)" }} />
    </span>
  );
}

/* ---- Forest Garden building blocks --------------------------------------- */

/** Deterministic firefly positions spread around Bloopy and the lower garden. */
const FIREFLIES = [
  { l: "20%", t: 70, s: 3, d: "0s", u: "4.5s" },
  { l: "78%", t: 58, s: 2, d: "1.1s", u: "5.5s" },
  { l: "62%", t: 110, s: 2.5, d: "2.2s", u: "4s" },
  { l: "30%", t: 150, s: 2, d: "0.6s", u: "6s" },
  { l: "84%", t: 150, s: 3, d: "1.6s", u: "5s" },
  { l: "14%", t: 210, s: 2, d: "3s", u: "4.8s" },
  { l: "50%", t: 252, s: 2.5, d: "2.4s", u: "6.2s" },
  { l: "72%", t: 240, s: 2, d: "0.4s", u: "5.4s" },
  { l: "40%", t: 300, s: 3, d: "1.3s", u: "5.2s" },
  { l: "88%", t: 288, s: 2, d: "2.8s", u: "4.6s" },
];

/** A single CSS leaf (rounded "0 100% 0 100%" blade + a faint center vein). */
function Leaf({ className, C, rot = 0, size = 14 }: { className: string; C: BloopyThemeColors; rot?: number; size?: number }) {
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: size, height: size, transform: `rotate(${rot}deg)`, opacity: 0.6 }}>
      <span className="absolute inset-0" style={{ background: C.bgDeep, borderRadius: "0 100% 0 100%" }} />
      <span className="absolute left-1/2 top-1/2 h-px w-[72%] -translate-x-1/2 -translate-y-1/2 rotate-45" style={{ background: `${C.neon}55` }} />
    </span>
  );
}

/** A denser corner canopy + a vine running down the side edge with leaves. */
function HangingVine({ side, C }: { side: "left" | "right"; C: BloopyThemeColors }) {
  const isR = side === "right";
  return (
    <span aria-hidden="true" className="absolute top-[-6px]" style={{ ...(isR ? { right: 0 } : { left: 0 }) }}>
      {/* soft canopy shadow filling the corner */}
      <span className="absolute top-[-30px] h-[110px] w-[110px] blur-md" style={{ ...(isR ? { right: -30 } : { left: -30 }), background: `radial-gradient(circle at ${isR ? "80%" : "20%"} 20%, ${C.bgDeep}, transparent 65%)`, opacity: 0.8 }} />
      {/* two vines down the edge */}
      <span className="absolute top-0 h-[210px] w-px" style={{ ...(isR ? { right: 22 } : { left: 22 }), background: `linear-gradient(180deg, ${C.cardBorder}, ${C.cardBorder}66 50%, transparent)` }} />
      <span className="absolute top-0 h-[150px] w-px" style={{ ...(isR ? { right: 40 } : { left: 40 }), background: `linear-gradient(180deg, ${C.cardBorder}99, transparent)` }} />
      {/* corner cluster */}
      <Leaf className={isR ? "right-0 top-0" : "left-0 top-0"} C={C} rot={isR ? -18 : 18} size={24} />
      <Leaf className={isR ? "right-6 top-2" : "left-6 top-2"} C={C} rot={isR ? -50 : 50} size={18} />
      <Leaf className={isR ? "right-[52px] top-1" : "left-[52px] top-1"} C={C} rot={isR ? -78 : 78} size={15} />
      <Leaf className={isR ? "right-2 top-9" : "left-2 top-9"} C={C} rot={isR ? 12 : -12} size={15} />
      <Leaf className={isR ? "right-10 top-[26px]" : "left-10 top-[26px]"} C={C} rot={isR ? -36 : 36} size={13} />
      {/* leaves trailing down the vine */}
      <Leaf className={isR ? "right-6 top-[84px]" : "left-6 top-[84px]"} C={C} rot={isR ? -40 : 40} size={13} />
      <Leaf className={isR ? "right-9 top-[120px]" : "left-9 top-[120px]"} C={C} rot={isR ? 26 : -26} size={11} />
      <Leaf className={isR ? "right-7 top-[166px]" : "left-7 top-[166px]"} C={C} rot={isR ? -30 : 30} size={12} />
    </span>
  );
}

/** A dark tree / shrub silhouette for a lower side edge (rounded foliage mass). */
function TreeSilhouette({ side, C }: { side: "left" | "right"; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  const isR = side === "right";
  return (
    <span aria-hidden="true" className="absolute top-[220px] h-[160px] w-[70px]" style={{ ...(isR ? { right: -10 } : { left: -10 }), opacity: 0.7 }}>
      {/* trunk */}
      <span className="absolute bottom-0 left-1/2 h-[120px] w-[6px] -translate-x-1/2 rounded-full" style={{ background: `linear-gradient(180deg, transparent, ${sil} 40%)` }} />
      {/* foliage masses */}
      <span className="absolute left-1/2 top-2 h-9 w-12 -translate-x-1/2 rounded-full blur-[2px]" style={{ background: sil }} />
      <span className="absolute left-[30%] top-7 h-7 w-9 rounded-full blur-[2px]" style={{ background: sil }} />
      <span className="absolute right-[26%] top-6 h-6 w-8 rounded-full blur-[2px]" style={{ background: sil }} />
    </span>
  );
}

/** A fan of dark grass blades with a tiny glowing bloom, for a lower corner. */
function Grass({ side, C }: { side: "left" | "right"; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  const blades = [
    { x: 0, h: 30, r: -12 }, { x: 7, h: 46, r: -5 }, { x: 14, h: 36, r: 3 }, { x: 22, h: 52, r: 11 }, { x: 30, h: 34, r: 18 },
  ];
  return (
    <span aria-hidden="true" className="absolute top-[318px] h-[56px] w-[42px]" style={{ ...(side === "right" ? { right: 8 } : { left: 8 }), transform: side === "right" ? "scaleX(-1)" : undefined, opacity: 0.7 }}>
      {blades.map((b, i) => (
        <span key={i} className="absolute bottom-0 w-[3px] rounded-full" style={{ left: b.x, height: b.h, background: `linear-gradient(180deg, transparent, ${sil} 55%)`, transformOrigin: "bottom center", transform: `rotate(${b.r}deg)` }} />
      ))}
      <span className="absolute bottom-[42px] left-[16px] h-1.5 w-1.5 rounded-full" style={{ background: C.glow, boxShadow: `0 0 5px ${C.glow}` }} />
    </span>
  );
}

/* ---- Snowy Cabin building blocks ----------------------------------------- */

/** A layered, snow-capped pine silhouette (three tiers + trunk). */
function Pine({ className, C, w = 44 }: { className: string; C: BloopyThemeColors; w?: number }) {
  const sil = C.bgDeep;
  const cap = C.glow;
  const h = w * 1.5;
  const tiers = [
    { top: 0, tw: w, th: h * 0.5 },
    { top: h * 0.28, tw: w * 0.82, th: h * 0.46 },
    { top: h * 0.56, tw: w * 0.64, th: h * 0.44 },
  ];
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: w, height: h, opacity: 0.85 }}>
      <span className="absolute bottom-0 left-1/2 -translate-x-1/2" style={{ width: w * 0.09, height: h * 0.12, background: sil }} />
      {tiers.map((t, i) => (
        <span key={i} className="absolute left-1/2 -translate-x-1/2" style={{ top: t.top, width: t.tw, height: t.th, background: sil, clipPath: "polygon(50% 0,100% 100%,0 100%)" }}>
          <span className="absolute left-1/2 top-0 -translate-x-1/2" style={{ width: t.tw * 0.36, height: t.th * 0.22, background: cap, opacity: 0.5, clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
        </span>
      ))}
    </span>
  );
}

/** A small cabin silhouette with a snow-topped roof and warm glowing windows. */
function Cabin({ className, C }: { className: string; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  const warm = C.red;
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: 70, height: 60 }}>
      {/* warm ground glow */}
      <span className="absolute -bottom-1 left-1/2 h-3 w-[60px] -translate-x-1/2 rounded-[50%] blur-md" style={{ background: warm, opacity: 0.3 }} />
      {/* body */}
      <span className="absolute bottom-0 left-1/2 h-[34px] w-[54px] -translate-x-1/2 rounded-sm" style={{ background: sil }} />
      {/* roof */}
      <span className="absolute top-[8px] left-1/2 h-[22px] w-[64px] -translate-x-1/2" style={{ background: sil, clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
      {/* snow on the roof */}
      <span className="absolute top-[7px] left-1/2 h-[9px] w-[64px] -translate-x-1/2" style={{ background: C.glow, opacity: 0.5, clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
      {/* warm windows */}
      <span className="absolute bottom-[11px] left-[18px] h-3 w-2.5 rounded-[1px]" style={{ background: warm, boxShadow: `0 0 8px ${warm}, 0 0 14px ${warm}88` }} />
      <span className="absolute bottom-[11px] right-[18px] h-3 w-2.5 rounded-[1px]" style={{ background: warm, boxShadow: `0 0 8px ${warm}, 0 0 14px ${warm}88` }} />
    </span>
  );
}

/** A clean 6-spoke snowflake (crossing strokes + center). */
function Snowflake({ C, size = 12, color }: { C: BloopyThemeColors; size?: number; color?: string }) {
  const col = color ?? C.glow;
  return (
    <span aria-hidden="true" className="relative block" style={{ width: size, height: size }}>
      {[0, 60, 120].map((r) => (
        <span key={r} className="absolute left-1/2 top-1/2 rounded-full" style={{ width: size, height: 1.4, background: col, transform: `translate(-50%,-50%) rotate(${r}deg)`, boxShadow: `0 0 4px ${col}88` }} />
      ))}
      <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: col }} />
    </span>
  );
}

/* ---- Cyber City building blocks ------------------------------------------ */

/** A translucent hologram panel that frames Bloopy: neon border, inner grid,
 *  sweeping scanline, and corner brackets. */
function Hologram({ C }: { C: BloopyThemeColors }) {
  const corners: [string, string, string][] = [
    ["left-2 top-2", "border-l border-t", `${C.glow}99`],
    ["right-2 top-2", "border-r border-t", `${C.red}99`],
    ["left-2 bottom-2", "border-l border-b", `${C.red}99`],
    ["right-2 bottom-2", "border-r border-b", `${C.glow}99`],
  ];
  return (
    <span aria-hidden="true" className="absolute left-1/2 top-[60px] h-[222px] w-[266px] -translate-x-1/2 overflow-hidden rounded-[26px]">
      <span className="absolute inset-0 rounded-[26px]" style={{ border: `1px solid ${C.neon}44`, background: `linear-gradient(160deg, ${C.neon}12, ${C.glow}08 60%, transparent)`, boxShadow: `inset 0 0 42px ${C.neon}1A, 0 0 26px ${C.neon}12` }} />
      <span className="absolute inset-0 opacity-[0.16]" style={{ backgroundImage: `linear-gradient(${C.glow} 1px, transparent 1px), linear-gradient(90deg, ${C.glow} 1px, transparent 1px)`, backgroundSize: "26px 26px", maskImage: "radial-gradient(120% 90% at 50% 0%, black, transparent 80%)", WebkitMaskImage: "radial-gradient(120% 90% at 50% 0%, black, transparent 80%)" }} />
      <span className="absolute inset-x-0 top-0 h-px animate-[ambScan_6s_linear_infinite] motion-reduce:animate-none" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}, transparent)`, boxShadow: `0 0 8px ${C.glow}` }} />
      {corners.map(([pos, bord, col], i) => (
        <span key={i} className={`absolute ${pos} ${bord} h-4 w-4`} style={{ borderColor: col }} />
      ))}
    </span>
  );
}

/** A neon skyline row: dark buildings with lit windows + glowing roof edges.
 *  `back` renders a dimmer, shorter, offset layer for parallax city depth. */
function Skyline({ C, back = false }: { C: BloopyThemeColors; back?: boolean }) {
  const buildings = back
    ? [
        { w: 16, h: 36, a: C.neon }, { w: 22, h: 54, a: C.glow }, { w: 14, h: 30, a: C.red },
        { w: 26, h: 60, a: C.neon }, { w: 18, h: 40, a: C.glow }, { w: 24, h: 66, a: C.red },
        { w: 16, h: 34, a: C.neon }, { w: 20, h: 50, a: C.glow }, { w: 14, h: 28, a: C.red },
        { w: 22, h: 58, a: C.neon }, { w: 16, h: 38, a: C.glow },
      ]
    : [
        { w: 20, h: 50, a: C.glow }, { w: 14, h: 34, a: C.red }, { w: 26, h: 78, a: C.neon },
        { w: 16, h: 44, a: C.glow }, { w: 22, h: 88, a: C.red }, { w: 13, h: 32, a: C.neon },
        { w: 28, h: 66, a: C.glow }, { w: 16, h: 50, a: C.red }, { w: 20, h: 82, a: C.neon },
        { w: 14, h: 40, a: C.glow },
      ];
  return (
    <span aria-hidden="true" className="absolute inset-x-0 flex items-end justify-center gap-[3px]" style={{ top: back ? 232 : 212, height: 90, opacity: back ? 0.4 : 0.74, filter: back ? "blur(0.6px)" : undefined }}>
      {buildings.map((b, i) => (
        <span key={i} className="relative rounded-t-[2px]" style={{ width: b.w, height: b.h, background: `linear-gradient(180deg, ${C.bgDeep}, ${C.bgDeep})`, boxShadow: `inset 0 0 0 1px ${C.neon}1A` }}>
          <span className="absolute inset-x-0 top-0 h-px" style={{ background: b.a, boxShadow: `0 0 6px ${b.a}`, opacity: back ? 0.6 : 0.85 }} />
          {!back && Array.from({ length: Math.max(2, Math.round(b.h / 24)) }).map((_, r) => (
            <span key={r} className="absolute h-1 w-1 rounded-[1px]" style={{ left: r % 2 ? "28%" : "56%", top: 8 + r * 13, background: b.a, opacity: 0.45, boxShadow: `0 0 4px ${b.a}66` }} />
          ))}
        </span>
      ))}
    </span>
  );
}

/* ---- Volcano Lab building blocks ----------------------------------------- */

/** Layered basalt ridges with a glowing lava seam + rim-lit crests. */
function RockRidge({ C }: { C: BloopyThemeColors }) {
  return (
    <>
      {/* far basalt ridge */}
      <span className="absolute inset-x-0 top-[230px] h-[78px]" style={{ background: `linear-gradient(180deg, ${C.card}, ${C.bgDeep})`, opacity: 0.55, clipPath: "polygon(0 100%,0 50%,14% 34%,26% 58%,40% 28%,54% 56%,68% 26%,82% 54%,94% 36%,100% 58%,100% 100%)" }} />
      {/* lava seam glowing between the ridges */}
      <span className="absolute inset-x-0 top-[296px] h-[10px] blur-[3px]" style={{ background: `linear-gradient(90deg, transparent, ${C.red}99, ${C.glow}99, ${C.red}99, transparent)`, opacity: 0.7 }} />
      {/* near basalt ridge (darker, taller) */}
      <span className="absolute inset-x-0 top-[266px] h-[64px]" style={{ background: C.bgDeep, clipPath: "polygon(0 100%,0 68%,10% 48%,22% 70%,34% 44%,48% 68%,60% 42%,74% 66%,88% 46%,100% 68%,100% 100%)" }} />
      {/* faint warm rim light catching the near crests */}
      <span className="absolute inset-x-0 top-[266px] h-[64px]" style={{ opacity: 0.5, clipPath: "polygon(0 70%,10% 50%,22% 72%,34% 46%,48% 70%,60% 44%,74% 68%,88% 48%,100% 70%,100% 73%,88% 51%,74% 71%,60% 47%,48% 73%,34% 49%,22% 73%,10% 53%,0 73%)", background: `linear-gradient(90deg, ${C.red}66, ${C.glow}66, ${C.red}66)` }} />
    </>
  );
}

/** Glowing branching lava cracks across the ground (tiny inline SVG). */
function LavaCracks({ C }: { C: BloopyThemeColors }) {
  return (
    <svg aria-hidden="true" className="absolute inset-x-0 top-[266px] h-[78px] w-full" viewBox="0 0 340 78" fill="none" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bloopyLavaCrack" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={C.red} />
          <stop offset="0.5" stopColor={C.glow} />
          <stop offset="1" stopColor={C.red} />
        </linearGradient>
      </defs>
      <g stroke="url(#bloopyLavaCrack)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 3px ${C.red})` }}>
        <path d="M8 64 L64 48 L104 58 L150 40" />
        <path d="M150 40 L196 52 L246 38 L298 50 L334 42" />
        <path d="M64 48 L72 72" />
        <path d="M104 58 L112 76" />
        <path d="M196 52 L206 74" />
        <path d="M246 38 L256 62" />
        <path d="M298 50 L292 74" />
        <path d="M150 40 L146 70" />
      </g>
      {/* thinner secondary capillaries */}
      <g stroke={C.red} strokeWidth="0.8" strokeLinecap="round" opacity="0.6" style={{ filter: `drop-shadow(0 0 2px ${C.red})` }}>
        <path d="M104 58 L132 64 L150 56" />
        <path d="M246 38 L272 46 L298 38" />
      </g>
    </svg>
  );
}

/* ---- Cloud Sky building blocks ------------------------------------------- */

/** A soft, fluffy cloud composed of overlapping blurred puffs (tinted). */
function Cloud({ className, C, w = 120, tint, op = 0.5 }: { className: string; C: BloopyThemeColors; w?: number; tint?: string; op?: number }) {
  const col = tint ?? C.glow;
  const h = w * 0.5;
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: w, height: h }}>
      <span className="absolute bottom-0 left-0 rounded-full blur-md" style={{ width: w, height: h * 0.5, background: col, opacity: op }} />
      <span className="absolute rounded-full blur-md" style={{ left: w * 0.1, bottom: h * 0.18, width: w * 0.4, height: w * 0.4, background: col, opacity: op }} />
      <span className="absolute rounded-full blur-md" style={{ left: w * 0.4, bottom: h * 0.26, width: w * 0.5, height: w * 0.5, background: col, opacity: op + 0.05 }} />
      <span className="absolute rounded-full blur-md" style={{ left: w * 0.66, bottom: h * 0.16, width: w * 0.36, height: w * 0.36, background: col, opacity: op }} />
    </span>
  );
}

/* ---- Moon Base building blocks ------------------------------------------- */

/** Distant planet (Earth) — a subtle cool-blue accent in the lunar sky. */
const MOON_EARTH = "#5E86C9";

/** A flattened crater ring (sunken inner shadow + lit lower rim). */
function Crater({ className, C, w = 40 }: { className: string; C: BloopyThemeColors; w?: number }) {
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: w, height: w * 0.42, borderRadius: "50%", border: `1px solid ${C.mutedText}55`, boxShadow: `inset 0 2px 4px ${C.bgDeep}, inset 0 -1px 0 ${C.glow}22` }} />
  );
}

/** A low rounded moon rock with a faint rim light. */
function MoonRock({ className, C, w = 16 }: { className: string; C: BloopyThemeColors; w?: number }) {
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: w, height: w * 0.6, background: C.bgDeep, borderRadius: "60% 60% 40% 40% / 100% 100% 0 0", boxShadow: `inset ${w * 0.2}px -1px 0 ${C.mutedText}33` }} />
  );
}

/** A tiny lunar rover silhouette (body, two wheels, a little mast). */
function Rover({ className, C }: { className: string; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: 26, height: 18, opacity: 0.85 }}>
      {/* body */}
      <span className="absolute bottom-[3px] left-1 h-2.5 w-[18px] rounded-[2px]" style={{ background: sil, boxShadow: `inset 1px -1px 0 ${C.neon}33`, borderTop: `1px solid ${C.glow}33` }} />
      {/* wheels */}
      <span className="absolute bottom-0 left-[3px] h-2 w-2 rounded-full" style={{ background: sil, border: `1px solid ${C.mutedText}66` }} />
      <span className="absolute bottom-0 left-[13px] h-2 w-2 rounded-full" style={{ background: sil, border: `1px solid ${C.mutedText}66` }} />
      {/* mast + sensor light */}
      <span className="absolute bottom-[10px] right-[5px] h-2 w-px" style={{ background: C.mutedText }} />
      <span className="absolute bottom-[11px] right-[3px] h-1 w-1 rounded-full" style={{ background: C.glow, boxShadow: `0 0 4px ${C.glow}` }} />
    </span>
  );
}

/** A small lunar-base structure: dome habitat + antenna mast, dish and beacon. */
function BaseStructure({ className, C }: { className: string; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  return (
    <span aria-hidden="true" className={`absolute ${className}`} style={{ width: 50, height: 40, opacity: 0.9 }}>
      {/* dome habitat */}
      <span className="absolute bottom-0 left-1 h-4 w-8 rounded-t-full" style={{ background: sil, boxShadow: `inset 2px -1px 0 ${C.neon}33`, borderTop: `1px solid ${C.glow}33` }} />
      {/* antenna mast + dish + beacon */}
      <span className="absolute bottom-0 right-3 h-9 w-px" style={{ background: C.mutedText }} />
      <span className="absolute right-1 top-0 h-3 w-4 rounded-[50%]" style={{ border: `1px solid ${C.glow}66`, transform: "rotate(-30deg)" }} />
      <span className="absolute right-[11px] top-[2px] h-1 w-1 rounded-full" style={{ background: C.red, boxShadow: `0 0 5px ${C.red}` }} />
    </span>
  );
}

/* ---- full hero-band scene (≈480px tall) ---------------------------------- */

function Scene({ particle, C, density = 1 }: { particle: WorldParticle; C: BloopyThemeColors; density?: number }) {
  const sil = C.bgDeep; // silhouette base
  // The variation mood thins out particles (Focus / Doomscroll calmer).
  const keep = <T,>(arr: T[]) => arr.slice(0, Math.max(2, Math.round(arr.length * density)));
  const tw = keep(TWINKLES);
  const ri = keep(RISERS);
  const fa = keep(FALLERS);

  switch (particle) {
    case "waves": { // Beach Paradise — ocean sunset, palms, shells, golden sparkles
      const warm = C.red; // setting sun + warm sand
      return (
        <>
          {/* sunset sky wash over the hero (warm at the very top → aqua → clear) */}
          <div className="absolute inset-x-0 top-0 h-[460px]" style={{ background: `linear-gradient(180deg, ${warm}2A 0%, ${warm}14 26%, ${C.neon}12 48%, transparent 78%)` }} />
          {/* warm horizon band glowing behind Bloopy */}
          <div className="absolute inset-x-0 top-[120px] h-[150px]" style={{ background: `linear-gradient(180deg, transparent, ${warm}1A 28%, ${C.glow}1F 56%, ${C.neon}14 76%, transparent)` }} />
          {/* soft sand warmth at the foot of the scene */}
          <div className="absolute inset-x-0 top-[300px] h-[180px]" style={{ background: `linear-gradient(180deg, transparent, ${warm}14 58%, ${warm}26)` }} />
          {/* setting sun + horizon glow behind Bloopy */}
          <span className="absolute left-1/2 top-[40px] h-[182px] w-[182px] -translate-x-1/2 rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${warm}, ${warm}55 45%, transparent 70%)`, opacity: 0.5 }} />
          <span className="absolute left-1/2 top-[118px] h-[64px] w-[64px] -translate-x-1/2 rounded-full blur-md" style={{ background: warm, opacity: 0.35 }} />
          {/* layered translucent wave bands under Bloopy for depth */}
          {[0, 1].map((i) => (
            <span key={`b${i}`} className="absolute left-1/2 h-[120px] w-[150%] -translate-x-1/2 rounded-[50%]" style={{ top: 208 + i * 30, background: `linear-gradient(180deg, ${C.neon}${i ? "10" : "1A"}, transparent 68%)`, opacity: 0.85 }} />
          ))}
          {/* water-reflection shimmer lines under the sun */}
          {[-16, 0, 16].map((dx, i) => (
            <span key={`r${i}`} className="absolute top-[190px] h-[44px] w-[3px] animate-[ambWave_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: `calc(50% + ${dx}px)`, background: `linear-gradient(180deg, ${C.glow}66, transparent)`, ["--u" as string]: `${4 + i}s` } as React.CSSProperties} />
          ))}
          {/* palm fronds framing the top corners */}
          <PalmFrond side="left" C={C} />
          <PalmFrond side="right" C={C} />
          {/* crisp foam lines along the shore */}
          {[0, 1, 2].map((i) => (
            <span key={`w${i}`} className="absolute left-1/2 h-[70px] w-[130%] -translate-x-1/2 rounded-[50%] animate-[ambWave_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ top: 214 + i * 16, border: `1px solid ${C.glow}${i === 0 ? "66" : "2E"}`, ["--u" as string]: `${5 + i}s` } as React.CSSProperties} />
          ))}
          {/* golden sunset sparkles */}
          {tw.map((p, i) => (
            <span key={`s${i}`} className="absolute rounded-full animate-[ambTwinkle_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, top: p.t, width: p.s, height: p.s, background: i % 2 ? warm : C.glow, boxShadow: `0 0 6px ${i % 2 ? warm : C.glow}`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
          {/* shell + starfish ornaments near the shoreline edges */}
          <Starfish className="left-[16px] top-[284px]" C={C} />
          <Shell className="right-[18px] top-[292px]" C={C} />
        </>
      );
    }

    case "sand": { // Desert Oasis — sunset dunes, cacti, oasis pool, sand motes
      const warm = C.red; // setting sun
      const DUSK = "#43295C"; // faint plum dusk at the top of the sky (local accent)
      return (
        <>
          {/* dusk → sunset sky wash (plum top → coral → amber → clear) */}
          <div className="absolute inset-x-0 top-0 h-[460px]" style={{ background: `linear-gradient(180deg, ${DUSK}1F 0%, ${warm}28 22%, ${C.neon}18 40%, ${C.glow}0E 56%, transparent 80%)` }} />
          {/* warm horizon haze behind Bloopy */}
          <div className="absolute inset-x-0 top-[148px] h-[110px]" style={{ background: `linear-gradient(180deg, transparent, ${C.neon}16 50%, ${warm}12 82%, transparent)` }} />
          {/* low sun: broad glow + a defined disc sitting on the horizon */}
          <span className="absolute left-1/2 top-[44px] h-[192px] w-[192px] -translate-x-1/2 rounded-full blur-2xl" style={{ background: `radial-gradient(circle, ${warm}, ${C.neon}66 45%, transparent 70%)`, opacity: 0.55 }} />
          <span className="absolute left-1/2 top-[150px] h-[74px] w-[74px] -translate-x-1/2 rounded-full blur-[2px]" style={{ background: `radial-gradient(circle at 50% 40%, ${C.glow}, ${warm}cc 60%, ${warm}00 78%)`, opacity: 0.62 }} />
          {/* soft halo ring framing the hero */}
          <span className="absolute left-1/2 top-[40px] h-[192px] w-[192px] -translate-x-1/2 rounded-full" style={{ border: `1px solid ${C.glow}26` }} />
          {/* warm star / spark dots in the sky */}
          {tw.map((p, i) => (
            <span key={`t${i}`} className="absolute rounded-full animate-[ambTwinkle_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, top: p.t, width: p.s, height: p.s, background: i % 3 === 0 ? warm : C.glow, boxShadow: `0 0 5px ${C.glow}`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
          {/* drifting sand motes */}
          {fa.slice(0, 5).map((p, i) => (
            <span key={`m${i}`} className="absolute h-1 w-1 rounded-full animate-[ambDriftX_7s_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, top: 78 + (i % 3) * 22, background: C.glow, opacity: 0.5, animationDelay: p.d }} />
          ))}
          {/* sculpted, overlapping dune silhouettes with sun-lit crests */}
          <span className="absolute left-[-30%] top-[206px] h-[130px] w-[120%] rounded-[50%]" style={{ background: sil, opacity: 0.5 }} />
          <span className="absolute left-[-30%] top-[206px] h-[130px] w-[120%] rounded-[50%]" style={{ borderTop: `1px solid ${C.glow}2A` }} />
          <span className="absolute right-[-30%] top-[200px] h-[130px] w-[120%] rounded-[50%]" style={{ background: sil, opacity: 0.5 }} />
          <span className="absolute right-[-30%] top-[200px] h-[130px] w-[120%] rounded-[50%]" style={{ borderTop: `1px solid ${C.glow}22` }} />
          <span className="absolute left-1/2 top-[238px] h-[140px] w-[170%] -translate-x-1/2 rounded-[50%]" style={{ background: sil, opacity: 0.72 }} />
          <span className="absolute left-1/2 top-[238px] h-[140px] w-[170%] -translate-x-1/2 rounded-[50%]" style={{ borderTop: `1px solid ${C.glow}3A` }} />
          {/* oasis pool: cool teal glow + reflection ripples in the foreground */}
          <span className="absolute left-1/2 top-[224px] h-[26px] w-[150px] -translate-x-1/2 rounded-[50%] blur-md" style={{ background: OASIS_TEAL, opacity: 0.26 }} />
          <span className="absolute left-1/2 top-[233px] h-px w-[112px] -translate-x-1/2" style={{ background: `linear-gradient(90deg, transparent, ${OASIS_TEAL}99, transparent)` }} />
          <span className="absolute left-1/2 top-[238px] h-px w-[72px] -translate-x-1/2" style={{ background: `linear-gradient(90deg, transparent, ${OASIS_TEAL}55, transparent)` }} />
          {/* cacti standing on the dune edges */}
          <Cactus className="left-[14px] top-[190px]" C={C} />
          <Cactus className="right-[18px] top-[198px]" C={C} />
        </>
      );
    }

    case "stars": { // Space Station — viewport, orbit rings, planet, constellation
      const cyan = SPACE_CYAN;
      return (
        <>
          {/* deep-space vignette (violet core + cyan corner light) */}
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `radial-gradient(120% 80% at 50% 4%, ${C.glow}16, transparent 58%), radial-gradient(80% 50% at 82% 0%, ${cyan}0E, transparent 60%)` }} />
          {/* structured static starfield for depth (uniform, not sparkly) */}
          {STARFIELD.map((p, i) => (
            <span key={`sf${i}`} className="absolute rounded-full" style={{ left: p.l, top: p.t, width: p.s, height: p.s, background: i % 4 === 0 ? cyan : C.softText, opacity: 0.45, boxShadow: p.s > 1 ? `0 0 3px ${C.neon}55` : undefined }} />
          ))}
          {/* a few quietly twinkling stars (kept minimal so it reads structured) */}
          {tw.slice(0, 4).map((p, i) => (
            <span key={`tw${i}`} className="absolute rounded-full animate-[ambTwinkle_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, top: p.t, width: p.s, height: p.s, background: C.glow, boxShadow: `0 0 5px ${C.neon}`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
          {/* faint spaceship panel seams flanking the viewport, behind the chips */}
          {[0, 1].map((side) => (
            <span key={`ps${side}`} className="absolute top-[100px] h-[58px] w-3" style={{ ...(side ? { right: 10 } : { left: 10 }) }}>
              <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: `linear-gradient(${C.neon}33, transparent)` }} />
              {[0, 1, 2].map((t) => (
                <span key={t} className="absolute left-0 h-px w-2.5" style={{ top: t * 24, background: `${C.neon}3A` }} />
              ))}
            </span>
          ))}
          {/* constellation cluster near the BLOOPY wordmark (top-left) */}
          <svg className="absolute left-[7%] top-[38px] h-12 w-24" viewBox="0 0 96 48" fill="none" aria-hidden="true">
            <polyline points="4,14 28,24 48,8 72,26 90,16" stroke={`${C.glow}55`} strokeWidth="1" strokeLinejoin="round" strokeLinecap="round" />
            {[[4, 14], [28, 24], [48, 8], [72, 26], [90, 16]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r={i % 2 ? 1 : 1.6} fill={C.glow} />
            ))}
          </svg>
          {/* spaceship viewport framing Bloopy + orbit rings around him */}
          <Viewport C={C} cyan={cyan} />
          <OrbitField C={C} cyan={cyan} />
          {/* planet / moon with a tilted ring (top-right) */}
          <span className="absolute right-[20px] top-[26px] h-[44px] w-[44px] rounded-full" style={{ background: `radial-gradient(circle at 34% 30%, ${C.glow}, ${C.neon} 68%, ${C.bgDeep})`, boxShadow: `0 0 18px ${C.neon}55, inset -7px -5px 12px ${C.bgDeep}` }} />
          <span className="absolute right-[-2px] top-[34px] h-[26px] w-[82px] rounded-[50%]" style={{ border: `1px solid ${cyan}66`, transform: "rotate(-22deg)" }} />
          {/* tiny satellite / station silhouette (lower-left) */}
          <span className="absolute left-[15%] top-[250px]" style={{ opacity: 0.55 }}>
            <span className="absolute h-2.5 w-3.5 rounded-[2px]" style={{ background: sil, border: `1px solid ${C.neon}55` }} />
            <span className="absolute left-[-11px] top-[3px] h-1.5 w-2.5 rounded-[1px]" style={{ background: `${C.neon}40` }} />
            <span className="absolute left-[15px] top-[3px] h-1.5 w-2.5 rounded-[1px]" style={{ background: `${C.neon}40` }} />
          </span>
        </>
      );
    }

    case "bubbles": // Underwater World — god rays, caustics, bubbles, coral, fish
      return (
        <>
          {/* layered ocean depth: sunlit surface → mid teal → dark deep + vignette */}
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `linear-gradient(180deg, ${C.glow}26 0%, ${C.neon}16 22%, ${C.neon}0C 46%, transparent 70%)` }} />
          <div className="absolute inset-x-0 top-[300px] h-[180px]" style={{ background: `linear-gradient(180deg, transparent, ${C.bgDeep}99)` }} />
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `radial-gradient(120% 70% at 50% 128%, ${C.bgDeep}cc, transparent 60%)` }} />
          {/* vertical water light rays + rippling caustic lines */}
          <WaterRays C={C} />
          <Caustics C={C} />
          {/* floating aqua glow behind Bloopy */}
          <span className="absolute left-1/2 top-[104px] h-[168px] w-[168px] -translate-x-1/2 rounded-full blur-2xl" style={{ background: C.neon, opacity: 0.2 }} />
          {/* tiny fish silhouettes in the mid-water */}
          <Fish className="left-[20%] top-[196px]" C={C} />
          <Fish className="right-[22%] top-[168px]" C={C} flip />
          <Fish className="left-[30%] top-[250px]" C={C} />
          {/* coral / seaweed clusters at the lower side edges */}
          <Coral side="left" C={C} />
          <Coral side="right" C={C} />
          {/* deliberate bubble clusters flanking Bloopy */}
          <BubbleCluster className="left-[30%] top-[92px]" C={C} />
          <BubbleCluster className="right-[28%] top-[150px]" C={C} />
          {/* rising bubble trail */}
          {ri.map((p, i) => (
            <span key={`b${i}`} className="absolute top-[380px] rounded-full animate-[ambRise_var(--u)_linear_infinite] motion-reduce:animate-none" style={{ left: p.l, width: p.s, height: p.s, border: `1px solid ${C.glow}88`, boxShadow: `0 0 5px ${C.neon}`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
        </>
      );

    case "fireflies": { // Forest Garden — night garden, vines, fireflies, grass
      const warm = C.red; // lantern amber
      return (
        <>
          {/* forest depth gradient + ground darkening */}
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `linear-gradient(180deg, ${C.neon}1E 0%, ${C.neon}0C 34%, transparent 66%), radial-gradient(120% 70% at 50% 126%, ${C.bgDeep}cc, transparent 60%)` }} />
          {/* dark tree / shrub silhouettes along the lower side edges */}
          <TreeSilhouette side="left" C={C} />
          <TreeSilhouette side="right" C={C} />
          {/* soft mossy glow behind Bloopy */}
          <span className="absolute left-1/2 top-[104px] h-[180px] w-[180px] -translate-x-1/2 rounded-full blur-2xl" style={{ background: C.neon, opacity: 0.22 }} />
          {/* hanging leaves + vines along the top corners / side edges */}
          <HangingVine side="left" C={C} />
          <HangingVine side="right" C={C} />
          {/* fireflies — slow blink, warm + green */}
          {FIREFLIES.map((p, i) => {
            const col = i % 3 === 0 ? warm : C.glow;
            return (
              <span key={`ff${i}`} className="absolute rounded-full animate-[ambBlink_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, top: p.t, width: p.s, height: p.s, background: col, boxShadow: `0 0 8px ${col}, 0 0 14px ${C.neon}66`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
            );
          })}
          {/* tiny warm lantern glow on the right edge */}
          <span className="absolute right-[20px] top-[196px] h-2.5 w-2.5 rounded-full" style={{ background: warm, boxShadow: `0 0 10px ${warm}, 0 0 18px ${warm}88` }} />
          {/* ground shadow + faint garden path under the hero */}
          <span className="absolute left-1/2 top-[300px] h-[26px] w-[200px] -translate-x-1/2 rounded-[50%] blur-md" style={{ background: C.bgDeep, opacity: 0.6 }} />
          <span className="absolute left-1/2 top-[306px] h-px w-[150px] -translate-x-1/2" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}44, transparent)` }} />
          {/* grass / plant silhouettes at the lower corners */}
          <Grass side="left" C={C} />
          <Grass side="right" C={C} />
          {/* tiny flower clusters near the lower hero edges */}
          {[{ l: "12%", t: 332, c: warm }, { l: "20%", t: 348, c: C.glow }, { l: "82%", t: 340, c: warm }, { l: "90%", t: 326, c: C.glow }].map((f, i) => (
            <span key={`fl${i}`} className="absolute rounded-full" style={{ left: f.l, top: f.t, width: 4, height: 4, background: f.c, boxShadow: `0 0 6px ${f.c}` }} />
          ))}
        </>
      );
    }

    case "snow": { // Snowy Cabin — winter night, pines, cabin, snowdrifts, snow
      const warm = C.red; // cabin amber
      return (
        <>
          {/* cold night gradient + soft warm cabin wash low-left + icy vignette */}
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `linear-gradient(180deg, ${C.neon}1C 0%, ${C.glow}0E 30%, transparent 64%), radial-gradient(120% 70% at 50% 124%, ${C.bgDeep}cc, transparent 60%)` }} />
          <span className="absolute left-[-4%] top-[230px] h-[150px] w-[55%] rounded-full blur-3xl" style={{ background: warm, opacity: 0.1 }} />
          {/* crescent moon (top-right) */}
          <span className="absolute right-[26px] top-[22px] h-6 w-6 rounded-full" style={{ boxShadow: `inset -5px 3px 0 0 ${C.glow}, 0 0 14px ${C.glow}55` }} />
          {/* cold glow behind Bloopy + a frosty arc on the hero panel */}
          <span className="absolute left-1/2 top-[108px] h-[172px] w-[172px] -translate-x-1/2 rounded-full blur-2xl" style={{ background: C.neon, opacity: 0.18 }} />
          <span className="absolute left-1/2 top-[64px] h-[200px] w-[200px] -translate-x-1/2 rounded-full" style={{ border: `1px solid ${C.glow}22` }} />
          <span className="absolute left-1/2 top-[58px] h-[150px] w-[230px] -translate-x-1/2" style={{ borderTop: `1.5px solid ${C.glow}40`, borderRadius: "50% 50% 0 0", maskImage: "linear-gradient(90deg, transparent, black 30%, black 70%, transparent)", WebkitMaskImage: "linear-gradient(90deg, transparent, black 30%, black 70%, transparent)" }} />
          {/* pine silhouettes framing both edges */}
          <Pine className="left-[-6px] top-[210px]" C={C} w={36} />
          <Pine className="left-[34px] top-[236px]" C={C} w={24} />
          <Pine className="right-[8px] top-[196px]" C={C} w={48} />
          <Pine className="right-[52px] top-[226px]" C={C} w={30} />
          {/* warm cabin with glowing windows (lower-left, in front of the pines) */}
          <Cabin className="left-[12px] top-[244px]" C={C} />
          {/* warm lantern by the right pines */}
          <span className="absolute right-[46px] top-[216px] h-2 w-2 rounded-full" style={{ background: warm, boxShadow: `0 0 10px ${warm}, 0 0 16px ${warm}88` }} />
          {/* layered snowdrifts behind and under Bloopy */}
          <span className="absolute left-1/2 top-[286px] h-[46px] w-[160%] -translate-x-1/2 rounded-[50%]" style={{ background: `linear-gradient(180deg, ${C.glow}24, transparent 70%)` }} />
          <span className="absolute left-[-16%] top-[300px] h-[38px] w-[88%] rounded-[50%]" style={{ background: `linear-gradient(180deg, ${C.glow}1A, transparent 72%)` }} />
          <span className="absolute right-[-16%] top-[308px] h-[34px] w-[84%] rounded-[50%]" style={{ background: `linear-gradient(180deg, ${C.glow}14, transparent 72%)` }} />
          {/* crisp snow ground line catching the light */}
          <span className="absolute left-1/2 top-[300px] h-px w-[78%] -translate-x-1/2" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}55, transparent)` }} />
          {/* tiny static snowflake / star dots */}
          {tw.slice(0, 5).map((p, i) => (
            <span key={`s${i}`} className="absolute rounded-full" style={{ left: p.l, top: p.t, width: p.s, height: p.s, background: C.glow, opacity: 0.5 }} />
          ))}
          {/* slow falling snow */}
          {fa.map((p, i) => (
            <span key={`f${i}`} className="absolute top-[-8px] rounded-full animate-[ambFall_var(--u)_linear_infinite] motion-reduce:animate-none" style={{ left: p.l, width: 4 + (i % 2) * 2, height: 4 + (i % 2) * 2, background: C.glow, boxShadow: `0 0 5px ${C.glow}`, opacity: 0.8, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
        </>
      );
    }

    case "grid": // Cyber City — skyline, hologram, neon grid floor, signs, pixels
      return (
        <>
          {/* dark city gradient + vignette */}
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `linear-gradient(180deg, ${C.neon}1C 0%, ${C.glow}0C 38%, transparent 72%), radial-gradient(120% 70% at 50% 126%, ${C.bgDeep}cc, transparent 60%)` }} />
          {/* tall vertical neon light strips on the side edges (billboards) */}
          <span className="absolute left-[7px] top-[44px] h-[180px] w-[3px] rounded-full" style={{ background: `linear-gradient(180deg, transparent, ${C.glow} 30%, ${C.glow}66 70%, transparent)`, boxShadow: `0 0 10px ${C.glow}`, opacity: 0.6 }} />
          <span className="absolute left-[16px] top-[80px] h-[110px] w-[2px] rounded-full" style={{ background: `linear-gradient(180deg, ${C.neon}, transparent)`, boxShadow: `0 0 6px ${C.neon}`, opacity: 0.5 }} />
          <span className="absolute right-[9px] top-[36px] h-[200px] w-[3px] rounded-full" style={{ background: `linear-gradient(180deg, transparent, ${C.red} 28%, ${C.red}66 70%, transparent)`, boxShadow: `0 0 10px ${C.red}`, opacity: 0.6 }} />
          <span className="absolute right-[18px] top-[74px] h-[120px] w-[2px] rounded-full" style={{ background: `linear-gradient(180deg, ${C.neon}, transparent)`, boxShadow: `0 0 6px ${C.neon}`, opacity: 0.5 }} />
          {/* horizontal neon sign bars near the top */}
          <span className="absolute left-[14%] top-[58px] h-1 w-[24px] rounded-full" style={{ background: C.glow, boxShadow: `0 0 8px ${C.neon}`, opacity: 0.85 }} />
          <span className="absolute right-[18%] top-[92px] h-1 w-4 rounded-full" style={{ background: C.red, boxShadow: `0 0 8px ${C.red}`, opacity: 0.85 }} />
          {/* layered neon skyline (back parallax + front) below Bloopy */}
          <Skyline C={C} back />
          <Skyline C={C} />
          {/* neon grid floor under Bloopy */}
          <div className="absolute inset-x-0 top-[244px] h-[110px]" style={{ backgroundImage: `linear-gradient(${C.neon}3A 1px, transparent 1px), linear-gradient(90deg, ${C.glow}2A 1px, transparent 1px)`, backgroundSize: "30px 30px", maskImage: "linear-gradient(180deg, black, transparent 75%)", WebkitMaskImage: "linear-gradient(180deg, black, transparent 75%)" }} />
          {/* hologram panel framing Bloopy (over the skyline) */}
          <Hologram C={C} />
          {/* bright neon reflection platform under Bloopy */}
          <span className="absolute left-1/2 top-[240px] h-[30px] w-[170px] -translate-x-1/2 rounded-[50%] blur-md" style={{ background: C.neon, opacity: 0.34 }} />
          <span className="absolute left-1/2 top-[248px] h-[12px] w-[130px] -translate-x-1/2 rounded-[50%]" style={{ border: `1px solid ${C.glow}77`, boxShadow: `0 0 12px ${C.glow}55` }} />
          <span className="absolute left-1/2 top-[256px] h-[26px] w-[2px] -translate-x-1/2" style={{ background: `linear-gradient(180deg, ${C.glow}66, transparent)` }} />
          {/* drifting pixel / signal particles */}
          {ri.map((p, i) => (
            <span key={`px${i}`} className="absolute top-[300px] animate-[ambRise_var(--u)_linear_infinite] motion-reduce:animate-none" style={{ left: p.l, width: 2, height: 2, background: i % 2 ? C.glow : C.red, boxShadow: `0 0 5px ${i % 2 ? C.glow : C.red}`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
          {/* a few static pixels in the sky */}
          {tw.slice(0, 5).map((p, i) => (
            <span key={`sp${i}`} className="absolute" style={{ left: p.l, top: p.t, width: 2, height: 2, background: C.glow, opacity: 0.5, boxShadow: `0 0 4px ${C.neon}66` }} />
          ))}
        </>
      );

    case "embers": // Volcano Lab — rock ridges, lava cracks, embers, lab sensors
      return (
        <>
          {/* dark volcanic gradient + deep vignette */}
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `linear-gradient(180deg, ${C.red}1E 0%, ${C.neon}12 40%, transparent 74%), radial-gradient(120% 70% at 50% 126%, ${C.bgDeep}cc, transparent 60%)` }} />
          {/* layered heat glow behind + under Bloopy */}
          <span className="absolute left-1/2 top-[96px] h-[190px] w-[210px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: C.red, opacity: 0.22 }} />
          <span className="absolute left-1/2 top-[150px] h-[120px] w-[150px] -translate-x-1/2 rounded-full blur-2xl" style={{ background: C.glow, opacity: 0.16 }} />
          {/* hot ground glow band under the cracks */}
          <span className="absolute inset-x-0 top-[286px] h-[40px] blur-xl" style={{ background: `radial-gradient(80% 100% at 50% 100%, ${C.red}44, transparent 70%)` }} />
          {/* lab warning hazard strip (right edge) */}
          <span className="absolute right-[8px] top-[60px] h-[42px] w-[10px] overflow-hidden rounded-sm" style={{ opacity: 0.55 }}>
            <span className="absolute inset-0" style={{ backgroundImage: `repeating-linear-gradient(45deg, ${C.glow} 0 3px, transparent 3px 6px)` }} />
          </span>
          {/* lab sensor tick line (left edge) */}
          <span className="absolute left-[9px] top-[70px] h-[84px] w-[10px]">
            <span className="absolute inset-y-0 left-1/2 w-px" style={{ background: `linear-gradient(${C.neon}66, transparent)` }} />
            {[0, 1, 2, 3].map((t) => (
              <span key={t} className="absolute left-0 h-px w-2.5" style={{ top: t * 24, background: `${C.neon}88`, boxShadow: `0 0 4px ${C.red}66` }} />
            ))}
          </span>
          {/* futuristic pipe + glowing valve (left edge) */}
          <span className="absolute left-[6px] top-[176px] h-[78px] w-[6px] rounded-full" style={{ background: `linear-gradient(90deg, ${C.bgDeep}, ${C.cardBorder})`, boxShadow: `inset -1px 0 0 ${C.neon}33` }} />
          <span className="absolute left-[5px] top-[206px] h-2 w-2 rounded-full" style={{ background: C.red, boxShadow: `0 0 6px ${C.red}` }} />
          {/* heat-sensor readout gauge (right edge, under the warning strip) */}
          <span className="absolute right-[8px] top-[112px] flex h-[44px] w-[10px] flex-col-reverse items-center gap-[2px]">
            {[0.9, 0.7, 0.45, 0.25].map((o, i) => (
              <span key={i} className="h-[3px] w-[8px] rounded-[1px]" style={{ background: i < 2 ? C.red : C.glow, opacity: o, boxShadow: i === 0 ? `0 0 4px ${C.red}` : undefined }} />
            ))}
          </span>
          {/* layered rock ridges with a lava seam */}
          <RockRidge C={C} />
          {/* glowing lava cracks across the ground */}
          <LavaCracks C={C} />
          {/* a lava vent rising toward Bloopy */}
          <span className="absolute left-[46%] top-[252px] h-[34px] w-[2px]" style={{ background: `linear-gradient(${C.red}, ${C.glow})`, boxShadow: `0 0 8px ${C.red}` }} />
          {/* warm reflection platform under Bloopy */}
          <span className="absolute left-1/2 top-[240px] h-[28px] w-[166px] -translate-x-1/2 rounded-[50%] blur-md" style={{ background: C.red, opacity: 0.3 }} />
          <span className="absolute left-1/2 top-[248px] h-[11px] w-[128px] -translate-x-1/2 rounded-[50%]" style={{ border: `1px solid ${C.glow}66`, boxShadow: `0 0 12px ${C.red}44` }} />
          {/* rising embers (warm, slow) */}
          {ri.map((p, i) => (
            <span key={`e${i}`} className="absolute top-[320px] rounded-full animate-[ambRise_var(--u)_linear_infinite] motion-reduce:animate-none" style={{ left: p.l, width: p.s * 0.7, height: p.s * 0.7, background: i % 3 === 0 ? C.glow : C.red, boxShadow: `0 0 8px ${i % 3 === 0 ? C.glow : C.red}`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
          {/* a few static embers in the warm air */}
          {tw.slice(0, 4).map((p, i) => (
            <span key={`se${i}`} className="absolute rounded-full" style={{ left: p.l, top: p.t, width: 2, height: 2, background: C.red, opacity: 0.5, boxShadow: `0 0 4px ${C.red}66` }} />
          ))}
        </>
      );

    case "clouds": // Cloud Sky — dusk sky, horizon, layered clouds, moon, stars
      return (
        <>
          {/* dreamy dusk sky gradient (lavender → blue → pink) */}
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `linear-gradient(180deg, ${C.glow}28 0%, ${C.neon}18 36%, ${C.red}10 60%, transparent 82%)` }} />
          {/* "above the clouds" horizon glow band */}
          <span className="absolute inset-x-0 top-[250px] h-[60px] blur-2xl" style={{ background: `radial-gradient(80% 100% at 50% 60%, ${C.red}33, ${C.glow}1A 50%, transparent 75%)` }} />
          {/* soft moon: sunset wash + halo + disc (top-right) */}
          <span className="absolute right-[6px] top-[8px] h-[90px] w-[120px] blur-2xl" style={{ background: `radial-gradient(circle at 75% 25%, ${C.red}33, transparent 65%)` }} />
          <span className="absolute right-[18px] top-[18px] h-[58px] w-[58px] rounded-full blur-xl" style={{ background: C.glow, opacity: 0.26 }} />
          <span className="absolute right-[26px] top-[26px] h-[38px] w-[38px] rounded-full blur-[2px]" style={{ background: `radial-gradient(circle at 40% 35%, ${C.mainText}, ${C.softText} 55%, ${C.glow}00)`, opacity: 0.88 }} />
          {/* misty glow behind Bloopy */}
          <span className="absolute left-1/2 top-[98px] h-[186px] w-[206px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: C.neon, opacity: 0.18 }} />
          {/* misty cloud bands behind the hero */}
          <span className="absolute left-1/2 top-[120px] h-[26px] w-[150%] -translate-x-1/2 rounded-[50%] blur-xl" style={{ background: C.glow, opacity: 0.12 }} />
          <span className="absolute left-1/2 top-[182px] h-[30px] w-[160%] -translate-x-1/2 rounded-[50%] blur-xl" style={{ background: C.neon, opacity: 0.12 }} />
          {/* drifting clouds near the top / side edges */}
          <Cloud className="left-[-4%] top-[34px] animate-[ambDriftX_26s_ease-in-out_infinite] motion-reduce:animate-none" C={C} w={130} tint={C.glow} op={0.4} />
          <Cloud className="right-[0%] top-[104px] animate-[ambDriftX_32s_ease-in-out_infinite] motion-reduce:animate-none" C={C} w={140} tint={C.neon} op={0.36} />
          {/* tiny stars */}
          {tw.slice(0, 6).map((p, i) => (
            <span key={`st${i}`} className="absolute rounded-full animate-[ambTwinkle_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, top: p.t, width: 2, height: 2, background: C.mainText, opacity: 0.7, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
          {/* layered cloud bank under Bloopy (back mist + 3 tinted layers) */}
          <span className="absolute left-1/2 top-[276px] h-[40px] w-[170%] -translate-x-1/2 rounded-[50%] blur-2xl" style={{ background: C.glow, opacity: 0.14 }} />
          <Cloud className="left-[-12%] top-[258px]" C={C} w={190} tint={C.glow} op={0.42} />
          <Cloud className="right-[-14%] top-[252px]" C={C} w={210} tint={C.neon} op={0.4} />
          <Cloud className="left-1/2 top-[270px] -translate-x-1/2" C={C} w={180} tint={C.red} op={0.34} />
          {/* pink/lavender rim highlight catching the top of the cloud bank */}
          <span className="absolute left-1/2 top-[256px] h-px w-[64%] -translate-x-1/2 blur-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${C.red}77, ${C.softText}66, transparent)` }} />
          {/* faint floating light motes */}
          {[{ l: "24%", t: 196 }, { l: "70%", t: 218 }, { l: "50%", t: 158 }, { l: "84%", t: 176 }].map((p, i) => (
            <span key={`mo${i}`} className="absolute rounded-full animate-[ambDriftX_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, top: p.t, width: 3, height: 3, background: C.softText, opacity: 0.5, boxShadow: `0 0 6px ${C.glow}`, ["--u" as string]: `${13 + i * 2}s`, animationDelay: `${i}s` } as React.CSSProperties} />
          ))}
        </>
      );

    case "craters": // Moon Base — lunar horizon, craters, rocks, base, dust
      return (
        <>
          {/* quiet lunar gradient + soft vignette */}
          <div className="absolute inset-x-0 top-0 h-[480px]" style={{ background: `radial-gradient(120% 70% at 50% 0%, ${C.glow}14, transparent 58%), radial-gradient(120% 70% at 50% 126%, ${C.bgDeep}cc, transparent 60%)` }} />
          {/* distant planet (Earth) top-right */}
          <span className="absolute right-[22px] top-[26px] h-8 w-8 rounded-full" style={{ background: `radial-gradient(circle at 36% 32%, ${C.glow}, ${MOON_EARTH} 70%, ${C.bgDeep})`, boxShadow: `0 0 16px ${MOON_EARTH}66, inset -4px -3px 8px ${C.bgDeep}` }} />
          {/* stars */}
          {tw.map((p, i) => (
            <span key={`s${i}`} className="absolute rounded-full animate-[ambTwinkle_var(--u)_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, top: p.t, width: p.s, height: p.s, background: C.glow, boxShadow: `0 0 5px ${C.glow}`, ["--u" as string]: p.u, animationDelay: p.d } as React.CSSProperties} />
          ))}
          {/* tiny satellite (upper-left) */}
          <span className="absolute left-[16%] top-[64px]" style={{ opacity: 0.55 }}>
            <span className="absolute h-2.5 w-3.5 rounded-[2px]" style={{ background: C.bgDeep, border: `1px solid ${C.neon}55` }} />
            <span className="absolute left-[-11px] top-[3px] h-1.5 w-2.5 rounded-[1px]" style={{ background: `${C.neon}40` }} />
            <span className="absolute left-[15px] top-[3px] h-1.5 w-2.5 rounded-[1px]" style={{ background: `${C.neon}40` }} />
          </span>
          {/* soft moonlight glow behind Bloopy */}
          <span className="absolute left-1/2 top-[104px] h-[176px] w-[186px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: C.neon, opacity: 0.16 }} />
          {/* faint base-panel framing around the hero (brackets + side rails) */}
          <span className="absolute left-[14px] top-[54px] h-4 w-4 border-l border-t" style={{ borderColor: `${C.glow}44` }} />
          <span className="absolute right-[14px] top-[54px] h-4 w-4 border-r border-t" style={{ borderColor: `${C.glow}44` }} />
          <span className="absolute left-[12px] top-[80px] h-[70px] w-px" style={{ background: `linear-gradient(${C.glow}33, transparent)` }} />
          <span className="absolute right-[12px] top-[80px] h-[70px] w-px" style={{ background: `linear-gradient(${C.glow}33, transparent)` }} />
          {/* moon horizon: lit ground ellipse + bright moonlit crest + ground haze */}
          <span className="absolute inset-x-0 top-[252px] h-[40px] blur-2xl" style={{ background: `radial-gradient(80% 100% at 50% 0%, ${C.glow}22, transparent 70%)` }} />
          <span className="absolute left-1/2 top-[244px] h-[200px] w-[180%] -translate-x-1/2 rounded-[50%]" style={{ background: `linear-gradient(180deg, ${C.cardAlt}, ${C.bgDeep})`, boxShadow: `inset 0 2px 0 ${C.glow}44` }} />
          <span className="absolute left-1/2 top-[243px] h-[2px] w-[150%] -translate-x-1/2 blur-[1px]" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}88, ${C.softText}66, transparent)` }} />
          {/* craters on the surface (rim-lit) */}
          <Crater className="left-[26%] top-[262px]" C={C} w={50} />
          <Crater className="right-[22%] top-[278px]" C={C} w={34} />
          <Crater className="left-[54%] top-[294px]" C={C} w={24} />
          <Crater className="left-[16%] top-[300px]" C={C} w={18} />
          {/* moon rocks at the side / lower edges */}
          <MoonRock className="left-[10px] top-[258px]" C={C} w={22} />
          <MoonRock className="right-[14px] top-[264px]" C={C} w={17} />
          <MoonRock className="left-[44px] top-[284px]" C={C} w={12} />
          <MoonRock className="right-[60px] top-[290px]" C={C} w={11} />
          {/* small lunar base (dome + antenna) + a rover on the horizon */}
          <BaseStructure className="right-[38px] top-[210px]" C={C} />
          <Rover className="left-[30px] top-[260px]" C={C} />
          {/* silver reflection platform under Bloopy */}
          <span className="absolute left-1/2 top-[242px] h-[24px] w-[152px] -translate-x-1/2 rounded-[50%] blur-md" style={{ background: C.glow, opacity: 0.22 }} />
          <span className="absolute left-1/2 top-[248px] h-[10px] w-[122px] -translate-x-1/2 rounded-[50%]" style={{ border: `1px solid ${C.glow}55` }} />
          {/* drifting lunar dust */}
          {fa.slice(0, 4).map((p, i) => (
            <span key={`d${i}`} className="absolute top-[300px] h-1 w-1 rounded-full animate-[ambDriftX_8s_ease-in-out_infinite] motion-reduce:animate-none" style={{ left: p.l, background: C.glow, opacity: 0.4, animationDelay: p.d }} />
          ))}
        </>
      );

    default:
      return null;
  }
}

/* ---- Layer 2: the variation overlay (tech / protective / cozy / minimal) ----
 * World-agnostic but tinted by the world palette, so each variation reads
 * clearly on every world (Beach+Robot = aqua scanners, Space+Robot = violet
 * diagnostics, …). Confined to the hero band except the protective vignette,
 * which grounds the whole page. */

function VariationLayer({ overlay, C }: { overlay: VariationOverlayId; C: BloopyThemeColors }) {
  switch (overlay) {
    case "tech": // Robot Lab — scanners, blueprint grid, brackets, signal dots
      return (
        <>
          <div className="absolute inset-x-0 top-0 h-[460px]" style={{ backgroundImage: `linear-gradient(${C.neon}22 1px, transparent 1px), linear-gradient(90deg, ${C.neon}1A 1px, transparent 1px)`, backgroundSize: "26px 26px", maskImage: "radial-gradient(120% 80% at 50% 10%, black, transparent 80%)", WebkitMaskImage: "radial-gradient(120% 80% at 50% 10%, black, transparent 80%)" }} />
          <span className="absolute inset-x-0 top-0 h-px animate-[ambScan_5.5s_linear_infinite] motion-reduce:animate-none" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}, transparent)`, boxShadow: `0 0 10px ${C.neon}` }} />
          <span className="absolute left-2 top-2 h-4 w-4 border-l border-t" style={{ borderColor: `${C.glow}99` }} />
          <span className="absolute right-2 top-2 h-4 w-4 border-r border-t" style={{ borderColor: `${C.glow}99` }} />
          <span className="absolute left-[20%] top-[150px] h-1.5 w-1.5 rounded-full animate-[ambBlink_2.2s_ease-in-out_infinite] motion-reduce:animate-none" style={{ background: C.glow, boxShadow: `0 0 6px ${C.neon}` }} />
          <span className="absolute right-[24%] top-[120px] h-1.5 w-1.5 rounded-full animate-[ambBlink_2.8s_ease-in-out_infinite] motion-reduce:animate-none" style={{ background: C.red, boxShadow: `0 0 6px ${C.red}` }} />
          <span className="absolute left-[14%] top-[180px] text-[8px] font-bold tracking-[0.2em]" style={{ color: `${C.glow}88` }}>SYS·OK</span>
        </>
      );

    case "protective": // Doomscroll Rescue — vignette + slow breathing glow
      return (
        <>
          <div className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 18%, transparent 40%, ${C.bgDeep}AA 100%)` }} />
          <span className="absolute left-1/2 top-[70px] h-[220px] w-[220px] -translate-x-1/2 rounded-full blur-3xl animate-[ambBreathe_7s_ease-in-out_infinite] motion-reduce:animate-none" style={{ background: C.neon, opacity: 0.18 }} />
          <span className="absolute left-1/2 top-[150px] h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: C.red, opacity: 0.6, boxShadow: `0 0 8px ${C.red}` }} />
        </>
      );

    case "cozy": // Cozy Room — warm comfort wash + corner lanterns
      return (
        <>
          <span className="absolute left-1/2 top-[40px] h-[200px] w-[260px] -translate-x-1/2 rounded-full blur-3xl" style={{ background: C.red, opacity: 0.16 }} />
          <div className="absolute inset-x-0 top-[320px] h-[160px]" style={{ background: `linear-gradient(180deg, transparent, ${C.red}14)` }} />
          <span className="absolute left-[10%] top-[60px] h-3 w-3 rounded-full blur-[3px]" style={{ background: C.glow, opacity: 0.5 }} />
          <span className="absolute right-[12%] top-[90px] h-2.5 w-2.5 rounded-full blur-[3px]" style={{ background: C.red, opacity: 0.5 }} />
        </>
      );

    case "minimal": // Focus Mode — one clean focus line, nothing else
      return <span className="absolute left-1/2 top-[210px] h-px w-40 -translate-x-1/2" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}66, transparent)` }} />;

    default:
      return null;
  }
}

const AMB_KEYFRAMES = `
  @keyframes ambTwinkle { 0%,100% { opacity: 0.2; } 50% { opacity: 0.9; } }
  @keyframes ambBlink { 0%,100% { opacity: 0.12; } 50% { opacity: 0.85; } }
  @keyframes ambRise { 0% { transform: translateY(0); opacity: 0; } 14% { opacity: 0.8; } 90% { opacity: 0.5; } 100% { transform: translateY(-280px); opacity: 0; } }
  @keyframes ambFall { 0% { transform: translateY(0) translateX(0); opacity: 0; } 12% { opacity: 0.85; } 100% { transform: translateY(330px) translateX(16px); opacity: 0; } }
  @keyframes ambDriftX { 0%,100% { transform: translateX(0); } 50% { transform: translateX(20px); } }
  @keyframes ambWave { 0%,100% { transform: translateX(-50%) scaleX(1); opacity: 0.7; } 50% { transform: translateX(-50%) scaleX(1.04); opacity: 1; } }
  @keyframes ambSway { 0%,100% { transform: rotate(0deg); } 50% { transform: rotate(3deg); } }
  @keyframes ambRay { 0%,100% { opacity: 0.45; } 50% { opacity: 0.8; } }
  @keyframes ambCaustic { 0%,100% { opacity: 0.3; transform: scaleX(0.96); } 50% { opacity: 0.7; transform: scaleX(1.04); } }
  @keyframes ambScan { 0% { transform: translateY(0); opacity: 0; } 10% { opacity: 0.8; } 90% { opacity: 0.8; } 100% { transform: translateY(440px); opacity: 0; } }
  @keyframes ambBreathe { 0%,100% { transform: translateX(-50%) scale(0.9); opacity: 0.14; } 50% { transform: translateX(-50%) scale(1.1); opacity: 0.32; } }
`;

export default function BloopyWorldAmbience() {
  const world = useBloopyWorld();
  const mood = useBloopyMood();
  const C = useBloopyThemeColors();

  const hasWorld = world.particle !== "none";
  const hasOverlay = mood.overlay !== "none";
  if (!hasWorld && !hasOverlay) return null;

  // The variation's glow level scales how present the world scene feels.
  const sceneOpacity = Math.min(1, 0.6 + 0.3 * mood.glow);

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      {hasWorld && (
        <div className="absolute inset-x-0 top-0 h-[480px]" style={{ opacity: sceneOpacity }}>
          <Scene particle={world.particle} C={C} density={mood.density} />
        </div>
      )}
      <VariationLayer overlay={mood.overlay} C={C} />
      <style>{AMB_KEYFRAMES}</style>
    </div>
  );
}

/* ---- compact static preview for the Settings world cards ----------------- */

function MiniScene({ particle, C }: { particle: WorldParticle; C: BloopyThemeColors }) {
  const sil = C.bgDeep;
  const dot = (left: string, top: string, color = C.glow, size = 2) => (
    <span className="absolute rounded-full" style={{ left, top, width: size, height: size, background: color, boxShadow: `0 0 4px ${color}` }} />
  );

  switch (particle) {
    case "waves":
      return (
        <>
          {/* warm sand glow at the foot */}
          <span className="absolute inset-x-0 bottom-0 h-3" style={{ background: `linear-gradient(180deg, transparent, ${C.red}33)` }} />
          {/* setting sun on the horizon */}
          <span className="absolute right-1.5 top-1 h-4 w-4 rounded-full blur-[1px]" style={{ background: `radial-gradient(circle, ${C.red}, ${C.red}66)`, opacity: 0.9 }} />
          {/* ocean horizon line */}
          <span className="absolute inset-x-0 top-[22px] h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}88, transparent)` }} />
          {/* foam wave strokes */}
          <span className="absolute left-1/2 top-7 h-5 w-[150%] -translate-x-1/2 rounded-[50%]" style={{ border: `1px solid ${C.glow}66` }} />
          <span className="absolute left-1/2 top-9 h-5 w-[150%] -translate-x-1/2 rounded-[50%]" style={{ border: `1px solid ${C.glow}33` }} />
          {/* palm frond top-left */}
          <span className="absolute -left-1 -top-1 h-5 w-7" style={{ background: sil, opacity: 0.6, clipPath: "polygon(0 0,0 60%,60% 18%,100% 30%,45% 8%)" }} />
          {/* tiny starfish on the sand */}
          <span className="absolute bottom-0.5 left-1.5 h-2 w-2" style={{ background: C.red, opacity: 0.85, clipPath: STARFISH_CLIP }} />
          {dot("38%", "34%", C.glow, 1.5)}
        </>
      );
    case "sand":
      return (
        <>
          {/* warm sand glow at the foot */}
          <span className="absolute inset-x-0 bottom-0 h-3" style={{ background: `linear-gradient(180deg, transparent, ${C.red}33)` }} />
          {/* setting sun */}
          <span className="absolute right-2 top-1 h-3.5 w-3.5 rounded-full blur-[1px]" style={{ background: `radial-gradient(circle, ${C.glow}, ${C.red}88)`, opacity: 0.9 }} />
          {/* layered dune curves */}
          <span className="absolute left-1/2 top-[22px] h-7 w-[170%] -translate-x-1/2 rounded-[50%]" style={{ background: sil, opacity: 0.6 }} />
          <span className="absolute left-1/2 top-7 h-7 w-[150%] -translate-x-1/2 rounded-[50%]" style={{ background: sil, opacity: 0.45 }} />
          {/* tiny oasis teal mark on the sand */}
          <span className="absolute bottom-1.5 right-3 h-1 w-1 rounded-full" style={{ background: OASIS_TEAL, boxShadow: `0 0 4px ${OASIS_TEAL}` }} />
          {/* saguaro cactus */}
          <span className="absolute bottom-0 left-3 h-4 w-1 rounded-full" style={{ background: sil }} />
          <span className="absolute bottom-2 left-[8px] h-1.5 w-1 rounded-full" style={{ background: sil }} />
          <span className="absolute bottom-2.5 left-[15px] h-2 w-1 rounded-full" style={{ background: sil }} />
          {/* warm sand particle dots */}
          {dot("40%", "20%", C.glow, 1.5)}
          {dot("66%", "32%", C.glow, 1)}
        </>
      );
    case "stars":
      return (
        <>
          {/* violet space glow */}
          <span className="absolute inset-0" style={{ background: `radial-gradient(85% 100% at 50% 0%, ${C.glow}1F, transparent 65%)` }} />
          {/* viewport corner brackets (echo the hero HUD) */}
          <span className="absolute left-0.5 top-0.5 h-2 w-2 rounded-tl-[4px]" style={{ borderTop: `1px solid ${SPACE_CYAN}99`, borderLeft: `1px solid ${SPACE_CYAN}99` }} />
          <span className="absolute bottom-0.5 right-0.5 h-2 w-2 rounded-br-[4px]" style={{ borderBottom: `1px solid ${SPACE_CYAN}77`, borderRight: `1px solid ${SPACE_CYAN}77` }} />
          {dot("18%", "28%")}
          {dot("60%", "62%", C.glow, 1.5)}
          {dot("40%", "20%", C.glow, 1)}
          {dot("82%", "46%", SPACE_CYAN, 1.5)}
          {/* orbit ring around the center */}
          <span className="absolute left-1/2 top-1/2 h-5 w-10 rounded-[50%]" style={{ transform: "translate(-50%,-50%) rotate(-18deg)", border: `1px solid ${SPACE_CYAN}66` }} />
          {/* planet / moon */}
          <span className="absolute right-1.5 top-1 h-3.5 w-3.5 rounded-full" style={{ background: `radial-gradient(circle at 34% 30%, ${C.glow}, ${C.neon})`, boxShadow: `0 0 6px ${C.neon}88` }} />
          {/* tiny station silhouette */}
          <span className="absolute bottom-1 left-2 h-1.5 w-1.5 rounded-[1px]" style={{ background: sil, border: `1px solid ${C.neon}66` }} />
          <span className="absolute bottom-[7px] left-1 h-px w-4" style={{ background: `${C.neon}88` }} />
        </>
      );
    case "bubbles":
      return (
        <>
          {/* aqua depth glow */}
          <span className="absolute inset-0" style={{ background: `radial-gradient(90% 100% at 50% 0%, ${C.glow}22, transparent 70%)` }} />
          {/* water light rays */}
          <span className="absolute left-[34%] top-0 h-7 w-2 -rotate-6" style={{ background: `linear-gradient(180deg, ${C.glow}55, transparent)` }} />
          <span className="absolute left-[50%] top-0 h-6 w-1.5 rotate-3" style={{ background: `linear-gradient(180deg, ${C.glow}40, transparent)` }} />
          <span className="absolute left-[64%] top-0 h-5 w-1.5 rotate-12" style={{ background: `linear-gradient(180deg, ${C.glow}2E, transparent)` }} />
          {/* bubble cluster */}
          <span className="absolute left-[22%] top-[24%] h-2 w-2 rounded-full" style={{ border: `1px solid ${C.glow}99` }} />
          {dot("32%", "20%", C.glow, 2)}
          {dot("27%", "44%", C.glow, 1.5)}
          {dot("58%", "50%", C.glow, 2)}
          {/* coral / seaweed */}
          <span className="absolute bottom-0 left-[7px] h-5 w-1 rounded-full" style={{ background: sil }} />
          <span className="absolute bottom-0 left-2 h-3.5 w-1 rounded-full" style={{ background: sil }} />
          <span className="absolute bottom-0 left-[13px] h-3 w-1 rounded-full" style={{ background: sil }} />
          {/* tiny fish */}
          <span className="absolute right-3 top-[42%] h-1.5 w-2.5 rounded-[50%]" style={{ background: sil, opacity: 0.8 }} />
          <span className="absolute right-2 top-[44%] h-1.5 w-1.5" style={{ background: sil, opacity: 0.8, clipPath: "polygon(0 50%,100% 0,100% 100%)" }} />
        </>
      );
    case "fireflies":
      return (
        <>
          {/* deep green glow */}
          <span className="absolute inset-0" style={{ background: `radial-gradient(90% 100% at 50% 0%, ${C.neon}22, transparent 70%)` }} />
          {/* hanging corner leaves */}
          <span className="absolute -left-1 -top-1 h-5 w-5" style={{ background: sil, borderRadius: "0 100% 0 100%", opacity: 0.65 }} />
          <span className="absolute -right-1 -top-1 h-4 w-4" style={{ background: sil, borderRadius: "100% 0 100% 0", opacity: 0.65 }} />
          {/* dark tree silhouette (right) */}
          <span className="absolute bottom-0 right-1 h-4 w-4 rounded-full blur-[1px]" style={{ background: sil, opacity: 0.7 }} />
          <span className="absolute bottom-0 right-[11px] h-3 w-[2px] rounded-full" style={{ background: sil, opacity: 0.7 }} />
          {/* grass blades at the base (left) */}
          <span className="absolute bottom-0 left-2 h-3 w-[2px] -rotate-6 rounded-full" style={{ background: sil }} />
          <span className="absolute bottom-0 left-[13px] h-4 w-[2px] rotate-3 rounded-full" style={{ background: sil }} />
          <span className="absolute bottom-0 left-[19px] h-2.5 w-[2px] rotate-12 rounded-full" style={{ background: sil }} />
          {/* fireflies (incl. one warm) */}
          {dot("34%", "32%", C.glow, 2.5)}
          {dot("60%", "24%", C.glow, 2)}
          {dot("48%", "52%", C.red, 2)}
          {/* tiny warm bloom on the grass */}
          <span className="absolute bottom-2.5 left-[15px] h-1.5 w-1.5 rounded-full" style={{ background: C.glow, boxShadow: `0 0 5px ${C.glow}` }} />
        </>
      );
    case "snow":
      return (
        <>
          {/* icy blue glow */}
          <span className="absolute inset-0" style={{ background: `radial-gradient(90% 100% at 50% 0%, ${C.neon}22, transparent 70%)` }} />
          {/* snowdrift curve */}
          <span className="absolute inset-x-0 bottom-0 h-2.5" style={{ background: `linear-gradient(180deg, transparent, ${C.glow}33)` }} />
          <span className="absolute bottom-[-6px] left-1/2 h-4 w-[150%] -translate-x-1/2 rounded-[50%]" style={{ background: `${C.glow}1F` }} />
          {/* snow-capped pine (right) */}
          <span className="absolute bottom-0 right-2 h-5 w-4" style={{ background: sil, clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
          <span className="absolute bottom-[7px] right-[11px] h-2 w-2.5" style={{ background: sil, clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
          <span className="absolute bottom-[10px] right-[14px] h-1 w-1.5" style={{ background: C.glow, opacity: 0.6, clipPath: "polygon(50% 0,100% 100%,0 100%)" }} />
          {/* warm cabin light (left) */}
          <span className="absolute bottom-1 left-2.5 h-1.5 w-1.5 rounded-[1px]" style={{ background: C.red, boxShadow: `0 0 6px ${C.red}` }} />
          {/* falling snow dots */}
          {dot("28%", "22%", C.glow, 1.5)}
          {dot("56%", "32%", C.glow, 1.5)}
          {dot("44%", "14%", C.glow, 2)}
          {dot("70%", "20%", C.glow, 1.5)}
        </>
      );
    case "grid":
      return (
        <>
          {/* neon glow */}
          <span className="absolute inset-0" style={{ background: `radial-gradient(90% 100% at 50% 0%, ${C.neon}22, transparent 70%)` }} />
          {/* neon grid floor */}
          <span className="absolute inset-x-0 bottom-0 h-4" style={{ backgroundImage: `linear-gradient(${C.glow}40 1px, transparent 1px), linear-gradient(90deg, ${C.neon}33 1px, transparent 1px)`, backgroundSize: "6px 5px", maskImage: "linear-gradient(0deg, black, transparent)", WebkitMaskImage: "linear-gradient(0deg, black, transparent)" }} />
          {/* skyline bars with lit windows */}
          <span className="absolute inset-x-0 bottom-0 flex items-end justify-center gap-0.5" style={{ opacity: 0.72 }}>
            {[10, 16, 8, 20, 12, 18, 9, 14].map((h, i) => (
              <span key={i} className="relative w-1.5 rounded-t-[1px]" style={{ height: h, background: sil }}>
                <span className="absolute inset-x-0 top-0 h-px" style={{ background: i % 2 ? C.red : C.glow, opacity: 0.7 }} />
              </span>
            ))}
          </span>
          {/* hologram rectangle */}
          <span className="absolute left-1/2 top-1.5 h-6 w-9 -translate-x-1/2 rounded-[3px]" style={{ border: `1px solid ${C.neon}66`, background: `${C.neon}12` }} />
          {/* neon sign lines */}
          <span className="absolute left-2 top-1 h-0.5 w-4" style={{ background: C.glow, boxShadow: `0 0 6px ${C.neon}` }} />
          <span className="absolute right-2.5 top-2.5 h-0.5 w-3" style={{ background: C.red, boxShadow: `0 0 6px ${C.red}` }} />
        </>
      );
    case "embers":
      return (
        <>
          {/* heat glow */}
          <span className="absolute inset-0" style={{ background: `radial-gradient(90% 100% at 50% 0%, ${C.red}22, transparent 70%)` }} />
          {/* dark rock ridge */}
          <span className="absolute inset-x-0 bottom-0 h-3.5" style={{ background: sil, clipPath: "polygon(0 100%,0 60%,18% 35%,38% 62%,58% 30%,80% 58%,100% 40%,100% 100%)" }} />
          {/* glowing lava crack / seam */}
          <span className="absolute inset-x-1 bottom-[3px] h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.red}, ${C.glow}, transparent)`, boxShadow: `0 0 4px ${C.red}` }} />
          {/* lava vent */}
          <span className="absolute bottom-2 left-1/2 h-3 w-px -translate-x-1/2" style={{ background: `linear-gradient(${C.red}, ${C.glow})`, boxShadow: `0 0 6px ${C.red}` }} />
          {/* lab sensor tick (left) */}
          <span className="absolute left-1 top-1.5 h-4 w-px" style={{ background: `${C.neon}88` }} />
          <span className="absolute left-[2px] top-2 h-px w-1.5" style={{ background: `${C.neon}99` }} />
          {/* embers */}
          {dot("30%", "30%", C.red, 2)}
          {dot("62%", "22%", C.glow, 1.5)}
          {dot("48%", "44%", C.red, 1.5)}
        </>
      );
    case "clouds":
      return (
        <>
          {/* dreamy lavender → blue → pink gradient */}
          <span className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${C.glow}26, ${C.neon}16 60%, ${C.red}12)` }} />
          {/* moon */}
          <span className="absolute right-2 top-1 h-2.5 w-2.5 rounded-full" style={{ background: C.softText, boxShadow: `0 0 6px ${C.glow}` }} />
          {/* tiny stars */}
          {dot("26%", "22%", C.mainText, 1.5)}
          {dot("54%", "16%", C.mainText, 1)}
          {/* layered clouds */}
          <span className="absolute bottom-0 left-1 h-3 w-10 rounded-full blur-[2px]" style={{ background: C.glow, opacity: 0.55 }} />
          <span className="absolute bottom-1 right-1 h-3 w-9 rounded-full blur-[2px]" style={{ background: C.red, opacity: 0.4 }} />
          <span className="absolute bottom-0 left-1/2 h-3.5 w-12 -translate-x-1/2 rounded-full blur-[2px]" style={{ background: C.neon, opacity: 0.45 }} />
        </>
      );
    case "craters":
      return (
        <>
          {/* silver glow */}
          <span className="absolute inset-0" style={{ background: `radial-gradient(90% 100% at 50% 0%, ${C.glow}1A, transparent 70%)` }} />
          {/* stars */}
          {dot("20%", "20%", C.glow, 1.5)}
          {dot("44%", "14%", C.glow, 1)}
          {/* distant planet */}
          <span className="absolute right-1.5 top-1 h-2.5 w-2.5 rounded-full" style={{ background: `radial-gradient(circle at 36% 32%, ${C.glow}, ${MOON_EARTH})`, boxShadow: `0 0 5px ${MOON_EARTH}66` }} />
          {/* moon horizon curve */}
          <span className="absolute left-1/2 top-7 h-10 w-[170%] -translate-x-1/2 rounded-[50%]" style={{ background: `linear-gradient(180deg, ${C.card}, ${C.bgDeep})`, boxShadow: `inset 0 1px 0 ${C.glow}33` }} />
          {/* craters */}
          <span className="absolute left-[30%] top-[62%] h-2 w-3.5 rounded-[50%]" style={{ border: `1px solid ${C.mutedText}66` }} />
          <span className="absolute right-[32%] top-[70%] h-1.5 w-2.5 rounded-[50%]" style={{ border: `1px solid ${C.mutedText}66` }} />
          {/* moon rock + antenna */}
          <span className="absolute bottom-0 left-1.5 h-1.5 w-2.5" style={{ background: sil, borderRadius: "60% 60% 0 0" }} />
          <span className="absolute bottom-1 right-2 h-3 w-px" style={{ background: C.mutedText }} />
          <span className="absolute bottom-[10px] right-1 h-1.5 w-2 rounded-[50%]" style={{ border: `1px solid ${C.glow}66`, transform: "rotate(-30deg)" }} />
        </>
      );
    default:
      return null;
  }
}

/** Tiny static ambience preview used by the Settings world cards. */
export function WorldMiniScene({ world, palette }: { world: WorldTheme; palette: BloopyThemeColors }) {
  return (
    <span className="relative block h-12 w-full overflow-hidden rounded-xl" style={{ background: `radial-gradient(120% 130% at 50% 0%, ${palette.cardAlt}, ${palette.bgDeep})` }}>
      {world.particle === "none" ? (
        <span className="absolute inset-0 grid place-items-center">
          <span className="flex gap-1.5">
            {[palette.neon, palette.glow, palette.red].map((col, i) => (
              <span key={i} className="h-3 w-3 rounded-full" style={{ background: col, boxShadow: i === 0 ? `0 0 6px ${col}` : "none" }} />
            ))}
          </span>
        </span>
      ) : (
        <MiniScene particle={world.particle} C={palette} />
      )}
      <span aria-hidden="true" className="absolute right-1.5 top-1 text-[13px] leading-none">
        {world.icon}
      </span>
    </span>
  );
}

/**
 * A tiny, themed corner ornament for cards — a small world-specific mark so the
 * world's character carries onto the boxes too (subtle, pointer-events-none).
 */
export function WorldCardAccent({ className = "" }: { className?: string }) {
  const world = useBloopyWorld();
  const C = useBloopyThemeColors();
  if (world.particle === "none") return null;

  let mark: React.ReactNode;
  switch (world.particle) {
    case "waves": // Beach Paradise — starfish over a soft wave divider stroke
      mark = (
        <span className="flex flex-col items-end gap-1">
          <span className="block h-2.5 w-2.5" style={{ background: C.glow, clipPath: STARFISH_CLIP, boxShadow: `0 0 5px ${C.neon}` }} />
          <span className="block h-1 w-5 rounded-[50%]" style={{ borderTop: `1px solid ${C.glow}66` }} />
        </span>
      );
      break;
    case "bubbles": // Underwater World — a tiny rising bubble cluster
      mark = (
        <span className="relative block h-4 w-4">
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full" style={{ border: `1.5px solid ${C.glow}` }} />
          <span className="absolute left-0 top-1.5 h-1.5 w-1.5 rounded-full" style={{ border: `1px solid ${C.glow}99` }} />
          <span className="absolute bottom-0 right-1.5 h-1 w-1 rounded-full" style={{ background: `${C.glow}AA` }} />
        </span>
      );
      break;
    case "sand": // Desert Oasis — tiny cactus + oasis dot over a soft dune divider
      mark = (
        <span className="flex flex-col items-end gap-1">
          <span className="relative block h-3 w-4">
            {/* saguaro */}
            <span className="absolute bottom-0 left-1/2 h-3 w-[2px] -translate-x-1/2 rounded-full" style={{ background: C.glow }} />
            <span className="absolute bottom-1 left-1/2 h-[2px] w-[5px] -translate-x-[6px] rounded-full" style={{ background: C.glow }} />
            <span className="absolute bottom-1 left-1/2 h-[5px] w-[2px] -translate-x-[6px] rounded-full" style={{ background: C.glow }} />
            <span className="absolute bottom-[6px] left-1/2 h-[2px] w-[5px] translate-x-[1px] rounded-full" style={{ background: C.glow }} />
            <span className="absolute bottom-[6px] left-1/2 h-[6px] w-[2px] translate-x-[4px] rounded-full" style={{ background: C.glow }} />
            {/* oasis teal dot */}
            <span className="absolute bottom-0 right-0 h-1 w-1 rounded-full" style={{ background: OASIS_TEAL, boxShadow: `0 0 4px ${OASIS_TEAL}` }} />
          </span>
          <span className="block h-1 w-5 rounded-[50%]" style={{ borderTop: `1px solid ${C.glow}66` }} />
        </span>
      );
      break;
    case "stars": // Space Station — a 4-point star riding a tilted orbit ring
      mark = (
        <span className="relative block h-4 w-4">
          {/* orbit ring */}
          <span className="absolute inset-0 rounded-full" style={{ border: `1px solid ${C.glow}55`, transform: "rotate(-20deg) scaleY(0.62)" }} />
          {/* 4-point star sitting on the ring's edge */}
          <span className="absolute right-[-2px] top-1/2 block h-3 w-3 -translate-y-1/2">
            <span className="absolute left-1/2 top-1/2 h-3 w-[1.5px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(180deg, transparent, ${C.glow}, transparent)` }} />
            <span className="absolute left-1/2 top-1/2 h-[1.5px] w-3 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}, transparent)` }} />
            <span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: C.mainText, boxShadow: `0 0 5px ${C.neon}` }} />
          </span>
        </span>
      );
      break;
    case "fireflies": // Forest Garden — a tiny leaf with a warm firefly dot
      mark = (
        <span className="relative block h-4 w-5">
          <span className="absolute right-0 top-0 block h-3 w-3" style={{ background: C.glow, borderRadius: "0 100% 0 100%" }} />
          <span className="absolute right-[3px] top-[5px] h-px w-2 rotate-45" style={{ background: C.card }} />
          <span className="absolute bottom-0 left-0 h-1 w-1 rounded-full" style={{ background: C.red, boxShadow: `0 0 4px ${C.red}` }} />
        </span>
      );
      break;
    case "craters": // Moon Base — a tiny crater ring + dust speck
      mark = (
        <span className="relative block h-3.5 w-3.5">
          <span className="absolute inset-0 rounded-full" style={{ border: `1px solid ${C.glow}77`, boxShadow: `inset 0 1px 2px ${C.bgDeep}` }} />
          <span className="absolute bottom-0 right-0 h-1 w-1 rounded-full" style={{ background: C.softText, opacity: 0.8 }} />
        </span>
      );
      break;
    case "snow": // Snowy Cabin — a tiny snowflake
      mark = <Snowflake C={C} size={13} />;
      break;
    case "clouds": // Cloud Sky — a tiny cloud with a star
      mark = (
        <span className="relative block h-3 w-5">
          <span className="absolute bottom-0 left-0 h-2 w-5 rounded-full" style={{ background: C.glow, opacity: 0.9 }} />
          <span className="absolute bottom-1 left-1 h-2 w-2 rounded-full" style={{ background: C.glow, opacity: 0.9 }} />
          <span className="absolute bottom-[5px] left-2.5 h-2.5 w-2.5 rounded-full" style={{ background: C.glow, opacity: 0.9 }} />
          <span className="absolute right-0 top-0 h-1 w-1 rounded-full" style={{ background: C.mainText, boxShadow: `0 0 4px ${C.glow}` }} />
        </span>
      );
      break;
    case "grid": // Cyber City — neon corner bracket + a pink pixel
      mark = (
        <span className="relative block h-3.5 w-3.5">
          <span className="absolute right-0 top-0 h-3 w-3 border-r border-t" style={{ borderColor: C.glow, boxShadow: `0 0 5px ${C.neon}66` }} />
          <span className="absolute bottom-0 left-0 h-1 w-1" style={{ background: C.red, boxShadow: `0 0 4px ${C.red}` }} />
        </span>
      );
      break;
    case "embers": // Volcano Lab — an ember over a tiny lava-crack divider
      mark = (
        <span className="flex flex-col items-end gap-1">
          <span className="block h-1.5 w-1.5 rounded-full" style={{ background: C.red, boxShadow: `0 0 5px ${C.red}` }} />
          <span className="block h-px w-4" style={{ background: `linear-gradient(90deg, transparent, ${C.glow})`, boxShadow: `0 0 3px ${C.red}` }} />
        </span>
      );
      break;
    default:
      return null;
  }

  return (
    <span aria-hidden="true" className={`pointer-events-none absolute opacity-60 ${className}`}>
      {mark}
    </span>
  );
}

/** Compact, static variation overlay for the Appearance live-preview tile. */
export function VariationOverlayMini({ overlay, C }: { overlay: VariationOverlayId; C: BloopyThemeColors }) {
  switch (overlay) {
    case "tech":
      return (
        <>
          <span className="absolute left-2 top-2 h-3 w-3 border-l border-t" style={{ borderColor: `${C.glow}AA` }} />
          <span className="absolute right-2 top-2 h-3 w-3 border-r border-t" style={{ borderColor: `${C.glow}AA` }} />
          <span className="absolute inset-x-0 top-1/3 h-px" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}, transparent)`, boxShadow: `0 0 6px ${C.neon}` }} />
          <span className="absolute left-[18%] top-[60%] h-1.5 w-1.5 rounded-full" style={{ background: C.glow, boxShadow: `0 0 5px ${C.neon}` }} />
        </>
      );
    case "protective":
      return <span className="absolute inset-0" style={{ background: `radial-gradient(120% 90% at 50% 30%, transparent 35%, ${C.bgDeep}CC 100%)` }} />;
    case "cozy":
      return <span className="absolute inset-x-0 bottom-0 h-2/3" style={{ background: `radial-gradient(80% 90% at 50% 120%, ${C.red}33, transparent 70%)` }} />;
    case "minimal":
      return <span className="absolute left-1/2 top-1/2 h-px w-12 -translate-x-1/2" style={{ background: `linear-gradient(90deg, transparent, ${C.glow}88, transparent)` }} />;
    default:
      return null;
  }
}
