"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../player-dashboard.css";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/api\/v1\/?$/, "");

type PlayerProfile = {
  name: string;
  email?: string;
  phone: string;
  whatsappNumber: string;
  profileImage?: string;
  isVerified?: boolean;
  referralCode?: string;
  createdAt?: string;
  rating?: number;
  totalGamesPlayed?: number;
  noShowCount?: number;
  backoutCount?: number;
  attendanceRate?: number | null;
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
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const pickerWrapRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"user" | "environment">("user");

  useEffect(() => {
    if (!showPhotoPicker) return;
    const handler = (e: MouseEvent) => {
      if (pickerWrapRef.current && !pickerWrapRef.current.contains(e.target as Node)) setShowPhotoPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showPhotoPicker]);

  useEffect(() => {
    if (!cameraOpen) return;
    let cancelled = false;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: cameraFacing } })
      .then((stream) => {
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      })
      .catch(() => { if (!cancelled) { setCameraOpen(false); imageInputRef.current?.click(); } });
    return () => { cancelled = true; };
  }, [cameraOpen, cameraFacing]);

  const stopStream = () => { streamRef.current?.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  const closeCamera = () => { stopStream(); setCameraOpen(false); };
  const flipCamera = () => setCameraFacing((f) => f === "user" ? "environment" : "user");

  const handleTakePhoto = () => { setShowPhotoPicker(false); setCameraOpen(true); };
  const handleChooseGallery = () => { setShowPhotoPicker(false); imageInputRef.current?.click(); };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const v = videoRef.current; const c = canvasRef.current;
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext("2d")?.drawImage(v, 0, 0);
    c.toBlob((blob) => {
      if (!blob) return;
      closeCamera();
      uploadFile(new File([blob], "photo.jpg", { type: "image/jpeg" }));
    }, "image/jpeg", 0.9);
  };
  const [profile, setProfile] = useState<PlayerProfile>({
    name: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    profileImage: undefined,
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
      const imageUrl = p.profileImage ? `${API_BASE_URL}${p.profileImage}` : null;
      setImagePreview(imageUrl);
      if (imageUrl) {
        localStorage.setItem("userProfileImage", imageUrl);
      }
      setProfile({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        whatsappNumber: p.whatsappNumber || "",
        profileImage: p.profileImage || undefined,
        isVerified: p.isVerified ?? false,
        referralCode: p.referralCode || "",
        createdAt: p.createdAt || "",
        rating: p.rating ?? 0,
        totalGamesPlayed: p.totalGamesPlayed ?? 0,
        noShowCount: p.noShowCount ?? 0,
        backoutCount: p.backoutCount ?? 0,
        attendanceRate: p.attendanceRate ?? null,
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

  const uploadFile = async (file: File) => {
    const { token } = getSession();
    if (!token) { clearSessionAndExit(); return; }
    setImageUploading(true);
    setError("");
    setImagePreview(URL.createObjectURL(file));
    try {
      const formData = new FormData();
      formData.append("profileImage", file);
      const res = await fetch(buildApiUrl("/api/v1/players/me/profile-image"), {
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
      if (newImageUrl) { localStorage.setItem("userProfileImage", newImageUrl); localStorage.removeItem("requirePhotoUpload"); }
    } catch {
      setError("Failed to upload image");
      setImagePreview(profile.profileImage ? `${API_BASE_URL}${profile.profileImage}` : null);
    } finally {
      setImageUploading(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  };

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

      {/* ── Delete Modal ── */}
      {deleteStep > 0 && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !deleting && setDeleteStep(0)}>
          <div className="modal-content" style={{ maxWidth: 480, width: "92%" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <div className="modal-title-section">
                <h2 style={{ margin: 0 }}>Delete Account</h2>
                <p className="modal-subtitle" style={{ marginTop: 8 }}>
                  {deleteStep === 1 ? "Are you sure you want to delete your account?" : "This will permanently remove your profile and all your bookings."}
                </p>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button className="btn-close" type="button" onClick={() => setDeleteStep(0)} disabled={deleting}>Cancel</button>
              {deleteStep === 1 ? (
                <button className="btn-primary" type="button" onClick={() => setDeleteStep(2)} disabled={deleting}><span>Continue</span></button>
              ) : (
                <button className="pp-delete-btn" type="button" onClick={async () => { setDeleteStep(0); await handleDeleteProfile(); }} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Welcome Banner ── */}
      {showWelcomeBanner && (
        <div className="pp-welcome-banner">
          <div>
            <p className="pp-banner-title">Welcome to Kasakai! Complete your profile</p>
            <p className="pp-banner-body">Add your city, WhatsApp number, and skill level so we can find the best games near you.</p>
          </div>
          <button className="pp-banner-close" onClick={() => setShowWelcomeBanner(false)} aria-label="Dismiss">×</button>
        </div>
      )}

      {/* ── In-app Camera ── */}
      {cameraOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 3000, background: "#000", display: "flex", flexDirection: "column" }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", flex: 1, objectFit: "cover" }} />
          <canvas ref={canvasRef} style={{ display: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, padding: "24px 32px 48px", background: "linear-gradient(transparent,rgba(0,0,0,0.85))", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <button type="button" onClick={closeCamera} style={{ color: "#fff", background: "none", border: "none", fontSize: 15, cursor: "pointer", padding: "8px 12px", fontFamily: "inherit" }}>Cancel</button>
            <button type="button" onClick={capturePhoto} style={{ width: 70, height: 70, borderRadius: "50%", background: "#fff", border: "5px solid rgba(255,255,255,0.4)", cursor: "pointer", boxShadow: "0 0 0 3px rgba(255,255,255,0.2)" }} aria-label="Capture" />
            <button type="button" onClick={flipCamera} style={{ color: "#fff", background: "rgba(255,255,255,0.15)", border: "none", borderRadius: "50%", width: 44, height: 44, fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }} aria-label="Flip camera">🔄</button>
          </div>
        </div>
      )}

      <div className="pp-shell">

        {/* ── HERO ── */}
        <div className="pp-hero">
          {/* Avatar */}
          <div className="pp-avatar-wrap">
            <div
              className="pp-avatar"
              onClick={() => {
                if (imageUploading) return;
                if (imagePreview) setLightboxOpen(true);
                else setShowPhotoPicker(true);
              }}
              style={{ cursor: imagePreview ? "zoom-in" : "pointer" }}
            >
              {imagePreview
                ? <img src={imagePreview} alt="Profile" onError={() => { setImagePreview(null); localStorage.removeItem("userProfileImage"); }} />
                : <span className="pp-avatar-placeholder">{profile.name ? profile.name.substring(0, 2).toUpperCase() : "?"}</span>
              }
              <div
                className="pp-avatar-overlay"
                onClick={(e) => { e.stopPropagation(); if (!imageUploading) { if (imagePreview) setLightboxOpen(true); else setShowPhotoPicker(true); } }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
              </div>
              {imageUploading && (
                <div className="pp-avatar-spinner">
                  <div className="pp-avatar-spinner-dot" />
                </div>
              )}
            </div>

            {/* Photo button + inline dropdown */}
            <div ref={pickerWrapRef} style={{ position: "relative" }}>
              <button type="button" className="pp-photo-btn"
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
            {/* Gallery input — display:none is fine */}
            <input ref={imageInputRef} type="file" accept="image/jpeg,image/png,image/webp" style={{ display: "none" }} onChange={handleImageUpload} />
          </div>

          {/* ── Lightbox ── */}
          {lightboxOpen && imagePreview && (
            <div
              onClick={() => setLightboxOpen(false)}
              style={{
                position: "fixed", inset: 0, zIndex: 2000,
                background: "rgba(0,0,0,0.92)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "zoom-out",
              }}
            >
              <img
                src={imagePreview}
                alt="Profile full size"
                style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain", boxShadow: "0 8px 48px rgba(0,0,0,0.6)" }}
                onClick={(e) => e.stopPropagation()}
              />
              <button
                type="button"
                onClick={() => setLightboxOpen(false)}
                style={{
                  position: "absolute", top: 20, right: 24,
                  background: "rgba(255,255,255,0.1)", border: "none",
                  color: "#fff", fontSize: 28, lineHeight: 1,
                  width: 44, height: 44, borderRadius: "50%",
                  cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
          )}

          {/* Info */}
          <div className="pp-hero-info">
            <h1 className="pp-hero-name">{profile.name || "Your Name"}</h1>
            <div className="pp-hero-badges">
              <span className="pp-role-badge">Player</span>
              <span className="pp-verified-badge" style={{
                background: profile.isVerified ? "rgba(74,222,128,0.12)" : "rgba(255,107,71,0.1)",
                color: profile.isVerified ? "#4ade80" : "#ff8070",
                border: `1px solid ${profile.isVerified ? "rgba(74,222,128,0.3)" : "rgba(255,107,71,0.25)"}`,
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "currentColor", display: "inline-block", marginRight: 5 }} />
                {profile.isVerified ? "Verified" : "Not Verified"}
              </span>
            </div>
            {(profile.location?.city || profile.location?.state) && (
              <p className="pp-hero-location">📍 {[profile.location.city, profile.location.state].filter(Boolean).join(", ")}</p>
            )}
          </div>

          {/* Hero save */}
          <button type="submit" form="pp-profile-form" className="pp-hero-save" disabled={saving || deleting}>
            {saving ? "Saving…" : "Save Changes"}
          </button>
        </div>

        {/* ── Stats strip ── */}
        <div className="pp-stats-strip">
          <div className="pp-stat">
            <div className="pp-stat-val">{profile.totalGamesPlayed ?? 0}</div>
            <div className="pp-stat-key">Games</div>
            <div className="pp-stat-sub">played</div>
          </div>
          <div className="pp-stat-div" />
          <div className="pp-stat">
            {profile.attendanceRate === null || profile.attendanceRate === undefined ? (
              <div className="pp-stat-val pp-ok">—</div>
            ) : (
              <div className={`pp-stat-val ${profile.attendanceRate < 70 ? "pp-warn" : ""}`}>
                {profile.attendanceRate}%
              </div>
            )}
            <div className="pp-stat-key">Attendance</div>
            <div className="pp-stat-sub">{profile.attendanceRate === null || profile.attendanceRate === undefined ? "no data yet" : profile.attendanceRate >= 90 ? "excellent" : profile.attendanceRate >= 70 ? "good" : "needs work"}</div>
          </div>
        </div>

        {/* ── FORM ── */}
        <form id="pp-profile-form" onSubmit={handleSave} className="pp-form">

          {/* Basic Info */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div className="pp-card-icon">👤</div>
              <div>
                <h3 className="pp-card-title">Basic Info</h3>
                <p className="pp-card-desc">Your contact and location details</p>
              </div>
            </div>
            <div className="pp-grid">
              <div className="pp-field">
                <label className="pp-label">Full Name *</label>
                <input className="pp-input" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" required />
              </div>
              <div className="pp-field">
                <label className="pp-label">Email</label>
                <input className="pp-input" type="email" value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="your@email.com" />
              </div>
              <div className="pp-field">
                <label className="pp-label">Phone *</label>
                <input className="pp-input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="10-digit number" required />
              </div>
              <div className="pp-field">
                <label className="pp-label">WhatsApp Number *</label>
                <input className="pp-input" value={profile.whatsappNumber} onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })} placeholder="WhatsApp number" required />
              </div>
              <div className="pp-field">
                <label className="pp-label">City</label>
                <input className="pp-input" value={profile.location?.city || ""} onChange={(e) => setProfile({ ...profile, location: { ...profile.location, city: e.target.value } })} placeholder="e.g. Mumbai" />
              </div>
              <div className="pp-field">
                <label className="pp-label">State</label>
                <input className="pp-input" value={profile.location?.state || ""} onChange={(e) => setProfile({ ...profile, location: { ...profile.location, state: e.target.value } })} placeholder="e.g. Maharashtra" />
              </div>
            </div>
          </div>

          {/* Game Preferences */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div className="pp-card-icon">⚽</div>
              <div>
                <h3 className="pp-card-title">Game Preferences</h3>
                <p className="pp-card-desc">Skill level, format, and positions</p>
              </div>
            </div>
            <div className="pp-grid" style={{ marginBottom: 20 }}>
              <div className="pp-field">
                <label className="pp-label">Skill Level</label>
                <select className="pp-input" value={profile.preferences?.skillLevel || "beginner"} onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, skillLevel: e.target.value as "beginner" | "intermediate" | "advanced" } })}>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
              <div className="pp-field">
                <label className="pp-label">Preferred Format</label>
                <select className="pp-input" value={profile.preferences?.preferredFormat || "5v5"} onChange={(e) => setProfile({ ...profile, preferences: { ...profile.preferences, preferredFormat: e.target.value as "5v5" | "6v6" | "7v7" | "8v8" | "9v9" | "10v10" } })}>
                  {(["5v5", "6v6", "7v7", "8v8", "9v9", "10v10"] as const).map((f) => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            <div className="pp-field" style={{ marginBottom: 20 }}>
              <label className="pp-label">Preferred Positions</label>
              <div className="pp-chips">
                {[{ id: "GK", label: "Goalkeeper" }, { id: "DEF", label: "Defender" }, { id: "MID", label: "Midfielder" }, { id: "FWD", label: "Forward" }].map(({ id, label }) => {
                  const selected = (profile.preferences?.positions || []).includes(id);
                  return (
                    <button key={id} type="button" onClick={() => togglePosition(id)} className={`pp-chip${selected ? " pp-chip-on" : ""}`}>
                      <span className="pp-chip-code">{id}</span>
                      <span className="pp-chip-name">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="pp-field">
              <label className="pp-label">Preferred Play Areas (up to 2)</label>
              <div className="pp-grid">
                {[0, 1].map((idx) => (
                  <input key={idx} className="pp-input"
                    value={(profile.preferences?.preferredLocations || [])[idx] || ""}
                    onChange={(e) => updatePreferredLocation(idx, e.target.value)}
                    placeholder={idx === 0 ? "e.g. Andheri, Mumbai" : "e.g. Bandra (optional)"} />
                ))}
              </div>
            </div>
          </div>

          {/* Account Info */}
          <div className="pp-card">
            <div className="pp-card-header">
              <div className="pp-card-icon">🔒</div>
              <div>
                <h3 className="pp-card-title">Account Info</h3>
                <p className="pp-card-desc">Read-only account details</p>
              </div>
            </div>
            <div className="pp-status-grid">
              <div className="pp-status-item">
                <div className="pp-status-item-label">Verification</div>
                <div className="pp-status-item-value">
                  <span className="pp-status-dot" style={{ background: profile.isVerified ? "#4ade80" : "#ff6b6b" }} />
                  {profile.isVerified ? "Verified" : "Not Verified"}
                </div>
              </div>
              {memberSince && (
                <div className="pp-status-item">
                  <div className="pp-status-item-label">Member Since</div>
                  <div className="pp-status-item-value">{memberSince}</div>
                </div>
              )}
              {profile.referralCode && (
                <div className="pp-status-item" style={{ gridColumn: "1 / -1" }}>
                  <div className="pp-status-item-label" style={{ marginBottom: 8 }}>Referral Code</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <code className="pp-referral-code">{profile.referralCode}</code>
                    <button type="button" className="pp-copy-btn" onClick={() => navigator.clipboard.writeText(profile.referralCode || "")}>Copy</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {error && <div className="pp-error">{error}</div>}
          {saveSuccess && <div className="pp-success">Profile saved successfully.</div>}

          <div className="pp-actions">
            <button type="submit" className="pp-save-btn" disabled={saving || deleting}>
              {saving ? "Saving…" : "Save Changes"}
            </button>
            <button type="button" className="pp-delete-btn" onClick={() => setDeleteStep(1)} disabled={saving || deleting}>
              Delete Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
