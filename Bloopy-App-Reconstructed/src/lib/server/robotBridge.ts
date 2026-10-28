import type { RobotActionName, RobotActionResult, RobotStatus } from "@/lib/robotConnection";

const ROBOT_BRIDGE_URL =
  process.env.BLOOPY_ROBOT_BRIDGE_URL?.trim() || "http://127.0.0.1:8765";

const REQUEST_TIMEOUT_MS = 1800;

function timeoutSignal(): AbortSignal {
  return AbortSignal.timeout(REQUEST_TIMEOUT_MS);
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) throw new Error("Bloopy Brain returned an empty response.");
  return JSON.parse(text) as T;
}

export async function getPhysicalRobotStatus(): Promise<RobotStatus | null> {
  try {
    const response = await fetch(`${ROBOT_BRIDGE_URL}/status`, {
      method: "GET",
      cache: "no-store",
      signal: timeoutSignal(),
    });

    if (!response.ok) return null;
    const data = await parseJson<RobotStatus>(response);
    return data?.ok ? data : null;
  } catch {
    return null;
  }
}

export async function runPhysicalRobotAction(
  action: RobotActionName,
  params: Record<string, string | number | boolean> = {}
): Promise<RobotActionResult> {
  const response = await fetch(`${ROBOT_BRIDGE_URL}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, params }),
    cache: "no-store",
    signal: timeoutSignal(),
  });

  const data = await parseJson<RobotActionResult & { error?: string }>(response);

  if (!response.ok || !data.ok) {
    throw new Error(data.error || data.message || "Physical action failed.");
  }

  return data;
}

export function compactRobotContext(status: RobotStatus | null): string {
  if (!status) {
    return "Physical Bloopy body: offline or unavailable.";
  }

  return [
    "Physical Bloopy body status:",
    `- brain_state: ${status.robot.brainState}`,
    `- speech_mode: ${status.robot.speechMode}`,
    `- sleeping: ${status.robot.manualSleep}`,
    `- esp32_sensor_link: ${status.modules.esp32.state}`,
    `- telemetry_age_seconds: ${status.sensors.telemetryAgeSeconds}`,
    `- light_lux: ${status.sensors.lux}`,
    `- distance_mm: ${status.sensors.distanceMm}`,
    `- tilt_deg: ${status.sensors.tiltDeg}`,
    `- local_vision_visible: ${status.vision.visible}`,
    `- local_vision_target: ${status.vision.targetType}`,
    `- local_vision_zone: ${status.vision.zone}`,
    `- speaker_volume_percent: ${status.audio.volumePercent}`,
    `- cooling_fan: ${status.modules.fan.detail}`,
    `- movement: ${status.modules.movement.detail}`,
    `- battery: ${status.modules.battery.detail}`,
  ].join("\n");
}
