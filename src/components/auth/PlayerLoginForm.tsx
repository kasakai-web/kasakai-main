"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { validatePhone, validatePassword } from "@/utils/auth";
import { buildApiUrl } from "@/utils/api";

interface PlayerLoginFormProps {
  onSignupClick: () => void;
  onForgotClick: () => void;
  redirectAfterLogin?: string | null;
}

export function PlayerLoginForm({ onSignupClick, onForgotClick, redirectAfterLogin }: PlayerLoginFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePhone(phone)) {
      setError("Please enter a valid 10-digit phone number (starting with 6–9)");
      return;
    }
    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, password, role: "player" }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(response.status === 401 ? "Wrong credentials" : data.message || "Failed to login");
      }

      const { token, user } = data;
      localStorage.setItem("authToken", token);
      localStorage.setItem("userRole", "player");
      // Signal SocketClient to connect now that we have a token (same-tab login)
      window.dispatchEvent(new CustomEvent("kk-auth-changed"));
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userName", user.name || "User");
      if (user.profileImage) {
        const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/api\/v1\/?$/, "");
        localStorage.setItem("userProfileImage", `${apiBase}${user.profileImage}`);
      } else {
        localStorage.removeItem("userProfileImage");
      }

      // Upload pending profile image from signup if present
      const pendingImage = localStorage.getItem("pendingProfileImage");
      if (pendingImage) {
        try {
          const blob = await (await fetch(pendingImage)).blob();
          const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
          const formData = new FormData();
          formData.append("profileImage", blob, `profile.${ext}`);
          const imgRes = await fetch(buildApiUrl("/players/me/profile-image"), {
            method: "POST",
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          });
          if (imgRes.ok) {
            const imgData = await imgRes.json();
            if (imgData.data?.profileImage) {
              const apiBase = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000").replace(/\/api\/v1\/?$/, "");
              localStorage.setItem("userProfileImage", `${apiBase}${imgData.data.profileImage}`);
            }
          }
        } catch {
          // Non-critical — don't block login
        } finally {
          localStorage.removeItem("pendingProfileImage");
        }
      }

      const hasImage = !!localStorage.getItem("userProfileImage");
      if (!hasImage) localStorage.setItem("requirePhotoUpload", "true");

      const isNew = localStorage.getItem("newSignup") === "true";
      if (isNew) {
        localStorage.removeItem("newSignup");
        localStorage.setItem("showProfileBanner", "true");
        router.replace(`/dashboard/player/${user.id}/profile`);
      } else if (!hasImage) {
        router.replace(`/dashboard/player/${user.id}/profile`);
      } else if (redirectAfterLogin) {
        router.replace(redirectAfterLogin);
      } else {
        router.replace(`/dashboard/player/${user.id}`);
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#0e0e0e", border: "1px solid var(--border)", padding: "clamp(24px, 6vw, 40px) clamp(20px, 6vw, 36px)" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "10px" }}>
          Player Portal
        </div>
        <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "42px", letterSpacing: "-0.01em", lineHeight: 0.95, color: "var(--white)", margin: 0 }}>
          WELCOME<br />
          <span style={{ color: "var(--lime)" }}>BACK</span>
        </h1>
        <p style={{ fontFamily: "var(--body)", fontSize: "13px", color: "var(--muted)", marginTop: "12px", lineHeight: 1.6 }}>
          Sign in to browse games and manage bookings.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(255,68,68,0.08)",
          border: "1px solid rgba(255,68,68,0.3)",
          color: "#ff8080",
          padding: "12px 16px",
          marginBottom: "24px",
          fontFamily: "var(--body)",
          fontSize: "13px",
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Phone */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}>
            Phone Number
          </label>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", transition: "border-color 0.18s" }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--lime)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <span style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "var(--muted)", padding: "0 14px", borderRight: "1px solid var(--border)", height: "48px", display: "flex", alignItems: "center", flexShrink: 0 }}>
              +91
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              maxLength={10}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: "0 14px",
                height: "48px",
                color: "var(--white)",
                fontFamily: "var(--body)",
                fontSize: "15px",
                outline: "none",
              }}
            />
          </div>
        </div>

        {/* Password */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}>
            Password
          </label>
          <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", transition: "border-color 0.18s" }}
            onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--lime)")}
            onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
          >
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: "0 14px",
                height: "48px",
                color: "var(--white)",
                fontFamily: "var(--body)",
                fontSize: "15px",
                outline: "none",
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{ background: "transparent", border: "none", padding: "0 14px", color: "var(--muted)", cursor: "pointer", fontSize: "12px", fontFamily: "var(--mono)", letterSpacing: "0.06em" }}
            >
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: "100%", textAlign: "center", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", marginTop: "4px" }}
        >
          <span>{loading ? "Signing in..." : "Sign In"}</span>
        </button>

        {/* Forgot password */}
        <button
          type="button"
          onClick={onForgotClick}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--muted)",
            fontFamily: "var(--body)",
            fontSize: "13px",
            cursor: "pointer",
            textAlign: "center",
            padding: "0",
            transition: "color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--white)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--muted)")}
        >
          Forgot password?
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: "0.18em", color: "var(--muted)", textTransform: "uppercase" }}>New here?</span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>

        {/* Signup */}
        <button
          type="button"
          onClick={onSignupClick}
          className="btn-ghost"
          style={{ width: "100%", textAlign: "center" }}
        >
          Create an Account
        </button>
      </form>
    </div>
  );
}
