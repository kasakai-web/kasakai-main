"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl, getSession } from "@/utils/api";
import { useNotificationSocket, type IncomingNotification } from "@/hooks/useNotificationSocket";
import "./NotificationBell.css";

interface Notification {
  _id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl?: string | null;
}

interface NotificationBellProps {
  onViewAll?: () => void;
  unreadCount?: number;
}

const TYPE_ICON: Record<string, string> = {
  game_created:           "🏟️",
  game_registered:        "✅",
  game_cancelled:         "⛔",
  game_backout_player:    "↩️",
  game_backout_organiser: "📢",
  refund_credited:        "💚",
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
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationBell({ onViewAll, unreadCount }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(unreadCount ?? 0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  // Sync badge when parent passes a controlled count
  useEffect(() => {
    if (unreadCount !== undefined) setUnread(unreadCount);
  }, [unreadCount]);

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
    } catch {}
  }, []);

  // Only poll independently when no parent is managing the count
  useEffect(() => {
    if (unreadCount !== undefined) return;
    fetchUnreadCount();
    const id = setInterval(fetchUnreadCount, 15_000);
    return () => clearInterval(id);
  }, [fetchUnreadCount, unreadCount]);

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
        // Silently mark all read on the server
        fetch(buildApiUrl("/api/v1/notifications/read-all"), {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
    } catch {}
    finally { setLoading(false); }
  }, []);

  const togglePanel = () => {
    setOpen((v) => {
      if (!v) fetchNotifications();
      return !v;
    });
  };

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

  const markRead = (n: Notification) => {
    setNotifications((prev) => prev.map((x) => x._id === n._id ? { ...x, isRead: true } : x));
    if (n.actionUrl) {
      setOpen(false);
      router.push(n.actionUrl);
    }
  };

  // Real-time: receive pushed notifications via Socket.io
  const handleSocketNotification = useCallback((n: IncomingNotification) => {
    setUnread((c) => c + 1);
    setNotifications((prev) => {
      if (prev.some((x) => x._id === n._id)) return prev;
      return [n, ...prev];
    });
  }, []);

  useNotificationSocket(handleSocketNotification);

  return (
    <div className="nb-wrap">
      <button
        ref={btnRef}
        className={`nb-btn${open ? " nb-active" : ""}`}
        onClick={togglePanel}
        aria-label="Notifications"
      >
        🔔
        {unread > 0 && <span className="nb-badge">{unread > 9 ? "9+" : unread}</span>}
      </button>

      {open && (
        <div ref={panelRef} className="nb-panel">
          <div className="nb-header">
            <span className="nb-header-title">Notifications</span>
            <button className="nb-mark-all" onClick={onViewAll}>
              View all
            </button>
          </div>

          <div className="nb-list">
            {loading && (
              <div className="nb-loading"><div className="nb-spinner" /></div>
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
                <div className="nb-icon">{TYPE_ICON[n.type] ?? "🔔"}</div>
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
