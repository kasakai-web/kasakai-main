"use client";

import { useState, useMemo, useCallback, memo } from "react";
import { ScreeningEventCard } from "./ScreeningEventCard";
import type { Screening } from "./types";

interface Props {
  screenings: Screening[];
  onBook: (screening: Screening) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  bookedMap?: Record<string, string>;
}

export const ScreeningEventsView = memo(function ScreeningEventsView({ screenings, onBook, loading, error, onRetry, bookedMap }: Props) {
  const [search, setSearch] = useState("");
  const [city, setCity] = useState("All");

  const cities = useMemo(() => {
    const set = new Set(
      screenings.map((s) => {
        const parts = s.location.split(",");
        return parts[parts.length - 1].trim();
      })
    );
    return ["All", ...Array.from(set).sort()];
  }, [screenings]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return screenings.filter((s) => {
      const matchQ = !q || [s.matchTitle, s.venueName, s.location].join(" ").toLowerCase().includes(q);
      const matchCity = city === "All" || s.location.includes(city);
      return matchQ && matchCity;
    });
  }, [screenings, search, city]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value), []);
  const handleCity = useCallback((c: string) => setCity(c), []);
  const clearSearch = useCallback(() => setSearch(""), []);

  return (
    <div>
      {/* ── HERO ── */}
      <div className="relative overflow-hidden border-b border-[#1a1a1a]">

        {/* Faint pitch-line grid */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.035]"
          viewBox="0 0 1440 520"
          preserveAspectRatio="xMidYMid slice"
        >
          <g stroke="rgba(255,255,255,0.6)" strokeWidth="1" fill="none">
            <rect x="60" y="40" width="1320" height="440" />
            <line x1="720" y1="40" x2="720" y2="480" />
            <circle cx="720" cy="260" r="110" />
            <rect x="60" y="160" width="180" height="200" />
            <rect x="1200" y="160" width="180" height="200" />
          </g>
        </svg>

        <div
          className="absolute -top-24 -left-24 w-[480px] h-[480px] rounded-full pointer-events-none"
          style={{ background: "radial-gradient(ellipse, rgba(200,241,53,0.055) 0%, transparent 70%)" }}
        />

        <div className="relative max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 pt-14 sm:pt-20 pb-0">

          <div className="flex justify-center sm:justify-start mb-5">
            <div className="inline-flex items-center gap-2"
              style={{
                padding: "5px 13px",
                border: "1px solid rgba(239,68,68,0.25)",
                background: "rgba(239,68,68,0.07)",
              }}
            >
              <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "pulse 2s infinite" }} />
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#f87171", letterSpacing: "0.22em", textTransform: "uppercase" }}>
                Live Now
              </span>
            </div>
          </div>

          <h1 className="text-center sm:text-left" style={{
            fontSize: "clamp(28px, 5.5vw, 62px)",
            fontWeight: 900, color: "#f0f0f0",
            textTransform: "uppercase", letterSpacing: "-0.01em", lineHeight: 1,
            marginBottom: "14px",
          }}>
            Live <span style={{ color: "#c8f135" }}>Screenings</span>
          </h1>

          <div className="text-center sm:text-left" style={{ marginBottom: "32px" }}>
            <p style={{ fontSize: "clamp(12px, 1.4vw, 14px)", color: "#999", lineHeight: 1.7, margin: 0 }}>
              Book your spot at premium sports bars and venues across India.
            </p>
            <p style={{ fontSize: "clamp(12px, 1.4vw, 14px)", color: "#666", lineHeight: 1.7, margin: 0 }}>
              Live screens · Great food · Electric crowd.
            </p>
          </div>

        </div>
      </div>

      {/* ── EVENTS GRID ── */}
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-14 py-10 sm:py-14">

        {/* Search + city filter row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">

          {/* Search */}
          <div style={{ position: "relative", flex: 1 }}>
            <svg
              width="13" height="13" fill="none" viewBox="0 0 24 24"
              stroke="#444" strokeWidth="2.5" strokeLinecap="round"
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
            >
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={handleSearch}
              placeholder="Search events, venues, cities…"
              style={{
                width: "100%",
                padding: "9px 36px 9px 34px",
                background: "#0d0d0d",
                border: "1px solid #222",
                color: "#ccc",
                fontSize: "12px",
                fontWeight: 600,
                outline: "none",
                caretColor: "#c8f135",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(200,241,53,0.3)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "#222")}
            />
            {search && (
              <button
                onClick={clearSearch}
                style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#444", padding: "4px", lineHeight: 1 }}
                aria-label="Clear search"
              >
                <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* City pills */}
          <div className="scr-city-scroll">
            {cities.map((c) => (
              <button
                key={c}
                onClick={() => handleCity(c)}
                style={{
                  padding: "7px 14px",
                  border: c === city ? "1px solid rgba(200,241,53,0.5)" : "1px solid #222",
                  background: c === city ? "rgba(200,241,53,0.08)" : "none",
                  color: c === city ? "#c8f135" : "#555",
                  fontSize: "10px",
                  fontWeight: 900,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "color 0.15s, border-color 0.15s, background 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Label row */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span style={{ fontSize: "10px", fontWeight: 900, color: "#777", letterSpacing: "0.22em", textTransform: "uppercase" }}>
              {search || city !== "All" ? "Results" : "All Events"}
            </span>
            <span style={{ padding: "3px 10px", border: "1px solid #2a2a2a", fontSize: "9px", fontWeight: 900, color: "#777", letterSpacing: "0.18em", textTransform: "uppercase" }}>
              {filtered.length} {filtered.length === 1 ? "event" : "events"}
            </span>
          </div>
          {(search || city !== "All") && (
            <button
              onClick={() => { setSearch(""); setCity("All"); }}
              style={{ fontSize: "10px", fontWeight: 700, color: "#555", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.1em", textTransform: "uppercase" }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#aaa")}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#555")}
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ paddingTop: "40px" }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} style={{ height: "280px", background: "#111", borderRadius: "4px", opacity: 0.6, animation: "pulse 1.8s ease-in-out infinite", animationDelay: `${i * 0.1}s` }} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div style={{ padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#3a1a1a" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
            </svg>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 900, color: "#f0f0f0", marginBottom: "6px" }}>Could not load events</p>
              <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>{error}</p>
            </div>
            {onRetry && (
              <button onClick={onRetry} style={{ padding: "9px 22px", border: "1px solid #2a2a2a", background: "none", color: "#888", fontSize: "10px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}>
                Retry
              </button>
            )}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", textAlign: "center" }}>
            <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#2a2a2a" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
            <div>
              <p style={{ fontSize: "15px", fontWeight: 900, color: "#f0f0f0", marginBottom: "6px" }}>
                {screenings.length === 0 ? "No live events right now" : "No events found"}
              </p>
              <p style={{ fontSize: "12px", color: "#555", margin: 0 }}>
                {screenings.length === 0 ? "Check back soon — new screenings are added regularly." : "Try a different search or city."}
              </p>
            </div>
            {screenings.length > 0 && (
              <button
                onClick={() => { setSearch(""); setCity("All"); }}
                style={{ padding: "9px 22px", border: "1px solid #2a2a2a", background: "none", color: "#888", fontSize: "10px", fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", cursor: "pointer" }}
              >
                Show All Events
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((s) => (
              <ScreeningEventCard key={s.id} screening={s} onBook={onBook} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
