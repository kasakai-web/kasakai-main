"use client";

import { useState } from "react";

interface SignupFormProps {
  onLoginClick: () => void;
  onOTPRequired: (email: string, phone: string) => void;
}

export function SignupForm({ onLoginClick, onOTPRequired }: SignupFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    phone: "",
    email: "",
    address: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validation
      if (!formData.firstName || !formData.phone || !formData.email || !formData.address || !formData.password) {
        setError("Please fill in all fields");
        return;
      }

      if (!/^\d{10}$/.test(formData.phone.replace(/\D/g, ""))) {
        setError("Please enter a valid 10-digit phone number");
        return;
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        setError("Please enter a valid email address");
        return;
      }

      if (formData.password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }

      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      // Simulate API call to create user and send OTP
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Proceed to OTP verification
      onOTPRequired(formData.email, formData.phone);
    } catch (err) {
      setError("Sign up failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.6s ease-out" }}>
      <h1 style={{ fontFamily: "var(--cond)", fontSize: "48px", fontWeight: 900, marginBottom: "12px", color: "white" }}>
        Create Account
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "32px", fontSize: "16px" }}>
        Join KasaKai and start playing football
      </p>

      <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* First Name */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Full Name
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="John Doe"
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

        {/* Phone Number */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Phone Number
          </label>
          <input
            type="tel"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
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

        {/* Email */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Email Address
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
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

        {/* Address */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Address
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="123 Main Street, City, State 12345"
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

        {/* Password */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Password (Min. 8 characters)
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
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

        {/* Confirm Password */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
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

        {/* Sign Up Button */}
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
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
      </form>

      {/* Login Link */}
      <div style={{ marginTop: "24px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
        Already have an account?{" "}
        <button
          onClick={onLoginClick}
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
          Login
        </button>
      </div>
    </div>
  );
}
