"use client";

import { useState } from "react";
import { validatePassword } from "@/utils/auth";
import { buildApiUrl } from "@/utils/api";

interface SetNewPasswordFormProps {
  email?: string;
  phone?: string;
  otp: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function SetNewPasswordForm({ email, phone, otp, onSuccess, onBack }: SetNewPasswordFormProps) {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!validatePassword(newPassword)) {
      newErrors.newPassword = "Password must be at least 8 characters";
    }

    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/auth/reset-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email,
          phone: email ? undefined : phone,
          resetToken: otp,
          newPassword: newPassword,
          role: "player"
        }),
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to reset password.");
      }

      onSuccess();
    } catch (err: any) {
      setErrors({ submit: err.message || "Failed to reset password. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card">
      <button onClick={onBack} className="auth-linkbtn" style={{ marginBottom: "20px", display: "block" }}>
        ← Back
      </button>

      <div className="auth-head">
        <div className="auth-eyebrow">Account recovery</div>
        <h1 className="auth-title">
          Set new<br />
          <span className="accent">Password</span>
        </h1>
        <p className="auth-lead">Choose a new password for {email || phone}.</p>
      </div>

      {errors.submit && <div className="auth-error">{errors.submit}</div>}

      <form onSubmit={handleResetPassword} className="auth-form">
        <div className="auth-field">
          <label className="auth-label">New Password *</label>
          <div className={`auth-input-shell${errors.newPassword ? " invalid" : ""}`}>
            <input
              type="password"
              className="auth-input"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value);
                setErrors({ ...errors, newPassword: "" });
              }}
              placeholder="At least 8 characters"
            />
          </div>
          {errors.newPassword && <span className="auth-err">{errors.newPassword}</span>}
          <span className="auth-hint">Use uppercase, lowercase, numbers, and symbols for strength</span>
        </div>

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

        <button type="submit" disabled={loading} className="btn-primary btn-block">
          <span>{loading ? "Resetting Password..." : "Reset Password"}</span>
        </button>

        <button type="button" onClick={onBack} className="btn-ghost btn-block">
          Back
        </button>
      </form>
    </div>
  );
}
