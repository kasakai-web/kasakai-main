"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { validatePhone, validatePassword } from "@/utils/auth";

interface PlayerLoginFormProps {
  onSignupClick: () => void;
  onForgotClick: () => void;
}

export function PlayerLoginForm({ onSignupClick, onForgotClick }: PlayerLoginFormProps) {
  const searchParams = useSearchParams();
  const qRole = searchParams.get("role");

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  
  // Default to what's in the query param (player or organizer), else fallback to player
  const [role, setRole] = useState(qRole === "organiser" || qRole === "organizer" ? "organizer" : "player");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (qRole === "organiser" || qRole === "organizer") {
      setRole("organizer");
    } else {
      setRole("player");
    }
  }, [qRole]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!validatePhone(phone)) {
      setError("Please enter a valid 10-digit phone number (starting with 6-9)");
      return;
    }

    if (!validatePassword(password)) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch("http://localhost:5000/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          phone, 
          password, 
          // Frontend URL role uses "organizer" but DB uses "organiser"
          role: role === "organizer" || role === "organiser" ? "organiser" : "player" 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to login");
      }

      const { token, user } = await response.json();
      localStorage.setItem("authToken", token);
      localStorage.setItem("userRole", user.role || role);
      localStorage.setItem("userId", user.id);
      localStorage.setItem("userName", user.name || "User");

      window.location.href = user.role === "organiser" ? `/dashboard/organizer/${user.id}` : `/dashboard/player/${user.id}`;
    } catch (err: any) {
      setError(err.message || "Login failed. Please try again.");
    }
  };

  return (
    <div style={{ background: "var(--dark-navy)", padding: "40px 30px", borderRadius: "12px", border: "1px solid #333" }}>
      <h1 style={{ color: "var(--yellow)", fontSize: "28px", marginBottom: "10px", textAlign: "center" }}>
        {role === "organizer" ? "Organiser Login" : "Player Login"}
      </h1>
      <p style={{ color: "#999", textAlign: "center", marginBottom: "30px", fontSize: "14px" }}>Enter your phone number and password</p>

      {error && (
        <div style={{ background: "#ff4444", color: "white", padding: "12px", borderRadius: "6px", marginBottom: "20px", fontSize: "14px" }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: "20px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "8px" }}>Phone Number</label>
          <div style={{ display: "flex", alignItems: "center", background: "#1a1a2e", border: "1px solid #444", borderRadius: "6px", padding: "0 12px" }}>
            <span style={{ color: "#999", fontSize: "14px", fontWeight: "600" }}>+91</span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
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
            />
          </div>
          <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>10-digit mobile number</small>
        </div>

        <div style={{ marginBottom: "24px" }}>
          <label style={{ color: "#ccc", fontSize: "14px", display: "block", marginBottom: "8px" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
            style={{
              width: "100%",
              background: "#1a1a2e",
              border: "1px solid #444",
              borderRadius: "6px",
              padding: "12px",
              color: "white",
              fontSize: "16px",
              outline: "none",
              boxSizing: "border-box",
            }}
            onFocus={(e) => (e.target.style.borderColor = "var(--yellow)")}
            onBlur={(e) => (e.target.style.borderColor = "#444")}
          />
          <small style={{ color: "#666", fontSize: "12px", marginTop: "4px", display: "block" }}>Minimum 8 characters</small>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: "transparent",
            color: loading ? "#666" : "var(--yellow)",
            border: `1px solid ${loading ? "#666" : "var(--yellow)"}`,
            padding: "12px",
            borderRadius: "6px",
            fontSize: "16px",
            fontWeight: "600",
            cursor: loading ? "not-allowed" : "pointer",
            marginBottom: "16px",
            transition: "background 0.3s ease, color 0.3s ease",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.background = "var(--yellow)";
              e.currentTarget.style.color = "black";
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--yellow)";
            }
          }}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <button
          type="button"
          onClick={onForgotClick}
          style={{
            width: "100%",
            background: "transparent",
            color: "var(--yellow)",
            border: "1px solid var(--yellow)",
            padding: "10px",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: "pointer",
            marginBottom: "20px",
            transition: "all 0.3s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--yellow)";
            e.currentTarget.style.color = "black";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--yellow)";
          }}
        >
          Forgot Password?
        </button>

        <div style={{ textAlign: "center", paddingTop: "16px", borderTop: "1px solid #333" }}>
          <p style={{ color: "#999", fontSize: "14px", marginBottom: "8px" }}>Don't have an account?</p>
          <button
            type="button"
            onClick={onSignupClick}
            style={{
              background: "transparent",
              color: "var(--yellow)",
              border: "none",
              fontSize: "14px",
              fontWeight: "600",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Create one now
          </button>
        </div>
      </form>
    </div>
  );
}
