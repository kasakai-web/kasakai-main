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
  /** When provided by a parent that already polls, the bell won't poll independently */
  unreadCount?: number;
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

export function NotificationBell({ onViewAll, unreadCount }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(unreadCount ?? 0);
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

  // Sync badge when parent passes a controlled count
  useEffect(() => {
    if (unreadCount !== undefined) setUnread(unreadCount);
  }, [unreadCount]);

  // Only poll independently when no parent is managing the count
  useEffect(() => {
    if (unreadCount !== undefined) return;
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 15_000);
    return () => clearInterval(id);
  }, [fetchUnreadCount, unreadCount]);

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
        setUnread(0);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Panel open/close logic ─────────────────────────────────────────────
  const togglePanel = () => {
    setOpen((v) => {
      if (!v) fetchNotifications();
      return !v;
    });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Mark single notification as read ──────────────────────────────────
  const markRead = async (n: Notification) => {
    setNotifications((prev) =>
      prev.map((p) => (p._id === n._id ? { ...p, isRead: true } : p))
    );
    setUnread(u => Math.max(0, u - 1));

    try {
      await fetch(buildApiUrl(`/api/v1/notifications/${n._id}/read`), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getSession().token}` },
      });
    } catch {
      setNotifications((prev) =>
        prev.map((p) => (p._id === n._id ? { ...p, isRead: false } : p))
      );
      setUnread(u => u + 1);
    }

    if (n.actionUrl) {
      router.push(n.actionUrl);
      setOpen(false);
    }
  };

  // ── Mark all as read ───────────────────────────────────────────────────
  const markAllRead = async () => {
    setMarking(true);
    try {
      await fetch(buildApiUrl("/api/v1/notifications/read-all"), {
        method: "PATCH",
        headers: { Authorization: `Bearer ${getSession().token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
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
        onClick={togglePanel}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && (
          <span className="nb-badge">{unread > 9 ? "9+" : unread}</span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="nb-panel">
          <div className="nb-header">
            <span className="nb-header-title">Notifications</span>
            <button
              className="nb-mark-all"
              onClick={markAllRead}
              disabled={marking || notifications.every(n => n.isRead)}
            >
              {marking ? "Marking…" : "Mark all read"}
            </button>
          </div>

          <div className="nb-list">
            {loading && (
              <div className="nb-loading">
                <div className="nb-spinner" />
              </div>
            )}

            {!loading && notifications.length === 0 && (
              <div className="nb-empty">
                <div className="nb-empty-icon">🔔</div>
                <div className="nb-empty-text">No notifications yet</div>
              </div>
            )}

            {!loading && notifications.map((n) => (
              <button
                key={n._id}
                className={`nb-item${n.isRead ? "" : " nb-unread"}`}
                onClick={() => markRead(n)}
              >
                <div className="nb-icon">
                  {TYPE_ICON[n.type] ?? "🔔"}
                </div>
                <div className="nb-content">
                  <div className="nb-title">{n.title}</div>
                  <div className="nb-body">{n.body}</div>
                  <div className="nb-time">{timeAgo(n.createdAt)}</div>
                </div>
                {!n.isRead && <div className="nb-dot" />}
              </button>
            ))}
          </div>

          <div className="nb-footer">
            <button className="nb-footer-link" onClick={onViewAll}>
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
