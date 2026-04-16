"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../organizer-dashboard.css";
import "./notifications.css";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

// ── Types ─────────────────────────────────────────────────────────────────────
interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const TYPE_ICON: Record<string, string> = {
  game_created:           "🏟️",
  game_registered:        "✅",
  game_cancelled:         "⛔",
  game_backout_player:    "↩️",
  game_backout_organiser: "📢",
  waitlist_joined:        "⏳",
  waitlist_spot:          "🔔",
  waitlist_approved:      "🎉",
  player_removed:         "❌",
  wallet_topup:           "💰",
  wallet_debit:           "💸",
  wallet_refund:          "💚",
  system:                 "ℹ️",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

const PAGE_SIZE = 30;

// ── Page ──────────────────────────────────────────────────────────────────────
export default function OrganizerNotificationsPage() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const routeUserId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;

  const { isAuthorized } = useAuthGuard({
    requiredRole: "organiser",
    routeUserId,
    redirectTo: "/login",
  });

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [marking, setMarking] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const clearSessionAndExit = () => {
    clearSession();
    router.replace("/login");
  };

  const fetchNotifications = useCallback(async (skip = 0, append = false) => {
    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }
    if (!append) setLoading(true);
    setError("");
    try {
      const res = await fetch(buildApiUrl(`/api/v1/notifications?limit=${PAGE_SIZE}&skip=${skip}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { clearSessionAndExit(); return; }
      const data = await res.json();
      if (!res.ok || !data.success) { setError(data.message || "Failed to load notifications"); return; }
      const list: Notification[] = data.data?.notifications ?? [];
      setNotifications((prev) => append ? [...prev, ...list] : list);
      setHasMore(list.length === PAGE_SIZE);
    } catch (e) {
      setError((e as Error).message || "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchNotifications(0);
  }, [isAuthorized, fetchNotifications]);

  const markRead = async (n: Notification) => {
    if (!n.isRead) {
      const { token } = getSession();
      if (!token) return;
      try {
        await fetch(buildApiUrl(`/api/v1/notifications/${n._id}/read`), {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications((prev) => prev.map((x) => x._id === n._id ? { ...x, isRead: true } : x));
      } catch {}
    }
    if (n.actionUrl) router.push(n.actionUrl);
  };

  const markAllRead = async () => {
    if (marking) return;
    const unreadCount = notifications.filter((n) => !n.isRead).length;
    if (unreadCount === 0) return;
    setMarking(true);
    const { token } = getSession();
    if (!token) { setMarking(false); return; }
    try {
      await fetch(buildApiUrl("/api/v1/notifications/read-all"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
    } catch {}
    finally { setMarking(false); }
  };

  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage * PAGE_SIZE, true);
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="organizer-dashboard-container">
      {/* Page header */}
      <div className="dashboard-header-section" style={{ marginBottom: 24 }}>
        <div className="header-left">
          <h1 className="dashboard-title">Notifications</h1>
          <p className="dashboard-subtitle">Game events and player activity</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="pn-toolbar" style={{ marginBottom: 16, maxWidth: 840 }}>
        <span className="pn-toolbar-count">
          {loading
            ? "Loading…"
            : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        </span>
        <button
          className="pn-mark-all-btn"
          onClick={markAllRead}
          disabled={marking || unreadCount === 0}
        >
          {marking ? "Marking…" : "Mark all read"}
        </button>
      </div>

      {/* Error */}
      {error && <div className="op-error" style={{ marginBottom: 16, maxWidth: 840 }}>{error}</div>}

      {/* Loading skeleton */}
      {loading && (
        <div className="pn-skeleton-list" style={{ maxWidth: 840 }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="pn-skeleton-item">
              <div className="pn-skeleton-icon" />
              <div className="pn-skeleton-content">
                <div className="pn-skeleton-title" />
                <div className="pn-skeleton-body" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && notifications.length === 0 && (
        <div className="pn-empty" style={{ maxWidth: 840 }}>
          <div className="pn-empty-icon">🔔</div>
          <div className="pn-empty-title">All caught up!</div>
          <div className="pn-empty-desc">You have no notifications yet. Game events and player activity will appear here.</div>
        </div>
      )}

      {/* Notification list */}
      {!loading && notifications.length > 0 && (
        <div className="pn-list" style={{ maxWidth: 840 }}>
          {notifications.map((n) => (
            <button
              key={n._id}
              className={`pn-item${!n.isRead ? " pn-item-unread" : ""}`}
              onClick={() => markRead(n)}
            >
              <span className="pn-item-icon">{TYPE_ICON[n.type] ?? "ℹ️"}</span>
              <span className="pn-item-content">
                <span className="pn-item-title">{n.title}</span>
                <span className="pn-item-body">{n.body}</span>
                <span className="pn-item-time">{timeAgo(n.createdAt)}</span>
              </span>
              {!n.isRead && <span className="pn-item-dot" />}
              {n.actionUrl && <span className="pn-item-arrow">→</span>}
            </button>
          ))}

          {hasMore && (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <button className="pn-load-more" onClick={loadMore}>
                Load more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
