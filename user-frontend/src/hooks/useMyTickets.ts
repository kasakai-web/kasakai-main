"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchMyTickets, toTicket } from '@/utils/screening-api';
import type { Ticket } from '@/components/screening/types';

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

  const load = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchMyTickets();
      setConfirmed((data.confirmed ?? []).map(toTicket));
      setHistory((data.history ?? []).map(toTicket));
    } catch {
      setError('Could not load your tickets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { load(); }, [load]);

  return { confirmed, history, loading, error, refetch: load };
}
