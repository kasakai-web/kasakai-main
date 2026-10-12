"use client";

import { useState } from "react";
import { validatePhone } from "@/utils/auth";
import { buildApiUrl } from "@/utils/api";
import { GoogleSignInButton, useGoogleAvailable } from "./GoogleSignInButton";

export type SessionUser = { id: string; name?: string; profileImage?: string | null };

// A Google sign-in that isn't linked yet. maskedPhone is set when their Gmail
// found an existing account: the code then goes to that account's number.
export type GoogleStep = { googleToken: string; profile: { name: string; email: string }; maskedPhone?: string };

// Linked → a session. Not linked yet → the player verifies a phone, which either
// links an existing account or starts a new one.
export type GoogleResult = { token: string; user: SessionUser } | GoogleStep;

interface PlayerLoginFormProps {
  onCodeSent: (phone: string) => void;
  onGoogle?: (result: GoogleResult) => void | Promise<void>;
  // After Google: ask only for the number — or, when their Gmail found their
  // account, just send the code to the number on it.
  google?: GoogleStep;
  onBack?: () => void;
}

// Sign in AND sign up: a number with no account goes on to the profile step.
export function PlayerLoginForm({ onCodeSent, onGoogle, google, onBack }: PlayerLoginFormProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const googleAvailable = useGoogleAvailable() && !google;
  const known = google?.maskedPhone; // the server sends the code to this number

  const post = async (path: string, body: object) => {
    const res = await fetch(buildApiUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, role: "player" }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Something went wrong. Please try again.");
    return data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!known && !validatePhone(phone)) {
      setError("Please enter a valid 10-digit phone number (starting with 6–9)");
      return;
    }
    setLoading(true);
    try {
      await post("/auth/otp/send", known ? { googleToken: google?.googleToken } : { phone });
      onCodeSent(known ? "" : phone);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async (credential: string) => {
    setError("");
    setLoading(true);
    try {
      await onGoogle?.(await post("/auth/google", { credential }));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ background: "#0e0e0e", border: "1px solid var(--border)", padding: "clamp(24px, 6vw, 40px) clamp(20px, 6vw, 36px)" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            style={{ background: "none", border: "none", padding: 0, marginBottom: "20px", cursor: "pointer", fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}
          >
            ← Back
          </button>
        )}
        <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "10px" }}>
          Player Portal
        </div>
        <h1 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "42px", letterSpacing: "-0.01em", lineHeight: 0.95, color: "var(--white)", margin: 0 }}>
          {known ? "WELCOME" : google ? "ALMOST" : <>LET&apos;S</>}<br />
          <span style={{ color: "var(--lime)" }}>{known ? "BACK" : google ? "THERE" : "PLAY"}</span>
        </h1>
        <p style={{ fontFamily: "var(--body)", fontSize: "13px", color: "var(--muted)", marginTop: "12px", lineHeight: 1.6 }}>
          {known
            ? <>We found your KasaKai account for {google?.profile.email}. We&apos;ll send a code to your WhatsApp on +91 {known}.</>
            : google
              ? <>Signed in with Google as {google.profile.email}. Now verify your phone number.</>
              : "Sign in or create an account with your phone number."}
        </p>
      </div>

      {/* Existing players whose Gmail isn't on their account land here */}
      {google && !known && (
        <div style={{
          background: "rgba(196,213,108,0.06)",
          border: "1px solid rgba(196,213,108,0.3)",
          color: "var(--white)",
          padding: "12px 16px",
          marginBottom: "24px",
          fontFamily: "var(--body)",
          fontSize: "13px",
          lineHeight: 1.5,
        }}>
          <strong>Already have a KasaKai account?</strong> Enter the number you signed up with and we&apos;ll connect this Google account to it.
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{
          background: "rgba(255,68,68,0.08)",
          border: "1px solid rgba(255,68,68,0.3)",
          color: "#ff8080",
          padding: "12px 16px",
          marginBottom: "24px",
          fontFamily: "var(--body)",
          fontSize: "13px",
          lineHeight: 1.5,
        }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {/* Phone */}
        {!known && (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--muted)" }}>
              Phone Number
            </label>
            <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", transition: "border-color 0.18s" }}
              onFocusCapture={(e) => (e.currentTarget.style.borderColor = "var(--lime)")}
              onBlurCapture={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            >
              <span style={{ fontFamily: "var(--mono)", fontSize: "13px", color: "var(--muted)", padding: "0 14px", borderRight: "1px solid var(--border)", height: "48px", display: "flex", alignItems: "center", flexShrink: 0 }}>
                +91
              </span>
              <input
                type="tel"
                autoComplete="tel-national"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
                placeholder="9876543210"
                maxLength={10}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  padding: "0 14px",
                  height: "48px",
                  color: "var(--white)",
                  fontFamily: "var(--body)",
                  fontSize: "15px",
                  outline: "none",
                }}
              />
            </div>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="btn-primary"
          style={{ width: "100%", textAlign: "center", opacity: loading ? 0.6 : 1, cursor: loading ? "not-allowed" : "pointer", marginTop: "4px" }}
        >
          <span>{loading ? "Please wait..." : "Send code on WhatsApp"}</span>
        </button>

        {/* No way to make a second account from here: a changed number goes to support */}
        {known && (
          <p style={{ fontFamily: "var(--body)", fontSize: "12px", color: "var(--muted)", lineHeight: 1.6, margin: 0, textAlign: "center" }}>
            Can&apos;t get the code on this number? Email{" "}
            <a href="mailto:support@kasakai.in" style={{ color: "var(--lime)" }}>support@kasakai.in</a>.
          </p>
        )}

        {googleAvailable && (
          <>
            {/* Divider */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
              <span style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: "0.18em", color: "var(--muted)", textTransform: "uppercase" }}>or</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
            </div>
            <GoogleSignInButton onCredential={handleGoogle} />
          </>
        )}
      </form>
    </div>
  );
}
