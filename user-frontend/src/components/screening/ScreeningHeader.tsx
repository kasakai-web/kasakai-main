"use client";

import { useState, memo } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

interface Props {
  isLoggedIn: boolean;
}

export const ScreeningHeader = memo(function ScreeningHeader({ isLoggedIn }: Props) {
  const router   = useRouter();
  const pathname = usePathname();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [loggingOut,  setLoggingOut]  = useState(false);

  function handleLogout() {
    setConfirmOpen(false);
    setLoggingOut(true);
    setTimeout(() => {
      localStorage.removeItem("authToken");
      localStorage.removeItem("userName");
      localStorage.removeItem("userId");
      localStorage.removeItem("userRole");
      localStorage.removeItem("profileImage");
      window.dispatchEvent(new Event("kk-auth-changed"));
      if (pathname !== "/screening") {
        router.replace("/screening");
      } else {
        // Already on the right page — kk-auth-changed already updated state, dismiss overlay
        setLoggingOut(false);
      }
    }, 2000);
  }

  return (
    <>
      <header
        className="sticky top-0 z-40 w-full"
        style={{
          background: "rgba(8,8,8,0.97)",
          borderBottom: "1px solid #1a1a1a",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="h-[58px] sm:h-[66px] flex items-center">

          {/* ── Logo ── */}
          <Link
            href="/"
            aria-label="Back to home"
            className="no-underline flex-shrink-0"
            style={{
              display: "flex", alignItems: "center", justifyContent: "center",
              height: "100%", width: "54px",
              borderRight: "1px solid #1a1a1a",
            }}
          >
            <div style={{
              display: "flex", flexDirection: "column",
              width: "30px", height: "30px",
              overflow: "hidden", border: "1.5px solid #333", flexShrink: 0,
            }}>
              <div style={{ flex: 1, background: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontWeight: 900, fontSize: "7px", letterSpacing: "0.08em", color: "#000", userSelect: "none" }}>KASA</span>
              </div>
              <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1.5px solid #333" }}>
                <span style={{ fontWeight: 900, fontSize: "7px", letterSpacing: "0.08em", color: "#fff", userSelect: "none" }}>KAI</span>
              </div>
            </div>
          </Link>

          {/* ── Screening label ── */}
          <div style={{
            padding: "0 14px", height: "100%",
            borderRight: "1px solid #1a1a1a",
            display: "flex", flexDirection: "column",
            alignItems: "flex-start", justifyContent: "center", flexShrink: 0,
          }}>
            <span className="hidden sm:block" style={{ fontSize: "8px", fontWeight: 900, color: "#444", textTransform: "uppercase", letterSpacing: "0.25em", lineHeight: 1 }}>
              Kasa Kai
            </span>
            <span style={{ fontSize: "12px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.18em", lineHeight: 1, marginTop: "4px" }}>
              Screening
            </span>
          </div>

          <div style={{ flex: 1 }} />

          {/* ── Right: Login / Logout ── */}
          {isLoggedIn ? (
            <button
              onClick={() => setConfirmOpen(true)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                height: "32px", padding: "0 14px", margin: "0 12px",
                background: "transparent", color: "#555",
                border: "1px solid #2a2a2a",
                fontSize: "10px", fontWeight: 900,
                letterSpacing: "0.14em", textTransform: "uppercase",
                cursor: "pointer", transition: "color 0.15s, border-color 0.15s",
                whiteSpace: "nowrap",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#ef4444";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.4)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#555";
                (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a";
              }}
            >
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
              <span className="hidden xs:inline">Logout</span>
              <span className="xs:hidden">Out</span>
            </button>
          ) : (
            <Link
              href="/screening/login"
              className="no-underline"
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                height: "32px", padding: "0 14px", margin: "0 12px",
                background: "#c8f135", color: "#000",
                fontSize: "10px", fontWeight: 900,
                letterSpacing: "0.14em", textTransform: "uppercase",
                transition: "background 0.15s, box-shadow 0.15s",
                boxShadow: "0 0 16px rgba(200,241,53,0.2)",
                whiteSpace: "nowrap",
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

      {/* ── Logout confirmation modal ── */}
      {confirmOpen && (
        <div
          onClick={() => setConfirmOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 200,
            background: "rgba(0,0,0,0.78)", backdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "20px", animation: "scrFadeIn .18s ease both",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#111", border: "1px solid #222",
              width: "100%", maxWidth: "360px",
              overflow: "hidden", animation: "sd-in .2s cubic-bezier(.22,1,.36,1) both",
            }}
          >
            <div style={{ height: "3px", background: "linear-gradient(90deg,#ef4444,#7f1d1d)" }} />
            <div style={{ padding: "26px 24px 22px", textAlign: "center" }}>
              <div style={{
                width: 48, height: 48, borderRadius: "50%",
                background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.2)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
              }}>
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
                </svg>
              </div>
              <p style={{ fontSize: "9px", fontWeight: 900, color: "#ef4444", letterSpacing: ".28em", textTransform: "uppercase", marginBottom: "6px" }}>
                Confirm Logout
              </p>
              <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#e8e8e8", margin: "0 0 8px" }}>
                Are you sure?
              </h3>
              <p style={{ fontSize: "12px", color: "#555", lineHeight: 1.65, margin: "0 0 22px" }}>
                Your bookings are saved and will be here when you return.
              </p>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  onClick={() => setConfirmOpen(false)}
                  style={{
                    flex: 1, height: "42px", background: "transparent", color: "#666",
                    border: "1px solid #2a2a2a", fontSize: "11px", fontWeight: 900,
                    letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
                    transition: "color 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#aaa"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#444"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#666"; (e.currentTarget as HTMLButtonElement).style.borderColor = "#2a2a2a"; }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  style={{
                    flex: 1, height: "42px", background: "rgba(239,68,68,0.12)", color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.3)", fontSize: "11px", fontWeight: 900,
                    letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer",
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.22)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.55)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.12)"; (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(239,68,68,0.3)"; }}
                >
                  Yes, Logout
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Logout toast (2 s) ── */}
      {loggingOut && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 300,
          background: "rgba(0,0,0,0.88)", backdropFilter: "blur(14px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          animation: "scrFadeIn .2s ease both",
        }}>
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: "16px",
            animation: "sd-in .28s cubic-bezier(.22,1,.36,1) both",
          }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "rgba(200,241,53,0.08)", border: "1.5px solid rgba(200,241,53,0.2)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
              </svg>
            </div>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", letterSpacing: ".28em", textTransform: "uppercase", marginBottom: "6px" }}>
                See you soon
              </p>
              <p style={{ fontSize: "20px", fontWeight: 900, color: "#e8e8e8", margin: "0 0 6px" }}>
                You&apos;ve been logged out
              </p>
              <p style={{ fontSize: "12px", color: "#444", margin: 0 }}>
                Redirecting to screening…
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
});
