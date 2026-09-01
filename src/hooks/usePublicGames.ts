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

/**
 * Upcoming games for signed-out visitors.
 *
 * Fetched once and shared by every landing section that needs it (the hero's
 * count and the games grid), so the page makes a single request and the two can
 * never disagree about how many games there are.
 */
export function usePublicGames(): State {
  const [state, setState] = useState<State>({ games: [], loading: true, error: null });

  useEffect(() => {
    let cancelled = false;

    fetch(buildApiUrl("/games/public"))
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
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
