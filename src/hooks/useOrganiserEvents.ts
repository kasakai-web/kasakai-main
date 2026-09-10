"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildApiUrl, getSession, handleAuthExpiry } from "@/utils/api";

export const ORGANISER_EVENT_PAGE_SIZE = 6;
export type OrganiserEventScope = "upcoming" | "past" | "attended";
export type ProfileEvent = { id: string; title: string; date: string; location: string };
export type EventPagination = { total: number; hasMore: boolean; nextCursor: string | null };
type EventPage = { events: ProfileEvent[]; pagination: EventPagination };

export async function fetchOrganiserProfile<T>(
  organiserId: string,
  currentGameId: string,
  signal: AbortSignal,
  page?: { scope: OrganiserEventScope; cursor: string },
): Promise<T> {
  const { token } = getSession();
  if (!token) throw new Error("Please log in to view this organiser's profile.");
  const query = new URLSearchParams({ excludeGame: currentGameId, limit: String(ORGANISER_EVENT_PAGE_SIZE) });
  if (page) {
    query.set("scope", page.scope);
    query.set("cursor", page.cursor);
  }
  const response = await fetch(buildApiUrl(`/games/organisers/${encodeURIComponent(organiserId)}/profile?${query}`), {
    headers: { Authorization: `Bearer ${token}` }, signal,
  });
  if (response.status === 401) {
    handleAuthExpiry();
    throw new Error("Your session has expired. Please log in again.");
  }
  if (!response.ok) throw new Error(response.status === 404 ? "Organiser not found." : "Couldn't load this profile. Please try again.");
  const result = await response.json();
  if (!result.success || !result.data) throw new Error("Couldn't load this profile. Please try again.");
  return result.data as T;
}

export function useOrganiserEvents({ organiserId, currentGameId, scope, initialEvents, pagination, enabled = true }: {
  organiserId: string;
  currentGameId: string;
  scope: OrganiserEventScope;
  initialEvents: ProfileEvent[];
  pagination?: EventPagination;
  enabled?: boolean;
}) {
  // Also reveal legacy responses in batches during a staggered backend rollout.
  const [page, setPage] = useState<EventPage>(() => ({
    events: initialEvents.slice(0, ORGANISER_EVENT_PAGE_SIZE),
    pagination: pagination ?? {
      total: initialEvents.length,
      hasMore: initialEvents.length > ORGANISER_EVENT_PAGE_SIZE,
      nextCursor: null,
    },
  }));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const requestRef = useRef<AbortController | null>(null);
  const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);

  useEffect(() => () => { requestRef.current?.abort(); }, []);

  const loadMore = useCallback(async () => {
    if (!enabled || requestRef.current || !page.pagination.hasMore) return;
    if (!pagination) {
      setPage((previous) => {
        const events = initialEvents.slice(0, previous.events.length + ORGANISER_EVENT_PAGE_SIZE);
        return { events, pagination: { total: initialEvents.length, hasMore: events.length < initialEvents.length, nextCursor: null } };
      });
      return;
    }
    if (!page.pagination.nextCursor) return;

    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await fetchOrganiserProfile<EventPage>(organiserId, currentGameId, controller.signal, {
        scope, cursor: page.pagination.nextCursor,
      });
      if (controller.signal.aborted) return;
      if (!Array.isArray(result.events) || !result.pagination
        || (result.pagination.hasMore && (!result.pagination.nextCursor || result.pagination.nextCursor === page.pagination.nextCursor))) {
        throw new Error("Couldn't load more events. Please try again.");
      }
      setPage((previous) => {
        const seen = new Set(previous.events.map((event) => event.id));
        const additions = result.events.filter((event) => {
          if (seen.has(event.id)) return false;
          seen.add(event.id);
          return true;
        });
        return { events: [...previous.events, ...additions], pagination: result.pagination };
      });
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Couldn't load more events. Please try again.");
    } finally {
      if (requestRef.current === controller) requestRef.current = null;
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [organiserId, currentGameId, scope, pagination, initialEvents, page.pagination, enabled]);

  useEffect(() => {
    if (!enabled || !scrollRoot || !sentinel || !page.pagination.hasMore || loading || error || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) void loadMore();
    }, { root: scrollRoot, rootMargin: "80px 0px" });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [enabled, scrollRoot, sentinel, page.pagination.hasMore, page.events.length, loading, error, loadMore]);

  return { ...page, loading, error, loadMore, scrollRef: setScrollRoot, sentinelRef: setSentinel };
}
