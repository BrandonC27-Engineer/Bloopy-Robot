"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { celebrate, fireBloopyReward } from "@/lib/useBloopyReward";
import { awardEnergy } from "@/lib/bloopyEnergy";

type Reminder = {
  id: string; // uuid from Supabase now, not a number
  text: string;
  done: boolean;
  created_at: string;
};

/**
 * Dark futuristic-cozy Bloopy theme — matches Home, Chat, Mood, and Journal.
 */

const LOGO_SRC = "/bloopy_logo_flat_no_lighting_transparent.png";

function formatWhen(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/* ---------- Small content icons ---------- */

function SparkIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function CheckCircleIcon({ className = "", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} style={style} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="m8.5 12 2.3 2.3L15.5 9.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlusIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function CheckIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m5 12.5 4.2 4.2L19 7" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function DeleteIcon({ className = "" }: { className?: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className={className}>
      <path d="M6 6l12 12M18 6 6 18" strokeLinecap="round" />
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

/* ---------- Section wrapper ---------- */

function TaskSection({
  icon,
  label,
  count,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  const COLORS = useBloopyThemeColors();
  return (
    <section
      className="mt-4 rounded-3xl border p-5"
      style={{
        background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
        borderColor: COLORS.cardBorder,
        boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: COLORS.softText }}>
            {label}
          </p>
        </div>
        <span className="text-[11px]" style={{ color: COLORS.mutedText }}>
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  const COLORS = useBloopyThemeColors();
  return (
    <p
      className="mt-3 rounded-2xl border px-4 py-5 text-center text-xs leading-relaxed"
      style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}66`, color: COLORS.mutedText }}
    >
      {children}
    </p>
  );
}

/* ---------- Task row (backed by real reminders data) ---------- */

function TaskRow({
  reminder,
  onToggle,
  onDelete,
  justDone = false,
  isNew = false,
}: {
  reminder: Reminder;
  onToggle: (e: React.MouseEvent) => void;
  onDelete: () => void;
  /** True only for the task just completed this tap — drives the one-shot pop/glow. */
  justDone?: boolean;
  /** True only for a just-added task — drives the soft slide/fade-in. */
  isNew?: boolean;
}) {
  const COLORS = useBloopyThemeColors();
  const done = reminder.done;
  return (
    <li className={isNew ? "bloopy-task-in" : ""}>
      <div
        className={`flex items-start gap-3 rounded-2xl border p-3 transition-all duration-300 ${justDone ? "bloopy-task-glow" : ""}`}
        style={{
          // completed cards feel finished but stay readable: a touch dimmer with
          // a soft themed tint + glow (brighter for the moment it's completed).
          borderColor: done ? `${COLORS.glow}55` : COLORS.cardBorder,
          background: done ? `${COLORS.neon}0F` : `${COLORS.bgDeep}66`,
          boxShadow: justDone ? `0 0 18px ${COLORS.neon}55` : "none",
          opacity: done ? 0.82 : 1,
        }}
      >
        {/* checkbox */}
        <button
          type="button"
          onClick={onToggle}
          data-bloopy-sound="none"
          aria-label={done ? `Mark "${reminder.text}" as not done` : `Mark "${reminder.text}" as done`}
          aria-pressed={done}
          className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full border transition-all duration-200 hover:scale-105 active:scale-90 ${justDone ? "bloopy-check-pop" : ""}`}
          style={{
            borderColor: done ? COLORS.glow : COLORS.cardBorder,
            background: done ? `radial-gradient(circle at 50% 35%, ${COLORS.glow}, ${COLORS.neon})` : "transparent",
            color: done ? COLORS.mainText : "transparent",
            boxShadow: done ? `0 0 12px ${COLORS.neon}88` : "none",
          }}
        >
          {/* the check mark draws itself in the moment a task is completed
              (bloopy-check-draw is disabled / shown solid under reduced motion) */}
          <CheckIcon className={`h-4 w-4 ${justDone ? "bloopy-check-draw" : ""}`} />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className="truncate text-sm font-semibold transition-colors duration-300"
              style={{ color: done ? COLORS.mutedText : COLORS.mainText, textDecoration: done ? "line-through" : "none" }}
            >
              {reminder.text}
            </span>
            <span className="shrink-0 text-[10px]" style={{ color: COLORS.mutedText }}>
              {formatWhen(reminder.created_at)}
            </span>
          </div>
        </div>

        {/* delete */}
        <button
          type="button"
          onClick={onDelete}
          aria-label={`Delete "${reminder.text}"`}
          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors"
          style={{ color: COLORS.mutedText }}
        >
          <DeleteIcon />
        </button>
      </div>
    </li>
  );
}

export default function RemindersPage() {
  const COLORS = useBloopyThemeColors();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // transient ids: the task just completed (one-shot pop/glow) and the task
  // just added (soft slide/fade-in). Both clear themselves after the animation.
  const [justDoneId, setJustDoneId] = useState<string | null>(null);
  const [newId, setNewId] = useState<string | null>(null);

  const supabase = createClient();

  // ---- load the user's reminders on first visit ----
  useEffect(() => {
    async function loadReminders() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Middleware should prevent this, but just in case
        setError("You need to be signed in to see your reminders.");
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("reminders")
        .select("id, text, done, created_at")
        .order("created_at", { ascending: true });

      if (error) {
        setError("Hmm, I couldn't load your reminders. Try refreshing? 💙");
      } else {
        setReminders(data ?? []);
      }
      setLoading(false);
    }

    loadReminders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- add ----
  async function addReminder(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || saving) return;

    setError(null);
    setSaving(true);

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You need to be signed in to add reminders.");
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from("reminders")
      .insert({ user_id: user.id, text })
      .select("id, text, done, created_at")
      .single();

    if (error || !data) {
      setError("That one didn't save. Mind trying again? 💙");
    } else {
      setReminders((prev) => [...prev, data]);
      setDraft("");
      // keep adding subtle: the Add button's press already played a soft tap
      // (global interaction layer); here we just slide the new task in gently.
      setNewId(data.id);
      window.setTimeout(() => setNewId((cur) => (cur === data.id ? null : cur)), 600);
    }
    setSaving(false);
  }

  // ---- toggle done ----
  async function toggleReminder(id: string, currentDone: boolean, e?: React.MouseEvent) {
    setError(null);

    // update the screen right away…
    setReminders((prev) =>
      prev.map((r) => (r.id === id ? { ...r, done: !currentDone } : r))
    );

    // completing a task is a little win → success burst + Bloopy bounce; the
    // moment it finishes the *last* open task it becomes a rare milestone
    // celebration. Un-checking is a quiet, neutral soft tap (no celebration).
    if (!currentDone) {
      // mark this task for the one-shot checkbox pop + card glow (clears itself)
      setJustDoneId(id);
      window.setTimeout(() => setJustDoneId((cur) => (cur === id ? null : cur)), 750);
      // a bit of Bloopy energy for completing a task (once per day)
      awardEnergy("task");
      const nextList = reminders.map((r) => (r.id === id ? { ...r, done: true } : r));
      const allDone = nextList.length > 0 && nextList.every((r) => r.done);
      if (allDone) {
        // rare, calm celebration: themed world particles + a happy Bloopy pulse.
        // The calm "Tiny wins completed" banner shows in the focus card.
        celebrate("milestone", { text: "Tiny wins completed. Bloopy is proud.", x: e?.clientX, y: e?.clientY });
      } else {
        // success burst at the tap + Bloopy reaction (hero + center nav pulse)
        celebrate("success", { text: "Task done", x: e?.clientX, y: e?.clientY });
      }
    } else {
      // un-checking is quiet and neutral — no celebration, no guilt
      fireBloopyReward({ x: e?.clientX, y: e?.clientY, sound: "tap", level: "tap" });
    }

    // …then tell Supabase; roll back if it fails
    const { error } = await supabase
      .from("reminders")
      .update({ done: !currentDone })
      .eq("id", id);

    if (error) {
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, done: currentDone } : r))
      );
      setError("Couldn't save that change — try again? 💙");
    }
  }

  // ---- delete ----
  async function deleteReminder(id: string) {
    setError(null);

    // remember it in case we need to put it back
    const removed = reminders.find((r) => r.id === id);
    setReminders((prev) => prev.filter((r) => r.id !== id));

    const { error } = await supabase.from("reminders").delete().eq("id", id);

    if (error && removed) {
      setReminders((prev) =>
        [...prev, removed].sort((a, b) =>
          a.created_at.localeCompare(b.created_at)
        )
      );
      setError("Couldn't delete that one — try again? 💙");
    }
  }

  const todo = reminders.filter((r) => !r.done);
  const done = reminders.filter((r) => r.done);
  const total = reminders.length;
  const doneCount = done.length;

  return (
    <main
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
    >
      {/* faint circuit grid backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
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
              Focus with Bloopy
            </p>
          </div>
        </div>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Today&apos;s Tasks
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Let&apos;s take today one step at a time.
          </p>
        </div>
      </header>

      {/* ===== Scrollable content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* Today's Focus card */}
        <section
          className="rounded-3xl border p-5"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <div className="flex items-center gap-3">
            <BloopyAvatar className="h-11 w-11" />
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em]" style={{ color: COLORS.softText }}>
                Today&apos;s Focus
              </p>
              <h2 className="text-lg font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                One small step at a time
              </h2>
            </div>
          </div>

          {/* progress */}
          <div className="mt-4 flex items-center justify-between text-[11px]" style={{ color: COLORS.mutedText }}>
            <span>
              {doneCount} of {total} done
            </span>
            <span>{total - doneCount} left</span>
          </div>
          <div className="relative mt-2">
            <div className="h-2 w-full overflow-hidden rounded-full" style={{ background: COLORS.bgDeep }}>
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${total ? (doneCount / total) * 100 : 0}%`,
                  background: `linear-gradient(90deg, ${COLORS.neon}, ${COLORS.glow})`,
                  boxShadow: `0 0 12px ${COLORS.neon}88`,
                }}
              />
            </div>
            {/* soft glow riding the progress edge (gentle pulse; reduced-motion
                safe via bloopy-flame). Hidden at 0% so empty lists stay calm. */}
            {doneCount > 0 && (
              <span
                aria-hidden="true"
                className="bloopy-flame pointer-events-none absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[2px]"
                style={{
                  left: `${(doneCount / total) * 100}%`,
                  background: COLORS.glow,
                  boxShadow: `0 0 10px ${COLORS.glow}, 0 0 16px ${COLORS.neon}88`,
                }}
              />
            )}
          </div>

          {/* all done: a calm, theme-aware "proud" banner (the milestone burst
              fires from the toggle handler). No streak pressure, no guilt. */}
          {total > 0 && doneCount === total && (
            <div
              className="bloopy-task-in mt-4 flex items-center gap-2 rounded-2xl border px-4 py-3"
              style={{ borderColor: `${COLORS.glow}55`, background: `${COLORS.neon}12`, boxShadow: `0 0 16px ${COLORS.neon}2E` }}
            >
              <span
                className="grid h-6 w-6 shrink-0 place-items-center rounded-full"
                style={{ color: COLORS.bgDeep, background: COLORS.glow, boxShadow: `0 0 10px ${COLORS.neon}` }}
              >
                <CheckIcon className="h-3.5 w-3.5" />
              </span>
              <p className="text-sm font-semibold leading-snug" style={{ color: COLORS.mainText }}>
                Tiny wins completed.{" "}
                <span style={{ color: COLORS.softText }}>Bloopy is proud.</span>
              </p>
            </div>
          )}
        </section>

        {/* Add task */}
        <form onSubmit={addReminder} className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's next on your list?"
            aria-label="New task"
            className="min-w-0 flex-1 rounded-2xl border px-4 py-3.5 text-sm outline-none bloopy-placeholder"
            style={{ borderColor: COLORS.cardBorder, background: `${COLORS.bgDeep}66`, color: COLORS.mainText }}
          />
          <button
            type="submit"
            disabled={!draft.trim() || saving}
            aria-label="Add task"
            className="bloopy-btn bloopy-tap flex shrink-0 items-center justify-center gap-2 rounded-2xl border px-4 py-3.5 text-sm font-semibold transition-all duration-200 enabled:hover:-translate-y-0.5 enabled:active:scale-[0.98]"
            style={{
              color: COLORS.mainText,
              borderColor: COLORS.glow,
              background: `linear-gradient(180deg, ${COLORS.glow}, ${COLORS.neon})`,
              boxShadow: `0 0 22px ${COLORS.neon}66, inset 0 0 14px ${COLORS.glow}33`,
            }}
          >
            <PlusIcon className="h-4 w-4" />
            {saving ? "Adding…" : "Add"}
          </button>
        </form>

        {error && (
          <p
            className="mt-3 rounded-2xl border px-4 py-3 text-sm leading-relaxed"
            style={{ borderColor: `${COLORS.red}33`, background: `${COLORS.red}14`, color: COLORS.softText }}
          >
            {error}
          </p>
        )}

        {/* Today */}
        <TaskSection icon={<SparkIcon className="h-4 w-4" style={{ color: COLORS.glow }} />} label="Today" count={todo.length}>
          {loading ? (
            <div className="flex items-center justify-center gap-1.5 py-6">
              <span className="bloopy-dot h-2 w-2 rounded-full" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.15s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
              <span className="bloopy-dot h-2 w-2 rounded-full [animation-delay:0.3s]" style={{ background: COLORS.glow, boxShadow: `0 0 6px ${COLORS.neon}` }} />
            </div>
          ) : todo.length ? (
            <ul className="mt-3 flex flex-col gap-2.5">
              {todo.map((r) => (
                <TaskRow
                  key={r.id}
                  reminder={r}
                  onToggle={(e) => toggleReminder(r.id, r.done, e)}
                  onDelete={() => deleteReminder(r.id)}
                  justDone={justDoneId === r.id}
                  isNew={newId === r.id}
                />
              ))}
            </ul>
          ) : (
            <EmptyNote>All clear ✦ add a little thing above when you&apos;re ready.</EmptyNote>
          )}
        </TaskSection>

        {/* Completed */}
        <TaskSection icon={<CheckCircleIcon className="h-4 w-4" style={{ color: COLORS.glow }} />} label="Completed" count={done.length}>
          {!loading && done.length ? (
            <ul className="mt-3 flex flex-col gap-2.5">
              {done.map((r) => (
                <TaskRow
                  key={r.id}
                  reminder={r}
                  onToggle={(e) => toggleReminder(r.id, r.done, e)}
                  onDelete={() => deleteReminder(r.id)}
                  justDone={justDoneId === r.id}
                />
              ))}
            </ul>
          ) : !loading ? (
            <EmptyNote>Finished tasks will rest here.</EmptyNote>
          ) : null}
        </TaskSection>
      </div>

      {/* loading dots animation */}
      <style>{`
        @keyframes bloopy-dot { 0%, 60%, 100% { transform: translateY(0); opacity: 0.5 } 30% { transform: translateY(-4px); opacity: 1 } }
        .bloopy-dot { animation: bloopy-dot 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .animate-ping { animation: none !important; }
          .bloopy-dot { animation: none; opacity: 0.7 }
        }
      `}</style>
    </main>
  );
}
