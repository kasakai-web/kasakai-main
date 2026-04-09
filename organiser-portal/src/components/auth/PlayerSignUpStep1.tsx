"use client";

import { useState } from "react";
import { validatePhone, validateEmail } from "@/utils/auth";

interface PlayerSignUpStep1Props {
  onBack: () => void;
  onContinue: (data: { firstName: string; phone: string; email: string }) => void;
}

export function PlayerSignUpStep1({ onBack, onContinue }: PlayerSignUpStep1Props) {
  const [firstName, setFirstName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!firstName.trim()) newErrors.firstName = "Name is required";
    if (!validatePhone(phone)) newErrors.phone = "Enter valid 10-digit phone (starting 6-9)";
    if (!validateEmail(email)) newErrors.email = "Enter valid email";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    onContinue({ firstName, phone, email });
  };

  const inputStyle = {
    width: "100%",
    background: "#1a1a2e",
    border: "1px solid #444",
    borderRadius: "6px",
    padding: "12px",
    color: "white",
    fontSize: "16px",
    outline: "none",
    boxSizing: "border-box" as const,
  };

  return (
    <div style={{ background: "var(--dark-navy)", padding: "40px 30px", borderRadius: "12px", border: "1px solid #333" }}>
      <button
        onClick={onBack}
        style={{
          background: "transparent",
          color: "var(--yellow)",
          border: "none",
          fontSize: "14px",
          cursor: "pointer",
          marginBottom: "20px",
          padding: 0,
        }}
      >
        ← Back
      </button>

      <h1 style={{ color: "var(--yellow)", fontSize: "28px", marginBottom: "10px" }}>Create Account</h1>
      <p style={{ color: "#999", marginBottom: "30px", fontSize: "14px" }}>Step 1 of 2: Enter your details</p>

      <form onSubmit={handleContinue}>
        {/* Name */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "8px" }}>Full Name *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              setErrors({ ...errors, firstName: "" });
            }}
            placeholder="Your full name"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--yellow)")}
            onBlur={(e) => (e.target.style.borderColor = "#444")}
          />
          {errors.firstName && <small style={{ color: "#ff6b6b", fontSize: "12px", display: "block", marginTop: "4px" }}>{errors.firstName}</small>}
        </div>

        {/* Phone */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "8px" }}>Phone Number *</label>
          <div style={{ display: "flex", alignItems: "center", background: "#1a1a2e", border: errors.phone ? "1px solid #ff6b6b" : "1px solid #444", borderRadius: "6px", padding: "0 12px" }}>
            <span style={{ color: "#999", fontSize: "14px", fontWeight: "600" }}>+91</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, "").slice(0, 10);
                setPhone(val);
                setErrors({ ...errors, phone: "" });
              }}
              placeholder="9876543210"
              maxLength={10}
              style={{
                flex: 1,
                background: "transparent",
                border: "none",
                padding: "12px 12px",
                color: "white",
                fontSize: "16px",
                outline: "none",
              }}
              onFocus={(e) => {
                const container = e.currentTarget.parentElement;
                if (container) container.style.borderColor = "var(--yellow)";
              }}
              onBlur={(e) => {
                const container = e.currentTarget.parentElement;
                if (container) container.style.borderColor = errors.phone ? "#ff6b6b" : "#444";
              }}
            />
          </div>
          {errors.phone && <small style={{ color: "#ff6b6b", fontSize: "12px", display: "block", marginTop: "4px" }}>{errors.phone}</small>}
        </div>

        {/* Email */}
        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "8px" }}>Email Address *</label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErrors({ ...errors, email: "" });
            }}
            placeholder="your@email.com"
            style={inputStyle}
            onFocus={(e) => (e.target.style.borderColor = "var(--yellow)")}
            onBlur={(e) => (e.target.style.borderColor = errors.email ? "#ff6b6b" : "#444")}
          />
          {errors.email && <small style={{ color: "#ff6b6b", fontSize: "12px", display: "block", marginTop: "4px" }}>{errors.email}</small>}
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            background: "var(--yellow)",
            color: "black",
            border: "none",
            padding: "12px",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: "pointer",
            transition: "background 0.3s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#ffd700")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "var(--yellow)")}
        >
          Continue
        </button>
      </form>
    </div>
  );
}
