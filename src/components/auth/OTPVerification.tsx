"use client";

import { useState } from "react";

interface OTPVerificationProps {
  email: string;
  phone: string;
  context: "signup" | "forgot-password";
  onVerified: () => void;
  onBackClick: () => void;
}

export function OTPVerification({ email, phone, context, onVerified, onBackClick }: OTPVerificationProps) {
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(60);

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const otpValue = otp.join("");
      if (otpValue.length !== 6) {
        setError("Please enter all 6 digits");
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (otpValue === "123456") {
        alert("Email verified successfully!");
        onVerified();
      } else {
        setError("Invalid OTP. Please try again.");
      }
    } catch (err) {
      setError("Verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    setTimer(60);
    setError("");
    // In real app, call backend to resend OTP
    alert("OTP resent to " + phone);
  };

  return (
    <div style={{ animation: "fadeUp 0.6s ease-out" }}>
      <h1 style={{ fontFamily: "var(--cond)", fontSize: "48px", fontWeight: 900, marginBottom: "12px", color: "white" }}>
        Verify Your Number
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "32px", fontSize: "16px" }}>
        We've sent a 6-digit code to<br />
        <strong style={{ color: "white" }}>{phone}</strong>
      </p>

      <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* OTP Input Fields */}
        <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOTPChange(index, e.target.value)}
              style={{
                width: "50px",
                height: "50px",
                padding: "0",
                border: "2px solid var(--border)",
                borderRadius: "8px",
                background: "#1a1a1a",
                color: "white",
                fontSize: "24px",
                fontWeight: 700,
                textAlign: "center",
                fontFamily: "var(--body)",
              }}
            />
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div style={{ padding: "12px", background: "#ff3e3e", borderRadius: "8px", color: "white", fontSize: "14px", textAlign: "center" }}>
            {error}
          </div>
        )}

        {/* Verify Button */}
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
          }}
        >
          {loading ? "Verifying..." : "Verify OTP"}
        </button>
      </form>

      {/* Resend OTP */}
      <div style={{ marginTop: "24px", textAlign: "center", fontSize: "14px", color: "var(--muted)" }}>
        Didn't receive the code?{" "}
        <button
          onClick={handleResendOTP}
          style={{
            background: "none",
            border: "none",
            color: "var(--lime)",
            cursor: "pointer",
            fontWeight: 600,
            textDecoration: "underline",
            fontSize: "14px",
          }}
        >
          Resend OTP
        </button>
        {timer > 0 && <span style={{ color: "var(--muted)", marginLeft: "8px" }}>({timer}s)</span>}
      </div>

      {/* Back Button */}
      <button
        onClick={onBackClick}
        style={{
          marginTop: "24px",
          padding: "12px",
          background: "transparent",
          color: "var(--muted)",
          border: "1px solid var(--border)",
          borderRadius: "8px",
          fontSize: "14px",
          fontWeight: 600,
          cursor: "pointer",
          width: "100%",
        }}
      >
        ← Back
      </button>

    </div>
  );
}
