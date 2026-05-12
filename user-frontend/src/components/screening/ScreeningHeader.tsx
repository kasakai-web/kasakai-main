"use client";

import { memo } from "react";
import Link from "next/link";

interface Props {
  isLoggedIn: boolean;
}

export const ScreeningHeader = memo(function ScreeningHeader({ isLoggedIn }: Props) {
  return (
    <header
      className="sticky top-0 z-40 w-full"
      style={{
        background: "rgba(8,8,8,0.97)",
        borderBottom: "1px solid #1a1a1a",
        backdropFilter: "blur(20px)",
      }}
    >
      <div className="h-[66px] flex items-center">

        {/* ── Logo ── */}
        <Link
          href="/"
          aria-label="Back to home"
          className="no-underline flex-shrink-0"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "66px",
            width: "64px",
            borderRight: "1px solid #1a1a1a",
          }}
        >
          <div style={{
            display: "flex", flexDirection: "column",
            width: "34px", height: "34px",
            overflow: "hidden", border: "1.5px solid #333", flexShrink: 0,
          }}>
            <div style={{ flex: 1, background: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontWeight: 900, fontSize: "8px", letterSpacing: "0.08em", color: "#000", userSelect: "none" }}>KASA</span>
            </div>
            <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1.5px solid #333" }}>
              <span style={{ fontWeight: 900, fontSize: "8px", letterSpacing: "0.08em", color: "#fff", userSelect: "none" }}>KAI</span>
            </div>
          </div>
        </Link>

        {/* ── Screening label ── */}
        <div
          style={{
            padding: "0 20px",
            height: "100%",
            borderRight: "1px solid #1a1a1a",
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <span style={{ fontSize: "8px", fontWeight: 900, color: "#444", textTransform: "uppercase", letterSpacing: "0.25em", lineHeight: 1 }}>
            Kasa Kai
          </span>
          <span style={{ fontSize: "13px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.18em", lineHeight: 1, marginTop: "5px" }}>
            Screening
          </span>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ── Right: Login / Dashboard ── */}
        {isLoggedIn ? (
          <Link
            href="/dashboard"
            className="no-underline"
            style={{
              display: "flex", alignItems: "center",
              height: "34px", padding: "0 20px",
              margin: "0 16px",
              background: "#c8f135", color: "#000",
              fontSize: "11px", fontWeight: 900,
              letterSpacing: "0.14em", textTransform: "uppercase",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#d4f545")}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = "#c8f135")}
          >
            Dashboard
          </Link>
        ) : (
          <Link
            href="/screening/login"
            className="no-underline"
            style={{
              display: "flex", alignItems: "center", gap: "6px",
              height: "34px", padding: "0 18px",
              margin: "0 16px",
              background: "#c8f135", color: "#000",
              fontSize: "11px", fontWeight: 900,
              letterSpacing: "0.14em", textTransform: "uppercase",
              transition: "background 0.15s, box-shadow 0.15s",
              boxShadow: "0 0 16px rgba(200,241,53,0.2)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#d4f545";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 24px rgba(200,241,53,0.35)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLAnchorElement).style.background = "#c8f135";
              (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 0 16px rgba(200,241,53,0.2)";
            }}
          >
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
            </svg>
            Login
          </Link>
        )}

      </div>
    </header>
  );
});
