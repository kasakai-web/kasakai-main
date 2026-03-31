"use client";

import { useState } from "react";

interface LoginFormProps {
  onSignupClick: () => void;
  onForgotClick: () => void;
}

export function LoginForm({ onSignupClick, onForgotClick }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // TODO: Replace with actual API call
      if (!email || !password) {
        setError("Please fill in all fields");
        return;
      }

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Store session (replace with actual auth)
      localStorage.setItem("token", "mock-token-" + Date.now());
      localStorage.setItem("userRole", "player");
      
      alert("Login successful!");
      window.location.href = "/dashboard";
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ animation: "fadeUp 0.6s ease-out" }}>
      <h1 style={{ fontFamily: "var(--cond)", fontSize: "48px", fontWeight: 900, marginBottom: "12px", color: "white" }}>
        Login to KasaKai
      </h1>
      <p style={{ color: "var(--muted)", marginBottom: "32px", fontSize: "16px" }}>
        Enter your credentials to access your player account
      </p>

      <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
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

        {/* Password Input */}
        <div>
          <label style={{ display: "block", fontSize: "14px", fontWeight: 600, marginBottom: "8px", color: "var(--white)" }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {/* Forgot Password Link */}
        <button
          type="button"
          onClick={onForgotClick}
          style={{
            background: "none",
            border: "none",
            color: "var(--lime)",
            cursor: "pointer",
            textAlign: "left",
            fontSize: "14px",
            fontWeight: 600,
            padding: 0,
          }}
        >
          Forgot Password?
        </button>

        {/* Error Message */}
        {error && (
          <div style={{ padding: "12px", background: "#ff3e3e", borderRadius: "8px", color: "white", fontSize: "14px" }}>
            {error}
          </div>
        )}

        {/* Login Button */}
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
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {/* Sign Up Link */}
      <div style={{ marginTop: "24px", textAlign: "center", color: "var(--muted)", fontSize: "14px" }}>
        Don't have an account?{" "}
        <button
          onClick={onSignupClick}
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
          Sign Up
        </button>
      </div>
    </div>
  );
}
