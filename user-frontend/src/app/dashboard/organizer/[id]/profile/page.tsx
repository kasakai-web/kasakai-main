"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import "../../../organizer-dashboard.css";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";

type OrganiserProfile = {
  name: string;
  email?: string;
  phone: string;
  whatsappNumber: string;
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
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<OrganiserProfile>({
    name: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    location: { city: "", state: "", country: "India" },
    defaultFeeInPaise: 0,
    defaultFormat: "6v6",
    defaultCutoffHours: 24,
    defaultTurfId: "",
    notificationSettings: { whatsapp: true, sms: true, push: true },
    approvalStatus: "pending",
    isActive: true,
  });

  const clearSessionAndExit = () => {
    clearSession();
    router.replace("/login?role=organiser");
  };

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

  const fetchProfile = async () => {
    setLoading(true);
    setError("");

    const { token } = getSession();

    if (!token) {
      clearSessionAndExit();
      return;
    }

    try {
      const res = await fetch(buildApiUrl("/api/v1/organisers/me"), {
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

      const o = data.data || {};
      setProfile({
        name: o.name || "",
        email: o.email || "",
        phone: o.phone || "",
        whatsappNumber: o.whatsappNumber || "",
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
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthorized) {
      setLoading(false);
      return;
    }

    fetchProfile();
  }, [isAuthorized]);

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

      localStorage.setItem("userName", data.data?.name || profile.name);
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

  return (
    <div className="organizer-dashboard-container">
      {deleteStep > 0 && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => !deleting && setDeleteStep(0)}>
          <div
            className="modal-content"
            style={{ maxWidth: 520, width: "92%", textAlign: "left" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="modal-header" style={{ marginBottom: 16 }}>
              <div className="modal-title-section">
                <h2 style={{ margin: 0 }}>Delete Account</h2>
                <p className="modal-subtitle" style={{ marginTop: 8 }}>
                  {deleteStep === 1
                    ? "Are you sure you want to delete your account?"
                    : "This will permanently remove your organiser profile and related access."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12 }}>
              <button className="btn-close" type="button" onClick={() => setDeleteStep(0)} disabled={deleting}>
                Cancel
              </button>
              {deleteStep === 1 ? (
                <button className="btn-primary" type="button" onClick={() => setDeleteStep(2)} disabled={deleting}>
                  <span>Continue</span>
                </button>
              ) : (
                <button
                  className="profile-delete-btn"
                  type="button"
                  onClick={async () => {
                    setDeleteStep(0);
                    await handleDeleteProfile();
                  }}
                  disabled={deleting}
                >
                  {deleting ? "Deleting..." : "Delete Now"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="organizer-profile-shell">
        <div className="organizer-profile-hero">
          <div className="profile-kicker">Organiser Dashboard</div>
          <h1 className="profile-title">Your Profile</h1>
          <p className="profile-subtitle">Manage your organiser contact details and default event settings.</p>
        </div>

        <form onSubmit={handleSave} className="organizer-profile-form">
          <section className="organizer-profile-card">
            <div className="profile-card-head">
              <h3>Basic Info</h3>
              <span>Account details</span>
            </div>

            <div className="profile-grid">
              <label className="profile-field">
                <span>Full Name</span>
                <input value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} placeholder="Full name" required />
              </label>

              <label className="profile-field">
                <span>Email</span>
                <input value={profile.email || ""} onChange={(e) => setProfile({ ...profile, email: e.target.value })} placeholder="Email" type="email" />
              </label>

              <label className="profile-field">
                <span>Phone</span>
                <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} placeholder="Phone" required />
              </label>

              <label className="profile-field">
                <span>WhatsApp Number</span>
                <input value={profile.whatsappNumber} onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })} placeholder="WhatsApp Number" required />
              </label>

              <label className="profile-field">
                <span>City</span>
                <input value={profile.location?.city || ""} onChange={(e) => setProfile({ ...profile, location: { ...(profile.location || {}), city: e.target.value } })} placeholder="City" />
              </label>

              <label className="profile-field">
                <span>State</span>
                <input value={profile.location?.state || ""} onChange={(e) => setProfile({ ...profile, location: { ...(profile.location || {}), state: e.target.value } })} placeholder="State" />
              </label>
            </div>
          </section>

          <section className="organizer-profile-card">
            <div className="profile-card-head">
              <h3>Event Defaults</h3>
              <span>Game setup preferences</span>
            </div>

            <div className="profile-grid">
              <label className="profile-field">
                <span>Default Format</span>
                <select value={profile.defaultFormat || "6v6"} onChange={(e) => setProfile({ ...profile, defaultFormat: e.target.value as OrganiserProfile["defaultFormat"] })}>
                  {["5v5", "6v6", "7v7", "8v8", "9v9", "10v10"].map((format) => (
                    <option key={format} value={format}>{format}</option>
                  ))}
                </select>
              </label>

              <label className="profile-field">
                <span>Default Fee (paise)</span>
                <input type="number" min="0" value={profile.defaultFeeInPaise ?? 0} onChange={(e) => setProfile({ ...profile, defaultFeeInPaise: Number(e.target.value) })} placeholder="0" />
              </label>

              <label className="profile-field">
                <span>Default Cutoff Hours</span>
                <input type="number" min="1" value={profile.defaultCutoffHours ?? 24} onChange={(e) => setProfile({ ...profile, defaultCutoffHours: Number(e.target.value) })} placeholder="24" />
              </label>

              <label className="profile-field">
                <span>Default Turf Id</span>
                <input value={profile.defaultTurfId || ""} onChange={(e) => setProfile({ ...profile, defaultTurfId: e.target.value })} placeholder="Turf ID" />
              </label>
            </div>
          </section>

          <section className="organizer-profile-card">
            <div className="profile-card-head">
              <h3>Notifications</h3>
              <span>Where to send updates</span>
            </div>

            <div className="profile-toggle-grid">
              {[
                ["whatsapp", "WhatsApp"],
                ["sms", "SMS"],
                ["push", "Push"],
              ].map(([key, label]) => {
                const settingKey = key as keyof NonNullable<OrganiserProfile["notificationSettings"]>;
                const value = profile.notificationSettings?.[settingKey] ?? true;
                return (
                  <button
                    key={key}
                    type="button"
                    className={`profile-toggle-row ${value ? "on" : "off"}`}
                    onClick={() => setProfile({
                      ...profile,
                      notificationSettings: {
                        ...(profile.notificationSettings || {}),
                        [settingKey]: !value,
                      },
                    })}
                  >
                    <div>
                      <div className="toggle-label">{label}</div>
                      <div className="toggle-sub">{value ? "Enabled" : "Disabled"}</div>
                    </div>
                    <span className="profile-toggle-pill">{value ? "On" : "Off"}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="organizer-profile-card">
            <div className="profile-card-head">
              <h3>Account Status</h3>
              <span>Read only</span>
            </div>

            <div className="profile-status-grid">
              <div className="profile-status-item">
                <span>Status</span>
                <strong>{profile.approvalStatus || "pending"}</strong>
              </div>
              <div className="profile-status-item">
                <span>Active</span>
                <strong>{profile.isActive ? "Yes" : "No"}</strong>
              </div>
            </div>
          </section>

          {error && <p className="profile-error">{error}</p>}

          <div className="profile-actions">
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
