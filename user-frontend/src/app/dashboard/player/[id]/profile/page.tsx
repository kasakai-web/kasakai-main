"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../player-dashboard.css";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type PlayerProfile = {
  name: string;
  email?: string;
  phone: string;
  whatsappNumber: string;
  isVerified?: boolean;
  referralCode?: string;
  createdAt?: string;
  rating?: number;
  totalGamesPlayed?: number;
  noShowCount?: number;
  backoutCount?: number;
  location?: {
    city?: string;
    state?: string;
  };
  preferences?: {
    skillLevel?: "beginner" | "intermediate" | "advanced";
    preferredFormat?: "5v5" | "6v6" | "7v7" | "8v8" | "9v9" | "10v10";
    positions?: string[];
    preferredLocations?: string[];
  };
  notificationSettings?: {
    whatsapp?: boolean;
    sms?: boolean;
    push?: boolean;
  };
};

export default function PlayerProfilePage() {
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
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [error, setError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile>({
    name: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    isVerified: false,
    rating: 0,
    totalGamesPlayed: 0,
    noShowCount: 0,
    backoutCount: 0,
    location: { city: "", state: "" },
    preferences: { skillLevel: "beginner", preferredFormat: "5v5", positions: [], preferredLocations: [] },
    notificationSettings: { whatsapp: true, sms: true, push: true },
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
      try { return JSON.parse(responseText); } catch { return { success: false, message: "Invalid JSON" }; }
    }
    return { success: false, message: responseText };
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError("");
    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }
    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { clearSessionAndExit(); return; }
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) { setError(data.message || `HTTP ${res.status}`); return; }
      const p = data.data || {};
      setProfile({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        whatsappNumber: p.whatsappNumber || "",
        isVerified: p.isVerified ?? false,
        referralCode: p.referralCode || "",
        createdAt: p.createdAt || "",
        rating: p.rating ?? 0,
        totalGamesPlayed: p.totalGamesPlayed ?? 0,
        noShowCount: p.noShowCount ?? 0,
        backoutCount: p.backoutCount ?? 0,
        location: { city: p.location?.city || "", state: p.location?.state || "" },
        preferences: {
          skillLevel: p.preferences?.skillLevel || "beginner",
          preferredFormat: p.preferences?.preferredFormat || "5v5",
          positions: p.preferences?.positions || [],
          preferredLocations: p.preferences?.preferredLocations || [],
        },
        notificationSettings: {
          whatsapp: p.notificationSettings?.whatsapp ?? true,
          sms: p.notificationSettings?.sms ?? true,
          push: p.notificationSettings?.push ?? true,
        },
      });
    } catch (e) {
      setError((e as Error).message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) { setLoading(false); return; }
    if (localStorage.getItem("showProfileBanner") === "true") {
      localStorage.removeItem("showProfileBanner");
      setShowWelcomeBanner(true);
    }
    fetchProfile();
  }, [isAuthorized]);

  const togglePosition = (pos: string) => {
    const current = profile.preferences?.positions || [];
    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        positions: current.includes(pos) ? current.filter((p) => p !== pos) : [...current, pos],
      },
    }));
  };

  const updatePreferredLocation = (idx: number, val: string) => {
    const locs = [...(profile.preferences?.preferredLocations || ["", ""])];
    locs[idx] = val;
    setProfile((prev) => ({ ...prev, preferences: { ...prev.preferences, preferredLocations: locs } }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);
    setError("");
    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }
    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me"), {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          whatsappNumber: profile.whatsappNumber,
          location: { city: profile.location?.city, state: profile.location?.state },
          preferences: {
            skillLevel: profile.preferences?.skillLevel,
            preferredFormat: profile.preferences?.preferredFormat,
            positions: profile.preferences?.positions,
            preferredLocations: (profile.preferences?.preferredLocations || []).filter(Boolean),
          },
          notificationSettings: profile.notificationSettings,
        }),
      });
      if (res.status === 401 || res.status === 403) { clearSessionAndExit(); return; }
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) { setError(data.message || `HTTP ${res.status}`); return; }
      localStorage.setItem("userName", data.data?.name || profile.name);
      setSaveSuccess(true);
      fetchProfile();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }
    setDeleting(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) { clearSessionAndExit(); return; }
      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) { alert(data.message || `Failed with HTTP ${res.status}`); setDeleting(false); return; }
      clearSessionAndExit();
    } catch {
      alert("Failed to delete profile");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="player-dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="player-dashboard-container">
      {/* Delete Modal */}
      {deleteStep > 0 && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteStep(0)}>
          <div className="modal-content" style={{ maxWidth: 520, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-section">
                <h2>Delete Account</h2>
                <p className="modal-subtitle">
                  {deleteStep === 1 ? "Are you sure you want to delete your account?" : "This will permanently remove your profile and bookings."}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button className="btn-close" type="button" onClick={() => setDeleteStep(0)} disabled={deleting}>Cancel</button>
              {deleteStep === 1 ? (
                <button className="btn-primary" type="button" onClick={() => setDeleteStep(2)} disabled={deleting}><span>Continue</span></button>
              ) : (
                <button className="profile-delete-btn" type="button" onClick={async () => { setDeleteStep(0); await handleDeleteProfile(); }} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="profile-page-shell">
        {/* Welcome Banner */}
        {showWelcomeBanner && (
          <div className="pd-welcome-banner">
            <div>
              <p className="pd-banner-title">Welcome to Kasakai! Complete your profile</p>
              <p className="pd-banner-body">Add your city, WhatsApp number, and skill level so we can find the best games near you.</p>
            </div>
            <button className="pd-banner-close" onClick={() => setShowWelcomeBanner(false)}>×</button>
          </div>
        )}

        {/* Hero */}
        <div className="profile-hero">
          <div className="profile-kicker">Player Dashboard</div>
          <h1 className="profile-title">Your Profile</h1>
          <p className="profile-subtitle">Keep your details and match preferences updated so you get better games.</p>
        </div>

        {/* Stats Row (read-only) */}
        <div className="pd-stats-grid">
          <div className="pd-stat-cell">
            <div className="pd-stat-value">{profile.rating?.toFixed(1) || "0.0"}</div>
            <div className="pd-stat-label">Rating</div>
            <div className="pd-stat-sub">/ 5.0</div>
          </div>
          <div className="pd-stat-cell">
            <div className="pd-stat-value">{profile.totalGamesPlayed ?? 0}</div>
            <div className="pd-stat-label">Games Played</div>
            <div className="pd-stat-sub">total</div>
          </div>
          <div className="pd-stat-cell">
            <div className={`pd-stat-value ${(profile.noShowCount ?? 0) > 0 ? "warn-stat" : "muted-stat"}`}>
              {profile.noShowCount ?? 0}
            </div>
            <div className="pd-stat-label">No-Shows</div>
            <div className="pd-stat-sub">missed</div>
          </div>
          <div className="pd-stat-cell">
            <div className={`pd-stat-value ${(profile.backoutCount ?? 0) > 0 ? "warn-stat" : "muted-stat"}`}>
              {profile.backoutCount ?? 0}
            </div>
            <div className="pd-stat-label">Backouts</div>
            <div className="pd-stat-sub">cancelled</div>
          </div>
        </div>

        <form onSubmit={handleSave}>
          {/* Basic Info */}
          <div className="pd-section">
            <div className="pd-section-head">
              <span className="pd-section-label">Basic Info</span>
            </div>
            <div className="pd-grid-2">
              <div className="pd-field">
                <span className="pd-field-label">Full Name *</span>
                <input className="pd-input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" required />
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Email</span>
                <input className="pd-input" type="email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="your@email.com" />
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Phone *</span>
                <input className="pd-input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="10-digit number" required />
              </div>
              <div className="pd-field">
                <span className="pd-field-label">WhatsApp Number *</span>
                <input className="pd-input" value={profile.whatsappNumber} onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })} placeholder="WhatsApp number" required />
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="pd-section">
            <div className="pd-section-head">
              <span className="pd-section-label">Location</span>
            </div>
            <div className="pd-grid-2">
              <div className="pd-field">
                <span className="pd-field-label">City</span>
                <input className="pd-input" value={profile.location?.city || ""} onChange={(e) => setProfile({ ...profile, location: { ...profile.location, city: e.target.value } })} placeholder="e.g. Mumbai" />
              </div>
              <div className="pd-field">
                <span className="pd-field-label">State</span>
                <input className="pd-input" value={profile.location?.state || ""} onChange={(e) => setProfile({ ...profile, location: { ...profile.location, state: e.target.value } })} placeholder="e.g. Maharashtra" />
              </div>
            </div>
          </div>

          {/* Game Preferences */}
          <div className="pd-section">
            <div className="pd-section-head">
              <span className="pd-section-label">Game Preferences</span>
            </div>
            <div className="pd-grid-2" style={{ marginBottom: "24px" }}>
              <div className="pd-field">
                <span className="pd-field-label">Skill Level</span>
                <select className="pd-input"
                  value={profile.preferences?.skillLevel || "beginner"}
                  onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, skillLevel: e.target.value as "beginner" | "intermediate" | "advanced" } })}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="pd-field">
                <span className="pd-field-label">Preferred Format</span>
                <select className="pd-input"
                  value={profile.preferences?.preferredFormat || "5v5"}
                  onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, preferredFormat: e.target.value as "5v5" | "6v6" | "7v7" | "8v8" | "9v9" | "10v10" } })}>
                  {(["5v5", "6v6", "7v7", "8v8", "9v9", "10v10"] as const).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Positions */}
            <div className="pd-field" style={{ marginBottom: "24px" }}>
              <span className="pd-field-label">Preferred Positions (Football)</span>
              <div className="pd-chips">
                {[
                  { id: "GK", label: "Goalkeeper" },
                  { id: "DEF", label: "Defender" },
                  { id: "MID", label: "Midfielder" },
                  { id: "FWD", label: "Forward" },
                ].map(({ id, label }) => {
                  const selected = (profile.preferences?.positions || []).includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => togglePosition(id)}
                      className={`pd-chip${selected ? " pd-chip-selected" : ""}`}
                    >
                      <span className="pd-chip-code">{id}</span>
                      <span className="pd-chip-name">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Preferred Play Areas */}
            <div className="pd-field">
              <span className="pd-field-label">Preferred Play Areas (up to 2)</span>
              <div className="pd-grid-2">
                {[0, 1].map((idx) => (
                  <input key={idx} className="pd-input"
                    value={(profile.preferences?.preferredLocations || [])[idx] || ""}
                    onChange={(e) => updatePreferredLocation(idx, e.target.value)}
                    placeholder={idx === 0 ? "e.g. Andheri, Mumbai" : "e.g. Bandra, Mumbai (optional)"} />
                ))}
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="pd-section">
            <div className="pd-section-head">
              <span className="pd-section-label">Notification Settings</span>
            </div>
            {([
              { key: "whatsapp", label: "WhatsApp Notifications", desc: "Game alerts and updates on WhatsApp" },
              { key: "sms", label: "SMS Notifications", desc: "Important game reminders via SMS" },
              { key: "push", label: "Push Notifications", desc: "In-app notifications for games" },
            ] as { key: keyof NonNullable<PlayerProfile["notificationSettings"]>; label: string; desc: string }[]).map(({ key, label, desc }) => {
              const enabled = profile.notificationSettings?.[key] ?? true;
              return (
                <div key={key} className="pd-toggle-row">
                  <div>
                    <div className="pd-toggle-info-label">{label}</div>
                    <div className="pd-toggle-info-desc">{desc}</div>
                  </div>
                  <button
                    type="button"
                    className={`pd-toggle ${enabled ? "on" : "off"}`}
                    onClick={() => setProfile({ ...profile, notificationSettings: { ...profile.notificationSettings, [key]: !enabled } })}
                  >
                    <span className="pd-toggle-knob" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Account Info (read-only) */}
          <div className="pd-section">
            <div className="pd-section-head">
              <span className="pd-section-label">Account Info</span>
            </div>
            <div className="pd-account-grid">
              <div>
                <div className="pd-account-item-label">Account Status</div>
                <div className="pd-account-item-value">
                  <span
                    className="pd-status-dot"
                    style={{ background: profile.isVerified ? "var(--lime)" : "#ff6b6b" }}
                  />
                  {profile.isVerified ? "Verified" : "Not Verified"}
                </div>
              </div>
              {memberSince && (
                <div>
                  <div className="pd-account-item-label">Member Since</div>
                  <div className="pd-account-item-value">{memberSince}</div>
                </div>
              )}
              {profile.referralCode && (
                <div className="pd-referral-wrap">
                  <div style={{ width: "100%", marginBottom: "8px" }}>
                    <div className="pd-account-item-label">Referral Code</div>
                  </div>
                  <code className="pd-referral-code">{profile.referralCode}</code>
                  <button
                    type="button"
                    className="pd-copy-btn"
                    onClick={() => navigator.clipboard.writeText(profile.referralCode || "")}
                  >
                    Copy
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Error / Success */}
          {error && <p className="profile-error">{error}</p>}
          {saveSuccess && (
            <div className="pd-success-bar">
              Profile saved successfully.
            </div>
          )}

          {/* Actions */}
          <div className="pd-actions">
            <button className="btn-primary" type="submit" disabled={saving || deleting}>
              <span>{saving ? "Saving..." : "Save Changes"}</span>
            </button>
            <button type="button" onClick={() => setDeleteStep(1)} disabled={saving || deleting} className="profile-delete-btn">
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
