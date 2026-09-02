"use client";

import { useState } from "react";
import { validatePassword } from "@/utils/auth";
import { buildApiUrl } from "@/utils/api";

interface PlayerSignUpStep2Props {
  userData: {
    phone: string;
    email: string;
    firstName: string;
    preferences: { positions: string[]; preferredLocations: string[] };
  };
  onBack: () => void;
  onSuccess: (password: string, devOtp?: string) => void;
}

export function PlayerSignUpStep2({ userData, onBack, onSuccess }: PlayerSignUpStep2Props) {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!validatePassword(password)) {
      newErrors.password = "Password must be at least 8 characters";
    }

    if (password !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (!agreeTerms) {
      newErrors.terms = "You must agree to the terms and conditions";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/auth/register"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userData.firstName,
          phone: userData.phone,
          email: userData.email,
          password: password,
          role: "player",
          preferences: userData.preferences,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to create account");
      }

      onSuccess(password, data.dev_otp);
    } catch (err: unknown) {
      const isNetworkError = err instanceof TypeError;
      const errorMessage = err instanceof Error ? err.message : "Failed to create account. Please try again.";
      const submitMessage = isNetworkError
        ? "Cannot reach backend server. Please try again in a few minutes."
        : errorMessage;

      setErrors({ submit: submitMessage });
    } finally {
      setLoading(false);
    }
  };

  const positionLabels: Record<string, string> = { GK: "Goalkeeper", DEF: "Defender", MID: "Midfielder", FWD: "Forward", ANY: "Any Position" };

  return (
    <div className="auth-card">
      <button onClick={onBack} className="auth-linkbtn" style={{ marginBottom: "20px", display: "block" }}>
        ← Back
      </button>

      <div className="auth-head">
        <div className="auth-eyebrow">Step 3 of 3 · Set a password</div>
        <h1 className="auth-title">
          Confirm<br />
          <span className="accent">Details</span>
        </h1>
        <p className="auth-lead">Check what we have, then pick a password.</p>
      </div>

      {errors.submit && <div className="auth-error">{errors.submit}</div>}

      <form onSubmit={handleCreateAccount} className="auth-form">
        {/* Read-back of everything collected so far */}
        <div className="auth-summary">
          <dl>
            <div>
              <dt>Name</dt>
              <dd>{userData.firstName}</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>+91 {userData.phone}</dd>
            </div>
            <div>
              <dt>Email</dt>
              <dd>{userData.email}</dd>
            </div>
            {userData.preferences.positions.length > 0 && (
              <div>
                <dt>Position</dt>
                <dd>{userData.preferences.positions.map((p) => positionLabels[p] || p).join(", ")}</dd>
              </div>
            )}
            {userData.preferences.preferredLocations.length > 0 && (
              <div>
                <dt>Areas</dt>
                <dd>{userData.preferences.preferredLocations.join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Password */}
        <div className="auth-field">
          <label className="auth-label">Create Password *</label>
          <div className={`auth-input-shell${errors.password ? " invalid" : ""}`}>
            <input
              type="password"
              className="auth-input"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: "" });
              }}
              placeholder="At least 8 characters"
            />
          </div>
          {errors.password && <span className="auth-err">{errors.password}</span>}
        </div>

        {/* Confirm Password */}
        <div className="auth-field">
          <label className="auth-label">Confirm Password *</label>
          <div className={`auth-input-shell${errors.confirmPassword ? " invalid" : ""}`}>
            <input
              type="password"
              className="auth-input"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                setErrors({ ...errors, confirmPassword: "" });
              }}
              placeholder="Re-enter password"
            />
          </div>
          {errors.confirmPassword && <span className="auth-err">{errors.confirmPassword}</span>}
        </div>

        {/* Terms & Conditions */}
        <div className="auth-field">
          <div className="auth-check">
            <input
              type="checkbox"
              id="terms"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked);
                setErrors({ ...errors, terms: "" });
              }}
            />
            <label htmlFor="terms">
              I agree to the <a href="/terms" target="_blank" rel="noopener noreferrer">Terms &amp; Conditions</a> and{" "}
              <a href="/privacy" target="_blank" rel="noopener noreferrer">Privacy Policy</a>
            </label>
          </div>
          {errors.terms && <span className="auth-err">{errors.terms}</span>}
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn-block">
          <span>{loading ? "Creating Account..." : "Create Account"}</span>
        </button>
      </form>
    </div>
  );
}
