"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { NAV_LINKS } from "@/config/navigation";
import { getSession } from "@/utils/api";

export function Header() {
  // const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const closeMobile = () => setMobileOpen(false);
  const toggleMobile = () => setMobileOpen((v) => !v);
  // const closeLogin = () => setLoginOpen(false);
  // const toggleLogin = () => setLoginOpen((v) => !v);

  useEffect(() => {
    const syncSession = () => setIsLoggedIn(Boolean(getSession().token));
    syncSession();

    window.addEventListener("kk-auth-changed", syncSession);
    return () => window.removeEventListener("kk-auth-changed", syncSession);
  }, []);

  const dashboardHref = "/dashboard";

  return (
    <>
      {/* ── NAVBAR ── */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 500,
          height: "52px",
          display: "flex",
          alignItems: "center",
          background: "rgba(8,8,8,0.96)",
          borderBottom: "1px solid var(--border)",
          backdropFilter: "blur(20px)",
          animation: "navIn 0.6s cubic-bezier(0.22,1,0.36,1) both",
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMobile}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "52px",
            width: "64px",
            borderRight: "1px solid var(--border)",
            textDecoration: "none",
            flexShrink: 0,
            transition: "background 0.18s",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: "34px",
              height: "34px",
              overflow: "hidden",
              border: "1.5px solid #333",
              flexShrink: 0,
            }}
          >
            <div
              style={{
                flex: 1,
                background: "var(--white)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--cond)",
                  fontWeight: 900,
                  fontSize: "8px",
                  letterSpacing: "0.08em",
                  color: "#000",
                }}
              >
                KASA
              </span>
            </div>
            <div
              style={{
                flex: 1,
                background: "#000",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderTop: "1.5px solid #333",
              }}
            >
              <span
                style={{
                  fontFamily: "var(--cond)",
                  fontWeight: 900,
                  fontSize: "8px",
                  letterSpacing: "0.08em",
                  color: "var(--white)",
                }}
              >
                KAI
              </span>
            </div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div
          className="site-desktop-links"
          style={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            padding: "0 8px 0 16px",
            gap: "2px",
          }}
        >
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "var(--body)",
                fontSize: "14.5px",
                fontWeight: 700,
                letterSpacing: "0.03em",
                color: "var(--muted)",
                textDecoration: "none",
                padding: "0 14px",
                height: "100%",
                display: "flex",
                alignItems: "center",
                transition: "color 0.15s",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--white)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--muted)")
              }
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* Desktop login button */}
        <div className="site-desktop-login" style={{ alignItems: "center" }}>
          <a
            href={isLoggedIn ? dashboardHref : "/login"}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              height: "36px",
              padding: "0 20px",
              margin: "0 16px",
              background: "var(--white)",
              color: "var(--black)",
              fontFamily: "var(--body)",
              textDecoration: "none",
              fontSize: "13.5px",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              border: "1px solid var(--white)",
              cursor: "pointer",
              transition: "background 0.2s, color 0.2s",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--white)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "var(--white)";
              e.currentTarget.style.color = "var(--black)";
            }}
          >
            {isLoggedIn ? "Dashboard" : "Login"}
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={toggleMobile}
          className="site-mobile-toggle"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          style={{
            height: "52px",
            width: "60px",
            borderTop: "none",
            borderRight: "none",
            borderBottom: "none",
            borderLeft: "1px solid var(--border)",
            background: "transparent",
            color: "var(--white)",
            cursor: "pointer",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {mobileOpen ? (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path
                d="M6 6l12 12M6 18L18 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24">
              <path
                d="M3 7h18M3 12h18M3 17h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </button>
      </nav>

      {/* ── DESKTOP LOGIN DROPDOWN ── */}
      {/* {loginOpen && (
        <div
          style={{ position: "fixed", top: "74px", right: "18px", zIndex: 490, animation: "modalIn .25s cubic-bezier(.4,0,.2,1) both" }}
          onMouseLeave={closeLogin}
        >
          <div style={{ width: "260px", background: "#111", border: "1px solid var(--border)", padding: "6px", display: "flex", flexDirection: "column", gap: "2px", boxShadow: "0 12px 32px rgba(0,0,0,0.4)" }}>
            {LOGIN_OPTIONS.map((opt) => (
              <a
                key={opt.href ?? opt.role}
                href={opt.href ?? `/login?role=${opt.role}`}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", textDecoration: "none", transition: "background .18s" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
              >
                <div style={{ width: "30px", height: "30px", flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                  {opt.icon}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: "13.5px", color: "var(--white)", lineHeight: 1.2 }}>{opt.label}</span>
                  <span style={{ fontFamily: "var(--body)", fontSize: "11.5px", color: "var(--muted)", lineHeight: 1.4, marginTop: "2px" }}>{opt.desc}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )} */}

      {/* ── MOBILE DROPDOWN MENU ── */}
      {mobileOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 490,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(4px)",
          }}
          onClick={closeMobile}
        >
          <div
            style={{
              position: "absolute",
              top: "52px",
              left: 0,
              right: 0,
              background: "#0e0e0e",
              borderBottom: "1px solid var(--border)",
              animation: "modalIn .22s cubic-bezier(.4,0,.2,1) both",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map((link, i) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontFamily: "var(--body)",
                  fontSize: "14px",
                  fontWeight: 600,
                  color: "var(--muted)",
                  textDecoration: "none",
                  padding: "11px 20px",
                  borderBottom:
                    i < NAV_LINKS.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                  transition: "color 0.15s, background 0.15s",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "var(--white)";
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "var(--muted)";
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {link.label}
              </a>
            ))}

            <div style={{ alignItems: "center" }}>
              <a
                href={isLoggedIn ? dashboardHref : "/login"}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  height: "36px",
                  padding: "0 20px",
                  // margin: "0 16px",
                  background: "var(--white)",
                  color: "var(--black)",
                  fontFamily: "var(--body)",
                  textDecoration: "none",
                  fontSize: "13.5px",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  border: "1px solid var(--white)",
                  cursor: "pointer",
                  transition: "background 0.2s, color 0.2s",
                  flexShrink: 0,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--white)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "var(--white)";
                  e.currentTarget.style.color = "var(--black)";
                }}
              >
                {isLoggedIn ? "Dashboard" : "Login"}
              </a>
            </div>
            {/* <div style={{ borderTop: "1px solid var(--border)" }}>
              {LOGIN_OPTIONS.map((opt) => (
                <a
                  key={opt.href ?? opt.role}
                  href={opt.href ?? `/login?role=${opt.role}`}
                  onClick={closeMobile}
                  style={{
                    display: "flex", alignItems: "center", gap: "10px",
                    padding: "10px 20px", textDecoration: "none",
                    borderBottom: "1px solid var(--border)",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  <div style={{ width: "28px", height: "28px", flexShrink: 0, background: "rgba(255,255,255,0.04)", border: "1px solid var(--border)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px" }}>
                    {opt.icon}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: "13px", color: "var(--white)", lineHeight: 1.2 }}>{opt.label}</span>
                    <span style={{ fontFamily: "var(--body)", fontSize: "11px", color: "var(--muted)", lineHeight: 1.3, marginTop: "1px" }}>{opt.desc}</span>
                  </div>
                </a>
              ))}
            </div> */}
          </div>
        </div>
      )}
    </>
  );
}
