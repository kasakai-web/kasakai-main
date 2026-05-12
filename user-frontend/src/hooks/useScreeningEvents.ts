"use client";

import { useState, useEffect, useCallback } from 'react';
import { fetchPublicScreenings, toScreening } from '@/utils/screening-api';
import type { Screening } from '@/components/screening/types';

type UseScreeningEventsResult = {
  screenings: Screening[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useScreeningEvents(): UseScreeningEventsResult {
  const [screenings, setScreenings] = useState<Screening[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPublicScreenings();
      setScreenings(res.events.map(toScreening));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load events');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return { screenings, loading, error, refetch: load };
}
