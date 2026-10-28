/**
 * Lightweight client-side notification preferences + scheduler helpers.
 *
 * Everything here is browser-only (uses `window`/`Notification`) and backed by
 * localStorage. There is no server/push component — notifications only fire
 * while a Bloopy tab is open and the relevant time has passed for the day.
 */

export type NotificationPreferences = {
  dailyCheckIns: boolean;
  reminderNudges: boolean;
  moodCheckIns: boolean;
  journalReminders: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  dailyCheckIns: true,
  reminderNudges: true,
  moodCheckIns: false,
  journalReminders: false,
};

export const NOTIFICATION_PREFERENCES_STORAGE_KEY = "bloopy:notification-preferences";

const LAST_SENT_STORAGE_KEY = "bloopy:notification-last-sent";

/** Notification types that are backed by a real daily schedule today. */
export type ScheduledNotificationKey = "dailyCheckIns" | "moodCheckIns" | "journalReminders";

type ScheduledNotification = {
  /** Local hour (0-23) after which the notification may fire. */
  hour: number;
  title: string;
  body: string;
  url: string;
};

export const SCHEDULED_NOTIFICATIONS: Record<ScheduledNotificationKey, ScheduledNotification> = {
  dailyCheckIns: {
    hour: 9,
    title: "Bloopy check-in",
    body: "Bloopy check-in: Want to talk for a minute?",
    url: "/chat",
  },
  moodCheckIns: {
    hour: 19,
    title: "Mood check-in",
    body: "Mood check-in: How are you feeling right now?",
    url: "/mood",
  },
  journalReminders: {
    hour: 21,
    title: "Journal reminder",
    body: "Journal reminder: Want to write down one thought from today?",
    url: "/journal",
  },
};

/* ---------- permission helpers ---------- */

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission | "unsupported" {
  if (!isNotificationSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isNotificationSupported()) return "unsupported";
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

/* ---------- preferences (localStorage) ---------- */

export function loadNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined") return DEFAULT_NOTIFICATION_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_PREFERENCES_STORAGE_KEY);
    if (raw) {
      return { ...DEFAULT_NOTIFICATION_PREFERENCES, ...JSON.parse(raw) };
    }
  } catch {
    // ignore malformed storage
  }
  return DEFAULT_NOTIFICATION_PREFERENCES;
}

export function saveNotificationPreferences(preferences: NotificationPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATION_PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
}

/* ---------- last-sent tracking (prevents spamming the same nudge twice a day) ---------- */

function loadLastSentMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(LAST_SENT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function markSentToday(key: string, today: string) {
  if (typeof window === "undefined") return;
  const map = loadLastSentMap();
  map[key] = today;
  window.localStorage.setItem(LAST_SENT_STORAGE_KEY, JSON.stringify(map));
}

function localDateKey(date: Date): string {
  // YYYY-MM-DD in local time, so "today" lines up with the user's clock.
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* ---------- sending ---------- */

function sendNotification(title: string, body: string, url: string) {
  if (getNotificationPermission() !== "granted") return;

  const notification = new Notification(title, {
    body,
    icon: "/bloopy_logo_flat_no_lighting_transparent.png",
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = url;
    notification.close();
  };
}

/**
 * Call periodically (e.g. once a minute) while the app is open. Sends at most
 * one notification per scheduled type per local day, once its hour has passed.
 */
export function checkAndSendScheduledNotifications(preferences: NotificationPreferences) {
  if (getNotificationPermission() !== "granted") return;

  const now = new Date();
  const today = localDateKey(now);
  const lastSent = loadLastSentMap();

  (Object.keys(SCHEDULED_NOTIFICATIONS) as ScheduledNotificationKey[]).forEach((key) => {
    if (!preferences[key]) return;

    const schedule = SCHEDULED_NOTIFICATIONS[key];
    if (now.getHours() < schedule.hour) return;
    if (lastSent[key] === today) return;

    sendNotification(schedule.title, schedule.body, schedule.url);
    markSentToday(key, today);
  });
}
