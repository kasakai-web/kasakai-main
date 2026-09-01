"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { GameFeedbackModal } from "@/components/dashboard/GameFeedbackModal";
import "../player-dashboard.css";
import "./ratings.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface GameFeedbackData {
  _id: string;
  // Populated by the server. Null only if the game was deleted out from under
  // the feedback, which the card renders as "Completed Game".
  game: {
    _id: string;
    title?: string;
    format?: string;
    scheduledAt?: string;
    turf?: { name?: string; address?: { city?: string } };
  } | null;
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
  const { isAuthorized } = useAuthGuard({
    requiredRole: "player",
    redirectTo: "/login?role=player",
  });

  const [feedbacks, setFeedbacks] = useState<GameFeedbackData[]>([]);
  const [pendingGames, setPendingGames] = useState<PendingGame[]>([]);
  const [loading, setLoading] = useState(true);
  // The game the player is currently submitting feedback for
  const [feedbackGame, setFeedbackGame] = useState<PendingGame | null>(null);
  // Submitted feedback is paged — it only ever grows, and a regular player
  // builds up a season of it.
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  // How many the player has submitted in total, not how many are on screen —
  // the server counts them, so the section header can state a real number.
  const [totalFeedbacks, setTotalFeedbacks] = useState(0);
  const PAGE_SIZE = 12;

  // One page of submitted feedback. This used to be built by fetching the
  // player's completed games and then asking /games/:id/feedback about each one
  // — N+1 requests to show N cards, and it could only ever find feedback on the
  // games in that window. The list now comes from the feedback collection
  // itself, so it is one request and it is complete.
  const fetchFeedbackPage = useCallback(async (which = 1, append = false) => {
    const { token } = getSession();
    if (!token) return;
    const res = await fetch(
      buildApiUrl(`/games/my-feedback?page=${which}&limit=${PAGE_SIZE}`),
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!res.ok) return;
    const d = await res.json();
    if (!d.success) return;
    const batch: GameFeedbackData[] = d.data || [];
    setFeedbacks((prev) =>
      append
        ? [...prev, ...batch.filter((f) => !prev.some((p) => p._id === f._id))]
        : batch,
    );
    setHasMore(Boolean(d.hasMore));
    setTotalFeedbacks(typeof d.total === "number" ? d.total : batch.length);
    setPage(which);
  }, []);

  const fetchData = useCallback(async () => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setLoading(true);
    try {
      const [pendingRes] = await Promise.allSettled([
        fetch(buildApiUrl("/games/pending-feedback"), { headers: { Authorization: `Bearer ${token}` } }),
        fetchFeedbackPage(1),
      ]);

      // Pending feedback games
      if (pendingRes.status === "fulfilled" && pendingRes.value.ok) {
        const d = await pendingRes.value.json();
        if (d.success) setPendingGames(d.data || []);
      }
    } catch {
      // non-critical
    } finally {
      setLoading(false);
    }
  }, [router, fetchFeedbackPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      await fetchFeedbackPage(page + 1, true);
    } finally {
      setLoadingMore(false);
    }
  };

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
                    <div className="mpr-pending-hint">You played this game. Share how it went!</div>
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
              {/* Shown even with nothing pending above it. The heading used to be
                  hidden in that case, on the grounds that the list was the only
                  thing on the page — but the count beside it is now a real
                  total, and "you have rated 37 games" is worth stating whether
                  or not anything is awaiting feedback. */}
              <div className="mpr-section-head">
                <span className="mpr-section-title">Submitted Feedback</span>
                <span className="mpr-section-count">
                  {totalFeedbacks} game{totalFeedbacks === 1 ? "" : "s"}
                </span>
              </div>
              <div className="mpr-cards">
                {/* Already newest-first from the server — see getMyFeedbackList.
                    Sorting here would only reorder the pages loaded so far. */}
                {feedbacks.map((fb) => (
                    <div key={fb._id} className="mpr-card mpr-card-feedback">
                      <div className="mpr-card-header">
                        <div className="mpr-card-game">
                          <div className="mpr-card-title">{fb.game?.title || "Completed Game"}</div>
                          {/* The GAME's date, not just the submission date. A
                              regular's recurring games all share one title, so
                              two cards showing only "Submitted 26 Aug" read as
                              the same game rated twice — which is exactly what
                              players reported. The date below is what makes
                              them different games again. */}
                          <div className="mpr-card-meta">
                            {fb.game?.format && <span className="mpr-badge">{fb.game.format}</span>}
                            {fb.game?.scheduledAt && (
                              <span className="mpr-date">
                                {new Date(fb.game.scheduledAt).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric" })}
                              </span>
                            )}
                            {fb.game?.turf?.name && <span className="mpr-date">{fb.game.turf.name}</span>}
                          </div>
                          {fb.createdAt && (
                            <div className="mpr-card-submitted">
                              Rated on {new Date(fb.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                            </div>
                          )}
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

              {hasMore && (
                <div className="mpr-load-more-wrap">
                  <button
                    className="mpr-load-more"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? "Loading…" : "Load more"}
                  </button>
                </div>
              )}
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
