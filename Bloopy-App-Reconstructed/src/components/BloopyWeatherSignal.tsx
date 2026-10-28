"use client";

import { useEffect, useState } from "react";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import {
  WEATHER_CHANGE_EVENT,
  clearWeather,
  fetchCityWeather,
  fetchCoordsWeather,
  getBrowserPosition,
  loadWeatherPrefs,
  loadWeatherSnapshot,
  refreshWeatherIfStale,
  saveBrowserWeather,
  saveCityWeather,
  type WeatherPrefs,
  type WeatherSnapshot,
} from "@/lib/bloopyWeather";

/**
 * Outside Signal — a tiny, optional weather chip near Bloopy on the Home hero.
 *
 * Smaller than the Status / Today panels. Tapping it opens a self-contained
 * setup sheet (enter a city, use location once, or turn it off). All state is
 * read from localStorage after mount (hydration-safe) and styled from the
 * active Bloopy theme.
 */

const DEFAULT_PREFS: WeatherPrefs = { enabled: false, mode: "off", cityName: null };

function CloseIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

function PinIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 21s7-5.7 7-11a7 7 0 1 0-14 0c0 5.3 7 11 7 11Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <circle cx="12" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.7" />
    </svg>
  );
}

export default function BloopyWeatherSignal() {
  const COLORS = useBloopyThemeColors();

  const [mounted, setMounted] = useState(false);
  const [prefs, setPrefs] = useState<WeatherPrefs>(DEFAULT_PREFS);
  const [snapshot, setSnapshot] = useState<WeatherSnapshot | null>(null);

  const [open, setOpen] = useState(false);
  const [cityInput, setCityInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => {
      setPrefs(loadWeatherPrefs());
      setSnapshot(loadWeatherSnapshot());
    };
    /* eslint-disable react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount */
    setMounted(true);
    sync();
    /* eslint-enable react-hooks/set-state-in-effect */

    let cancelled = false;
    refreshWeatherIfStale()
      .then((fresh) => {
        if (!cancelled && fresh) setSnapshot(fresh);
      })
      .catch(() => {});

    window.addEventListener(WEATHER_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      cancelled = true;
      window.removeEventListener(WEATHER_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const enabled = mounted && prefs.enabled && prefs.mode !== "off";
  const hasData = enabled && snapshot !== null;

  // chip lines
  const line2 = !mounted ? "…" : hasData ? `${snapshot!.temperature}° · ${snapshot!.condition}` : "Not set";
  const line3 = !mounted ? "" : hasData ? snapshot!.summary : "Add city";

  async function handleSaveCity() {
    const name = cityInput.trim();
    if (!name) return;
    setBusy(true);
    setError(null);
    const result = await fetchCityWeather(name);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    saveCityWeather(result.displayName, result.latitude, result.longitude, result.snapshot);
    setSnapshot(result.snapshot);
    setPrefs(loadWeatherPrefs());
    setOpen(false);
  }

  async function handleUseLocation() {
    setBusy(true);
    setError(null);
    try {
      const pos = await getBrowserPosition();
      const result = await fetchCoordsWeather(pos.latitude, pos.longitude);
      if (!result.ok) {
        setError(result.error);
        setBusy(false);
        return;
      }
      saveBrowserWeather(result.snapshot);
      setSnapshot(result.snapshot);
      setPrefs(loadWeatherPrefs());
      setBusy(false);
      setOpen(false);
    } catch {
      setBusy(false);
      setError("Couldn't get your location. You can enter a city instead.");
    }
  }

  function handleTurnOff() {
    clearWeather();
    setSnapshot(null);
    setPrefs(loadWeatherPrefs());
    setCityInput("");
    setError(null);
    setOpen(false);
  }

  function openSheet() {
    setError(null);
    setOpen(true);
  }

  return (
    <>
      {/* ----- the tiny chip (lower-left of the hero) ----- */}
      <button
        type="button"
        onClick={openSheet}
        aria-label={hasData ? `Outside Signal: ${line2}, ${line3}. Edit.` : "Outside Signal: not set. Add a city."}
        className="group absolute bottom-1 left-0 z-20 w-[4rem] rounded-lg p-1.5 text-left transition-all duration-200 hover:-translate-y-0.5 active:scale-95 sm:w-[4.25rem]"
        style={{
          border: `1px solid ${COLORS.glow}33`,
          background: `${COLORS.bgDeep}D9`,
          boxShadow: `0 0 12px ${COLORS.neon}1E`,
        }}
      >
        <div className="flex items-center gap-1">
          <span
            className="h-1 w-1 shrink-0 rounded-full"
            style={{ background: hasData ? COLORS.glow : COLORS.mutedText, boxShadow: hasData ? `0 0 5px ${COLORS.neon}` : "none" }}
          />
          <span className="text-[8px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
            Outside
          </span>
        </div>
        <p className="mt-0.5 truncate text-[10px] font-semibold leading-tight" style={{ color: COLORS.mainText }}>
          {line2}
        </p>
        <p className="truncate text-[8px] leading-tight" style={{ color: COLORS.softText }}>
          {line3}
        </p>
      </button>

      {/* ----- setup sheet ----- */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Outside Signal setup">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default"
            style={{ background: `${COLORS.bgDeep}CC`, backdropFilter: "blur(2px)" }}
          />

          <div
            className="relative z-10 m-3 w-full max-w-sm rounded-3xl border p-5"
            style={{
              background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
              borderColor: COLORS.cardBorder,
              boxShadow: `0 0 0 1px ${COLORS.neon}14, 0 0 26px ${COLORS.neon}22, 0 16px 40px ${COLORS.bgDeep}cc`,
            }}
          >
            {/* header */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border"
                  style={{ color: COLORS.glow, borderColor: `${COLORS.neon}55`, background: COLORS.bgDeep, boxShadow: `0 0 14px ${COLORS.neon}26` }}
                >
                  <PinIcon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                    Outside Signal
                  </p>
                  <h2 className="text-base font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                    {enabled ? "Update your weather" : "Add weather context"}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full transition-colors"
                style={{ color: COLORS.mutedText, background: `${COLORS.bgDeep}80` }}
              >
                <CloseIcon className="h-3.5 w-3.5" />
              </button>
            </div>

            <p className="mt-3 text-xs leading-relaxed" style={{ color: COLORS.softText }}>
              Weather is optional. You can use a city instead of precise location.
            </p>

            {/* current reading (when set) */}
            {hasData && (
              <div
                className="mt-4 flex items-center justify-between rounded-2xl border px-3.5 py-2.5"
                style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.bgDeep}80` }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold" style={{ color: COLORS.mainText }}>
                    {snapshot!.temperature}° · {snapshot!.condition}
                  </p>
                  <p className="truncate text-[11px]" style={{ color: COLORS.mutedText }}>
                    {prefs.cityName ?? "Saved location"} · {snapshot!.summary}
                  </p>
                </div>
              </div>
            )}

            {/* city entry */}
            <div className="mt-4">
              <label className="text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ color: COLORS.mutedText }}>
                Enter a city
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={cityInput}
                  onChange={(e) => setCityInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSaveCity();
                  }}
                  placeholder="e.g. Austin, Tokyo, Berlin…"
                  aria-label="City name"
                  maxLength={80}
                  autoComplete="off"
                  disabled={busy}
                  className="min-w-0 flex-1 rounded-2xl border px-3 py-2.5 text-sm outline-none transition-colors placeholder:opacity-60 disabled:opacity-50"
                  style={{ background: `${COLORS.bgDeep}80`, borderColor: COLORS.cardBorder, color: COLORS.mainText }}
                />
                <button
                  type="button"
                  onClick={handleSaveCity}
                  disabled={busy || !cityInput.trim()}
                  className="shrink-0 rounded-2xl px-4 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 disabled:opacity-40"
                  style={{ background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`, color: COLORS.mainText, boxShadow: `0 0 16px ${COLORS.neon}66` }}
                >
                  {busy ? "…" : "Save"}
                </button>
              </div>
            </div>

            {/* divider */}
            <div className="my-4 flex items-center gap-3">
              <span className="h-px flex-1" style={{ background: `${COLORS.neon}22` }} />
              <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: COLORS.mutedText }}>
                or
              </span>
              <span className="h-px flex-1" style={{ background: `${COLORS.neon}22` }} />
            </div>

            {/* use my location */}
            <button
              type="button"
              onClick={handleUseLocation}
              disabled={busy}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border py-2.5 text-sm font-semibold transition-all duration-200 active:scale-[0.98] disabled:opacity-50"
              style={{ borderColor: `${COLORS.neon}44`, background: `${COLORS.neon}14`, color: COLORS.softText }}
            >
              <PinIcon className="h-4 w-4" />
              Use my location
            </button>

            {error && (
              <p className="mt-3 text-xs leading-relaxed" style={{ color: COLORS.red }}>
                {error}
              </p>
            )}

            {/* turn off / skip */}
            <div className="mt-4 flex items-center justify-between">
              {enabled ? (
                <button
                  type="button"
                  onClick={handleTurnOff}
                  className="text-xs font-semibold transition-colors active:scale-95"
                  style={{ color: COLORS.red }}
                >
                  Turn off weather
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-xs font-semibold transition-colors active:scale-95"
                  style={{ color: COLORS.mutedText }}
                >
                  Skip for now
                </button>
              )}
              <span className="text-[10px]" style={{ color: COLORS.mutedText }}>
                Weather data by Open-Meteo
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
