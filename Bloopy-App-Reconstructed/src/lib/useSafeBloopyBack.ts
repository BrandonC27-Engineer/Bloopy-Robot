"use client";

/**
 * Safe in-app back navigation for Bloopy.
 *
 * Top-left "back" arrows must never escape the Bloopy app. A raw
 * `router.back()` walks the browser's history, which may point at an external
 * page (the site the user came from, an OAuth redirect, etc.). Instead we keep
 * a tiny stack of the *internal* Bloopy routes the user has visited this
 * session and step back through that. If there is no safe target, we fall back
 * to a known in-app route.
 *
 * Storage is sessionStorage only (small, non-sensitive route paths) and is
 * read/written after mount, so there is no hydration mismatch.
 */

import { useCallback, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

/** Internal Bloopy route prefixes a back action is allowed to land on. */
export const INTERNAL_ROUTES = [
  "/app",
  "/chat",
  "/mood",
  "/journal",
  "/reminders",
  "/tasks",
  "/memory",
  "/settings",
  "/check-in",
  "/recap",
  "/onboarding",
  "/profile-insights",
  "/robot",
  "/unstuck",
] as const;

const HISTORY_KEY = "bloopy.nav.history";
const MAX_HISTORY = 20;

/** True when `path` belongs to one of the internal Bloopy routes. */
export function isInternalRoute(path: string): boolean {
  return INTERNAL_ROUTES.some((r) => path === r || path.startsWith(`${r}/`));
}

function safeReadHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.sessionStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((p): p is string => typeof p === "string") : [];
  } catch {
    return [];
  }
}

function safeWriteHistory(history: string[]): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(-MAX_HISTORY)));
  } catch {
    // sessionStorage unavailable — back nav simply falls back to the page default
  }
}

/**
 * Records internal route changes into a small sessionStorage stack. Mount once
 * (in the protected layout) so safe-back always has a trail to follow.
 */
export function useBloopyRouteHistory(): void {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isInternalRoute(pathname)) return;
    const history = safeReadHistory();
    if (history[history.length - 1] === pathname) return; // ignore re-renders on the same route
    history.push(pathname);
    safeWriteHistory(history);
  }, [pathname]);
}

/**
 * Returns a `goBack` that always stays inside the Bloopy app: it walks the
 * recorded internal-route stack for the most recent *different* internal route
 * and navigates there, falling back to `fallback` when there is no safe
 * target. Never calls raw `router.back()`, so it can't leave the app.
 */
export function useSafeBloopyBack(fallback = "/app"): () => void {
  const router = useRouter();
  const pathname = usePathname();

  return useCallback(() => {
    const history = safeReadHistory();
    let i = history.length - 1;
    // skip any trailing entries that are the current page
    while (i >= 0 && history[i] === pathname) i--;
    // find the nearest previous internal route that isn't the current page
    while (i >= 0) {
      const candidate = history[i];
      if (candidate && candidate !== pathname && isInternalRoute(candidate)) {
        safeWriteHistory(history.slice(0, i + 1));
        router.push(candidate);
        return;
      }
      i--;
    }
    // nothing safe to go back to — use the page's in-app fallback
    safeWriteHistory([]);
    router.push(fallback);
  }, [router, pathname, fallback]);
}
