import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "bloopy-app",
      version: "0.4.0",
      timestamp: Date.now(),
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
