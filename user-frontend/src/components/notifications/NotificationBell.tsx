"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl, getSession } from "@/utils/api";
import "./NotificationBell.css";

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
  game?: string | null;
}

interface NotificationBellProps {
  /** Navigates to the full notifications page */
  onViewAll?: () => void;
}

const TYPE_ICON: Record<string, string> = {
  game_created:          "🏟️",
  game_registered:       "✅",
  game_cancelled:        "⛔",
  game_backout_player:   "↩",
  game_backout_organiser:"📢",
  refund_credited:       "💚",
  waitlist_joined:       "⏳",
  waitlist_spot:         "🔔",
  waitlist_approved:     "🎉",
  player_removed:        "❌",
  wallet_topup:          "💰",
  wallet_debit:          "💸",
  wallet_refund:         "💰",
  system:                "ℹ️",
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
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationBell({ onViewAll }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // ── Fetch unread count (runs on mount + every 15s) ─────────────────────
  const fetchUnreadCount = useCallback(async () => {
    const { token } = getSession();
    if (!token) return;
    try {
      const res = await fetch(buildApiUrl("/api/v1/notifications/unread-count"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success) setUnread(data.data?.count ?? 0);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 15_000);
    return () => clearInterval(id);
  }, [fetchUnreadCount]);

  // ── Fetch notification list when panel opens ───────────────────────────
  const fetchNotifications = useCallback(async () => {
    const { token } = getSession();
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/notifications?limit=20"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.success) {
        setNotifications(data.data?.notifications ?? []);
        setUnread(data.data?.unread ?? 0);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  const handleOpen = () => {
    setOpen((v) => {
      if (!v) fetchNotifications();
      return !v;
    });
  };

  // ── Close on outside click ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current  && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Mark single notification as read ──────────────────────────────────
  const markRead = async (n: Notification) => {
    if (!n.isRead) {
      const { token } = getSession();
      if (!token) return;
      try {
        await fetch(buildApiUrl(`/api/v1/notifications/${n._id}/read`), {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        });
        setNotifications((prev) =>
          prev.map((x) => (x._id === n._id ? { ...x, isRead: true } : x))
        );
        setUnread((c) => Math.max(0, c - 1));
      } catch {
        // non-critical
      }
    }
    if (n.actionUrl) {
      setOpen(false);
      router.push(n.actionUrl);
    }
  };

  // ── Mark all as read ───────────────────────────────────────────────────
  const markAllRead = async () => {
    if (marking || unread === 0) return;
    setMarking(true);
    const { token } = getSession();
    if (!token) { setMarking(false); return; }
    try {
      await fetch(buildApiUrl("/api/v1/notifications/read-all"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((x) => ({ ...x, isRead: true })));
      setUnread(0);
    } catch {
      // non-critical
    } finally {
      setMarking(false);
    }
  };

  return (
    <div className="nb-wrap">
      <button
        ref={btnRef}
        className={`nb-btn${open ? " nb-active" : ""}`}
        onClick={handleOpen}
        aria-label="Notifications"
        title="Notifications"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unread > 0 && (
          <span className="nb-badge">{unread > 99 ? "99+" : unread}</span>
        )}
      </button>

      {open && (
        <div className="nb-panel" ref={panelRef}>
          {/* Header */}
          <div className="nb-header">
            <span className="nb-header-title">Notifications</span>
            <button
              className="nb-mark-all"
              onClick={markAllRead}
              disabled={marking || unread === 0}
            >
              {marking ? "Marking…" : "Mark all read"}
            </button>
          </div>

          {/* Content */}
          {loading ? (
            <div className="nb-loading"><div className="nb-spinner" /></div>
          ) : notifications.length === 0 ? (
            <div className="nb-empty">
              <span className="nb-empty-icon">🔔</span>
              <span className="nb-empty-text">All caught up! No notifications yet.</span>
            </div>
          ) : (
            <div className="nb-list">
              {notifications.map((n) => (
                <button
                  key={n._id}
                  className={`nb-item${!n.isRead ? " nb-unread" : ""}`}
                  onClick={() => markRead(n)}
                >
                  <span className="nb-icon">{TYPE_ICON[n.type] ?? "ℹ️"}</span>
                  <span className="nb-content">
                    <span className="nb-title">{n.title}</span>
                    <span className="nb-body">{n.body}</span>
                    <span className="nb-time">{timeAgo(n.createdAt)}</span>
                  </span>
                  {!n.isRead && <span className="nb-dot" />}
                </button>
              ))}
            </div>
          )}

          {/* Footer */}
          <div className="nb-footer">
            <button
              className="nb-footer-link"
              onClick={() => {
                setOpen(false);
                if (onViewAll) onViewAll();
              }}
            >
              View all notifications →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
