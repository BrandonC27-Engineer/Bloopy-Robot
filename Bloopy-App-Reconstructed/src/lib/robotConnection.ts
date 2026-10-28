/**
 * Bloopy physical robot connection.
 *
 * The browser never talks to the Raspberry Pi brain directly. It talks to the
 * same-origin Next.js API (`/api/robot/*`), and the Next.js server proxies to a
 * loopback-only bridge exposed by Bloopy Brain on the Pi.
 *
 * This keeps hardware control off the LAN/browser surface and gives the app one
 * stable contract whether it is opened on the Pi touchscreen or from another
 * device on the same network.
 */

export type RobotModuleState =
  | "ready"
  | "busy"
  | "sleeping"
  | "offline"
  | "not-installed"
  | "not-monitored"
  | "always-on"
  | "error";

export type RobotModuleStatus = {
  state: RobotModuleState;
  detail: string;
};

export type RobotStatus = {
  ok: true;
  schemaVersion: 1;
  timestamp: number;
  robot: {
    name: string;
    version: string;
    uptimeSeconds: number;
    brainState: string;
    speechMode: string;
    manualSleep: boolean;
    lookForMe: boolean;
  };
  sensors: {
    lux: number | null;
    distanceMm: number | null;
    tiltDeg: number | null;
    motion: number | null;
    sound: number | null;
    espState: string | null;
    telemetryAgeSeconds: number | null;
  };
  vision: {
    visible: boolean;
    targetType: string | null;
    zone: string | null;
    rememberingTarget: boolean;
  };
  audio: {
    volume: number;
    volumePercent: number;
  };
  conversation: {
    wakeCount: number;
    conversationCount: number;
    lastHeard: string | null;
    lastResponse: string | null;
    lastSpoken: string | null;
  };
  modules: {
    brain: RobotModuleStatus;
    esp32: RobotModuleStatus;
    camera: RobotModuleStatus;
    microphone: RobotModuleStatus;
    speaker: RobotModuleStatus;
    ai: RobotModuleStatus;
    fan: RobotModuleStatus;
    movement: RobotModuleStatus;
    battery: RobotModuleStatus;
  };
  capabilities: {
    sleep: boolean;
    wake: boolean;
    lookAtMe: boolean;
    setVolume: boolean;
    movement: boolean;
    fanControl: boolean;
    batteryTelemetry: boolean;
  };
};

export type RobotActionName = "sleep" | "wake" | "look_at_me" | "set_volume";

export type RobotActionResult = {
  ok: boolean;
  action: RobotActionName;
  message: string;
  status?: RobotStatus;
};

export type RobotConnectionView = {
  connected: boolean;
  status: RobotStatus | null;
  error: string | null;
};

async function readJson<T>(response: Response): Promise<T | null> {
  try {
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function fetchRobotStatus(signal?: AbortSignal): Promise<RobotStatus> {
  const response = await fetch("/api/robot/status", {
    method: "GET",
    cache: "no-store",
    signal,
  });

  const payload = await readJson<RobotStatus & { error?: string }>(response);

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Bloopy's physical brain is not reachable.");
  }

  return payload;
}

export async function sendRobotAction(
  action: RobotActionName,
  params: Record<string, string | number | boolean> = {}
): Promise<RobotActionResult> {
  const response = await fetch("/api/robot/action", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
  });

  const payload = await readJson<RobotActionResult & { error?: string }>(response);

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.error || "Bloopy couldn't complete that physical action.");
  }

  return payload;
}

export function robotStateLabel(status: RobotStatus | null): string {
  if (!status) return "Body offline";

  const speech = status.robot.speechMode.toUpperCase();
  const brain = status.robot.brainState.toUpperCase();

  if (status.robot.manualSleep || brain === "SLEEPING") return "Resting";
  if (speech === "LISTENING") return "Listening";
  if (speech === "TRANSCRIBING" || speech === "AI" || brain === "THINKING") return "Thinking";
  if (speech === "SPEAKING" || brain === "SPEAKING") return "Speaking";
  if (brain === "TRACKING") return "Looking at you";
  if (brain === "LOOKING_FOR_PERSON") return "Looking around";
  return "Awake";
}

export function naturalLight(lux: number | null): string {
  if (lux == null) return "waiting for light data";
  if (lux <= 5) return "very dark";
  if (lux <= 20) return "dim";
  if (lux <= 120) return "soft indoor light";
  if (lux <= 500) return "well lit";
  return "bright";
}

export function naturalDistance(distanceMm: number | null): string {
  if (distanceMm == null) return "nothing close";
  if (distanceMm < 80) return "something is very close";
  if (distanceMm < 250) return "something is nearby";
  if (distanceMm < 800) return "a little space in front";
  return "clear space ahead";
}

export function naturalTilt(tiltDeg: number | null): string {
  if (tiltDeg == null) return "waiting for orientation";
  const amount = Math.abs(tiltDeg);
  if (amount < 4) return "level";
  if (amount < 12) return "slightly tilted";
  return "tilted";
}


export function sensorTelemetryFresh(status: RobotStatus | null): boolean {
  const age = status?.sensors.telemetryAgeSeconds;
  return age != null && age < 3.5 && status?.modules.esp32.state !== "offline";
}

export function naturalMotion(value: number | null): string {
  if (value == null) return "waiting for motion data";
  const amount = Math.abs(value);
  if (amount < 0.03) return "mostly still";
  if (amount < 0.1) return "a little movement";
  return "movement in the signal";
}

export function naturalSound(value: number | null): string {
  if (value == null) return "waiting for sound data";
  if (value < 250) return "low sound level";
  if (value < 500) return "some sound around me";
  return "strong sound signal";
}

export function telemetryAgeLabel(ageSeconds: number | null): string {
  if (ageSeconds == null) return "waiting for ESP32";
  if (ageSeconds < 1.5) return "live now";
  if (ageSeconds < 3.5) return `updated ${Math.max(1, Math.round(ageSeconds))}s ago`;
  return "sensor link stale";
}

export function robotNaturalSummary(status: RobotStatus | null): string {
  if (!status) return "My physical brain isn't reachable right now.";

  const label = robotStateLabel(status);
  if (label === "Listening") return "I'm listening through my microphone.";
  if (label === "Thinking") return "I'm working on what I heard.";
  if (label === "Speaking") return "I'm answering through my speaker.";
  if (label === "Resting") return "I'm resting, but my wake phrase can bring me back.";
  if (label === "Looking at you") return "I can see a nearby person and I'm keeping them centered.";
  if (label === "Looking around") return "I'm looking for you with my camera.";

  if (!sensorTelemetryFresh(status)) {
    return "I'm awake, but my ESP32 sensor link is catching up.";
  }

  return `I'm awake. It's ${naturalLight(status.sensors.lux)} here, and ${naturalDistance(status.sensors.distanceMm)}.`;
}
