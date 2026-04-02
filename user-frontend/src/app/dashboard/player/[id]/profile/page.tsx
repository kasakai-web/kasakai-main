"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../../../player-dashboard.css";

type PlayerProfile = {
  name: string;
  email?: string;
  phone: string;
  whatsappNumber: string;
  location?: {
    city?: string;
    state?: string;
  };
  preferences?: {
    skillLevel?: "beginner" | "intermediate" | "advanced";
    preferredFormat?: "5v5" | "6v6" | "7v7" | "8v8" | "9v9" | "10v10";
    positions?: string[];
  };
};

export default function PlayerProfilePage({ params: _params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<PlayerProfile>({
    name: "",
    email: "",
    phone: "",
    whatsappNumber: "",
    location: { city: "", state: "" },
    preferences: { skillLevel: "beginner", preferredFormat: "5v5", positions: [] },
  });

  const clearSessionAndExit = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("token");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("userName");
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
        return { success: false, message: "Invalid JSON response from server" };
      }
    }

    return { success: false, message: responseText };
  };

  const fetchProfile = async () => {
    setLoading(true);
    setError("");

    const token = localStorage.getItem("authToken");
    const role = localStorage.getItem("userRole");
    const userId = localStorage.getItem("userId");

    if (!token || role !== "player" || !userId) {
      clearSessionAndExit();
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/v1/players/me", {
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

      const p = data.data || {};
      setProfile({
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        whatsappNumber: p.whatsappNumber || "",
        location: {
          city: p.location?.city || "",
          state: p.location?.state || "",
        },
        preferences: {
          skillLevel: p.preferences?.skillLevel || "beginner",
          preferredFormat: p.preferences?.preferredFormat || "5v5",
          positions: p.preferences?.positions || [],
        },
      });
    } catch (e) {
      setError((e as Error).message || "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const togglePosition = (position: string) => {
    const current = profile.preferences?.positions || [];
    const next = current.includes(position)
      ? current.filter((p) => p !== position)
      : [...current, position];

    setProfile((prev) => ({
      ...prev,
      preferences: {
        ...prev.preferences,
        positions: next,
      },
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const token = localStorage.getItem("authToken");
    if (!token) {
      clearSessionAndExit();
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/v1/players/me", {
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
          location: {
            city: profile.location?.city,
            state: profile.location?.state,
          },
          preferences: profile.preferences,
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
    const token = localStorage.getItem("authToken");
    if (!token) {
      clearSessionAndExit();
      return;
    }

    setDeleting(true);
    try {
      const res = await fetch("http://localhost:5000/api/v1/players/me", {
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
      <div className="player-dashboard-container">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="player-dashboard-container">
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
                    : "This will permanently remove your profile and bookings."}
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

      <div className="profile-page-shell">
        <div className="profile-hero">
          <div className="profile-kicker">Player Dashboard</div>
          <h1 className="profile-title">Your Profile</h1>
          <p className="profile-subtitle">Keep your details and match preferences updated so you get better games.</p>
        </div>

        <form onSubmit={handleSave} className="profile-form">
          <section className="profile-card">
            <div className="profile-card-head">
              <h3>Basic Info</h3>
              <span>Personal details</span>
            </div>

            <div className="profile-grid">
              <label className="profile-field">
                <span>Full Name</span>
                <input
                  value={profile.name}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  placeholder="Full name"
                  required
                />
              </label>

              <label className="profile-field">
                <span>Email</span>
                <input
                  value={profile.email || ""}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                  placeholder="Email"
                  type="email"
                />
              </label>

              <label className="profile-field">
                <span>Phone</span>
                <input
                  value={profile.phone}
                  onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                  placeholder="Phone"
                  required
                />
              </label>

              <label className="profile-field">
                <span>WhatsApp Number</span>
                <input
                  value={profile.whatsappNumber}
                  onChange={(e) => setProfile({ ...profile, whatsappNumber: e.target.value })}
                  placeholder="WhatsApp Number"
                  required
                />
              </label>

              <label className="profile-field">
                <span>City</span>
                <input
                  value={profile.location?.city || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    location: { ...(profile.location || {}), city: e.target.value },
                  })}
                  placeholder="City"
                />
              </label>

              <label className="profile-field">
                <span>State</span>
                <input
                  value={profile.location?.state || ""}
                  onChange={(e) => setProfile({
                    ...profile,
                    location: { ...(profile.location || {}), state: e.target.value },
                  })}
                  placeholder="State"
                />
              </label>
            </div>
          </section>

          <section className="profile-card">
            <div className="profile-card-head">
              <h3>Game Preferences</h3>
              <span>How you like to play</span>
            </div>

            <div className="profile-grid">
              <label className="profile-field">
                <span>Skill Level</span>
                <select
                  value={profile.preferences?.skillLevel || "beginner"}
                  onChange={(e) => setProfile({
                    ...profile,
                    preferences: {
                      ...(profile.preferences || {}),
                      skillLevel: e.target.value as "beginner" | "intermediate" | "advanced",
                    },
                  })}
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </label>

              <label className="profile-field">
                <span>Preferred Format</span>
                <select
                  value={profile.preferences?.preferredFormat || "5v5"}
                  onChange={(e) => setProfile({
                    ...profile,
                    preferences: {
                      ...(profile.preferences || {}),
                      preferredFormat: e.target.value as "5v5" | "6v6" | "7v7" | "8v8" | "9v9" | "10v10",
                    },
                  })}
                >
                  {(["5v5", "6v6", "7v7", "8v8", "9v9", "10v10"] as const).map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="profile-position-wrap">
              <span className="profile-position-label">Preferred Positions</span>
              <div className="profile-position-list">
                {["GK", "DEF", "MID", "FWD"].map((pos) => {
                  const selected = (profile.preferences?.positions || []).includes(pos);
                  return (
                    <button
                      key={pos}
                      type="button"
                      onClick={() => togglePosition(pos)}
                      className={`profile-chip ${selected ? "selected" : ""}`}
                    >
                      {pos}
                    </button>
                  );
                })}
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
