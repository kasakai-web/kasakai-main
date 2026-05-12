"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "../dashboard.module.css";
import { scrApi, toUIScrEvent, type UIScrEvent } from "@/lib/screening-api";
import { ScrEvent, scrStatusBadge } from "./types";
import { ScrEventCard } from "./EventCard";

function ScrHead({ total, onCreate }: { total: number; onCreate: () => void }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
      <div>
        <p style={{ margin: "0 0 2px", fontSize: "10px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.15em", textTransform: "uppercase" }}>Streaming</p>
        <h2 style={{ margin: "0 0 4px", fontSize: "24px", fontWeight: 800, color: "var(--white)" }}>Screening Events</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)" }}>{total} events across all statuses</p>
      </div>
      <button
        type="button"
        onClick={onCreate}
        style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "10px 18px", background: "rgba(91,230,178,0.1)", border: "1.5px solid rgba(91,230,178,0.35)", borderRadius: "10px", color: "#5be6b2", fontSize: "13px", fontWeight: 700, cursor: "pointer", transition: "all 0.15s" }}
        onMouseEnter={e => (e.currentTarget.style.background = "rgba(91,230,178,0.18)")}
        onMouseLeave={e => (e.currentTarget.style.background = "rgba(91,230,178,0.1)")}
      >
        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14" /></svg>
        Create Event
      </button>
    </div>
  );
}

export function ScrEvents() {
  const router = useRouter();

  const [events, setEvents]         = useState<UIScrEvent[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | ScrEvent["status"]>("all");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await scrApi.listAdmin();
      setEvents(res.events.map(toUIScrEvent));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const handleCreate       = useCallback(() => router.push("/dashboard/streaming/create-new-event"), [router]);
  const handleSearch       = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const handleStatusFilter = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => setStatusFilter(e.target.value as typeof statusFilter), []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return events.filter(ev => {
      const matchQ      = !q || [ev.title, ev.venue].join(" ").toLowerCase().includes(q);
      const matchStatus = statusFilter === "all" || ev.status === statusFilter;
      return matchQ && matchStatus;
    });
  }, [events, search, statusFilter]);

  const handleQuickPublish = useCallback(async (id: string) => {
    try {
      await scrApi.publishEvent(id);
      await fetchEvents();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to publish");
    }
  }, [fetchEvents]);

  const handleQuickCancel = useCallback(async (id: string) => {
    if (!confirm("Cancel this event?")) return;
    try {
      await scrApi.cancelEvent(id);
      await fetchEvents();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to cancel");
    }
  }, [fetchEvents]);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this draft event? This cannot be undone.")) return;
    try {
      await scrApi.deleteEvent(id);
      await fetchEvents();
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to delete");
    }
  }, [fetchEvents]);

  return (
    <>
      <ScrHead total={events.length} onCreate={handleCreate} />

      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search events, venues…" value={search} onChange={handleSearch} />
        <select className={styles.filterSelect} value={statusFilter} onChange={handleStatusFilter}>
          <option value="all">All Status</option>
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {loading && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)", fontSize: "14px" }}>
          Loading events…
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: "16px 20px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: "10px", color: "#ef4444", fontSize: "13px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
          <span>{error}</span>
          <button type="button" onClick={fetchEvents} style={{ padding: "6px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: "6px", color: "#ef4444", fontSize: "11px", fontWeight: 700, cursor: "pointer" }}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ textAlign: "center", padding: "64px 0", color: "var(--muted)", fontSize: "14px" }}>
          <svg width="36" height="36" fill="none" viewBox="0 0 24 24" stroke="var(--border2)" strokeWidth="1.5" strokeLinecap="round" style={{ display: "block", margin: "0 auto 12px" }}>
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          {events.length === 0 ? "No events yet. Create your first screening event." : "No events found."}
        </div>
      )}

      {!loading && filtered.map(ev => (
        <ScrEventCard
          key={ev.id}
          ev={ev}
          onManage={()        => router.push(`/dashboard/streaming/${ev.id}/manage`)}
          onViewAnalytics={()  => router.push(`/dashboard/streaming/${ev.id}/analytics`)}
          onViewEvent={()     => router.push(`/dashboard/streaming/${ev.id}`)}
          onPublish={ev.status === "draft" ? () => handleQuickPublish(ev.id) : undefined}
          onCancel={ev.status !== "cancelled" ? () => handleQuickCancel(ev.id) : undefined}
          onDelete={ev.status === "draft" ? () => handleDelete(ev.id) : undefined}
        />
      ))}
    </>
  );
}
