"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchPublicScreenings, toScreening } from '@/utils/screening-api';
import type { Screening } from '@/components/screening/types';

const CACHE_KEY = 'kk_scr_events';
const POLL_MS   = 30_000;

function readCache(): Screening[] {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as Screening[]) : [];
  } catch { return []; }
}

function writeCache(events: Screening[]) {
  try { sessionStorage.setItem(CACHE_KEY, JSON.stringify(events)); } catch {}
}

type UseScreeningEventsResult = {
  screenings: Screening[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useScreeningEvents(): UseScreeningEventsResult {
  // Must match SSR: start empty so server and client agree on initial render
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res    = await fetchPublicScreenings();
      const events = res.events.map(toScreening);
      setScreenings(events);
      writeCache(events);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Safe to read sessionStorage here — this only runs on the client after hydration
    const cached = readCache();
    if (cached.length > 0) {
      setScreenings(cached);
      setLoading(false);
    }
    // Fetch fresh data (and poll every 30 s silently)
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { screenings, loading, error, refetch: load };
}
