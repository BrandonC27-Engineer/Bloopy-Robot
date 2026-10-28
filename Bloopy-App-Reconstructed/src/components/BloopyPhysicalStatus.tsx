"use client";

import Link from "next/link";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import { useRobot } from "@/components/RobotProvider";
import {
  naturalDistance,
  naturalLight,
  naturalTilt,
  robotNaturalSummary,
  robotStateLabel,
  sensorTelemetryFresh,
} from "@/lib/robotConnection";

function RobotIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="5" y="8" width="14" height="10" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 8V4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="12" cy="3.8" r="0.9" fill="currentColor" />
      <circle cx="9.5" cy="12.5" r="1" fill="currentColor" />
      <circle cx="14.5" cy="12.5" r="1" fill="currentColor" />
      <path d="M10 15.5h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function BloopyPhysicalStatus() {
  const COLORS = useBloopyThemeColors();
  const { status, connected, loading } = useRobot();
  const state = robotStateLabel(status);
  const sensorsFresh = sensorTelemetryFresh(status);

  return (
    <section className="mt-4" aria-label="Physical Bloopy body">
      <Link
        href="/robot"
        className="group relative block overflow-hidden rounded-3xl border p-4 transition-all duration-300 hover:-translate-y-0.5 active:scale-[0.985]"
        style={{
          background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
          borderColor: connected ? `${COLORS.neon}55` : COLORS.cardBorder,
          boxShadow: connected
            ? `0 0 0 1px ${COLORS.neon}16, 0 0 22px ${COLORS.neon}1F, 0 8px 24px #00040A88`
            : `0 0 0 1px ${COLORS.neon}0D, 0 8px 24px #00040A88`,
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border"
            style={{
              color: connected ? COLORS.glow : COLORS.mutedText,
              borderColor: connected ? `${COLORS.neon}55` : COLORS.cardBorder,
              background: COLORS.bgDeep,
              boxShadow: connected ? `0 0 16px ${COLORS.neon}2D` : "none",
            }}
          >
            <RobotIcon className="h-6 w-6" />
          </span>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
                  Physical Bloopy
                </p>
                <h3 className="mt-0.5 text-base font-semibold" style={{ color: COLORS.mainText }}>
                  {loading ? "Connecting…" : state}
                </h3>
              </div>
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: connected ? COLORS.glow : COLORS.mutedText,
                  boxShadow: connected ? `0 0 8px ${COLORS.neon}` : "none",
                }}
              />
            </div>

            <p className="mt-1 text-xs leading-relaxed" style={{ color: COLORS.softText }}>
              {loading ? "Checking the Raspberry Pi brain…" : robotNaturalSummary(status)}
            </p>
          </div>
        </div>

        {status && (
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { label: "Light", value: sensorsFresh ? naturalLight(status.sensors.lux) : "waiting" },
              { label: "Ahead", value: sensorsFresh ? naturalDistance(status.sensors.distanceMm) : "waiting" },
              { label: "Body", value: sensorsFresh ? naturalTilt(status.sensors.tiltDeg) : "waiting" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border px-2.5 py-2"
                style={{ borderColor: `${COLORS.neon}22`, background: `${COLORS.bgDeep}70` }}
              >
                <p className="text-[9px] font-semibold uppercase tracking-[0.15em]" style={{ color: COLORS.mutedText }}>
                  {item.label}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold leading-tight" style={{ color: COLORS.mainText }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: COLORS.softText }}>
          Tap for live sensors &amp; body controls →
        </p>
      </Link>
    </section>
  );
}
