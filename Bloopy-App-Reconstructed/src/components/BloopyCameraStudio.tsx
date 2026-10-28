"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Vision is opt-in. Camera stream stays on the local Pi/robot page; still frames
 * are sent to cloud vision only after the user clicks an Analyze button.
 */
export default function BloopyCameraStudio() {
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("What can you see in front of me?");
  const [answer, setAnswer] = useState("");
  const [notice, setNotice] = useState("");
  const [imageError, setImageError] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    const onVisibility = () => {
      if (document.hidden) setLive(false);
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      mounted.current = false;
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  async function captureUserApprovedScreen(): Promise<string> {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      throw new Error("Screen sharing needs a supported browser and a secure/localhost connection. Use the camera-only option here.");
    }
    // Called directly by the user pressing the screenshot button: browser will
    // request permission, and we stop every track immediately after one frame.
    const screen = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
    try {
      const video = document.createElement("video");
      video.muted = true;
      video.srcObject = screen;
      video.playsInline = true;
      await video.play();
      if (!video.videoWidth || !video.videoHeight) {
        throw new Error("The screen did not provide an image.");
      }
      const scale = Math.min(1, 1100 / video.videoWidth, 700 / video.videoHeight);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture the screen.");
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.65);
    } finally {
      screen.getTracks().forEach((track) => track.stop());
    }
  }

  async function inspect(mode: "camera" | "screen" | "page-text") {
    if (loading || !question.trim()) return;
    setLoading(true);
    setNotice("");
    setAnswer("");
    try {
      const screenImage = mode === "screen" ? await captureUserApprovedScreen() : undefined;
      // Fallback for kiosks without a screen-sharing portal: includes visible
      // app text only, not a screenshot or other windows on the Pi.
      const screenContext = mode === "page-text"
        ? (document.querySelector("main")?.innerText || "").slice(0, 1800)
        : undefined;
      const response = await fetch("/api/robot/inspect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: question.trim(), screenImage, screenContext }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.answer) {
        throw new Error(data?.error || "Bloopy couldn't analyze that view.");
      }
      if (mounted.current) setAnswer(data.answer);
    } catch (error) {
      if (mounted.current) setNotice(error instanceof Error ? error.message : "Camera analysis failed.");
    } finally {
      if (mounted.current) setLoading(false);
    }
  }

  return (
    <section className="mt-5 rounded-3xl border border-sky-600/40 bg-[#07182C] p-4 text-white" aria-label="Bloopy camera and visual AI">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">Bloopy's camera</h2>
          <p className="mt-1 text-xs text-sky-200">Live local preview · snapshots analyzed only when you ask</p>
        </div>
        <button
          type="button"
          className="rounded-full border border-sky-500/50 bg-sky-900/40 px-3 py-2 text-xs font-bold"
          onClick={() => { setImageError(false); setLive((on) => !on); }}
        >
          {live ? "Stop view" : "Show camera"}
        </button>
      </div>

      <div className="mt-3 flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-black">
        {live ? (
          // Stream is same-origin and authenticated on initial connection.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/api/robot/camera/stream"
            alt="Live view from Bloopy's Pi camera"
            className="h-full w-full object-contain"
            onError={() => { setImageError(true); setLive(false); }}
          />
        ) : (
          <div className="px-4 text-center text-sm text-sky-200/70">
            {imageError ? "Camera feed unavailable. Check the Pi brain service." : "Camera preview is off"}
          </div>
        )}
      </div>
      {live && <p className="mt-2 text-xs text-sky-200">Live · approximately 2 frames/second to limit Pi CPU load</p>}

      <label htmlFor="bloopy-vision-question" className="mt-4 block text-xs font-bold text-sky-200">
        Ask Bloopy about its view
      </label>
      <textarea
        id="bloopy-vision-question"
        rows={2}
        maxLength={450}
        className="mt-2 w-full resize-y rounded-xl border border-sky-500/30 bg-[#020712] px-3 py-3 text-sm text-white outline-none focus:border-sky-400"
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={loading || !question.trim()}
          className="rounded-full bg-[#0A84FF] px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
          onClick={() => void inspect("camera")}
        >
          {loading ? "Looking…" : "Analyze camera"}
        </button>
        <button
          type="button"
          disabled={loading || !question.trim()}
          className="rounded-full border border-sky-500/40 px-4 py-2 text-sm font-bold text-sky-200 disabled:opacity-50"
          onClick={() => void inspect("screen")}
        >
          Camera + share screen once
        </button>
        <button
          type="button"
          disabled={loading || !question.trim()}
          className="rounded-full border border-sky-500/40 px-4 py-2 text-sm font-bold text-sky-200 disabled:opacity-50"
          onClick={() => void inspect("page-text")}
        >
          Camera + visible app text
        </button>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-sky-200/75">
        The second button asks your browser for permission to capture a single screenshot of a display/window.
        Both images go to cloud AI for this question only; they are not added to chat history.
        If screen sharing is unavailable, the third button shares visible text from this Bloopy page only, not pixels.
        Bloopy can discuss buttons and suggest actions, but it never silently clicks or controls your screen.
      </p>
      {notice && <p role="alert" className="mt-3 rounded-xl bg-rose-900/30 p-3 text-sm text-rose-100">{notice}</p>}
      {answer && (
        <div className="mt-3 rounded-2xl border border-sky-500/30 bg-[#020712] p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-sky-300">What Bloopy sees</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{answer}</p>
        </div>
      )}
    </section>
  );
}
