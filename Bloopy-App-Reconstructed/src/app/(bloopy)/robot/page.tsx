"use client";

import { useEffect, useMemo, useState } from "react";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import { useRobot } from "@/components/RobotProvider";
import { useSafeBloopyBack } from "@/lib/useSafeBloopyBack";
import BloopyCameraStudio from "@/components/BloopyCameraStudio";
import {
  naturalDistance,
  naturalLight,
  naturalMotion,
  naturalSound,
  naturalTilt,
  robotNaturalSummary,
  robotStateLabel,
  sensorTelemetryFresh,
  telemetryAgeLabel,
  type RobotModuleStatus,
} from "@/lib/robotConnection";

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function EyeIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M2.8 12s3.4-5 9.2-5 9.2 5 9.2 5-3.4 5-9.2 5-9.2-5-9.2-5Z" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2.2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function MoonIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M19 15.2A7.5 7.5 0 0 1 8.8 5a7.7 7.7 0 1 0 10.2 10.2Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
    </svg>
  );
}

function SunIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function SpeakerIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 10v4h4l4 3V7l-4 3H4Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M16 9.2a4 4 0 0 1 0 5.6M18.5 7a7 7 0 0 1 0 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CameraIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="7" width="18" height="13" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 7 1.2-2.4h4.6L15.5 7" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <circle cx="12" cy="13.5" r="3.4" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ChipIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="7" y="7" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BloopyAvatar({ className = "" }: { className?: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`}>
      <span aria-hidden="true" className="pointer-events-none absolute h-[82%] w-[82%] rounded-full blur-md" style={{ background: COLORS.neon, opacity: 0.3 }} />
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-full" style={{ border: `1.5px solid ${COLORS.glow}66`, boxShadow: `0 0 14px ${COLORS.neon}66` }} />
      <img src={LOGO_SRC} alt="Bloopy" className="relative h-[78%] w-[78%] object-contain drop-shadow-[0_4px_14px_rgba(30,144,255,0.45)]" />
    </div>
  );
}

function readingValue(value: number | null, suffix = "") {
  return value == null ? "—" : `${Number.isInteger(value) ? value : value.toFixed(1)}${suffix}`;
}

export default function RobotPage() {
  const COLORS = useBloopyThemeColors();
  const handleBack = useSafeBloopyBack("/app");
  const { status, connected, loading, error, actionBusy, refresh, act } = useRobot();
  const [note, setNote] = useState<string | null>(null);
  const [volume, setVolume] = useState(25);

  useEffect(() => {
    if (status) setVolume(status.audio.volumePercent);
  }, [status]);

  const stateLabel = robotStateLabel(status);
  const summary = robotNaturalSummary(status);
  const sensorsFresh = sensorTelemetryFresh(status);
  const telemetryLabel = telemetryAgeLabel(status?.sensors.telemetryAgeSeconds ?? null);
  const sleeping = Boolean(status?.robot.manualSleep || status?.robot.brainState.toUpperCase() === "SLEEPING");

  const moduleRows = useMemo(() => {
    if (!status) return [] as { label: string; status: RobotModuleStatus; icon: React.ReactNode }[];
    return [
      { label: "Camera", status: status.modules.camera, icon: <CameraIcon className="h-5 w-5" /> },
      { label: "ESP32 + sensors", status: status.modules.esp32, icon: <ChipIcon className="h-5 w-5" /> },
      { label: "Microphone", status: status.modules.microphone, icon: <SpeakerIcon className="h-5 w-5" /> },
      { label: "Speaker", status: status.modules.speaker, icon: <SpeakerIcon className="h-5 w-5" /> },
      { label: "Cooling fan", status: status.modules.fan, icon: <SunIcon className="h-5 w-5" /> },
      { label: "Movement", status: status.modules.movement, icon: <EyeIcon className="h-5 w-5" /> },
      { label: "Battery", status: status.modules.battery, icon: <ChipIcon className="h-5 w-5" /> },
    ];
  }, [status]);

  async function runAction(action: "sleep" | "wake" | "look_at_me") {
    setNote(null);
    try {
      const result = await act(action);
      setNote(result.message);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Bloopy couldn't do that right now.");
    }
  }

  async function commitVolume(next: number) {
    setVolume(next);
    setNote(null);
    try {
      const result = await act("set_volume", { volume: next / 100 });
      setNote(result.message);
    } catch (err) {
      setNote(err instanceof Error ? err.message : "I couldn't change the speaker volume.");
    }
  }

  return (
    <main
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
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

      <header className="relative z-10 px-5 pt-6">
        <div className="flex items-center justify-between">
          <button type="button" onClick={handleBack} className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: COLORS.softText }}>
            <ChevronIcon className="h-4 w-4" /> Back
          </button>

          <div className="flex items-center gap-2 rounded-full border px-3 py-1" style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC` }}>
            <span className="h-2 w-2 rounded-full" style={{ background: connected ? COLORS.glow : COLORS.mutedText, boxShadow: connected ? `0 0 6px ${COLORS.neon}` : "none" }} />
            <p className="text-[10px] font-medium uppercase tracking-[0.18em]" style={{ color: COLORS.softText }}>
              {loading ? "Connecting" : connected ? "Body linked" : "Body offline"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Physical Bloopy
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            The live Raspberry Pi body, sensors, camera, voice, and safe controls.
          </p>
        </div>
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        <section
          className="rounded-3xl border p-5"
          style={{ background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`, borderColor: connected ? `${COLORS.neon}55` : COLORS.cardBorder, boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99` }}
        >
          <div className="flex items-center gap-3">
            <BloopyAvatar className="h-14 w-14" />
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>Current body state</p>
              <p className="mt-0.5 text-lg font-semibold" style={{ color: connected ? COLORS.mainText : COLORS.mutedText }}>{stateLabel}</p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: COLORS.softText }}>{loading ? "Checking my physical brain…" : summary}</p>
            </div>
          </div>

          {!connected && !loading && (
            <div className="mt-4 rounded-2xl border px-4 py-3 text-sm leading-relaxed" style={{ borderColor: `${COLORS.red}33`, background: `${COLORS.red}12`, color: COLORS.softText }}>
              {error || "The local robot bridge is not reachable. Bloopy's voice brain can still run independently."}
              <button type="button" onClick={() => void refresh()} className="ml-1 font-bold underline underline-offset-4">Retry</button>
            </div>
          )}

          {connected && (
            <div className="mt-4 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => void runAction(sleeping ? "wake" : "sleep")}
                disabled={actionBusy !== null}
                className="rounded-2xl border px-2 py-3 text-xs font-bold transition active:scale-95 disabled:opacity-50"
                style={{ borderColor: `${COLORS.neon}44`, background: `${COLORS.bgDeep}88`, color: COLORS.mainText }}
              >
                <span className="mx-auto mb-1 grid h-7 w-7 place-items-center" style={{ color: COLORS.glow }}>
                  {sleeping ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
                </span>
                {sleeping ? "Wake" : "Sleep"}
              </button>

              <button
                type="button"
                onClick={() => void runAction("look_at_me")}
                disabled={actionBusy !== null}
                className="rounded-2xl border px-2 py-3 text-xs font-bold transition active:scale-95 disabled:opacity-50"
                style={{ borderColor: `${COLORS.neon}44`, background: `${COLORS.bgDeep}88`, color: COLORS.mainText }}
              >
                <span className="mx-auto mb-1 grid h-7 w-7 place-items-center" style={{ color: COLORS.glow }}><EyeIcon className="h-5 w-5" /></span>
                Look at me
              </button>

              <button
                type="button"
                onClick={() => void refresh()}
                className="rounded-2xl border px-2 py-3 text-xs font-bold transition active:scale-95"
                style={{ borderColor: `${COLORS.neon}44`, background: `${COLORS.bgDeep}88`, color: COLORS.mainText }}
              >
                <span className="mx-auto mb-1 grid h-7 w-7 place-items-center" style={{ color: COLORS.glow }}><ChipIcon className="h-5 w-5" /></span>
                Refresh
              </button>
            </div>
          )}

          {note && <p className="mt-3 text-xs leading-relaxed" style={{ color: COLORS.softText }}>{note}</p>}
        </section>

        {status && (
          <>
            <div className="mt-5 mb-2 flex items-end justify-between gap-3 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>What I sense</h2>
              <p className="text-[10px] font-semibold" style={{ color: sensorsFresh ? COLORS.softText : COLORS.mutedText }}>
                {telemetryLabel}
              </p>
            </div>
            <section className="grid grid-cols-2 gap-3">
              {[
                { label: "Light", natural: sensorsFresh ? naturalLight(status.sensors.lux) : "sensor link waiting", raw: sensorsFresh ? readingValue(status.sensors.lux, " lux") : "—" },
                { label: "In front", natural: sensorsFresh ? naturalDistance(status.sensors.distanceMm) : "sensor link waiting", raw: sensorsFresh ? readingValue(status.sensors.distanceMm, " mm") : "—" },
                { label: "Orientation", natural: sensorsFresh ? naturalTilt(status.sensors.tiltDeg) : "sensor link waiting", raw: sensorsFresh ? readingValue(status.sensors.tiltDeg, "°") : "—" },
                { label: "Local vision", natural: status.vision.visible ? `I see a ${status.vision.targetType?.toLowerCase() || "person"}` : "no target right now", raw: status.vision.zone || "—" },
                { label: "Motion", natural: sensorsFresh ? naturalMotion(status.sensors.motion) : "sensor link waiting", raw: sensorsFresh ? readingValue(status.sensors.motion) : "—" },
                { label: "Sound", natural: sensorsFresh ? naturalSound(status.sensors.sound) : "sensor link waiting", raw: sensorsFresh ? readingValue(status.sensors.sound) : "—" },
              ].map((item) => (
                <div key={item.label} className="rounded-3xl border p-4" style={{ background: `linear-gradient(160deg, ${COLORS.cardAlt}, ${COLORS.card})`, borderColor: COLORS.cardBorder }}>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.16em]" style={{ color: COLORS.mutedText }}>{item.label}</p>
                  <p className="mt-1 text-sm font-semibold leading-snug" style={{ color: COLORS.mainText }}>{item.natural}</p>
                  <p className="mt-1 text-[11px]" style={{ color: COLORS.softText }}>{item.raw}</p>
                </div>
              ))}
            </section>

            <BloopyCameraStudio />

            <section className="mt-4 rounded-3xl border p-5" style={{ background: `linear-gradient(160deg, ${COLORS.cardAlt}, ${COLORS.card})`, borderColor: COLORS.cardBorder }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>Voice volume</p>
                  <p className="mt-0.5 text-xs" style={{ color: COLORS.mutedText }}>MAX98357A speaker · {volume}%</p>
                </div>
                <SpeakerIcon className="h-6 w-6" />
              </div>
              <input
                aria-label="Bloopy speaker volume"
                className="mt-4 w-full accent-[#1E90FF]"
                type="range"
                min={0}
                max={35}
                step={1}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                onPointerUp={(e) => void commitVolume(Number((e.target as HTMLInputElement).value))}
                onKeyUp={(e) => {
                  if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) void commitVolume(Number((e.target as HTMLInputElement).value));
                }}
              />
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>
                25% is the current comfortable reference. The amplifier is powerful, so this control intentionally tops out at 35%.
              </p>
            </section>

            <div className="mt-5 mb-2 px-1">
              <h2 className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>Body modules</h2>
            </div>
            <section className="overflow-hidden rounded-3xl border" style={{ background: `linear-gradient(160deg, ${COLORS.cardAlt}, ${COLORS.card})`, borderColor: COLORS.cardBorder }}>
              {moduleRows.map((row, index) => {
                const active = ["ready", "busy", "sleeping", "always-on"].includes(row.status.state);
                return (
                  <div key={row.label} className={`flex items-center gap-3 px-4 py-3.5 ${index ? "border-t" : ""}`} style={{ borderColor: COLORS.cardBorder }}>
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border" style={{ borderColor: active ? `${COLORS.neon}44` : COLORS.cardBorder, background: COLORS.bgDeep, color: active ? COLORS.glow : COLORS.mutedText }}>{row.icon}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>{row.label}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>{row.status.detail}</p>
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: active ? COLORS.glow : COLORS.mutedText, boxShadow: active ? `0 0 6px ${COLORS.neon}` : "none" }} />
                  </div>
                );
              })}
            </section>

            <section className="mt-4 rounded-3xl border p-5" style={{ background: `${COLORS.card}D9`, borderColor: COLORS.cardBorder }}>
              <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>Recent conversation</p>
              <p className="mt-3 text-xs" style={{ color: COLORS.softText }}>Last heard</p>
              <p className="mt-0.5 text-sm leading-relaxed" style={{ color: COLORS.mainText }}>{status.conversation.lastHeard || "Nothing yet this boot."}</p>
              <p className="mt-3 text-xs" style={{ color: COLORS.softText }}>Last spoken</p>
              <p className="mt-0.5 text-sm leading-relaxed" style={{ color: COLORS.mainText }}>{status.conversation.lastSpoken || "Nothing yet this boot."}</p>
            </section>

            <p className="mt-4 px-2 text-center text-[11px] leading-relaxed" style={{ color: COLORS.mutedText }}>
              Live data stays on the Pi unless it is needed to answer something you ask Bloopy. The cooling fan is wired directly to Pi power, so it turns on with the Pi and is not software-controlled. Drive motors and battery telemetry are not installed in this body yet.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
