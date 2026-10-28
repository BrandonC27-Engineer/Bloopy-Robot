import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPhysicalRobotStatus, runPhysicalRobotAction } from "@/lib/server/robotBridge";
import type { RobotActionName } from "@/lib/robotConnection";

const ALLOWED_ACTIONS = new Set<RobotActionName>(["sleep", "wake", "look_at_me", "set_volume"]);

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in before controlling the physical Bloopy body." }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const action = body?.action as RobotActionName | undefined;
  const params = body?.params && typeof body.params === "object" && !Array.isArray(body.params) ? body.params : {};

  if (!action || !ALLOWED_ACTIONS.has(action)) {
    return NextResponse.json({ error: "That robot action is not allowed." }, { status: 400 });
  }

  if (action === "set_volume") {
    const raw = Number((params as Record<string, unknown>).volume);
    if (!Number.isFinite(raw) || raw < 0 || raw > 0.35) {
      return NextResponse.json({ error: "Volume must be between 0 and 0.35." }, { status: 400 });
    }
  }

  try {
    const result = await runPhysicalRobotAction(action, params as Record<string, string | number | boolean>);
    const status = await getPhysicalRobotStatus();
    return NextResponse.json({ ...result, status: status ?? undefined });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Bloopy couldn't complete that action." },
      { status: 502 }
    );
  }
}
