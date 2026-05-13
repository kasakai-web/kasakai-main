"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
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
  const cachedRef              = useRef<Screening[]>(readCache());
  const [screenings, setScreenings] = useState<Screening[]>(cachedRef.current);
  // Only show spinner when there's nothing to display yet
  const [loading, setLoading]  = useState(cachedRef.current.length === 0);
  const [error,   setError]    = useState<string | null>(null);

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
      setLoading(false); // clears initial spinner; no-op on background polls
    }
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { screenings, loading, error, refetch: load };
}
