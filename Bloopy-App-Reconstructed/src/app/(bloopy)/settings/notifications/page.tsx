"use client";
import { useBloopyThemeColors } from "@/components/BloopyThemeProvider";

import Link from "next/link";
import { useEffect, useState } from "react";
import Switch from "@/components/Switch";
import {
  type NotificationPreferences,
  DEFAULT_NOTIFICATION_PREFERENCES,
  SCHEDULED_NOTIFICATIONS,
  getNotificationPermission,
  isNotificationSupported,
  loadNotificationPreferences,
  requestNotificationPermission,
  saveNotificationPreferences,
} from "@/lib/notifications";


function formatHour(hour: number): string {
  const period = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:00 ${period}`;
}

const TOGGLES: { key: keyof NotificationPreferences; title: string; note: string }[] = [
  {
    key: "dailyCheckIns",
    title: "Daily check-ins",
    note: `A daily nudge around ${formatHour(SCHEDULED_NOTIFICATIONS.dailyCheckIns.hour)} to check in with Bloopy in chat.`,
  },
  {
    key: "reminderNudges",
    title: "Reminder nudges",
    note: "Nudges for the tasks you've added.",
  },
  {
    key: "moodCheckIns",
    title: "Mood check-in reminders",
    note: `A daily nudge around ${formatHour(SCHEDULED_NOTIFICATIONS.moodCheckIns.hour)} to log how you're feeling.`,
  },
  {
    key: "journalReminders",
    title: "Journal reminders",
    note: `A daily nudge around ${formatHour(SCHEDULED_NOTIFICATIONS.journalReminders.hour)} to write something down.`,
  },
];

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="m15 6-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function NotificationsSettingsPage() {
  const COLORS = useBloopyThemeColors();
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);
  const [mounted, setMounted] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  // load saved preferences + current permission once the component mounts (client-only, avoids hydration mismatch)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time hydration from localStorage on mount
    setPreferences(loadNotificationPreferences());
    setPermission(getNotificationPermission());
    setMounted(true);
  }, []);

  // persist whenever preferences change, after the initial load
  useEffect(() => {
    if (!mounted) return;
    saveNotificationPreferences(preferences);
  }, [preferences, mounted]);

  async function toggle(key: keyof NotificationPreferences) {
    const enabling = !preferences[key];

    // ask for permission only when turning a notification on, and only if we haven't already decided
    if (enabling && isNotificationSupported() && Notification.permission === "default") {
      const result = await requestNotificationPermission();
      setPermission(result);
    }

    setPreferences((prev) => ({ ...prev, [key]: enabling }));
  }

  let permissionNote: string | null = null;
  if (permission === "unsupported") {
    permissionNote = "Your browser doesn't support notifications, so these nudges can't be delivered here.";
  } else if (permission === "denied") {
    permissionNote = "Notifications are blocked for Bloopy in your browser. Allow notifications in your browser's site settings to receive these nudges.";
  } else if (permission === "default") {
    permissionNote = "Turn on a nudge below to ask your browser for notification permission.";
  } else if (permission === "granted") {
    permissionNote = "Notifications are enabled ✦ Bloopy can nudge you while this app is open in a tab.";
  }

  return (
    <main
      className="relative mx-auto flex min-h-[100dvh] w-full max-w-md flex-col overflow-hidden font-sans"
      style={{ background: `radial-gradient(120% 80% at 50% -10%, ${COLORS.card} 0%, ${COLORS.bg} 45%, ${COLORS.bgDeep} 100%)` }}
    >
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
        <Link
          href="/settings"
          className="inline-flex items-center gap-1.5 text-sm font-semibold transition-colors"
          style={{ color: COLORS.softText }}
        >
          <ChevronIcon className="h-4 w-4" />
          Settings
        </Link>

        <div className="mt-4">
          <h1 className="text-2xl font-bold leading-tight" style={{ color: COLORS.mainText, textShadow: `0 0 26px ${COLORS.neon}40` }}>
            Notifications
          </h1>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: COLORS.softText }}>
            Choose when Bloopy can nudge you.
          </p>
        </div>
      </header>

      {/* ===== Content ===== */}
      <div className="relative z-10 flex-1 overflow-y-auto bloopy-nav-pad px-4 pt-5">
        {/* permission status */}
        {permissionNote && (
          <p
            className="mb-4 rounded-2xl border px-4 py-3 text-xs leading-relaxed"
            style={{
              borderColor: permission === "denied" || permission === "unsupported" ? `${COLORS.red}33` : `${COLORS.neon}33`,
              background: permission === "denied" || permission === "unsupported" ? `${COLORS.red}14` : `${COLORS.card}CC`,
              color: COLORS.softText,
            }}
          >
            {permissionNote}
          </p>
        )}

        <section
          className="overflow-hidden rounded-3xl border"
          style={{
            background: `linear-gradient(160deg, ${COLORS.cardAlt} 0%, ${COLORS.card} 100%)`,
            borderColor: COLORS.cardBorder,
            boxShadow: `0 0 0 1px ${COLORS.neon}10, 0 10px 30px #00040A99`,
          }}
        >
          <ul className="divide-y" style={{ borderColor: COLORS.cardBorder }}>
            {TOGGLES.map((item) => (
              <li key={item.key} className="flex items-center gap-3 px-5 py-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold" style={{ color: COLORS.mainText }}>
                    {item.title}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
                    {item.note}
                  </p>
                </div>
                <Switch checked={preferences[item.key]} onChange={() => toggle(item.key)} label={item.title} />
              </li>
            ))}
          </ul>
        </section>

        {/* reminder nudges callout */}
        <p className="mt-4 px-2 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
          Reminder nudges will start firing once your tasks have due times — for now this switch just saves your preference so it&rsquo;s ready to go.
        </p>

        {/* general limitations */}
        <p className="mt-2 px-2 text-xs leading-relaxed" style={{ color: COLORS.mutedText }}>
          These nudges run only while Bloopy is open in a browser tab. Full background and mobile push notifications aren&rsquo;t implemented yet.
        </p>
      </div>
    </main>
  );
}
