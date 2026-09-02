"use client";

import { useState, useEffect } from "react";
import { buildApiUrl } from "@/utils/api";
import "../../app/auth-styles.css";

interface OTPVerificationPhoneProps {
  phone?: string;
  email?: string;
  role: "player" | "organiser";
  mode: "signup" | "forgot-password";
  onVerified: (value: string, authData?: { token: string; user: any }) => void;
  onBack: () => void;
  devOtp?: string;
}

export function OTPVerificationPhone({ phone, email, role, mode, onVerified, onBack }: OTPVerificationPhoneProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  useEffect(() => {
    if (resendTimer > 0) {
      const timer = setTimeout(() => setResendTimer(resendTimer - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendTimer]);

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError("");

    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`) as HTMLInputElement;
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`) as HTMLInputElement;
      prevInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const otpString = otp.join("");

    if (otpString.length !== 6) {
      setError("Please enter all 6 digits");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(buildApiUrl('/auth/verify-otp'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, email, otp: otpString, role, mode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Invalid OTP');
      }

      if (mode === "signup") {
        onVerified(otpString, { token: data.token, user: data.user });
      } else {
        onVerified(data.resetToken);
      }
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setOtp(["", "", "", "", "", ""]);

    try {
      const endpoint = mode === "signup" ? "/auth/resend-otp" : "/auth/forgot-password";
      const response = await fetch(buildApiUrl(endpoint), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, email, role }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to resend OTP");
      }

      setResendTimer(60);
    } catch (err: any) {
      setError(err.message || "Failed to resend OTP. Please try again.");
    }
  };

  const maskPhone = (p: string) => `••••••${p.slice(-4)}`;

  const destinationText = phone ? `+91 ${maskPhone(phone)}` : "your WhatsApp";

  return (
    <div className="auth-card auth-form-container">
      <button onClick={onBack} className="auth-linkbtn" style={{ marginBottom: "20px", display: "block" }}>
        ← Back
      </button>

      <div className="auth-head">
        <div className="auth-eyebrow">Verification</div>
        <h1 className="auth-title">
          Enter your<br />
          <span className="accent">OTP</span>
        </h1>
        <p className="auth-lead">Sent to {destinationText}</p>
      </div>

      <div className="auth-note" style={{ marginBottom: "24px" }}>
        <span>📲</span>
        <span>
          Your OTP arrives on <strong>WhatsApp</strong>. Please check your WhatsApp messages.
        </span>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleVerify} className="auth-form">
        <div className="auth-field">
          <label className="auth-label" style={{ textAlign: "center" }}>Enter 6-digit OTP</label>
          <div className="otp-input-container">
            {otp.map((digit, index) => (
              <input
                key={index}
                id={`otp-${index}`}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleOtpChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                className={`otp-input${digit ? " filled" : ""}`}
              />
            ))}
          </div>
        </div>

        {resendTimer > 0 ? (
          <p className="auth-hint" style={{ textAlign: "center" }}>Resend OTP in {resendTimer}s</p>
        ) : (
          <button type="button" onClick={handleResend} className="btn-ghost btn-block">
            Resend OTP
          </button>
        )}

        <button
          type="submit"
          disabled={loading || otp.some((d) => !d)}
          className="btn-primary btn-block"
        >
          <span>{loading ? "Verifying..." : "Verify OTP"}</span>
        </button>
      </form>
    </div>
  );
}
