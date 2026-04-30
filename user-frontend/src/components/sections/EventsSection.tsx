"use client";

import { useEffect, useRef, useState } from "react";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1");

interface PublicGame {
  _id: string;
  title?: string;
  scheduledAt: string;
  format: string;
  maxPlayers: number;
  spotsLeft: number;
  fee: number;
  status: "open" | "confirmed";
  venue: string;
  city: string;
  organiser: string;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", weekday: "short" });
}
function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function GameCard({ game, onSignUp }: { game: PublicGame; onSignUp: () => void }) {
  const isFull = game.spotsLeft <= 0;
  const isConfirmed = game.status === "confirmed";
  const isOpen = game.status === "open";
  const statusLabel = isConfirmed ? "Confirmed" : isOpen ? "Open" : "Coming Soon";
  const statusColor = isConfirmed ? "var(--lime)" : isOpen ? "var(--electric)" : "var(--amber)";
  const statusBg = isConfirmed ? "rgba(196,213,108,0.08)" : isOpen ? "rgba(111,200,218,0.08)" : "rgba(210,166,74,0.08)";
  const statusBorder = isConfirmed ? "rgba(196,213,108,0.25)" : isOpen ? "rgba(111,200,218,0.25)" : "rgba(210,166,74,0.25)";
  const fillPct = Math.round(((game.maxPlayers - game.spotsLeft) / game.maxPlayers) * 100);

  return (
    <div style={{
      minWidth: "300px",
      maxWidth: "300px",
      border: "1px solid var(--border)",
      background: "#0d0d0d",
      display: "flex",
      flexDirection: "column",
      flexShrink: 0,
      transition: "border-color 0.2s ease",
    }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = "#2e2e2e")}
      onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--border)")}
    >
      {/* Top bar */}
      <div style={{
        padding: "14px 18px 12px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: "9px",
          letterSpacing: ".16em",
          textTransform: "uppercase",
          color: statusColor,
          background: statusBg,
          padding: "3px 8px",
          border: `1px solid ${statusBorder}`,
        }}>
          {statusLabel}
        </span>
        <span style={{
          fontFamily: "var(--mono)",
          fontSize: "10px",
          color: "var(--muted)",
          letterSpacing: ".06em",
        }}>
          {game.format}
        </span>
      </div>

      {/* Body */}
      <div style={{ padding: "18px", flex: 1, display: "flex", flexDirection: "column", gap: "12px" }}>
        {/* Venue */}
        <div>
          <p style={{
            fontFamily: "var(--cond)",
            fontWeight: 800,
            fontSize: "18px",
            letterSpacing: ".02em",
            color: "var(--white)",
            lineHeight: 1.1,
            marginBottom: "2px",
          }}>
            {game.venue}
          </p>
          {game.city && (
            <p style={{ fontFamily: "var(--body)", fontSize: "12px", color: "var(--muted)" }}>
              {game.city}
            </p>
          )}
        </div>

        {/* Date / Time */}
        <div style={{ display: "flex", gap: "16px" }}>
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".14em", textTransform: "uppercase", color: "#444", marginBottom: "3px" }}>Date</p>
            <p style={{ fontFamily: "var(--body)", fontSize: "13px", fontWeight: 600, color: "var(--white)" }}>{formatDate(game.scheduledAt)}</p>
          </div>
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".14em", textTransform: "uppercase", color: "#444", marginBottom: "3px" }}>Time</p>
            <p style={{ fontFamily: "var(--body)", fontSize: "13px", fontWeight: 600, color: "var(--white)" }}>{formatTime(game.scheduledAt)}</p>
          </div>
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".14em", textTransform: "uppercase", color: "#444", marginBottom: "3px" }}>Fee</p>
            <p style={{ fontFamily: "var(--body)", fontSize: "13px", fontWeight: 600, color: "var(--lime)" }}>₹{game.fee}</p>
          </div>
        </div>

        {/* Spots fill bar */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontFamily: "var(--mono)", fontSize: "9px", letterSpacing: ".12em", textTransform: "uppercase", color: "#444" }}>Spots</span>
            <span style={{ fontFamily: "var(--mono)", fontSize: "10px", color: isFull ? "#ff6b6b" : "var(--muted)" }}>
              {isFull ? "Full" : `${game.spotsLeft} left`}
            </span>
          </div>
          <div style={{ height: "3px", background: "#1a1a1a", borderRadius: "2px" }}>
            <div style={{
              height: "100%",
              width: `${fillPct}%`,
              background: fillPct > 80 ? "#ff6b6b" : fillPct > 50 ? "var(--amber)" : "var(--lime)",
              borderRadius: "2px",
              transition: "width 0.4s ease",
            }} />
          </div>
        </div>
      </div>

      {/* CTA */}
      <button
        onClick={onSignUp}
        style={{
          margin: "0 18px 18px",
          padding: "12px",
          background: "var(--lime)",
          color: "#000",
          border: "none",
          fontFamily: "var(--cond)",
          fontWeight: 800,
          fontSize: "13px",
          letterSpacing: ".12em",
          textTransform: "uppercase",
          cursor: "pointer",
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={e => { e.currentTarget.style.opacity = "0.85"; }}
        onMouseLeave={e => { e.currentTarget.style.opacity = "1"; }}
      >
        Book Your Seat
      </button>
    </div>
  );
}

export function EventsSection() {
  const [games, setGames] = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = `${API_BASE}/games/public`;
    console.log("[EventsSection] fetching:", url);
    fetch(url)
      .then(r => r.json())
      .then(d => {
        console.log("[EventsSection] response:", d);
        if (d.success) setGames(d.data);
        else setFetchError(d.message || "API returned success:false");
      })
      .catch(e => {
        console.error("[EventsSection] fetch failed:", e);
        setFetchError(e.message);
      })
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir: "left" | "right") => {
    if (!trackRef.current) return;
    trackRef.current.scrollBy({ left: dir === "right" ? 320 : -320, behavior: "smooth" });
  };

  const handleSignUp = () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
    if (token && userId) {
      window.location.href = `/dashboard/player/${userId}`;
    } else {
      window.location.href = "/login";
    }
  };

  return (
    <section
      id="events"
      style={{
        background: "var(--black)",
        padding: "100px 0 80px",
        borderTop: "1px solid var(--border)",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>

        {/* Header row */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "48px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              letterSpacing: ".22em",
              textTransform: "uppercase",
              color: "var(--muted)",
              marginBottom: "12px",
            }}>
              Live now
            </p>
            <h2 style={{
              fontFamily: "var(--cond)",
              fontWeight: 900,
              fontSize: "clamp(44px, 8vw, 68px)",
              letterSpacing: "-.01em",
              lineHeight: 0.92,
              color: "var(--white)",
            }}>
              UPCOMING<br />
              <span style={{ color: "var(--lime)" }}>EVENTS</span>
            </h2>
          </div>

          {/* Scroll arrows */}
          {games.length > 0 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button onClick={() => scroll("left")} style={{
                width: "40px", height: "40px", border: "1px solid var(--border)",
                background: "transparent", color: "var(--muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-color 0.2s, color 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--white)"; e.currentTarget.style.color = "var(--white)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button onClick={() => scroll("right")} style={{
                width: "40px", height: "40px", border: "1px solid var(--border)",
                background: "transparent", color: "var(--muted)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                transition: "border-color 0.2s, color 0.2s",
              }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--white)"; e.currentTarget.style.color = "var(--white)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Carousel */}
        {loading ? (
          <div style={{ display: "flex", gap: "16px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ minWidth: "300px", height: "280px", border: "1px solid var(--border)", background: "#0d0d0d", flexShrink: 0, opacity: 0.4 }} />
            ))}
          </div>
        ) : games.length === 0 ? (
          <div style={{
            border: "1px solid var(--border)",
            padding: "60px 24px",
            textAlign: "center",
          }}>
            {fetchError ? (
              <>
                <p style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#ff6b6b", letterSpacing: ".1em", marginBottom: "8px" }}>
                  Could not load games
                </p>
                <p style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#3a3a3a" }}>
                  {fetchError} — check browser console for details
                </p>
              </>
            ) : (
              <>
                <p style={{ fontFamily: "var(--cond)", fontSize: "20px", color: "var(--muted)", letterSpacing: ".06em" }}>
                  No games listed yet
                </p>
                <p style={{ fontFamily: "var(--body)", fontSize: "13px", color: "#3a3a3a", marginTop: "8px" }}>
                  Organisers — create a game from your dashboard and it will appear here.
                </p>
              </>
            )}
          </div>
        ) : (
          <div
            ref={trackRef}
            style={{
              display: "flex",
              gap: "16px",
              overflowX: "auto",
              scrollbarWidth: "none",
              paddingBottom: "4px",
            }}
          >
            <style>{`.events-track::-webkit-scrollbar { display: none; }`}</style>
            {games.map(game => (
              <GameCard key={game._id} game={game} onSignUp={handleSignUp} />
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
