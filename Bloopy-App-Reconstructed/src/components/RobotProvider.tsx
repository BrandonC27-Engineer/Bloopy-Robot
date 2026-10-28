"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  fetchRobotStatus,
  sendRobotAction,
  type RobotActionName,
  type RobotActionResult,
  type RobotStatus,
} from "@/lib/robotConnection";

type RobotContextValue = {
  status: RobotStatus | null;
  connected: boolean;
  loading: boolean;
  error: string | null;
  actionBusy: RobotActionName | null;
  refresh: () => Promise<void>;
  act: (
    action: RobotActionName,
    params?: Record<string, string | number | boolean>
  ) => Promise<RobotActionResult>;
};

const RobotContext = createContext<RobotContextValue | null>(null);

const ACTIVE_POLL_MS = 1800;
const HIDDEN_POLL_MS = 6000;

export default function RobotProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<RobotStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState<RobotActionName | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const controller = new AbortController();
    try {
      const next = await fetchRobotStatus(controller.signal);
      if (!mountedRef.current) return;
      setStatus(next);
      setError(null);
    } catch (err) {
      if (!mountedRef.current) return;
      setStatus(null);
      setError(err instanceof Error ? err.message : "Physical Bloopy is offline.");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();

    let timer: ReturnType<typeof setTimeout> | null = null;

    const schedule = () => {
      if (!mountedRef.current) return;
      const delay = document.visibilityState === "visible" ? ACTIVE_POLL_MS : HIDDEN_POLL_MS;
      timer = setTimeout(async () => {
        await refresh();
        schedule();
      }, delay);
    };

    schedule();

    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      mountedRef.current = false;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  const act = useCallback(
    async (
      action: RobotActionName,
      params: Record<string, string | number | boolean> = {}
    ) => {
      setActionBusy(action);
      try {
        const result = await sendRobotAction(action, params);
        if (result.status) {
          setStatus(result.status);
          setError(null);
        } else {
          await refresh();
        }
        return result;
      } finally {
        setActionBusy(null);
      }
    },
    [refresh]
  );

  const value = useMemo<RobotContextValue>(
    () => ({
      status,
      connected: Boolean(status),
      loading,
      error,
      actionBusy,
      refresh,
      act,
    }),
    [status, loading, error, actionBusy, refresh, act]
  );

  return <RobotContext.Provider value={value}>{children}</RobotContext.Provider>;
}

export function useRobot() {
  const value = useContext(RobotContext);
  if (!value) throw new Error("useRobot must be used inside RobotProvider");
  return value;
}
