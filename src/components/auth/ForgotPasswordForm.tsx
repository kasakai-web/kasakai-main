"use client";

import { useState } from "react";

interface ForgotPasswordFormProps {
  onLoginClick: () => void;
  onOTPRequired: (email: string, phone: string) => void;
}

export function ForgotPasswordForm({ onLoginClick, onOTPRequired }: ForgotPasswordFormProps) {
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!email || !phone) {
        setError("Please fill in all fields");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setError("Please enter a valid email address");
        return;
      }

      if (!/^\d{10}$/.test(phone.replace(/\D/g, ""))) {
        setError("Please enter a valid 10-digit phone number");
        return;
      }

      // Simulate API call to find account and send OTP
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Proceed to OTP verification
      onOTPRequired(email, phone);
    } catch (err) {
      setError("Failed to process request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.6s ease-out" }}>
      <h1 style={{ fontFamily: "var(--cond)", fontSize: "48px", fontWeight: 900, marginBottom: "12px", color: "white" }}>
        Reset Password
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "32px", fontSize: "16px" }}>
        Enter your email and phone number to recover your account
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Email Input */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "#1a1a1a",
              color: "white",
              fontSize: "14px",
              fontFamily: "var(--body)",
            }}
          />
        </div>

        {/* Phone Input */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Phone Number
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 (555) 000-0000"
            style={{
              width: "100%",
              padding: "12px 16px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              background: "#1a1a1a",
              color: "white",
              fontSize: "14px",
              fontFamily: "var(--body)",
            }}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ padding: "12px", background: "#ff3e3e", borderRadius: "8px", color: "white", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "14px",
            background: "var(--lime)",
            color: "#000",
            border: "none",
            borderRadius: "8px",
            fontSize: "16px",
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.7 : 1,
            marginTop: "8px",
          }}
        >
          {loading ? "Verifying Account..." : "Verify Account"}
        </button>
      </form>

      {/* Back to Login */}
      <div style={{ marginTop: "24px", textAlign: "center" }}>
        <button
          onClick={onLoginClick}
          style={{
            background: "none",
            border: "none",
            color: "var(--lime)",
            cursor: "pointer",
            fontSize: "14px",
            fontWeight: 600,
            textDecoration: "underline",
          }}
        >
          ← Back to Login
        </button>
      </div>
    </div>
  );
}
