"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../organizer-dashboard.css";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1").replace(/\/api\/v1\/?$/, "");

type OrganiserProfile = {
  name: string;
  email?: string;
  phone: string;
  whatsappNumber: string;
  profileImage?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  defaultFeeInPaise?: number;
  defaultFormat?: "5v5" | "6v6" | "7v7" | "8v8" | "9v9" | "10v10";
  defaultCutoffHours?: number;
  defaultTurfId?: string;
  notificationSettings?: {
    whatsapp?: boolean;
    sms?: boolean;
    push?: boolean;
  };
  approvalStatus?: string;
  isActive?: boolean;
};

export default function OrganiserProfilePage() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const organiserId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const { isAuthorized } = useAuthGuard({
    requiredRole: "organiser",
    routeUserId: organiserId,
    redirectTo: "/login?role=organiser",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [overallRating, setOverallRating] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [error, setError] = useState("");
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(false);
  const [requirePhoto, setRequirePhoto] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const pickerWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showPhotoPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) setShowPhotoPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPhotoPicker]);

  const handleTakePhoto = () => { setShowPhotoPicker(false); cameraInputRef.current?.click(); };
  const handleChooseGallery = () => { setShowPhotoPicker(false); imageInputRef.current?.click(); };
  const [profile, setProfile] = useState<OrganiserProfile>({
    name: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    profileImage: undefined,
    location: { city: "", state: "", country: "India" },
    defaultFeeInPaise: 0,
    defaultFormat: "6v6",
    defaultCutoffHours: 24,
    defaultTurfId: "",
    notificationSettings: { whatsapp: true, sms: true, push: true },
    approvalStatus: "pending",
    isActive: true,
  });

  const clearSessionAndExit = useCallback(() => {
    clearSession();
    router.replace("/login?role=organiser");
  }, [router]);

  const parseApiResponse = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    const responseText = await res.text();

    if (!responseText) return {} as any;

    if (contentType.includes("application/json")) {
      try {
        return JSON.parse(responseText);
      } catch {
        return { success: false, message: "Invalid JSON response from server" };
      }
    }

    return { success: false, message: responseText };
  };

  const fetchProfile = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");

    const { token } = getSession();

    if (!token) {
      clearSessionAndExit();
      return;
    }

    try {
      const [res, fbRes] = await Promise.all([
        fetch(buildApiUrl("/api/v1/organisers/me"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl("/api/v1/games/organisers/my-feedback-summary"), { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (res.status === 401 || res.status === 403) {
        clearSessionAndExit();
        return;
      }

      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || `HTTP ${res.status}`);
        return;
      }

      if (fbRes.ok) {
        try {
          const fbData = await fbRes.json();
          if (fbData.success && fbData.data?.summary?.avgOrganiser != null) {
            setOverallRating(fbData.data.summary.avgOrganiser);
          }
        } catch {}
      }

      const o = data.data || {};
      const imageUrl = o.profileImage ? `${API_BASE_URL}${o.profileImage}` : null;
      setImagePreview(imageUrl);
      if (imageUrl) {
        localStorage.setItem("userProfileImage", imageUrl);
      }
      setProfile({
        name: o.name || "",
        email: o.email || "",
        phone: o.phone || "",
        whatsappNumber: o.whatsappNumber || "",
        profileImage: o.profileImage || undefined,
        location: {
          city: o.location?.city || "",
          state: o.location?.state || "",
          country: o.location?.country || "India",
        },
        defaultFeeInPaise: o.defaultFeeInPaise || 0,
        defaultFormat: o.defaultFormat || "6v6",
        defaultCutoffHours: o.defaultCutoffHours || 24,
        defaultTurfId: o.defaultTurfId || "",
        notificationSettings: {
          whatsapp: o.notificationSettings?.whatsapp ?? true,
          sms: o.notificationSettings?.sms ?? true,
          push: o.notificationSettings?.push ?? true,
        },
        approvalStatus: o.approvalStatus || "pending",
        isActive: o.isActive ?? true,
      });
    } catch (e) {
      setError((e as Error).message || "Failed to load profile");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [clearSessionAndExit]);

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    if (localStorage.getItem("showProfileBanner") === "true") {
      localStorage.removeItem("showProfileBanner");
      setShowWelcomeBanner(true);
    }
    if (localStorage.getItem("requirePhotoUpload") === "true") {
      setRequirePhoto(true);
    }

    fetchProfile();
  }, [isAuthorized, fetchProfile]);

  // Keep profile data synced when changed from another tab/device.
  const silentFetchProfile = useCallback(() => fetchProfile(true), [fetchProfile]);
  useAutoRefresh(isAuthorized ? silentFetchProfile : null, { interval: 30_000 });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }

    setImageUploading(true);
    setError("");

    const preview = URL.createObjectURL(file);
    setImagePreview(preview);

    try {
      const formData = new FormData();
      formData.append("profileImage", file);
      const res = await fetch(buildApiUrl("/api/v1/organisers/me/profile-image"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.status === 401 || res.status === 403) { clearSessionAndExit(); return; }

      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to upload image");
        setImagePreview(profile.profileImage ? `${API_BASE_URL}${profile.profileImage}` : null);
        return;
      }

      const newImagePath = data.data?.profileImage;
      const newImageUrl = newImagePath ? `${API_BASE_URL}${newImagePath}` : null;
      setProfile((prev) => ({ ...prev, profileImage: newImagePath }));
      setImagePreview(newImageUrl);
      if (newImageUrl) {
        localStorage.setItem("userProfileImage", newImageUrl);
        if (localStorage.getItem("requirePhotoUpload") === "true") {
          localStorage.removeItem("requirePhotoUpload");
          setRequirePhoto(false);
          setTimeout(() => router.replace(`/dashboard/organizer/${organiserId}`), 1000);
        }
      } else {
        localStorage.removeItem("userProfileImage");
      }
      window.dispatchEvent(new CustomEvent("organiser-profile-updated", {
        detail: { profileImage: newImageUrl || "" },
      }));
    } catch {
      setError("Failed to upload image");
      setImagePreview(profile.profileImage ? `${API_BASE_URL}${profile.profileImage}` : null);
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
      if (cameraInputRef.current) cameraInputRef.current.value = "";
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const { token } = getSession();
    if (!token) {
      clearSessionAndExit();
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/v1/organisers/me"), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          whatsappNumber: profile.whatsappNumber,
          location: profile.location,
          defaultFeeInPaise: profile.defaultFeeInPaise,
          defaultFormat: profile.defaultFormat,
          defaultCutoffHours: profile.defaultCutoffHours,
          defaultTurfId: profile.defaultTurfId || undefined,
          notificationSettings: profile.notificationSettings,
        }),
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

      const latestName = data.data?.name || profile.name;
      localStorage.setItem("userName", latestName);
      window.dispatchEvent(new CustomEvent("organiser-profile-updated", {
        detail: { name: latestName },
      }));
      alert("Profile updated successfully");
      fetchProfile();
    } catch (e) {
      setError((e as Error).message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteProfile = async () => {
    const { token } = getSession();
    if (!token) {
      clearSessionAndExit();
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/organisers/me"), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401 || res.status === 403) {
        clearSessionAndExit();
        return;
      }

      const data = await parseApiResponse(res);
      if (!res.ok || !data.success) {
        alert(data.message || `Failed with HTTP ${res.status}`);
        setDeleting(false);
        return;
      }

      clearSessionAndExit();
    } catch (e) {
      alert("Failed to delete profile");
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="organizer-dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    approved: "#4ade80",
    pending: "#fbbf24",
    rejected: "#ff5c3e",
    suspended: "#ff5c3e",
  };

  return (
    <div className="organizer-dashboard-container">

      {/* ── Image Lightbox ── */}
      {showLightbox && imagePreview && (
        <div className="op-lightbox" onClick={() => setShowLightbox(false)}>
          <img className="op-lightbox-img" src={imagePreview} alt="Profile" onClick={(e) => e.stopPropagation()} />
          <button className="op-lightbox-close" onClick={() => setShowLightbox(false)} aria-label="Close">✕</button>
        </div>
      )}


      {/* ── Delete Modal ── */}
      {deleteStep > 0 && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !deleting && setDeleteStep(0)}>
          <div className="modal-content" style={{ maxWidth: 480, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <div className="modal-title-section">
                <h2 style={{ margin: 0 }}>Delete Account</h2>
                <p className="modal-subtitle" style={{ marginTop: 8 }}>
                  {deleteStep === 1 ? "Are you sure you want to delete your account?" : "This will permanently remove your organiser profile and all related access."}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button className="btn-close" type="button" onClick={() => setDeleteStep(0)} disabled={deleting}>Cancel</button>
              {deleteStep === 1 ? (
                <button className="btn-primary" type="button" onClick={() => setDeleteStep(2)} disabled={deleting}><span>Continue</span></button>
              ) : (
                <button className="op-delete-btn" type="button" onClick={async () => { setDeleteStep(0); await handleDeleteProfile(); }} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Require Photo Banner ── */}
      {requirePhoto && (
        <div style={{
          background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.4)",
          borderRadius: 10, padding: "16px 20px", marginBottom: 16,
          display: "flex", gap: 14, alignItems: "flex-start",
        }}>
          <span style={{ fontSize: 22, flexShrink: 0 }}>📸</span>
          <div>
            <p style={{ margin: "0 0 4px", fontWeight: 700, color: "#f87171", fontSize: 14 }}>
              Profile photo required before you can host games
            </p>
            <p style={{ margin: 0, fontSize: 12, color: "#aaa", lineHeight: 1.5 }}>
              A real photo helps players trust the organiser and ensures game quality. Please upload or take a photo below to continue.
            </p>
          </div>
        </div>
      )}

      {/* ── Welcome Banner ── */}
      {showWelcomeBanner && (
        <div className="op-welcome-banner">
          <div>
            <p className="op-banner-title">Welcome! Complete your profile to start hosting games</p>
            <p className="op-banner-body">Add your city, WhatsApp number, and default game settings to get started.</p>
          </div>
          <button className="op-banner-close" onClick={() => setShowWelcomeBanner(false)} aria-label="Dismiss">×</button>
        </div>
      )}

      <div className="op-shell">

        {/* ── HERO ── */}
        <div className="op-hero">
          {/* Avatar */}
          <div className="op-avatar-wrap">
            <div
              className="op-avatar"
              onClick={() => {
                if (imageUploading) return;
                if (imagePreview) setShowLightbox(true);
                else setShowPhotoPicker(true);
              }}
            >
              {imagePreview
                ? <img src={imagePreview} alt="Profile" onError={() => { setImagePreview(null); localStorage.removeItem("userProfileImage"); }} />
                : <span className="op-avatar-placeholder">
                    {profile.name ? profile.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join("").toUpperCase() : "?"}
                  </span>
              }
              <div className="op-avatar-overlay" onClick={(e) => { e.stopPropagation(); if (!imageUploading) { if (imagePreview) setShowLightbox(true); else setShowPhotoPicker(true); } }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              {imageUploading && (
                <div className="op-avatar-spinner">
                  <div className="op-avatar-spinner-dot" />
                </div>
              )}
            </div>

            {/* Photo button + inline dropdown */}
            <div ref={pickerWrapRef} style={{ position: "relative" }}>
              <button type="button" className="op-photo-btn"
                onClick={() => { if (!imageUploading) setShowPhotoPicker((v) => !v); }}
                disabled={imageUploading}
              >
                {imageUploading ? "Uploading…" : imagePreview ? "Change photo" : "Upload photo"}
              </button>
              {showPhotoPicker && (
                <div style={{
                  position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
                  background: "#1a1a2e", border: "1px solid #2a2a4a", borderRadius: 10,
                  overflow: "hidden", zIndex: 200, minWidth: 190,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}>
                  <button type="button"
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 16px", background: "none", border: "none", borderBottom: "1px solid #2a2a4a", color: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}
                    onClick={handleTakePhoto}
                  >
                    <span style={{ fontSize: 18 }}>📷</span> Take Photo
                  </button>
                  <button type="button"
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "13px 16px", background: "none", border: "none", color: "#fff", cursor: "pointer", fontSize: 14, fontFamily: "inherit" }}
                    onClick={handleChooseGallery}
                  >
                    <span style={{ fontSize: 18 }}>🖼️</span> Choose from Gallery
                  </button>
                </div>
              )}
            </div>
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageUpload} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="user" style={{ position: "fixed", top: "-200vh", left: 0, opacity: 0, pointerEvents: "none" }} onChange={handleImageUpload} />
            {!imagePreview && (
              <p style={{ margin: "6px 0 0", fontSize: 11, color: "#888", textAlign: "center", lineHeight: 1.4, maxWidth: 140 }}>
                📸 A real photo is required to host games
              </p>
            )}
          </div>

          {/* Info */}
          <div className="op-hero-info">
            <h1 className="op-hero-name">{profile.name || "Your Name"}</h1>
            <div className="op-hero-badges">
              <span className="op-role-badge">Organiser</span>
              <span className="op-status-badge" style={{
                background: `${statusColor[profile.approvalStatus || "pending"]}18`,
                color: statusColor[profile.approvalStatus || "pending"],
                border: `1px solid ${statusColor[profile.approvalStatus || "pending"]}40`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block", marginRight: 5 }} />
                {profile.approvalStatus || "pending"}
              </span>
            </div>
            {overallRating != null && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6 }}>
                {[1,2,3,4,5].map((n) => (
                  <span key={n} style={{ fontSize: 18, color: n <= Math.round(overallRating) ? "#fbbf24" : "#2a2a2a", lineHeight: 1 }}>★</span>
                ))}
                <span style={{ fontSize: 13, color: "#888", fontFamily: "var(--mono, monospace)" }}>{overallRating}/5 overall</span>
              </div>
            )}
            {(profile.location?.city || profile.location?.state) && (
              <p className="op-hero-location">
                📍 {[profile.location.city, profile.location.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>

          {/* Hero save */}
          <button type="submit" form="op-profile-form" className="op-hero-save" disabled={saving || deleting}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* ── FORM ── */}
        <form id="op-profile-form" onSubmit={handleSave} className="op-form">

          {/* Basic Info */}
          <div className="op-card">
            <div className="op-card-header">
              <div className="op-card-icon">👤</div>
              <div>
                <h3 className="op-card-title">Basic Info</h3>
                <p className="op-card-desc">Your contact and location details</p>
              </div>
            </div>
            <div className="op-grid">
              <div className="op-field">
                <label className="op-label">Full Name *</label>
                <input className="op-input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Your full name" required />
              </div>
              <div className="op-field">
                <label className="op-label">Email</label>
                <input className="op-input" type="email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="your@email.com" />
              </div>
              <div className="op-field">
                <label className="op-label">Phone *</label>
                <input className="op-input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="10-digit number" required />
              </div>
              <div className="op-field">
                <label className="op-label">WhatsApp Number *</label>
                <input className="op-input" value={profile.whatsappNumber} onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })} placeholder="WhatsApp number" required />
              </div>
              <div className="op-field">
                <label className="op-label">City</label>
                <input className="op-input" value={profile.location?.city || ""} onChange={(e) => setProfile({ ...profile, location: { ...(profile.location || {}), city: e.target.value } })} placeholder="e.g. Mumbai" />
              </div>
              <div className="op-field">
                <label className="op-label">State</label>
                <input className="op-input" value={profile.location?.state || ""} onChange={(e) => setProfile({ ...profile, location: { ...(profile.location || {}), state: e.target.value } })} placeholder="e.g. Maharashtra" />
              </div>
            </div>
          </div>

          {/* Event Defaults */}
          <div className="op-card">
            <div className="op-card-header">
              <div className="op-card-icon">⚽</div>
              <div>
                <h3 className="op-card-title">Event Defaults</h3>
                <p className="op-card-desc">Pre-filled settings when you create a game</p>
              </div>
            </div>
            <div className="op-grid">
              <div className="op-field">
                <label className="op-label">Default Format</label>
                <select className="op-input" value={profile.defaultFormat || "6v6"} onChange={(e) => setProfile({ ...profile, defaultFormat: e.target.value as OrganiserProfile["defaultFormat"] })}>
                  {["5v5", "6v6", "7v7", "8v8", "9v9", "10v10"].map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div className="op-field">
                <label className="op-label">Default Fee (₹ in paise)</label>
                <input className="op-input" type="number" min="0" value={profile.defaultFeeInPaise ?? 0} onChange={(e) => setProfile({ ...profile, defaultFeeInPaise: Number(e.target.value) })} placeholder="e.g. 20000" />
              </div>
              <div className="op-field">
                <label className="op-label">Cutoff Hours Before Game</label>
                <input className="op-input" type="number" min="1" value={profile.defaultCutoffHours ?? 24} onChange={(e) => setProfile({ ...profile, defaultCutoffHours: Number(e.target.value) })} placeholder="24" />
              </div>
              <div className="op-field">
                <label className="op-label">Default Turf ID</label>
                <input className="op-input" value={profile.defaultTurfId || ""} onChange={(e) => setProfile({ ...profile, defaultTurfId: e.target.value })} placeholder="Turf ID (optional)" />
              </div>
            </div>
          </div>

          {/* Notifications */}
          <div className="op-card">
            <div className="op-card-header">
              <div className="op-card-icon">🔔</div>
              <div>
                <h3 className="op-card-title">Notifications</h3>
                <p className="op-card-desc">Choose where you receive updates</p>
              </div>
            </div>
            {([
              { key: "whatsapp", label: "WhatsApp", desc: "Game alerts and bookings on WhatsApp" },
              { key: "sms", label: "SMS", desc: "Important reminders via text message" },
              { key: "push", label: "Push Notifications", desc: "In-app alerts for game activity" },
            ] as { key: keyof NonNullable<OrganiserProfile["notificationSettings"]>; label: string; desc: string }[]).map(({ key, label, desc }) => {
              const enabled = profile.notificationSettings?.[key] ?? true;
              return (
                <div key={key} className="op-notif-row">
                  <div>
                    <div className="op-notif-label">{label}</div>
                    <div className="op-notif-desc">{desc}</div>
                  </div>
                  <button type="button" className={`op-toggle ${enabled ? "on" : "off"}`}
                    onClick={() => setProfile({ ...profile, notificationSettings: { ...(profile.notificationSettings || {}), [key]: !enabled } })}>
                    <span className="op-toggle-knob" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Account Status */}
          <div className="op-card">
            <div className="op-card-header">
              <div className="op-card-icon">🔒</div>
              <div>
                <h3 className="op-card-title">Account Status</h3>
                <p className="op-card-desc">Read-only — managed by admin</p>
              </div>
            </div>
            <div className="op-status-grid">
              <div className="op-status-item">
                <div className="op-status-item-label">Approval Status</div>
                <div className="op-status-item-value">
                  <span className="op-status-dot" style={{ background: statusColor[profile.approvalStatus || "pending"] }} />
                  {profile.approvalStatus || "pending"}
                </div>
              </div>
              <div className="op-status-item">
                <div className="op-status-item-label">Account Active</div>
                <div className="op-status-item-value">
                  <span className="op-status-dot" style={{ background: profile.isActive ? "#4ade80" : "#666" }} />
                  {profile.isActive ? "Active" : "Inactive"}
                </div>
              </div>
            </div>
          </div>

          {error && <div className="op-error">{error}</div>}

          <div className="op-actions">
            <button type="submit" className="op-save-btn" disabled={saving || deleting}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" className="op-delete-btn" onClick={() => setDeleteStep(1)} disabled={saving || deleting}>
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
