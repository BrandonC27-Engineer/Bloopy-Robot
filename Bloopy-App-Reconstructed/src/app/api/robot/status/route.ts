import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPhysicalRobotStatus } from "@/lib/server/robotBridge";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Sign in to view the physical Bloopy body." }, { status: 401 });
  }

  const status = await getPhysicalRobotStatus();
  if (!status) {
    return NextResponse.json(
      { error: "Bloopy's physical brain is offline or the local bridge is not running." },
      { status: 503 }
    );
  }

  return NextResponse.json(status, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
