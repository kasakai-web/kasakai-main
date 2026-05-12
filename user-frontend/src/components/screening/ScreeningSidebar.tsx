"use client";

import Link from "next/link";
import type { ViewType } from "./types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentView: ViewType;
  onNav: (view: ViewType) => void;
  bookingsCount: number;
}

// ── colour tokens ──────────────────────────────────────────────
const C = {
  bg:        "#0c0c0c",
  border:    "#1e1e1e",
  white:     "#f0f0f0",
  mid:       "#888",
  muted:     "#555",
  faint:     "#333",
  lime:      "#c8f135",
  limeGlow:  "rgba(200,241,53,0.10)",
  limeBord:  "rgba(200,241,53,0.18)",
  hover:     "rgba(255,255,255,0.05)",
};
// ──────────────────────────────────────────────────────────────

export function ScreeningSidebar({ isOpen, onClose, currentView, onNav, bookingsCount }: Props) {
  if (!isOpen) return null;

  const navItems = [
    {
      id: "LIVE_EVENTS" as ViewType,
      label: "Live Events",
      sub: "Browse screenings",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="3" width="20" height="14" rx="2" />
          <path d="M8 21h8M12 17v4" />
          <path d="M10.5 9.5l4 2.5-4 2.5V9.5z" fill="currentColor" stroke="none" />
        </svg>
      ),
    },
    {
      id: "MY_BOOKINGS" as ViewType,
      label: "My Bookings",
      sub: bookingsCount > 0 ? `${bookingsCount} active ticket${bookingsCount > 1 ? "s" : ""}` : "No bookings yet",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="7" width="20" height="10" rx="1" />
          <circle cx="7.5" cy="12" r="1.5" fill="currentColor" stroke="none" />
          <path d="M12.5 10h5M12.5 14h4" />
        </svg>
      ),
    },
    {
      id: "HISTORY" as ViewType,
      label: "History",
      sub: "Past screenings",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="9" />
          <polyline points="12,7 12,12 15.5,14.5" />
        </svg>
      ),
    },
  ];

  const infoItems = [
    { d: "M15 10l4.553-2.069A1 1 0 0121 8.883v6.234a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z", text: "Giant 4K screens at every venue" },
    { d: "M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z", text: "Multiple cities across India" },
    { d: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z", text: "Zero booking fee, always" },
  ];

  return (
    <div className="fixed inset-0 z-[200]">
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="absolute left-0 top-0 bottom-0 flex flex-col scr-sidebar-panel overflow-hidden"
        style={{ width: "300px", background: C.bg, borderRight: `1px solid ${C.border}` }}
      >

        {/* ━━ HEADER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ height: "66px", padding: "0 18px", borderBottom: `1px solid ${C.border}` }}
        >
          <Link href="/" onClick={onClose} className="flex items-center gap-3 no-underline" style={{ minWidth: 0 }}>
            {/* Logo mark — 34 × 34, matches navbar exactly */}
            <div style={{
              display: "flex", flexDirection: "column",
              width: "34px", height: "34px", flexShrink: 0,
              overflow: "hidden", border: "1.5px solid #383838",
            }}>
              <div style={{ flex: 1, background: "#f0f0f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontWeight: 900, fontSize: "8px", letterSpacing: "0.1em", color: "#000", userSelect: "none", lineHeight: 1 }}>KASA</span>
              </div>
              <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", borderTop: "1.5px solid #383838" }}>
                <span style={{ fontWeight: 900, fontSize: "8px", letterSpacing: "0.1em", color: "#f0f0f0", userSelect: "none", lineHeight: 1 }}>KAI</span>
              </div>
            </div>

            {/* Brand text */}
            <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
              <span style={{ fontWeight: 900, fontSize: "10px", color: C.mid, textTransform: "uppercase", letterSpacing: "0.22em", lineHeight: 1 }}>
                Kasa Kai
              </span>
              <span style={{ fontWeight: 900, fontSize: "13px", color: C.lime, textTransform: "uppercase", letterSpacing: "0.18em", lineHeight: 1 }}>
                Screening
              </span>
            </div>
          </Link>

          {/* Close × */}
          <button
            onClick={onClose}
            style={{
              width: "34px", height: "34px", flexShrink: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "none", border: `1px solid ${C.faint}`,
              color: C.muted, cursor: "pointer",
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.white; (e.currentTarget as HTMLButtonElement).style.borderColor = C.mid; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = C.muted; (e.currentTarget as HTMLButtonElement).style.borderColor = C.faint; }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ━━ NAV LABEL ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div style={{ padding: "22px 20px 10px" }}>
          <span style={{ fontWeight: 900, fontSize: "10px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.22em" }}>
            Menu
          </span>
        </div>

        {/* ━━ NAV ITEMS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <nav style={{ padding: "0 10px", display: "flex", flexDirection: "column", gap: "3px" }}>
          {navItems.map((item) => {
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNav(item.id)}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  width: "100%", textAlign: "left",
                  padding: "13px 14px",
                  background: active ? C.limeGlow : "transparent",
                  border: `1px solid ${active ? C.limeBord : "transparent"}`,
                  color: active ? C.lime : C.mid,
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = C.hover;
                    (e.currentTarget as HTMLButtonElement).style.color = C.white;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = C.mid;
                  }
                }}
              >
                {/* Icon box */}
                <div style={{
                  width: "38px", height: "38px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: active ? "rgba(200,241,53,0.12)" : "rgba(255,255,255,0.05)",
                  border: `1px solid ${active ? C.limeBord : C.border}`,
                  color: active ? C.lime : C.muted,
                }}>
                  {item.icon}
                </div>

                {/* Labels */}
                <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 900, fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.08em", lineHeight: 1, color: active ? C.lime : C.white }}>
                    {item.label}
                  </span>
                  <span style={{ fontWeight: 500, fontSize: "11px", lineHeight: 1, color: active ? "rgba(200,241,53,0.55)" : C.muted }}>
                    {item.sub}
                  </span>
                </div>

                {/* Count badge */}
                {item.id === "MY_BOOKINGS" && bookingsCount > 0 && (
                  <span style={{
                    fontWeight: 900, fontSize: "10px",
                    padding: "3px 8px",
                    background: active ? C.lime : C.faint,
                    color: active ? "#000" : C.mid,
                    flexShrink: 0, letterSpacing: "0.04em",
                  }}>
                    {bookingsCount}
                  </span>
                )}

                {/* Active chevron */}
                {active && (
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.lime} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                )}
              </button>
            );
          })}
        </nav>

        {/* ━━ DIVIDER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div style={{ height: "1px", background: C.border, margin: "22px 20px 0" }} />

        {/* ━━ QUICK INFO ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div style={{ padding: "18px 20px" }}>
          <span style={{ fontWeight: 900, fontSize: "10px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.22em", display: "block", marginBottom: "14px" }}>
            About Screening
          </span>
          <div style={{ display: "flex", flexDirection: "column", gap: "13px" }}>
            {infoItems.map(({ d, text }) => (
              <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                <div style={{
                  width: "30px", height: "30px", flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${C.border}`,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d={d} />
                  </svg>
                </div>
                <span style={{ fontSize: "12px", color: C.mid, lineHeight: 1.6, paddingTop: "5px" }}>
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Spacer */}
        <div style={{ flex: 1 }} />

        {/* ━━ FOOTER ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "14px 20px",
            borderTop: `1px solid ${C.border}`,
            flexShrink: 0,
          }}
        >
          <span style={{ fontWeight: 900, fontSize: "10px", color: C.faint, textTransform: "uppercase", letterSpacing: "0.16em" }}>
            Kasa Kai © 2025
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 2s infinite" }} />
            <span style={{ fontWeight: 900, fontSize: "10px", color: C.muted, textTransform: "uppercase", letterSpacing: "0.14em" }}>
              Live
            </span>
          </div>
        </div>

      </aside>
    </div>
  );
}
