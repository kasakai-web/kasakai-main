"use client";

import { useEffect, useRef, useState } from "react";
import { EventCard } from "@/components/dashboard/EventCard";
import "@/app/dashboard/dashboard.css";

const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1");

interface PublicGame {
  _id: string;
  title?: string;
  scheduledAt: string;
  format: string;
  maxPlayers: number;
  spotsLeft: number;
  fee: number;
  status: "open" | "confirmed" | "draft";
  venue: string;
  city: string;
  organiser: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function goToAuth() {
  const token  = typeof window !== "undefined" ? localStorage.getItem("token")  : null;
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  if (token && userId) {
    window.location.href = `/dashboard/player/${userId}`;
  } else {
    window.location.href = "/login";
  }
}

export function EventsSection() {
  const [games,   setGames]   = useState<PublicGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [canLeft,  setCanLeft]  = useState(false);
  const [canRight, setCanRight] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API_BASE}/games/public`)
      .then(r => r.json())
      .then(d => { if (d.success) setGames(d.data); else setError("Could not load games"); })
      .catch(() => setError("Could not reach server"))
      .finally(() => setLoading(false));
  }, []);

  const updateArrows = () => {
    const t = trackRef.current;
    if (!t) return;
    setCanLeft(t.scrollLeft > 4);
    setCanRight(t.scrollLeft + t.clientWidth < t.scrollWidth - 4);
  };

  useEffect(() => {
    const t = trackRef.current;
    if (!t) return;
    updateArrows();
    t.addEventListener("scroll", updateArrows, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => { t.removeEventListener("scroll", updateArrows); window.removeEventListener("resize", updateArrows); };
  }, [games]);

  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({ left: dir === "right" ? 360 : -360, behavior: "smooth" });
  };

  return (
    <section id="events" style={{ background: "var(--black)", padding: "100px 0 80px", borderTop: "1px solid var(--border)" }}>
      <style>{`
        .events-track { scrollbar-width: none; }
        .events-track::-webkit-scrollbar { display: none; }
        .events-arrow {
          width: 44px; height: 44px;
          border: 1px solid var(--border);
          background: transparent;
          color: var(--muted);
          cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: border-color 0.2s, color 0.2s, background 0.2s;
          flex-shrink: 0;
        }
        .events-arrow:hover:not(:disabled) { border-color: var(--white); color: var(--white); background: rgba(255,255,255,0.04); }
        .events-arrow:disabled { opacity: 0.2; cursor: default; }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 24px" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "48px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "12px" }}>Live now</p>
            <h2 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "clamp(44px, 8vw, 68px)", letterSpacing: "-.01em", lineHeight: 0.92, color: "var(--white)" }}>
              UPCOMING<br /><span style={{ color: "var(--lime)" }}>EVENTS</span>
            </h2>
          </div>

          {games.length > 1 && (
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="events-arrow" disabled={!canLeft}  onClick={() => scroll("left")}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
              <button className="events-arrow" disabled={!canRight} onClick={() => scroll("right")}>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          )}
        </div>

        {/* Cards */}
        {loading ? (
          <div style={{ display: "flex", gap: "20px" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ minWidth: "300px", height: "360px", border: "1px solid var(--border)", background: "#0d0d0d", borderRadius: "12px", flexShrink: 0, opacity: 0.25 }} />
            ))}
          </div>
        ) : error || games.length === 0 ? (
          <div style={{ border: "1px solid var(--border)", padding: "60px 24px", textAlign: "center", borderRadius: "8px" }}>
            {error
              ? <p style={{ fontFamily: "var(--mono)", fontSize: "12px", color: "#ff6b6b" }}>{error}</p>
              : <>
                  <p style={{ fontFamily: "var(--cond)", fontSize: "22px", color: "var(--muted)", letterSpacing: ".04em" }}>No games listed yet</p>
                  <p style={{ fontFamily: "var(--body)", fontSize: "13px", color: "#3a3a3a", marginTop: "8px" }}>Organisers — create a game and it will appear here.</p>
                </>
            }
          </div>
        ) : (
          <div
            ref={trackRef}
            className="events-track"
            style={{ display: "flex", gap: "20px", overflowX: "auto", alignItems: "flex-start", paddingBottom: "4px" }}
          >
            {games.map(game => (
              <div key={game._id} style={{ flexShrink: 0, width: "300px" }}>
                <EventCard
                  id={game._id}
                  venue={game.venue || "TBA"}
                  city={game.city || ""}
                  status={game.status === "draft" ? "tentative" : game.status}
                  date={formatDate(game.scheduledAt)}
                  time={formatTime(game.scheduledAt)}
                  format={game.format}
                  fee={game.fee}
                  spotsTotal={game.maxPlayers}
                  spotsLeft={game.spotsLeft}
                  isRegistered={false}
                  isWaitlisted={false}
                  players={[]}
                  onBook={goToAuth}
                  onViewDetails={goToAuth}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
