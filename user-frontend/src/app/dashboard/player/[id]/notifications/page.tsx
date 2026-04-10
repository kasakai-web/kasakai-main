"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../player-dashboard.css";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type NotificationSettings = {
  whatsapp?: boolean;
  sms?: boolean;
  push?: boolean;
};

export default function PlayerNotificationsPage() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const routeUserId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;

  const { isAuthorized } = useAuthGuard({
    requiredRole: "player",
    routeUserId,
    redirectTo: "/login?role=player",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<NotificationSettings>({
    whatsapp: true,
    sms: true,
    push: true,
  });

  const clearSessionAndExit = () => {
    clearSession();
    router.replace("/login?role=player");
  };

  const parseApiResponse = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    const responseText = await res.text();
    if (!responseText) return {} as any;
    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(responseText);
      } catch {
        return { success: false, message: "Invalid JSON" };
      }
    }
    return { success: false, message: responseText };
  };

  const fetchNotificationSettings = async () => {
    setLoading(true);
    setError("");
    const { token } = getSession();
    if (!token) {
      clearSessionAndExit();
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        clearSessionAndExit();
        return;
      }

      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || `HTTP ${res.status}`);
        return;
      }

      setSettings({
        whatsapp: data.data?.notificationSettings?.whatsapp ?? true,
        sms: data.data?.notificationSettings?.sms ?? true,
        push: data.data?.notificationSettings?.push ?? true,
      });
    } catch (e) {
      setError((e as Error).message || "Failed to load notification settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }
    fetchNotificationSettings();
  }, [isAuthorized]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    setError("");

    const { token } = getSession();
    if (!token) {
      clearSessionAndExit();
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ notificationSettings: settings }),
      });

      if (res.status === 401 || res.status === 403) {
        clearSessionAndExit();
        return;
      }

      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || `HTTP ${res.status}`);
        return;
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    } catch (e) {
      setError((e as Error).message || "Failed to save notification settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="player-dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="player-dashboard-container">
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-title-group">
          <div className="page-eyebrow">Player Dashboard</div>
          <div className="page-title">Notification <span>Settings</span></div>
        </div>
      </div>

      <div className="pp-card" style={{ maxWidth: 840 }}>
        <div className="pp-card-header">
          <div className="pp-card-icon">🔔</div>
          <div>
            <h3 className="pp-card-title">Notifications</h3>
            <p className="pp-card-desc">Choose where you receive game updates</p>
          </div>
        </div>

        {([
          { key: "whatsapp", label: "WhatsApp", desc: "Game alerts and booking confirmations on WhatsApp" },
          { key: "sms", label: "SMS", desc: "Important reminders via text message" },
          { key: "push", label: "Push Notifications", desc: "In-app alerts for game activity" },
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
          <button className="pp-hero-save" type="button" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </button>
        </div>

        {saveSuccess && <div className="pp-success" style={{ marginTop: 14 }}>Notification settings updated successfully.</div>}
        {!!error && <div className="pp-error" style={{ marginTop: 14 }}>{error}</div>}
      </div>
    </div>
  );
}
