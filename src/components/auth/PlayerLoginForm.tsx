"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { validatePhone, validatePassword } from "@/utils/auth";
import { buildApiUrl, resolveImageUrl } from "@/utils/api";

interface PlayerLoginFormProps {
  onSignupClick: () => void;
  onForgotClick: () => void;
  redirectAfterLogin?: string | null;
  targetGame?: string | null;
}

export function PlayerLoginForm({ onSignupClick, onForgotClick, redirectAfterLogin, targetGame: propTargetGame }: PlayerLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const fromSearchParams = searchParams.get("targetGame");
  const fromStorage = typeof window !== "undefined" ? localStorage.getItem("targetGameId") : null;
  const targetGame = propTargetGame || fromSearchParams || fromStorage;
  
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
        localStorage.setItem("userProfileImage", resolveImageUrl(user.profileImage));
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
              localStorage.setItem("userProfileImage", resolveImageUrl(imgData.data.profileImage));
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

      // If targetGame is provided, redirect to dashboard with the game modal opened
      if (targetGame) {
        if (isNew) {
          localStorage.removeItem("newSignup");
          localStorage.setItem("showProfileBanner", "true");
        }
        // Clear the targetGameId so it doesn't carry over to other flows
        localStorage.removeItem("targetGameId");
        router.replace(`/dashboard?openGame=${targetGame}`);
      } else if (isNew) {
        localStorage.removeItem("newSignup");
        localStorage.setItem("showProfileBanner", "true");
        router.replace("/dashboard/profile");
      } else if (!hasImage) {
        router.replace("/dashboard/profile");
      } else if (redirectAfterLogin) {
        router.replace(redirectAfterLogin);
      } else {
        router.replace("/dashboard");
      }
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <div className="auth-head">
        <div className="auth-eyebrow">Player Portal</div>
        <h1 className="auth-title">
          Welcome<br />
          <span className="accent">Back</span>
        </h1>
        <p className="auth-lead">Sign in to browse games and manage bookings.</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSubmit} className="auth-form">
        {/* Phone */}
        <div className="auth-field">
          <label className="auth-label">Phone Number</label>
          <div className="auth-input-shell">
            <span className="auth-prefix">+91</span>
            <input
              type="tel"
              className="auth-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="9876543210"
              maxLength={10}
            />
          </div>
        </div>

        {/* Password */}
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <div className="auth-input-shell">
            <input
              type={showPassword ? "text" : "password"}
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 8 characters"
            />
            <button type="button" className="auth-reveal" onClick={() => setShowPassword(!showPassword)}>
              {showPassword ? "HIDE" : "SHOW"}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn-block" style={{ marginTop: "4px" }}>
          <span>{loading ? "Signing in..." : "Sign In"}</span>
        </button>

        <button type="button" onClick={onForgotClick} className="auth-linkbtn">
          Forgot password?
        </button>

        <div className="auth-divider">
          <span>New here?</span>
        </div>

        <button type="button" onClick={onSignupClick} className="btn-ghost btn-block">
          Create an Account
        </button>
      </form>
    </div>
  );
}
