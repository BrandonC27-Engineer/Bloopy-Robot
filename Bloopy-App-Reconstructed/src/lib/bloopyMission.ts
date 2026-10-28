/**
 * Today's tiny mission — picks ONE small, kind next step from local context.
 *
 * The whole point is gentleness: there is always exactly one suggestion, it's
 * always small ("one tiny step"), and the copy never pressures. It's pure logic
 * (no storage, no React) so it's trivial to test and reuse.
 *
 * Selection reads only locally-available signals (today's check-in, focus,
 * whether a journal/recap happened today, time of day) — it never queries
 * Supabase or changes any of those flows.
 */

export type MissionId = "check-in" | "recap" | "focus" | "journal" | "task" | "rest";

export type Mission = {
  id: MissionId;
  /** The mission line (what to do). */
  title: string;
  /** Soft Bloopy copy under the title — encouraging, never pressuring. */
  note: string;
  /** Main button label. */
  cta: string;
  /** Where "Start mission" routes. */
  href: string;
};

export type MissionContext = {
  checkInDoneToday: boolean;
  focus: string | null;
  journalDoneToday: boolean;
  recapDoneToday: boolean;
  /** Local hour 0–23 (for the evening wind-down). */
  hour: number;
};

/**
 * Choose the single mission to show, in a calm priority order:
 *   1. No check-in yet      → a 30-second check-in (the gentle daily anchor)
 *   2. Evening, no recap    → wrap up the day softly
 *   3. Today's focus is set → one small step on it
 *   4. Nothing written yet  → one small thought
 *   5. Day fully wrapped    → rest; the loop is complete, nothing left to "earn"
 *   6. Otherwise            → complete one small task (always safe + doable)
 */
export function pickMission(c: MissionContext): Mission {
  if (!c.checkInDoneToday) {
    return {
      id: "check-in",
      title: "Do a 30-second check-in",
      note: "One tiny step for today.",
      cta: "Start mission",
      href: "/check-in",
    };
  }

  if (c.hour >= 18 && !c.recapDoneToday) {
    return {
      id: "recap",
      title: "Wrap up the day",
      note: "No rush. We can close today softly.",
      cta: "Start mission",
      href: "/recap",
    };
  }

  if (c.focus) {
    return {
      id: "focus",
      title: "Work on today's focus",
      note: `One tiny step on ${c.focus}. That counts.`,
      cta: "Start mission",
      href: "/reminders",
    };
  }

  if (!c.journalDoneToday) {
    return {
      id: "journal",
      title: "Write one small thought",
      note: "One honest sentence is enough.",
      cta: "Start mission",
      href: "/journal",
    };
  }

  // Check-in done, journal done, recap done → the whole loop is closed.
  // The kind move is to say "you're done", not to invent more to do.
  if (c.recapDoneToday) {
    return {
      id: "rest",
      title: "Today's loop is complete",
      note: "You showed up for all of it. Rest is allowed 💙",
      cta: "Visit Bloopy",
      href: "/chat",
    };
  }

  return {
    id: "task",
    title: "Complete one small task",
    note: "Pick one small thing. No rush — I'm here.",
    cta: "Start mission",
    href: "/reminders",
  };
}
