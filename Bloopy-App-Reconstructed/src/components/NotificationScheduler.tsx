"use client";

import { useEffect } from "react";
import { checkAndSendScheduledNotifications, loadNotificationPreferences } from "@/lib/notifications";

/**
 * Mounted once inside the protected Bloopy layout. While a Bloopy tab is open,
 * checks every minute whether any enabled daily nudge is due and fires it via
 * the browser Notification API. Renders nothing.
 */
export default function NotificationScheduler() {
  useEffect(() => {
    function tick() {
      checkAndSendScheduledNotifications(loadNotificationPreferences());
    }

    tick();
    const interval = setInterval(tick, 60_000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
