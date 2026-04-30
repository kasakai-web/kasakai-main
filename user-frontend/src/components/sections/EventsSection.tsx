"use client";

import { useEffect, useRef, useState } from "react";
import { EventCard } from "@/components/dashboard/EventCard";
import "@/app/dashboard/player-dashboard.css";

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

function redirectToAuth() {
  const token  = typeof window !== "undefined" ? localStorage.getItem("token")  : null;
  const userId = typeof window !== "undefined" ? localStorage.getItem("userId") : null;
  if (token && userId) {
    window.location.href = `/dashboard/player/${userId}`;
  } else {
    window.location.href = "/login";
  }
}

export function EventsSection() {
  const [games,      setGames]      = useState<PublicGame[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = `${API_BASE}/games/public`;
    fetch(url)
      .then(r => r.json())
      .then(d => {
        if (d.success) setGames(d.data);
        else setFetchError(d.message || "Failed to load games");
      })
      .catch(e => setFetchError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir: "left" | "right") => {
    trackRef.current?.scrollBy({ left: dir === "right" ? 340 : -340, behavior: "smooth" });
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

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: "48px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <p style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".22em", textTransform: "uppercase", color: "var(--muted)", marginBottom: "12px" }}>
              Live now
            </p>
            <h2 style={{ fontFamily: "var(--cond)", fontWeight: 900, fontSize: "clamp(44px, 8vw, 68px)", letterSpacing: "-.01em", lineHeight: 0.92, color: "var(--white)" }}>
              UPCOMING<br /><span style={{ color: "var(--lime)" }}>EVENTS</span>
            </h2>
          </div>

          {games.length > 1 && (
            <div style={{ display: "flex", gap: "8px" }}>
              {(["left", "right"] as const).map(dir => (
                <button key={dir} onClick={() => scroll(dir)} style={{
                  width: "40px", height: "40px", border: "1px solid var(--border)",
                  background: "transparent", color: "var(--muted)", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "border-color 0.2s, color 0.2s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--white)"; e.currentTarget.style.color = "var(--white)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--muted)"; }}
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    {dir === "left"
                      ? <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      : <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    }
                  </svg>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", gap: "16px", overflow: "hidden" }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ minWidth: "300px", height: "340px", border: "1px solid var(--border)", background: "#0d0d0d", flexShrink: 0, opacity: 0.3, borderRadius: "4px" }} />
            ))}
          </div>
        ) : fetchError || games.length === 0 ? (
          <div style={{ border: "1px solid var(--border)", padding: "60px 24px", textAlign: "center" }}>
            {fetchError ? (
              <p style={{ fontFamily: "var(--mono)", fontSize: "11px", color: "#ff6b6b", letterSpacing: ".1em" }}>
                {fetchError}
              </p>
            ) : (
              <>
                <p style={{ fontFamily: "var(--cond)", fontSize: "22px", color: "var(--muted)", letterSpacing: ".04em" }}>
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
            style={{ display: "flex", gap: "20px", overflowX: "auto", scrollbarWidth: "none", paddingBottom: "8px", alignItems: "flex-start" }}
          >
            <style>{`div::-webkit-scrollbar { display: none; }`}</style>
            {games.map(game => (
              <div key={game._id} style={{ flexShrink: 0, width: "320px" }}>
                <EventCard
                  id={game._id}
                  venue={game.venue}
                  city={game.city}
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
                  onBook={redirectToAuth}
                  onViewDetails={redirectToAuth}
                />
              </div>
            ))}
          </div>
        )}

      </div>
    </section>
  );
}
