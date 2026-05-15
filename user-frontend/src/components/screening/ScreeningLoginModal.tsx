"use client";

import Link from "next/link";
import type { Screening } from "./types";

interface Props {
  open: boolean;
  onClose: () => void;
  screening: Screening | null;
}

export function ScreeningLoginModal({ open, onClose, screening }: Props) {
  if (!open) return null;

  const redirectParam = screening ? `?redirect=${encodeURIComponent(`/screening/${screening.id}`)}` : "";
  const loginHref  = `/screening/login${redirectParam}`;
  const signupHref = `/screening/login${redirectParam ? redirectParam + "&mode=signup" : "?mode=signup"}`;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 300,
        background: "rgba(0,0,0,0.8)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
      className="sm:items-center"
      onClick={onClose}
    >
      {/* Card */}
      <div
        style={{
          width: "100%",
          background: "#0a0a0a",
          border: "1px solid #151515",
          borderRadius: "16px 16px 0 0",
          overflow: "hidden",
        }}
        className="sm:max-w-md sm:mx-auto sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drag handle — mobile only */}
        <div className="flex justify-center pt-3 sm:hidden">
          <div style={{ width: "36px", height: "3px", background: "#1e1e1e", borderRadius: "9999px" }} />
        </div>

        {/* Top lime accent bar */}
        <div style={{ height: "2px", background: "linear-gradient(to right, transparent, #c8f135, transparent)", margin: "20px 40px 0", borderRadius: "9999px" }} />

        <div style={{ padding: "28px 28px 32px" }}>
          {/* ── Branding ── */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "24px", gap: "14px" }}>
            {/* Logo mark */}
            <div style={{
              width: "48px", height: "48px",
              display: "flex", flexDirection: "column",
              overflow: "hidden",
              border: "1.5px solid rgba(200,241,53,0.25)",
              borderRadius: "8px",
              boxShadow: "0 0 24px rgba(200,241,53,0.12)",
              flexShrink: 0,
            }}>
              <div style={{ flex: 1, background: "#f4efe8", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontWeight: 900, fontSize: "8px", letterSpacing: "0.1em", color: "#000", userSelect: "none" }}>KASA</span>
              </div>
              <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                <span style={{ fontWeight: 900, fontSize: "8px", letterSpacing: "0.1em", color: "#f4efe8", userSelect: "none" }}>KAI</span>
              </div>
            </div>

            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.25em", marginBottom: "8px", lineHeight: 1 }}>
                Kasa Kai Screening
              </p>
              <h2 style={{ fontSize: "22px", fontWeight: 900, color: "#fff", margin: 0, lineHeight: 1.2 }}>Reserve your spot</h2>
              <p style={{ color: "#777", fontSize: "13px", marginTop: "8px", lineHeight: 1.5 }}>
                Sign in to book seats at your favourite venue
              </p>
            </div>
          </div>

          {/* ── Event preview card ── */}
          {screening && (
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "12px",
              padding: "14px",
              background: "rgba(200,241,53,0.04)",
              border: "1px solid rgba(200,241,53,0.15)",
              borderRadius: "10px",
              marginBottom: "20px",
            }}>
              {/* Calendar icon */}
              <div style={{
                width: "36px", height: "36px", flexShrink: 0,
                background: "rgba(200,241,53,0.1)",
                borderRadius: "8px",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" />
                  <path d="M16 2v4M8 2v4M3 10h18" />
                </svg>
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ fontSize: "9px", fontWeight: 900, color: "rgba(200,241,53,0.45)", textTransform: "uppercase", letterSpacing: "0.18em", marginBottom: "4px", lineHeight: 1 }}>
                  Selected Event
                </p>
                <p style={{ fontSize: "13px", fontWeight: 800, color: "rgba(200,241,53,0.9)", lineHeight: 1.3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {screening.matchTitle}
                </p>
                <p style={{ fontSize: "11px", color: "#777", fontWeight: 600, marginTop: "3px" }}>
                  {screening.venueName} &middot; {screening.location}
                </p>
              </div>
            </div>
          )}

          {/* ── Perks ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", marginBottom: "24px" }}>
            {[
              {
                icon: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z",
                label: "Verified",
              },
              {
                icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
                label: "Secure",
              },
              {
                icon: "M13 10V3L4 14h7v7l9-11h-7z",
                label: "Instant",
              },
            ].map(({ icon, label }) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid #1a1a1a",
                  borderRadius: "9999px",
                }}
              >
                <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d={icon} />
                </svg>
                <span style={{ fontSize: "10px", fontWeight: 800, color: "#777", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</span>
              </div>
            ))}
          </div>

          {/* ── Actions ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <Link
              href={loginHref}
              className="no-underline"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                padding: "0 20px",
                height: "50px",
                background: "#c8f135",
                color: "#000",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                transition: "background 0.15s",
                boxSizing: "border-box",
                boxShadow: "0 0 24px rgba(200,241,53,0.2)",
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#d4f545")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#c8f135")}
            >
              <span>Login to my account</span>
              <svg width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </Link>

            <Link
              href={signupHref}
              className="no-underline"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                width: "100%",
                height: "46px",
                background: "transparent",
                color: "#555",
                border: "1px solid #1e1e1e",
                borderRadius: "8px",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                transition: "color 0.15s, border-color 0.15s, background 0.15s",
                boxSizing: "border-box",
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "#fff";
                el.style.borderColor = "#333";
                el.style.background = "rgba(255,255,255,0.04)";
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.color = "#555";
                el.style.borderColor = "#1e1e1e";
                el.style.background = "transparent";
              }}
            >
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 7a4 4 0 108 0 4 4 0 00-8 0M19 8v6M22 11h-6" />
              </svg>
              Create free account
            </Link>

            <button
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                color: "#555",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: "6px",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#888")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#555")}
            >
              Maybe later
            </button>
          </div>

          {/* Fine print */}
          <p style={{ textAlign: "center", fontSize: "9px", fontWeight: 800, color: "#666", textTransform: "uppercase", letterSpacing: "0.1em", marginTop: "16px" }}>
            By joining you agree to our{" "}
            <Link href="/terms" className="no-underline" style={{ color: "#888", textDecoration: "underline" }}>Terms</Link>
            {" & "}
            <Link href="/privacy" className="no-underline" style={{ color: "#888", textDecoration: "underline" }}>Privacy</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
