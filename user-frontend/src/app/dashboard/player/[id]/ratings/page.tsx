"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { GameFeedbackModal } from "@/components/dashboard/GameFeedbackModal";
import "../../../player-dashboard.css";
import "./ratings.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface PlayerRating {
  _id: string;
  game: { _id: string; title: string; format: string; scheduledAt: string };
  organiser: { _id: string; name: string };
  conductRating: number;
  gameplayRating: number;
  preferredPosition?: string;
  gkAffinity?: number | null;
  notes?: string;
  createdAt: string;
}

interface GameFeedbackData {
  _id: string;
  game: { _id: string; title?: string; format?: string; scheduledAt?: string };
  gameRating: number;
  organiserRating?: number;
  venueRating?: number;
  tags: string[];
  comment?: string;
  createdAt: string;
}

// A completed game the player attended but hasn't rated yet
interface PendingGame {
  _id: string;
  title: string;
  format: string;
  scheduledAt: string;
  turf?: { name?: string; location?: { city?: string } };
  attendanceMarkedAt?: string;
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ fontSize: size, color: n <= value ? "#fbbf24" : "#2a2a2a", lineHeight: 1 }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: "#555", marginLeft: 4, fontFamily: "var(--mono, monospace)" }}>{value}/5</span>
    </div>
  );
}

export default function MyRatingsPage() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const playerId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const { isAuthorized } = useAuthGuard({
    requiredRole: "player",
    routeUserId: playerId,
    redirectTo: "/login?role=player",
  });

  const [ratings, setRatings] = useState<PlayerRating[]>([]);
  const [feedbacks, setFeedbacks] = useState<GameFeedbackData[]>([]);
  const [pendingGames, setPendingGames] = useState<PendingGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<"received" | "submitted">("received");
  // The game the player is currently submitting feedback for
  const [feedbackGame, setFeedbackGame] = useState<PendingGame | null>(null);

  const fetchData = useCallback(async () => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setLoading(true);
    try {
      const [ratingsRes, pendingRes, myGamesRes] = await Promise.allSettled([
        fetch(buildApiUrl("/api/v1/games/my-ratings"),      { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl("/api/v1/games/pending-feedback"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl("/api/v1/games/my-games"),         { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      // Organiser ratings received
      if (ratingsRes.status === "fulfilled" && ratingsRes.value.ok) {
        const d = await ratingsRes.value.json();
        if (d.success) setRatings(d.data || []);
      }

      // Pending feedback games
      if (pendingRes.status === "fulfilled" && pendingRes.value.ok) {
        const d = await pendingRes.value.json();
        if (d.success) setPendingGames(d.data || []);
      }

      // Submitted feedbacks — fetch per completed game
      if (myGamesRes.status === "fulfilled" && myGamesRes.value.ok) {
        const myGamesData = await myGamesRes.value.json();
        const completed = (myGamesData.data || []).filter((g: any) => g.status === "completed");
        const fbResults = await Promise.allSettled(
          completed.map((g: any) =>
            fetch(buildApiUrl(`/api/v1/games/${g._id}/feedback`), {
              headers: { Authorization: `Bearer ${token}` },
            }).then((r) => r.json())
          )
        );
        const collected: GameFeedbackData[] = [];
        fbResults.forEach((result, i) => {
          if (result.status === "fulfilled" && result.value?.success && result.value?.data) {
            collected.push({ ...result.value.data, game: completed[i] });
          }
        });
        setFeedbacks(collected);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) { setLoading(false); return; }
    fetchData();
  }, [isAuthorized, fetchData]);

  // After submitting feedback — remove from pending, add to feedbacks, close modal
  const handleFeedbackSubmitted = () => {
    if (!feedbackGame) return;
    setPendingGames((prev) => prev.filter((g) => g._id !== feedbackGame._id));
    setFeedbackGame(null);
    // Refresh to pick up the newly submitted feedback
    fetchData();
  };

  // Summary stats
  const avgConduct  = ratings.length ? (ratings.reduce((s, r) => s + r.conductRating,  0) / ratings.length).toFixed(1) : null;
  const avgGameplay = ratings.length ? (ratings.reduce((s, r) => s + r.gameplayRating, 0) / ratings.length).toFixed(1) : null;
  const overallAvg  = avgConduct && avgGameplay
    ? ((parseFloat(avgConduct) + parseFloat(avgGameplay)) / 2).toFixed(1) : null;

  const positionCounts: Record<string, number> = {};
  for (const r of ratings) {
    if (r.preferredPosition && r.preferredPosition !== "any") {
      positionCounts[r.preferredPosition] = (positionCounts[r.preferredPosition] || 0) + 1;
    }
  }
  const topPosition = Object.entries(positionCounts).sort(([, a], [, b]) => b - a)[0]?.[0];

  // total badge for "Feedback" tab = pending + already submitted
  const feedbackTabCount = pendingGames.length + feedbacks.length;

  return (
    <div className="player-dashboard-container">
      {/* Feedback modal — opens when player clicks "Give Feedback" */}
      {feedbackGame && (
        <GameFeedbackModal
          game={feedbackGame}
          onSkip={() => setFeedbackGame(null)}
          onSubmit={handleFeedbackSubmitted}
        />
      )}

      <div className="page-header">
        <div className="page-title-group">
          <div className="page-eyebrow">Player Dashboard</div>
          <div className="page-title">My <span>Performance</span></div>
        </div>
      </div>

      <div className="tabs-section">
        <div className="tab-navigation player-tab-navigation">
          <button
            className={`tab-btn player-tab-btn ${activeView === "received" ? "active" : ""}`}
            onClick={() => setActiveView("received")}
          >
            <span className="tab-icon">⭐</span>
            <span className="tab-text">Ratings Received</span>
            <span className="tab-badge">{ratings.length}</span>
          </button>
          <button
            className={`tab-btn player-tab-btn ${activeView === "submitted" ? "active" : ""}`}
            onClick={() => setActiveView("submitted")}
          >
            <span className="tab-icon">📝</span>
            <span className="tab-text">Game Feedback</span>
            <span className="tab-badge">{feedbackTabCount}</span>
            {pendingGames.length > 0 && (
              <span className="mpr-pending-dot" title={`${pendingGames.length} awaiting feedback`} />
            )}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading…</p></div>
      ) : activeView === "received" ? (

        /* ── RATINGS RECEIVED ── */
        <>
          {ratings.length > 0 && (
            <div className="mpr-stats-row">
              <div className="mpr-stat">
                <div className="mpr-stat-value">{ratings.length}</div>
                <div className="mpr-stat-label">Games Rated</div>
              </div>
              <div className="mpr-stat">
                <div className="mpr-stat-value mpr-gold">{avgConduct}</div>
                <div className="mpr-stat-label">Avg Conduct</div>
              </div>
              <div className="mpr-stat">
                <div className="mpr-stat-value mpr-gold">{avgGameplay}</div>
                <div className="mpr-stat-label">Avg Gameplay</div>
              </div>
              <div className="mpr-stat">
                <div className="mpr-stat-value mpr-lime">{overallAvg}</div>
                <div className="mpr-stat-label">Overall Avg</div>
              </div>
              {topPosition && (
                <div className="mpr-stat">
                  <div className="mpr-stat-value mpr-lime" style={{ fontSize: 16, textTransform: "capitalize" }}>{topPosition}</div>
                  <div className="mpr-stat-label">Top Position</div>
                </div>
              )}
            </div>
          )}

          {ratings.length === 0 ? (
            <div className="empty-state">
              <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
              <h3>No ratings yet</h3>
              <p>Organisers rate your conduct and gameplay after completed games. Your scores appear here.</p>
            </div>
          ) : (
            <div className="mpr-cards">
              {[...ratings]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((r) => (
                  <div key={r._id} className="mpr-card">
                    <div className="mpr-card-header">
                      <div className="mpr-card-game">
                        <div className="mpr-card-title">{r.game?.title || "Game"}</div>
                        <div className="mpr-card-meta">
                          {r.game?.format && <span className="mpr-badge">{r.game.format}</span>}
                          {r.game?.scheduledAt && (
                            <span className="mpr-date">
                              {new Date(r.game.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="mpr-card-organiser">by {r.organiser?.name || "Organiser"}</div>
                    </div>

                    <div className="mpr-ratings-grid">
                      <div className="mpr-rating-item">
                        <div className="mpr-rating-label">Conduct</div>
                        <Stars value={r.conductRating} size={18} />
                      </div>
                      <div className="mpr-rating-item">
                        <div className="mpr-rating-label">Gameplay</div>
                        <Stars value={r.gameplayRating} size={18} />
                      </div>
                    </div>

                    <div className="mpr-extras">
                      {r.preferredPosition && r.preferredPosition !== "any" && (
                        <span className="mpr-extra-chip mpr-position">
                          {r.preferredPosition.charAt(0).toUpperCase() + r.preferredPosition.slice(1)}
                        </span>
                      )}
                      {r.gkAffinity != null && (
                        <span className="mpr-extra-chip">GK {r.gkAffinity}%</span>
                      )}
                    </div>

                    {r.notes && <div className="mpr-notes">"{r.notes}"</div>}
                  </div>
                ))}
            </div>
          )}
        </>

      ) : (

        /* ── GAME FEEDBACK ── */
        <>
          {/* Pending section — games awaiting feedback */}
          {pendingGames.length > 0 && (
            <div className="mpr-pending-section">
              <div className="mpr-section-head">
                <span className="mpr-section-title">Awaiting Your Feedback</span>
                <span className="mpr-section-count">{pendingGames.length} game{pendingGames.length > 1 ? "s" : ""}</span>
              </div>
              <div className="mpr-cards">
                {pendingGames.map((game) => (
                  <div key={game._id} className="mpr-card mpr-card-pending">
                    <div className="mpr-card-header">
                      <div className="mpr-card-game">
                        <div className="mpr-card-title">{game.title}</div>
                        <div className="mpr-card-meta">
                          {game.format && <span className="mpr-badge">{game.format}</span>}
                          {game.scheduledAt && (
                            <span className="mpr-date">
                              {new Date(game.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          )}
                          {game.turf?.name && <span className="mpr-date">{game.turf.name}</span>}
                        </div>
                      </div>
                    </div>
                    <div className="mpr-pending-hint">Your attendance was recorded. Share how it went!</div>
                    <button
                      className="mpr-btn-feedback"
                      onClick={() => setFeedbackGame(game)}
                    >
                      Give Feedback
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Already submitted */}
          {feedbacks.length > 0 && (
            <div className="mpr-submitted-section">
              {pendingGames.length > 0 && (
                <div className="mpr-section-head">
                  <span className="mpr-section-title">Submitted Feedback</span>
                  <span className="mpr-section-count">{feedbacks.length} game{feedbacks.length > 1 ? "s" : ""}</span>
                </div>
              )}
              <div className="mpr-cards">
                {[...feedbacks]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map((fb) => (
                    <div key={fb._id} className="mpr-card mpr-card-feedback">
                      <div className="mpr-card-header">
                        <div className="mpr-card-game">
                          <div className="mpr-card-title">{fb.game?.title || "Completed Game"}</div>
                          <div className="mpr-card-meta">
                            {fb.game?.format && <span className="mpr-badge">{fb.game.format}</span>}
                            {fb.createdAt && (
                              <span className="mpr-date">
                                Submitted {new Date(fb.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                          </div>
                        </div>
                        <span className="mpr-submitted-tick">✓ Submitted</span>
                      </div>

                      <div className="mpr-ratings-grid">
                        <div className="mpr-rating-item">
                          <div className="mpr-rating-label">Game</div>
                          <Stars value={fb.gameRating} size={18} />
                        </div>
                        {fb.organiserRating && (
                          <div className="mpr-rating-item">
                            <div className="mpr-rating-label">Organiser</div>
                            <Stars value={fb.organiserRating} size={18} />
                          </div>
                        )}
                        {fb.venueRating && (
                          <div className="mpr-rating-item">
                            <div className="mpr-rating-label">Venue</div>
                            <Stars value={fb.venueRating} size={18} />
                          </div>
                        )}
                      </div>

                      {fb.tags?.length > 0 && (
                        <div className="mpr-extras">
                          {fb.tags.map((tag) => (
                            <span key={tag} className="mpr-extra-chip mpr-tag">{tag}</span>
                          ))}
                        </div>
                      )}

                      {fb.comment && <div className="mpr-notes">"{fb.comment}"</div>}
                    </div>
                  ))}
              </div>
            </div>
          )}

          {pendingGames.length === 0 && feedbacks.length === 0 && (
            <div className="empty-state">
              <div style={{ fontSize: 40, marginBottom: 12 }}>📝</div>
              <h3>No feedback yet</h3>
              <p>After games you attend, you can rate the game, organiser, and venue here. Your feedback helps improve future games.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
