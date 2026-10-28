import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BRIDGE = process.env.BLOOPY_ROBOT_BRIDGE_URL?.trim() || "http://127.0.0.1:8765";
const BOUNDARY = "bloopyframe";
const PAUSE_MS = 550;

function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Sign in to view Bloopy's camera.", { status: 401 });

  // The session is checked *before* opening the stream. The bridge remains
  // loopback-only; the browser never receives its address or credentials.
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      // Never return an infinite async Promise from ReadableStream.start().
      // Start a detached producer so the browser receives headers immediately.
      void (async () => {
      const encoder = new TextEncoder();
      try {
        while (!cancelled && !request.signal.aborted) {
          try {
            const response = await fetch(`${BRIDGE}/camera.jpg`, {
              cache: "no-store",
              signal: AbortSignal.timeout(2500),
            });
            if (response.ok) {
              const image = new Uint8Array(await response.arrayBuffer());
              if (image.length > 0 && image.length < 2_000_000) {
                controller.enqueue(encoder.encode(
                  `--${BOUNDARY}\r\nContent-Type: image/jpeg\r\nContent-Length: ${image.length}\r\n\r\n`
                ));
                controller.enqueue(image);
                controller.enqueue(encoder.encode("\r\n"));
              }
            }
          } catch {
            // Camera/bridge temporarily unavailable. Retry while page is open.
          }
          await pause(PAUSE_MS);
        }
      } finally {
        try { controller.close(); } catch { /* disconnected */ }
      }
      })();
    },
    cancel() { cancelled = true; },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": `multipart/x-mixed-replace; boundary=${BOUNDARY}`,
      "Cache-Control": "private, no-store, no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex",
    },
  });
}
