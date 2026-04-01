"use client";

import Link from "next/link";
import { useState } from "react";
import { NAV_LINKS, LOGIN_OPTIONS } from "@/config/navigation";

export function Header() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleLogin = () => setLoginOpen(!loginOpen);
  const closeLogin = () => setLoginOpen(false);
  const toggleMobile = () => setMobileOpen(!mobileOpen);
  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      {/* NAVBAR */}
      <nav style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 500,
        height: "66px",
        display: "flex",
        alignItems: "center",
        background: "rgba(8, 8, 8, 0.96)",
        borderBottom: "1px solid var(--border)",
        backdropFilter: "blur(20px)",
        animation: "navIn 0.6s cubic-bezier(0.22, 1, 0.36, 1) both",
      }}>
        {/* Logo */}
        <Link
          href="/"
          onClick={closeMobile}
          style={{
            display: "flex",
            alignItems: "center",
            height: "66px",
            padding: "0 26px",
            borderRight: "1px solid var(--border)",
            textDecoration: "none",
            flexShrink: 0,
            gap: "12px",
            transition: "background 0.18s",
          }}
          className="hover:bg-white/3"
        >
          {/* Logo Block */}
          <div style={{ display: "flex", flexDirection: "column", width: "32px", height: "32px", overflow: "hidden", border: "1.5px solid #2a2a2a", flexShrink: 0 }}>
            <div style={{ flex: 1, background: "var(--white)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "8.5px", letterSpacing: "0.1em", lineHeight: 1, color: "#000" }}>KASA</span>
            </div>
            <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1.5px solid #2a2a2a" }}>
              <span style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "8.5px", letterSpacing: "0.1em", lineHeight: 1, color: "var(--white)" }}>KAI</span>
            </div>
          </div>
          
          {/* Logo Text */}
          <div style={{ display: "flex", flexDirection: "column", lineHeight: 1, gap: 0 }} className="hidden sm:flex">
            <p style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "16px", letterSpacing: "0.14em", color: "var(--white)", lineHeight: 1 }}>KASA</p>
            <p style={{ fontFamily: "var(--cond)", fontWeight: 800, fontSize: "16px", letterSpacing: "0.14em", color: "var(--muted)", lineHeight: 1 }}>KAI</p>
          </div>
        </Link>

        {/* Desktop Nav Links */}
        <div style={{ display: "flex", alignItems: "center", flex: 1, height: "100%", padding: "0 8px 0 18px", gap: "4px" }} className="hidden md:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              style={{
                fontFamily: "var(--body)",
                fontSize: "14px",
                fontWeight: 800,
                letterSpacing: "0.03em",
                color: "var(--muted)",
                textDecoration: "none",
                padding: "0 16px",
                height: "100%",
                display: "flex",
                alignItems: "center",
                position: "relative",
                transition: "color 0.15s",
              }}
              className="nav-link-desktop"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} className="hidden md:block" />

        {/* Login Button */}
        <div className="hidden md:flex items-center">
            <button
            onClick={toggleLogin}
            style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                height: "36px",
                padding: "0 22px",
                margin: "0 18px",
                background: "var(--white)",
                color: "var(--black)",
                fontFamily: "var(--body)",
                fontSize: "13px",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                border: "1px solid var(--white)",
                cursor: "pointer",
                position: "relative",
                overflow: "hidden",
                transition: "background 0.2s, color 0.2s",
                flexShrink: 0,
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--white)';
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--white)';
                e.currentTarget.style.color = 'var(--black)';
            }}
            >
            <span style={{ position: "relative", zIndex: 10 }}>Login</span>
            <svg
                style={{
                position: "relative",
                zIndex: 10,
                width: "12px",
                height: "12px",
                transition: "transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1)",
                transform: loginOpen ? "rotate(180deg)" : "rotate(0deg)",
                }}
                fill="none"
                viewBox="0 0 12 12"
            >
                <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            </button>
        </div>


        {/* Mobile Menu Button */}
        <button 
          onClick={toggleMobile} 
          style={{ 
            height: "66px", 
            padding: "0 20px", 
            borderLeft: "1px solid var(--border)", 
            color: "var(--white)", 
            background: 'transparent', 
            border: 'none', 
            cursor: 'pointer'
          }}
          className="mobile-menu-btn"
        >
          <svg style={{ width: "20px", height: "20px" }} fill="none" viewBox="0 0 24 24"><path d="M3 12h18M3 6h18M3 18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </nav>

      {/* LOGIN MODAL */}
      {loginOpen && (
        <div
          style={{
            position: "fixed",
            top: "74px",
            right: "18px",
            zIndex: 490,
            animation: "modalIn .3s cubic-bezier(.4,0,.2,1) both",
          }}
          onMouseLeave={closeLogin}
        >
          <div style={{
            width: "280px",
            background: "#111111",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "8px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
          }}>
            {LOGIN_OPTIONS.map((opt) => (
              <a
                key={opt.role}
                href={`/login?role=${opt.role}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  padding: "14px",
                  textDecoration: "none",
                  borderRadius: "6px",
                  transition: "background .2s",
                }}
                className="hover:bg-white/5"
              >
                <div style={{ width: "32px", height: "32px", flexShrink: 0, background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: "50%", display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {opt.icon}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontFamily: "var(--body)", fontWeight: 700, fontSize: "14px", color: "var(--white)", lineHeight: 1.2 }}>
                    {opt.label}
                  </span>
                  <span style={{ fontFamily: "var(--body)", fontSize: "12px", color: "var(--muted)", lineHeight: 1.4, marginTop: '2px' }}>
                    {opt.desc}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* MOBILE MENU */}
      {mobileOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={closeMobile}>
          <div
            style={{
              position: 'absolute',
              top: '74px',
              left: '16px',
              right: '16px',
              background: '#0e0e0e',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              animation: 'modalIn .3s cubic-bezier(.4,0,.2,1) both'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={closeMobile}
                style={{
                  fontFamily: "var(--body)",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--muted)",
                  textDecoration: "none",
                  padding: "12px 16px",
                  borderRadius: '6px',
                  transition: "color 0.15s, background 0.15s",
                }}
                className="hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </a>
            ))}
            <div style={{height: '1px', background: 'var(--border)', margin: '8px 0'}} />
            <a
              href="/login"
              onClick={closeMobile}
              style={{
                fontFamily: "var(--body)",
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--black)",
                background: 'var(--white)',
                textAlign: 'center',
                textDecoration: "none",
                padding: "14px 16px",
                borderRadius: '6px',
                transition: "opacity 0.15s",
              }}
              className="hover:opacity-90"
            >
              Login / Sign Up
            </a>
          </div>
        </div>
      )}
    </>
  );
}

      <style jsx>{`
        @keyframes navIn {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: none;
            opacity: 1;
          }
        }
      `}</style>
