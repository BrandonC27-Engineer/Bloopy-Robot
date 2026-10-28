/**
 * Bloopy "Outside Signal" — optional, privacy-friendly weather context.
 *
 * A small, opt-in layer that lets Bloopy feel aware of the user's environment.
 * It is OFF by default and only does anything once the user explicitly sets a
 * city or grants location once. Weather data comes from Open-Meteo's free,
 * key-less APIs (geocoding + forecast); see https://open-meteo.com/.
 *
 * Privacy posture:
 *   • City mode stores only the city display name and that city's public
 *     centre coordinates (used to refetch without re-geocoding). These are not
 *     the user's GPS position.
 *   • Browser-location mode never persists the precise GPS coordinates. The
 *     coordinates are used transiently for a single fetch; only a "Current
 *     location" label and the resulting weather summary are cached.
 *   • Everything lives in localStorage; nothing is sent to Supabase/Anthropic
 *     and no cookies are used.
 */

import type { ProactiveMessage } from "@/lib/bloopyPresence";

export const WEATHER_KEYS = {
  enabled: "bloopy.weather.enabled",
  cityName: "bloopy.weather.cityName",
  latitude: "bloopy.weather.latitude",
  longitude: "bloopy.weather.longitude",
  lastFetchAt: "bloopy.weather.lastFetchAt",
  lastSummary: "bloopy.weather.lastSummary",
  lastTemperature: "bloopy.weather.lastTemperature",
  lastCondition: "bloopy.weather.lastCondition",
  permissionMode: "bloopy.weather.permissionMode",
} as const;

/** Dispatched on `window` whenever weather prefs/cache change, so the chip updates live. */
export const WEATHER_CHANGE_EVENT = "bloopy:weather-change";

/** How long a cached reading stays "fresh" before a background refetch is attempted. */
export const WEATHER_CACHE_MS = 45 * 60_000; // 45 minutes

/** Weather nudges may use a reading no older than this (keeps gentle nudges relevant). */
const NUDGE_MAX_AGE_MS = 6 * 60 * 60_000; // 6 hours

export type WeatherMode = "city" | "browser" | "off";

export type WeatherPrefs = {
  enabled: boolean;
  mode: WeatherMode;
  /** Display label only — a city name or "Current location". */
  cityName: string | null;
};

export type WeatherSnapshot = {
  /** Whole degrees, Fahrenheit. */
  temperature: number;
  /** Coarse condition bucket, e.g. "Clear", "Rain", "Clouds", "Snow". */
  condition: string;
  /** Short, Bloopy-friendly line, e.g. "Good reset walk". */
  summary: string;
  fetchedAt: number;
};

export type WeatherResult =
  | { ok: true; snapshot: WeatherSnapshot; displayName: string; latitude: number; longitude: number }
  | { ok: false; error: string };

export type CoordsWeatherResult =
  | { ok: true; snapshot: WeatherSnapshot }
  | { ok: false; error: string };

/* ---------- safe localStorage ---------- */

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable — weather just won't persist
  }
}

function safeRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    // nothing to clear
  }
}

function notify(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(WEATHER_CHANGE_EVENT));
}

/* ---------- prefs + cache ---------- */

export function loadWeatherPrefs(): WeatherPrefs {
  const rawMode = safeGet(WEATHER_KEYS.permissionMode);
  const mode: WeatherMode = rawMode === "city" || rawMode === "browser" ? rawMode : "off";
  return {
    enabled: safeGet(WEATHER_KEYS.enabled) === "true",
    mode,
    cityName: safeGet(WEATHER_KEYS.cityName),
  };
}

export function loadWeatherSnapshot(): WeatherSnapshot | null {
  const t = safeGet(WEATHER_KEYS.lastTemperature);
  const condition = safeGet(WEATHER_KEYS.lastCondition);
  const fetchedRaw = safeGet(WEATHER_KEYS.lastFetchAt);
  if (t === null || condition === null || fetchedRaw === null) return null;

  const temperature = Number(t);
  const fetchedAt = Number(fetchedRaw);
  if (!Number.isFinite(temperature) || !Number.isFinite(fetchedAt)) return null;

  const summary = safeGet(WEATHER_KEYS.lastSummary) ?? summaryFor(condition, temperature);
  return { temperature, condition, summary, fetchedAt };
}

function saveSnapshot(snap: WeatherSnapshot): void {
  safeSet(WEATHER_KEYS.lastTemperature, String(snap.temperature));
  safeSet(WEATHER_KEYS.lastCondition, snap.condition);
  safeSet(WEATHER_KEYS.lastSummary, snap.summary);
  safeSet(WEATHER_KEYS.lastFetchAt, String(snap.fetchedAt));
}

/** Persist a city reading: stores the display name + the city's public centre coords (cache). */
export function saveCityWeather(
  displayName: string,
  latitude: number,
  longitude: number,
  snapshot: WeatherSnapshot
): void {
  safeSet(WEATHER_KEYS.enabled, "true");
  safeSet(WEATHER_KEYS.permissionMode, "city");
  safeSet(WEATHER_KEYS.cityName, displayName);
  safeSet(WEATHER_KEYS.latitude, String(latitude));
  safeSet(WEATHER_KEYS.longitude, String(longitude));
  saveSnapshot(snapshot);
  notify();
}

/** Persist a browser-location reading: NEVER stores the precise GPS coordinates. */
export function saveBrowserWeather(snapshot: WeatherSnapshot): void {
  safeSet(WEATHER_KEYS.enabled, "true");
  safeSet(WEATHER_KEYS.permissionMode, "browser");
  safeSet(WEATHER_KEYS.cityName, "Current location");
  // Privacy: do not persist exact coordinates for browser-location mode.
  safeRemove(WEATHER_KEYS.latitude);
  safeRemove(WEATHER_KEYS.longitude);
  saveSnapshot(snapshot);
  notify();
}

/** Turn the feature off and remove every weather key (full clear). */
export function clearWeather(): void {
  Object.values(WEATHER_KEYS).forEach(safeRemove);
  notify();
}

/* ---------- condition + summary mapping ---------- */

/** Maps an Open-Meteo WMO weather code to a coarse, display-friendly bucket. */
export function weatherCodeToCondition(code: number): string {
  if (code === 0 || code === 1) return "Clear";
  if (code === 2 || code === 3) return "Clouds";
  if (code === 45 || code === 48) return "Fog";
  if (code >= 51 && code <= 67) return "Rain";
  if (code >= 71 && code <= 77) return "Snow";
  if (code >= 80 && code <= 82) return "Rain";
  if (code === 85 || code === 86) return "Snow";
  if (code >= 95) return "Storm";
  return "Unknown";
}

/** A short, gentle, shame-free line based on temperature extremes then condition. */
export function summaryFor(condition: string, temperature: number): string {
  if (Number.isFinite(temperature)) {
    if (temperature >= 85) return "Stay cool";
    if (temperature <= 40) return "Warm reset";
  }
  switch (condition) {
    case "Clear":
      return "Good reset walk";
    case "Rain":
    case "Storm":
      return "Cozy focus mode";
    case "Clouds":
    case "Fog":
      return "Soft focus day";
    case "Snow":
      return "Warm reset";
    default:
      return "Outside signal";
  }
}

/* ---------- network (Open-Meteo, key-less, CORS-enabled) ---------- */

async function fetchJson(url: string, timeoutMs = 8000): Promise<unknown> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) return null;
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

type GeoHit = { name: string; latitude: number; longitude: number };

async function geocodeCity(cityName: string): Promise<GeoHit | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    cityName
  )}&count=1&language=en&format=json`;
  const data = await fetchJson(url);
  if (!data || typeof data !== "object") return null;
  const results = (data as { results?: unknown }).results;
  if (!Array.isArray(results) || results.length === 0) return null;
  const first = results[0] as { name?: unknown; latitude?: unknown; longitude?: unknown; country?: unknown };
  if (typeof first.latitude !== "number" || typeof first.longitude !== "number") return null;
  const base = typeof first.name === "string" ? first.name : cityName;
  const country = typeof first.country === "string" ? first.country : null;
  return {
    name: country ? `${base}, ${country}` : base,
    latitude: first.latitude,
    longitude: first.longitude,
  };
}

type CurrentWeather = { temperature: number; condition: string };

async function fetchForecast(latitude: number, longitude: number): Promise<CurrentWeather | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&temperature_unit=fahrenheit`;
  const data = await fetchJson(url);
  if (!data || typeof data !== "object") return null;
  const current = (data as { current?: unknown }).current;
  if (!current || typeof current !== "object") return null;
  const c = current as { temperature_2m?: unknown; weather_code?: unknown };
  if (typeof c.temperature_2m !== "number" || typeof c.weather_code !== "number") return null;
  return { temperature: c.temperature_2m, condition: weatherCodeToCondition(c.weather_code) };
}

function buildSnapshot(temperature: number, condition: string): WeatherSnapshot {
  const rounded = Math.round(temperature);
  return { temperature: rounded, condition, summary: summaryFor(condition, rounded), fetchedAt: Date.now() };
}

/** Resolve a city name → coordinates → current weather. */
export async function fetchCityWeather(cityName: string): Promise<WeatherResult> {
  const geo = await geocodeCity(cityName);
  if (!geo) return { ok: false, error: "Couldn't find that city. Try another spelling?" };
  const forecast = await fetchForecast(geo.latitude, geo.longitude);
  if (!forecast) return { ok: false, error: "Couldn't load weather right now." };
  return {
    ok: true,
    snapshot: buildSnapshot(forecast.temperature, forecast.condition),
    displayName: geo.name,
    latitude: geo.latitude,
    longitude: geo.longitude,
  };
}

/** Fetch current weather for given coordinates (used by browser-location mode). */
export async function fetchCoordsWeather(latitude: number, longitude: number): Promise<CoordsWeatherResult> {
  const forecast = await fetchForecast(latitude, longitude);
  if (!forecast) return { ok: false, error: "Couldn't load weather right now." };
  return { ok: true, snapshot: buildSnapshot(forecast.temperature, forecast.condition) };
}

/** Request the browser's current position once. Resolves coords; rejects on denial/error. */
export function getBrowserPosition(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Geolocation unavailable"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      (err) => reject(err),
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 10 * 60_000 }
    );
  });
}

/** True if the user has already granted geolocation (so we can refetch without a prompt). */
async function geolocationAlreadyGranted(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.permissions) return false;
    const status = await navigator.permissions.query({ name: "geolocation" as PermissionName });
    return status.state === "granted";
  } catch {
    return false;
  }
}

/**
 * If weather is enabled and the cache is stale, refetch in the background and
 * persist. Returns the freshest snapshot available (or null if disabled). Never
 * prompts for permission: browser-location only refetches when already granted.
 */
export async function refreshWeatherIfStale(): Promise<WeatherSnapshot | null> {
  const prefs = loadWeatherPrefs();
  if (!prefs.enabled || prefs.mode === "off") return null;

  const cached = loadWeatherSnapshot();
  if (cached && Date.now() - cached.fetchedAt < WEATHER_CACHE_MS) return cached;

  if (prefs.mode === "city") {
    const lat = Number(safeGet(WEATHER_KEYS.latitude));
    const lon = Number(safeGet(WEATHER_KEYS.longitude));
    if (Number.isFinite(lat) && Number.isFinite(lon) && (lat !== 0 || lon !== 0)) {
      const forecast = await fetchForecast(lat, lon);
      if (forecast) {
        const snap = buildSnapshot(forecast.temperature, forecast.condition);
        saveSnapshot(snap);
        notify();
        return snap;
      }
    } else if (prefs.cityName) {
      const result = await fetchCityWeather(prefs.cityName);
      if (result.ok) {
        saveCityWeather(result.displayName, result.latitude, result.longitude, result.snapshot);
        return result.snapshot;
      }
    }
    return cached; // fetch failed — keep showing the cached reading
  }

  // browser mode — only refetch silently if permission is still granted
  if (await geolocationAlreadyGranted()) {
    try {
      const pos = await getBrowserPosition();
      const forecast = await fetchForecast(pos.latitude, pos.longitude);
      if (forecast) {
        const snap = buildSnapshot(forecast.temperature, forecast.condition);
        saveSnapshot(snap); // privacy: snapshot only, no coordinates
        notify();
        return snap;
      }
    } catch {
      // permission revoked / unavailable — keep cached
    }
  }
  return cached;
}

/* ---------- gentle presence nudge (template-only, daily-gated by caller) ---------- */

/**
 * A gentle, weather-aware opener for the Presence bubble, or null if weather
 * isn't set or the reading is too old. Template-only — never calls Anthropic.
 * Daily gating + spacing are enforced by the caller.
 */
export function getWeatherPresenceMessage(): ProactiveMessage | null {
  const prefs = loadWeatherPrefs();
  if (!prefs.enabled || prefs.mode === "off") return null;
  const snap = loadWeatherSnapshot();
  if (!snap || Date.now() - snap.fetchedAt > NUDGE_MAX_AGE_MS) return null;

  const walk = { label: "Reset walk", href: "/unstuck" };
  const sprint = { label: "Focus sprint", href: "/unstuck" };

  if (snap.temperature >= 85) {
    return { id: "proactive-weather-hot", type: "weather", text: "It's warm out today. Keep things cool and easy.", action: walk };
  }
  if (snap.temperature <= 40) {
    return { id: "proactive-weather-cold", type: "weather", text: "Chilly out there. Want a warm, gentle reset?", action: sprint };
  }
  switch (snap.condition) {
    case "Clear":
      return { id: "proactive-weather-clear", type: "weather", text: "It looks nice outside. Want a 2-minute reset walk?", action: walk };
    case "Rain":
    case "Storm":
      return { id: "proactive-weather-rain", type: "weather", text: "Rainy outside. Want a cozy focus sprint?", action: sprint };
    case "Clouds":
    case "Fog":
      return { id: "proactive-weather-clouds", type: "weather", text: "Soft, cloudy day out. Good for a calm focus.", action: sprint };
    case "Snow":
      return { id: "proactive-weather-snow", type: "weather", text: "Snowy out there. Want a warm little reset?", action: sprint };
    default:
      return null;
  }
}
