"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { collectClientContext } from "@/lib/bloopyContext";
import { useBloopyTheme, useBloopyThemeColors } from "@/components/BloopyThemeProvider";
import { playBloopySound } from "@/lib/bloopySound";
import { awardEnergy } from "@/lib/bloopyEnergy";
import { getCheckInContext } from "@/lib/bloopyPresence";
import { getProfile } from "@/lib/bloopyProfile";
import { useRobot } from "@/components/RobotProvider";
import { robotStateLabel } from "@/lib/robotConnection";

type Message = {
  id: string;
  role: "user" | "bloopy";
  content: string;
  created_at: string;
};

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

/** Gentle, one-tap conversation openers shown only on an empty chat. */
const STARTERS = ["I feel stuck", "Help me start", "Make a tiny plan", "I need to vent"];

/* ---------- Inline icons (stroke = currentColor) ---------- */

function SendIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ---------- Bloopy avatar (logo + neon glow ring) ---------- */

function BloopyAvatar({ className = "" }: { className?: string }) {
  const COLORS = useBloopyThemeColors();
  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`}>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute h-[82%] w-[82%] rounded-full blur-md"
        style={{ background: COLORS.neon, opacity: 0.3 }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-full"
        style={{ border: `1.5px solid ${COLORS.glow}66`, boxShadow: `0 0 14px ${COLORS.neon}66` }}
      />
      <img
        src={LOGO_SRC}
        alt="Bloopy"
        className="relative h-[78%] w-[78%] object-contain drop-shadow-[0_4px_14px_rgba(30,144,255,0.45)]"
      />
    </div>
  );
}


export default function ChatPage() {
  const COLORS = useBloopyThemeColors();
  const { theme } = useBloopyTheme();
  const { status: robotStatus, connected: robotConnected } = useRobot();
  const physicalState = robotStateLabel(robotStatus);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Ids that should play the soft entrance pop (only messages added this session,
  // never the whole loaded history). `justRepliedId` gets the gentle reply glow.
  const [animatedIds, setAnimatedIds] = useState<Set<string>>(() => new Set());
  const [justRepliedId, setJustRepliedId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  // monotonic counter for local-only fallback ids (avoids impure Date.now in render-path)
  const localIdRef = useRef(0);
  // gentle personalization for the empty state — the display name (when set)
  // and a starter chip for today's focus. Read after mount (hydration-safe).
  const [displayName, setDisplayName] = useState("");
  const [starters, setStarters] = useState<string[]>(STARTERS);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time read of local profile/check-in after mount keeps SSR/client markup identical
    setDisplayName(getProfile().displayName);
    const focus = getCheckInContext().focus;
    if (focus) setStarters([`Help me start: ${focus.slice(0, 60)}`, ...STARTERS.slice(0, 3)]);
  }, []);

  const supabase = createClient();

  // ---- load conversation history on first visit ----
  useEffect(() => {
    async function loadMessages() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError("You need to be signed in to chat with Bloopy.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("chat_messages")
        .select("id, role, content, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        setError("Hmm, I couldn't load our conversation. Try refreshing? 💙");
      } else {
        setMessages((data ?? []) as Message[]);
      }
      setLoading(false);
    }

    loadMessages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the newest message in view
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, typing]);

  // ---- send a message ----
  // Core sender, shared by the composer form and the empty-state starter chips.
  async function submitMessage(raw: string) {
    const text = raw.trim();
    if (!text || typing) return;

    // soft, immediate send feedback — covers Enter-to-send too (the button/chips
    // opt out of the global layer to avoid a double tap). Respects the sound setting.
    playBloopySound("tap");
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in to chat with Bloopy.");
      return;
    }

    setTyping(true);

    // 1. save the user's message to Supabase
    const { data: userMsg, error: userErr } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role: "user", content: text })
      .select("id, role, content, created_at")
      .single();

    if (userErr || !userMsg) {
      setError("That message didn't send. Mind trying again? 💙");
      setTyping(false);
      return;
    }

    setMessages((prev) => [...prev, userMsg as Message]);
    setAnimatedIds((prev) => new Set(prev).add((userMsg as Message).id));
    setDraft("");

    // Reaching out counts as a tiny step too — a bit of Bloopy energy, once per
    // day. Quiet on purpose: the reply itself is the reward here, so no extra
    // sparkle (Home's energy pill updates live via the energy event).
    awardEnergy("chat");

    // 2. ask the real Bloopy brain for a reply
    //    (recent history only — the API route also trims to 20)
    const history = [...messages, userMsg as Message]
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.content }));

    // Collect a short, safe Bloopy context summary from local app state to
    // help Bloopy respond more personally. Never blocks sending — any failure
    // just sends without context and chat behaves exactly as before.
    let context;
    try {
      context = collectClientContext();
    } catch {
      context = undefined;
    }

    let reply: string | null = null;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: history.slice(0, -1), context }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.reply) {
        setError(
          data?.error ?? "Bloopy's brain is having a moment. Try again? 💙"
        );
        setTyping(false);
        return;
      }
      reply = data.reply as string;
    } catch {
      setError("Couldn't reach Bloopy. Check your connection and try again? 💙");
      setTyping(false);
      return;
    }

    // 3. save Bloopy's reply to Supabase
    const { data: bloopyMsg, error: bloopyErr } = await supabase
      .from("chat_messages")
      .insert({ user_id: user.id, role: "bloopy", content: reply })
      .select("id, role, content, created_at")
      .single();

    if (bloopyErr || !bloopyMsg) {
      // The reply exists but didn't persist — show it anyway so the
      // conversation isn't broken; it just won't survive a refresh.
      const localId = `local-${(localIdRef.current += 1)}`;
      setMessages((prev) => [
        ...prev,
        {
          id: localId,
          role: "bloopy",
          content: reply!,
          created_at: new Date().toISOString(),
        },
      ]);
      markReplyArrived(localId);
      setError("Bloopy replied, but it didn't save. It may vanish on refresh 💙");
    } else {
      setMessages((prev) => [...prev, bloopyMsg as Message]);
      markReplyArrived((bloopyMsg as Message).id);
    }
    playBloopySound("bloopy"); // cute soft bloop when Bloopy answers
    setTyping(false);
  }

  /** Composer form submit → send the current draft. */
  function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    void submitMessage(draft);
  }

  const displayedStarters = robotConnected
    ? ["What can you sense?", "Look at me", ...starters.slice(0, 2)]
    : starters;

  /** Give a fresh Bloopy reply the entrance pop + a one-shot gentle glow. */
  function markReplyArrived(id: string) {
    setAnimatedIds((prev) => new Set(prev).add(id));
    setJustRepliedId(id);
    // clear the glow flag after it plays so it never loops or replays on re-render
    window.setTimeout(() => setJustRepliedId((cur) => (cur === id ? null : cur)), 1100);
  }

  return (
    <main
      className="relative mx-auto flex h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
    >
      {/* faint circuit grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          opacity: theme.heroStyle.gridOpacity,
          backgroundImage: `linear-gradient(${COLORS.neon} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.neon} 1px, transparent 1px)`,
          backgroundSize: "44px 44px",
          maskImage: "radial-gradient(circle at 50% 20%, black, transparent 80%)",
        }}
      />

      {/* ===== Header ===== */}
      <header className="relative z-10 px-5 pt-6">
        <div className="flex items-center justify-between">
          <Link
            href="/app"
            aria-label="Back to home"
            className="flex items-center gap-2.5 rounded-full transition-transform duration-200 active:scale-95"
          >
            <BloopyAvatar className="h-9 w-9" />
            <span
              className="text-sm font-semibold tracking-[0.4em]"
              style={{ color: COLORS.mainText, textShadow: `0 0 18px ${COLORS.glow}66` }}
            >
              BLOOPY
            </span>
          </Link>

          {/* status pill */}
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1"
            style={{ borderColor: `${COLORS.neon}33`, background: `${COLORS.card}CC`, boxShadow: `0 0 12px ${COLORS.neon}1A` }}
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: COLORS.glow }} />
              <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </span>
            <p className="text-[10px] font-medium uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
              {typing ? "Thinking…" : robotConnected ? physicalState : "App online"}
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Chat
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            {robotConnected ? "Talk with me — or ask my physical body to sense and act." : "A quiet place to talk things through."}
          </p>
        </div>
      </header>

      {/* ===== Messages ===== */}
      <div className="bloopy-chat-scrollbar relative z-10 flex-1 overflow-y-auto px-4 pb-4 pt-5">
        <div className="flex flex-col gap-3.5">
          {loading ? (
            <div className="flex flex-1 items-center justify-center gap-1.5 py-6">
              <span className="bloopy-dot h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.15s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.3s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </div>
          ) : (
            <>
              {messages.length === 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-end gap-2">
                    <BloopyAvatar className="h-7 w-7" />
                    <div
                      className="max-w-[80%] rounded-3xl rounded-bl-md border px-4 py-2.5 text-sm leading-relaxed"
                      style={{
                        background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                        borderColor: COLORS.cardBorder,
                        color: COLORS.mainText,
                        boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 22px ${COLORS.bgDeep}88`,
                      }}
                    >
                      hi{displayName ? ` ${displayName.toLowerCase()}` : ""}! i&rsquo;m bloopy ✦ tell me one thing on your mind. no pressure 💙
                    </div>
                  </div>

                  {/* quick starter chips — one tap to begin. They opt out of the
                      global tap layer (submitMessage plays the soft tap itself,
                      respecting the sound setting) to avoid a double sound. */}
                  <div className="flex flex-wrap gap-2 pl-9">
                    {displayedStarters.map((s) => (
                      <button
                        key={s}
                        type="button"
                        data-bloopy-sound="none"
                        disabled={typing}
                        onClick={() => void submitMessage(s)}
                        className="bloopy-tap rounded-full border px-3 py-1.5 text-xs font-medium leading-snug transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-95 disabled:opacity-60"
                        style={{
                          borderColor: `${COLORS.neon}3A`,
                          background: `${COLORS.bgDeep}80`,
                          color: COLORS.softText,
                          boxShadow: `inset 0 0 10px ${COLORS.neon}12`,
                        }}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((m) =>
                m.role === "user" ? (
                  <div key={m.id} className="flex justify-end">
                    <div
                      className={`max-w-[78%] rounded-3xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed ${animatedIds.has(m.id) ? "bloopy-msg-in" : ""}`}
                      style={{
                        background: `linear-gradient(160deg, ${COLORS.glow} 0%, ${COLORS.neon} 100%)`,
                        color: COLORS.mainText,
                        boxShadow: `0 6px 18px ${COLORS.neon}44, 0 0 0 1px ${COLORS.glow}55`,
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex items-end gap-2">
                    <span className="relative">
                      {/* the avatar glows once when a fresh reply arrives */}
                      {justRepliedId === m.id && (
                        <span
                          aria-hidden="true"
                          className="bloopy-reply-halo pointer-events-none absolute -inset-1 rounded-full"
                          style={{ background: COLORS.neon, boxShadow: `0 0 18px ${COLORS.neon}, 0 0 26px ${COLORS.glow}88` }}
                        />
                      )}
                      <BloopyAvatar className="relative h-7 w-7" />
                    </span>
                    <div
                      className={`max-w-[78%] rounded-3xl rounded-bl-md border px-4 py-2.5 text-sm leading-relaxed ${animatedIds.has(m.id) ? "bloopy-msg-in" : ""}`}
                      style={{
                        background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                        borderColor: COLORS.cardBorder,
                        color: COLORS.mainText,
                        boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 22px ${COLORS.bgDeep}88`,
                      }}
                    >
                      {m.content}
                    </div>
                  </div>
                )
              )}

              {/* typing indicator */}
              {typing && (
                <div className="flex items-end gap-2">
                  <span className="relative">
                    {/* tiny Bloopy glow pulse while thinking (calm, reduced-motion safe) */}
                    <span
                      aria-hidden="true"
                      className="bloopy-think-glow pointer-events-none absolute -inset-1 rounded-full blur-md"
                      style={{ background: COLORS.neon, opacity: 0.4 }}
                    />
                    <BloopyAvatar className="relative h-7 w-7" />
                  </span>
                  <div
                    className="flex items-center gap-1.5 rounded-3xl rounded-bl-md border px-4 py-3"
                    style={{
                      background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
                      borderColor: COLORS.cardBorder,
                      boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 8px 22px ${COLORS.bgDeep}88`,
                    }}
                  >
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="h-2 w-2 rounded-full animate-[bloopyTyping_1s_ease-in-out_infinite]"
                        style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}`, animationDelay: `${i * 0.15}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      {/* friendly error */}
      {error && (
        <div className="relative z-10 px-4 pb-1">
          <p
            className="rounded-2xl border px-4 py-3 text-sm leading-relaxed"
            style={{
              borderColor: `${COLORS.red}33`,
              background: `${COLORS.red}14`,
              color: COLORS.softText,
            }}
          >
            {error}
          </p>
        </div>
      )}

      {/* ===== Composer ===== */}
      <div className="relative z-10 bloopy-nav-pad px-4 pt-2">
        <form
          onSubmit={sendMessage}
          className="flex items-center gap-2 rounded-full border px-2 py-2 pl-5"
          style={{
            background: `${COLORS.card}F2`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}14, inset 0 0 18px ${COLORS.neon}10, 0 8px 24px ${COLORS.bgDeep}88`,
            backdropFilter: "blur(12px)",
          }}
        >
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Say anything…"
            maxLength={2000}
            aria-label="Message Bloopy"
            className="min-w-0 flex-1 bg-transparent text-sm outline-none bloopy-placeholder"
            style={{ color: COLORS.mainText }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || typing || loading}
            aria-label="Send message"
            data-bloopy-sound="none"
            className="bloopy-btn bloopy-tap grid h-10 w-10 shrink-0 place-items-center rounded-full transition-all duration-200 hover:scale-105 active:scale-90"
            style={{
              background: `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})`,
              color: COLORS.mainText,
              boxShadow: `0 0 18px ${COLORS.neon}88`,
            }}
          >
            <SendIcon className="h-5 w-5" />
          </button>
        </form>
        <p className="mt-2 px-3 text-center text-[10px] leading-relaxed" style={{ color: COLORS.mutedText }}>
          Bloopy can use your check-in, memories, and — when connected — approved physical body tools.
        </p>
      </div>

      {/* component-scoped keyframes */}
      <style>{`
        @keyframes bloopyTyping {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
        @keyframes bloopy-dot {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5 }
          30% { transform: translateY(-4px); opacity: 1 }
        }
        .bloopy-dot { animation: bloopy-dot 1.1s ease-in-out infinite; }
        /* soft entrance pop for newly sent / received messages */
        @keyframes bloopyMsgIn {
          0% { opacity: 0; transform: translateY(6px) scale(0.98); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        .bloopy-msg-in { animation: bloopyMsgIn 0.32s ease both; }
        /* one-shot gentle glow behind a fresh Bloopy reply (no looping) */
        @keyframes bloopyReplyHalo {
          0% { opacity: 0; transform: scale(0.92); }
          35% { opacity: 0.45; }
          100% { opacity: 0; transform: scale(1.12); }
        }
        .bloopy-reply-halo { animation: bloopyReplyHalo 1s ease forwards; filter: blur(6px); }
        /* gentle, looping glow pulse on Bloopy's avatar while thinking */
        @keyframes bloopyThinkGlow {
          0%, 100% { opacity: 0.28; transform: scale(0.96); }
          50% { opacity: 0.5; transform: scale(1.06); }
        }
        .bloopy-think-glow { animation: bloopyThinkGlow 1.8s ease-in-out infinite; }
        @keyframes bloopyFadeIn { 0% { opacity: 0; } 100% { opacity: 1; } }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
          .bloopy-dot { animation: none; opacity: 0.7 }
          .animate-\\[bloopyTyping_1s_ease-in-out_infinite\\] { animation: none !important; }
          /* drop the movement, keep a soft fade only */
          .bloopy-msg-in { animation: bloopyFadeIn 0.3s ease both !important; }
          .bloopy-reply-halo { animation: none !important; opacity: 0 !important; }
          /* keep a calm static glow instead of a pulse */
          .bloopy-think-glow { animation: none !important; opacity: 0.32 !important; }
        }
      `}</style>
    </main>
  );
}
