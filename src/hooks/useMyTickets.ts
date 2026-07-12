"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchMyTickets, toTicket } from '@/utils/screening-api';
import type { Ticket } from '@/components/screening/types';

const CACHE_KEY = 'kk_my_tickets';
const CACHE_TTL = 60_000; // 60 s — short enough to stay fresh, long enough to skip redundant fetches

type CacheEntry = { ts: number; confirmed: Ticket[]; history: Ticket[] };

function readCache(): CacheEntry | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry;
    if (Date.now() - entry.ts > CACHE_TTL) return null;
    return entry;
  } catch { return null; }
}

function writeCache(confirmed: Ticket[], history: Ticket[]) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), confirmed, history }));
  } catch {}
}

export function clearTicketsCache() {
  try { sessionStorage.removeItem(CACHE_KEY); } catch {}
}

type UseMyTicketsResult = {
  confirmed: Ticket[];
  history:   Ticket[];
  loading:   boolean;
  error:     string | null;
  refetch:   () => void;
};

export function useMyTickets(enabled: boolean): UseMyTicketsResult {
  const [confirmed, setConfirmed] = useState<Ticket[]>([]);
  const [history,   setHistory]   = useState<Ticket[]>([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  const load = useCallback(async (force = false) => {
    if (!enabled) return;

    // Serve cache immediately when available; skip network unless forced or cache stale
    const cached = readCache();
    if (cached && !force) {
      setConfirmed(cached.confirmed);
      setHistory(cached.history);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyTickets();
      const c = (data.confirmed ?? []).map(toTicket);
      const h = (data.history   ?? []).map(toTicket);
      setConfirmed(c);
      setHistory(h);
      writeCache(c, h);
    } catch {
      setError('Could not load your tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    load();
  }, [load]);

  // refetch() forces a fresh fetch and busts the cache
  const refetch = useCallback(() => {
    clearTicketsCache();
    load(true);
  }, [load]);

  return { confirmed, history, loading, error, refetch };
}
