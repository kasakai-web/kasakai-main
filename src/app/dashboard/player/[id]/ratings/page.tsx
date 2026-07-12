"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { GameFeedbackModal } from "@/components/dashboard/GameFeedbackModal";
import "../../../player-dashboard.css";
import "./ratings.css";

// ── Types ─────────────────────────────────────────────────────────────────────
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

  const [feedbacks, setFeedbacks] = useState<GameFeedbackData[]>([]);
  const [pendingGames, setPendingGames] = useState<PendingGame[]>([]);
  const [loading, setLoading] = useState(true);
  // The game the player is currently submitting feedback for
  const [feedbackGame, setFeedbackGame] = useState<PendingGame | null>(null);

  const fetchData = useCallback(async () => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setLoading(true);
    try {
      const [pendingRes, myGamesRes] = await Promise.allSettled([
        fetch(buildApiUrl("/games/pending-feedback"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl("/games/my-games"),         { headers: { Authorization: `Bearer ${token}` } }),
      ]);

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
          <div className="page-title">My <span>Feedback</span></div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading…</p></div>
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
