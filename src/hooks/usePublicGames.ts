"use client";

import { useEffect, useState } from "react";
import { buildApiUrl } from "@/utils/api";

// One upcoming game as the PUBLIC feed describes it — no player identities,
// because GET /games/public is reachable by anyone with the URL.
export type PublicGame = {
  _id: string;
  title: string;
  scheduledAt: string;
  format: string;
  totalSlots: number;
  spotsLeft: number;
  fee: number;
  status: string;
  venue: string;
  city: string;
  metro: string | null;
  metroLabel: string;
};

type State = {
  games: PublicGame[];
  loading: boolean;
  error: string | null;
};

// A request that never settles would leave the grid on its skeleton for ever,
// which is exactly what a bfcache-frozen fetch does. Give every attempt a
// ceiling so "loading" always resolves into games or an error.
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Upcoming games for signed-out visitors.
 *
 * Fetched once and shared by every landing section that needs it (the hero's
 * count and the games grid), so the page makes a single request and the two can
 * never disagree about how many games there are.
 *
 * Coming BACK to the landing page refetches, but that is not arranged here —
 * app/page.tsx remounts its whole tree on a bfcache restore (usePageRestoreKey),
 * so this hook simply runs again from the top like any first mount. It is the
 * one place that decision lives, rather than every effect on the page growing
 * its own `pageshow` listener.
 */
export function usePublicGames(): State {
  const [state, setState] = useState<State>({ games: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      // Keep whatever is already on screen while refreshing underneath — only
      // an empty grid has nothing better to show than the skeleton.
      setState((prev) => ({ ...prev, loading: prev.games.length === 0, error: null }));

      fetch(buildApiUrl("/games/public"), { signal: controller.signal })
        .then((r) => r.json())
        .then((body) => {
          if (cancelled) return;
          if (!body?.success) {
            setState({ games: [], loading: false, error: "Could not load games" });
            return;
          }
          const games: PublicGame[] = [...(body.data || [])].sort(
            (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime(),
          );
          setState({ games, loading: false, error: null });
        })
        .catch(() => {
          if (!cancelled) setState({ games: [], loading: false, error: "Could not reach the server" });
        })
        .finally(() => clearTimeout(timer));

      return controller;
    };

    const controller = load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return state;
}
