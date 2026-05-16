"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchPublicScreenings, toScreening } from '@/utils/screening-api';
import type { Screening } from '@/components/screening/types';

const CACHE_KEY = 'kk_scr_events';
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const POLL_MS   = 30_000;

type CacheEntry = { events: Screening[]; ts: number };

function readCache(): Screening[] {
  try {
    if (typeof window === 'undefined') return [];
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return [];
    const entry = JSON.parse(raw) as CacheEntry;
    return entry.events ?? [];
  } catch { return []; }
}

function isCacheFresh(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return false;
    const entry = JSON.parse(raw) as CacheEntry;
    return Date.now() - entry.ts < CACHE_TTL;
  } catch { return false; }
}

function writeCache(events: Screening[]) {
  try {
    if (typeof window === 'undefined') return;
    localStorage.setItem(CACHE_KEY, JSON.stringify({ events, ts: Date.now() }));
  } catch {}
}

type UseScreeningEventsResult = {
  screenings: Screening[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useScreeningEvents(): UseScreeningEventsResult {
  // Start empty — matches server render, no hydration mismatch
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const res    = await fetchPublicScreenings({ limit: 6 });
      const events = (res.events ?? []).map(toScreening);
      setScreenings(events);
      writeCache(events);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Load from localStorage first — instant render for returning users
    const cached = readCache();
    if (cached.length > 0) {
      setScreenings(cached);
      setLoading(false);
    }
    // Skip network fetch if cache is still fresh
    if (isCacheFresh()) {
      const id = setInterval(load, POLL_MS);
      return () => clearInterval(id);
    }
    // Stale or empty: fetch immediately
    load();
    const id = setInterval(load, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return { screenings, loading, error, refetch: load };
}
