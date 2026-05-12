"use client";

import type { ViewType } from "./types";

interface Props {
  currentView: ViewType;
  onNav: (view: ViewType) => void;
}

const TABS = [
  {
    id: "LIVE_EVENTS" as ViewType,
    label: "Home",
    icon: (active: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#c8f135" : "#777"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 11L12 3l9 8" />
        <path d="M5 9.5v9.5a.5.5 0 00.5.5H9v-5h6v5h3.5a.5.5 0 00.5-.5V9.5"
          fill={active ? "rgba(200,241,53,0.13)" : "none"} />
      </svg>
    ),
  },
  {
    id: "MY_BOOKINGS" as ViewType,
    label: "Tickets",
    icon: (active: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#c8f135" : "#777"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="10" rx="1.5"
          fill={active ? "rgba(200,241,53,0.13)" : "none"} />
        <circle cx="7.5" cy="12" r="1.5"
          fill={active ? "#c8f135" : "#777"} stroke="none" />
        <line x1="12.5" y1="10" x2="19" y2="10" />
        <line x1="12.5" y1="14" x2="17" y2="14" />
      </svg>
    ),
  },
  {
    id: "HISTORY" as ViewType,
    label: "History",
    icon: (active: boolean) => (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none"
        stroke={active ? "#c8f135" : "#777"} strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9"
          fill={active ? "rgba(200,241,53,0.13)" : "none"} />
        <polyline points="12,7.5 12,12 15,14.5" />
      </svg>
    ),
  },
];

export function ScreeningBottomNav({ currentView, onNav }: Props) {
  return (
    <>
      <style>{`
        .scr-tab {
          transition: color 0.16s, background 0.16s;
          -webkit-tap-highlight-color: transparent;
        }
        .scr-tab:hover { background: rgba(255,255,255,0.04) !important; }
        .scr-tab.active:hover { background: rgba(200,241,53,0.06) !important; }
        .scr-tab:active { transform: scale(0.95); }
      `}</style>

      <nav style={{
        display: "flex", alignItems: "stretch",
        background: "#090909",
        borderTop: "1px solid #222",
        paddingBottom: "env(safe-area-inset-bottom)",
        flexShrink: 0,
      }}>
        {TABS.map((tab, i) => {
          const active = currentView === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onNav(tab.id)}
              className={`scr-tab${active ? " active" : ""}`}
              style={{
                flex: 1,
                display: "flex", flexDirection: "column",
                alignItems: "center", justifyContent: "center",
                gap: "5px", height: "62px",
                position: "relative",
                border: "none",
                borderLeft: i > 0 ? "1px solid #1c1c1c" : "none",
                background: "transparent",
                color: active ? "#c8f135" : "#777",
                cursor: "pointer",
              }}
            >
              {/* Active indicator */}
              {active && (
                <span style={{
                  position: "absolute", top: 0,
                  left: "50%", transform: "translateX(-50%)",
                  width: "32px", height: "2.5px",
                  background: "#c8f135",
                  borderRadius: "0 0 3px 3px",
                }} />
              )}

              {tab.icon(active)}

              <span style={{
                fontSize: "9.5px", fontWeight: 900,
                letterSpacing: "0.13em", textTransform: "uppercase",
                lineHeight: 1,
                color: active ? "#c8f135" : "#666",
              }}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
