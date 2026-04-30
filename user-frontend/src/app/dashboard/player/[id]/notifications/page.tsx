"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../player-dashboard.css";
import "./notifications.css";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

// ── Types ─────────────────────────────────────────────────────────────────────
type NotificationSettings = {
  whatsapp?: boolean;
  sms?: boolean;
  push?: boolean;
};

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

// ── Page ──────────────────────────────────────────────────────────────────────
export default function PlayerNotificationsPage() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const routeUserId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;

  const { isAuthorized } = useAuthGuard({
    requiredRole: "player",
    routeUserId,
    redirectTo: "/login?role=player",
  });

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<"inbox" | "settings">("inbox");

  // ── Inbox state ────────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loadingInbox, setLoadingInbox] = useState(true);
  const [inboxError, setInboxError] = useState("");
  const [marking, setMarking] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const PAGE_SIZE = 30;

  // ── Settings state ─────────────────────────────────────────────────────────
  const [settings, setSettings] = useState<NotificationSettings>({ whatsapp: true, sms: true, push: true });
  const [loadingSettings, setLoadingSettings] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const clearSessionAndExit = () => {
    clearSession();
    router.replace("/login?role=player");
  };

  // ── Fetch notifications ────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async (skip = 0, append = false) => {
    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }
    if (!append) setLoadingInbox(true);
    setInboxError("");
    try {
      const res = await fetch(buildApiUrl(`/api/v1/notifications?limit=${PAGE_SIZE}&skip=${skip}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { clearSessionAndExit(); return; }
      const data = await res.json();
      if (!res.ok || !data.success) { setInboxError(data.message || "Failed to load notifications"); return; }
      const list: Notification[] = data.data?.notifications ?? [];
      let normalizedList = list;

      // Auto-mark everything as read when opening notifications inbox.
      if (!append && skip === 0 && list.some((n) => !n.isRead)) {
        try {
          await fetch(buildApiUrl("/api/v1/notifications/read-all"), {
            method: "PATCH",
            headers: { Authorization: `Bearer ${token}` },
          });
          normalizedList = list.map((n) => ({ ...n, isRead: true }));
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("player-notifications-read-all"));
          }
        } catch {}
      }

      setNotifications((prev) => append ? [...prev, ...normalizedList] : normalizedList);
      setHasMore(list.length === PAGE_SIZE);
    } catch (e) {
      setInboxError((e as Error).message || "Failed to load notifications");
    } finally {
      setLoadingInbox(false);
    }
  }, []);

  // ── Fetch settings ─────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }
    setLoadingSettings(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { clearSessionAndExit(); return; }
      const data = await res.json();
      if (res.ok && data.success) {
        setSettings({
          whatsapp: data.data?.notificationSettings?.whatsapp ?? true,
          sms:      data.data?.notificationSettings?.sms ?? true,
          push:     data.data?.notificationSettings?.push ?? true,
        });
      }
    } catch {}
    finally { setLoadingSettings(false); }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;
    fetchNotifications(0);
    fetchSettings();
  }, [isAuthorized, fetchNotifications, fetchSettings]);

  // ── Mark single as read ────────────────────────────────────────────────────
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

  // ── Mark all as read ───────────────────────────────────────────────────────
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

  // ── Load more ──────────────────────────────────────────────────────────────
  const loadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    fetchNotifications(nextPage * PAGE_SIZE, true);
  };

  // ── Save settings ──────────────────────────────────────────────────────────
  const handleSaveSettings = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setSettingsError("");
    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }
    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ notificationSettings: settings }),
      });
      if (res.status === 401 || res.status === 403) { clearSessionAndExit(); return; }
      const data = await res.json();
      if (!res.ok || !data.success) { setSettingsError(data.message || `HTTP ${res.status}`); return; }
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setSettingsError((e as Error).message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="player-dashboard-container">
      {/* Page header */}
      <div className="page-header" style={{ marginBottom: 24 }}>
        <div className="page-title-group">
          <div className="page-title">Notifications</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="pn-tabs">
        <button
          className={`pn-tab${activeTab === "inbox" ? " pn-tab-active" : ""}`}
          onClick={() => setActiveTab("inbox")}
        >
          Inbox
          {unreadCount > 0 && <span className="pn-tab-badge">{unreadCount > 99 ? "99+" : unreadCount}</span>}
        </button>
        <button
          className={`pn-tab${activeTab === "settings" ? " pn-tab-active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          Settings
        </button>
      </div>

      {/* ── INBOX TAB ── */}
      {activeTab === "inbox" && (
        <div className="pn-inbox">
          {/* Toolbar */}
          <div className="pn-toolbar">
            <span className="pn-toolbar-count">
              {loadingInbox ? "Loading…" : `${notifications.length} notification${notifications.length !== 1 ? "s" : ""}${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
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
          {inboxError && <div className="pp-error" style={{ marginBottom: 16 }}>{inboxError}</div>}

          {/* Loading skeleton */}
          {loadingInbox && (
            <div className="pn-skeleton-list">
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
          {!loadingInbox && notifications.length === 0 && (
            <div className="pn-empty">
              <div className="pn-empty-icon">🔔</div>
              <div className="pn-empty-title">All caught up!</div>
              <div className="pn-empty-desc">You have no notifications yet. Game updates and alerts will appear here.</div>
            </div>
          )}

          {/* Notification list */}
          {!loadingInbox && notifications.length > 0 && (
            <div className="pn-list">
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

              {/* Load more */}
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
      )}

      {/* ── SETTINGS TAB ── */}
      {activeTab === "settings" && (
        <div className="pp-card" style={{ maxWidth: 840 }}>
          <div className="pp-card-header">
            <div className="pp-card-icon">🔔</div>
            <div>
              <h3 className="pp-card-title">Notification Channels</h3>
              <p className="pp-card-desc">Choose where you receive game updates</p>
            </div>
          </div>

          {loadingSettings ? (
            <div style={{ padding: "24px 0", textAlign: "center", color: "var(--muted)" }}>Loading settings…</div>
          ) : (
            <>
              {([
                { key: "whatsapp", label: "WhatsApp", desc: "Game alerts and booking confirmations on WhatsApp" },
                { key: "sms",      label: "SMS",       desc: "Important reminders via text message" },
                { key: "push",     label: "Push Notifications", desc: "In-app alerts for game activity" },
              ] as { key: keyof NotificationSettings; label: string; desc: string }[]).map(({ key, label, desc }) => {
                const enabled = settings[key] ?? true;
                return (
                  <div key={key} className="pp-notif-row">
                    <div>
                      <div className="pp-notif-label">{label}</div>
                      <div className="pp-notif-desc">{desc}</div>
                    </div>
                    <button
                      type="button"
                      className={`pp-toggle ${enabled ? "on" : "off"}`}
                      onClick={() => setSettings((prev) => ({ ...prev, [key]: !enabled }))}
                    >
                      <span className="pp-toggle-knob" />
                    </button>
                  </div>
                );
              })}

              <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                <button className="pp-hero-save" type="button" onClick={handleSaveSettings} disabled={saving}>
                  {saving ? "Saving…" : "Save Settings"}
                </button>
              </div>

              {saveSuccess && <div className="pp-success" style={{ marginTop: 14 }}>Notification settings updated successfully.</div>}
              {settingsError && <div className="pp-error" style={{ marginTop: 14 }}>{settingsError}</div>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
