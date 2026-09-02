"use client";

import { useState } from "react";
import { validatePhone } from "@/utils/auth";
import { buildApiUrl } from "@/utils/api";

interface ForgotPasswordStep1Props {
  onBack: () => void;
  onContinue: (phone: string, devOtp?: string) => void;
}

export function ForgotPasswordStep1({ onBack, onContinue }: ForgotPasswordStep1Props) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePhone(phone)) {
      setError("Please enter a valid 10-digit phone number (starting with 6–9)");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl("/auth/forgot-password"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, role: "player" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to send reset OTP.");
      }

      onContinue(phone, data.dev_otp);
    } catch (err: any) {
      setError(err.message || "Failed to send OTP. Please try again.");
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
          Reset<br />
          <span className="accent">Password</span>
        </h1>
        <p className="auth-lead">Enter your phone number and we&apos;ll send a reset OTP on WhatsApp.</p>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleContinue} className="auth-form">
        <div className="auth-field">
          <label className="auth-label">Phone Number</label>
          <div className={`auth-input-shell${error ? " invalid" : ""}`}>
            <span className="auth-prefix">+91</span>
            <input
              type="tel"
              className="auth-input"
              value={phone}
              onChange={(e) => {
                setPhone(e.target.value.replace(/\D/g, "").slice(0, 10));
                setError("");
              }}
              placeholder="9876543210"
              maxLength={10}
            />
          </div>
          <span className="auth-hint">OTP will be sent to this number via WhatsApp</span>
        </div>

        <button type="submit" disabled={loading} className="btn-primary btn-block">
          <span>{loading ? "Sending OTP..." : "Send OTP on WhatsApp"}</span>
        </button>

        <button type="button" onClick={onBack} className="btn-ghost btn-block">
          Back to Login
        </button>
      </form>
    </div>
  );
}
