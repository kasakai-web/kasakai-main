"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import "../../../organizer-dashboard.css";
import "./performance.css";

// ── Types ─────────────────────────────────────────────────────────────────────
interface FeedbackEntry {
  _id: string;
  submittedBy: { name: string };
  gameRating: number;
  organiserRating?: number;
  venueRating?: number;
  tags: string[];
  comment?: string;
  createdAt: string;
  gameInfo?: { _id: string; title?: string; format?: string; scheduledAt?: string; turf?: { name?: string } };
}

interface FeedbackSummary {
  count: number;
  avgGame: number | null;
  avgOrganiser: number | null;
  avgVenue: number | null;
  tagCounts: Record<string, number>;
}

interface PlayerRatingGiven {
  _id: string;
  player: { _id: string; name: string; phone?: string };
  game: { _id: string; title?: string; format?: string; scheduledAt?: string };
  conductRating: number;
  gameplayRating: number;
  preferredPosition?: string;
  gkAffinity?: number | null;
  notes?: string;
  createdAt: string;
}

function Stars({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <div style={{ display: "flex", gap: 1, alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} style={{ fontSize: size, color: n <= value ? "#fbbf24" : "#222", lineHeight: 1 }}>★</span>
      ))}
      <span style={{ fontSize: 11, color: "#555", marginLeft: 5, fontFamily: "var(--mono, monospace)" }}>{value}/5</span>
    </div>
  );
}

export default function OrgPerformancePage() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const organiserId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;
  const { isAuthorized } = useAuthGuard({
    requiredRole: "organiser",
    routeUserId: organiserId,
    redirectTo: "/login?role=organiser",
  });

  const [activeTab, setActiveTab] = useState<"feedback" | "ratings">("feedback");
  const [feedback, setFeedback] = useState<FeedbackEntry[]>([]);
  const [summary, setSummary] = useState<FeedbackSummary | null>(null);
  const [ratingsGiven, setRatingsGiven] = useState<PlayerRatingGiven[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=organiser"); return; }
    setLoading(true);
    try {
      const [fbRes, ratingRes] = await Promise.allSettled([
        fetch(buildApiUrl("/api/v1/games/organisers/my-feedback-summary"), { headers: { Authorization: `Bearer ${token}` } }),
        fetch(buildApiUrl("/api/v1/games/organisers/my-ratings-given"),    { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      if (fbRes.status === "fulfilled" && fbRes.value.ok) {
        const d = await fbRes.value.json();
        if (d.success) { setFeedback(d.data.feedback || []); setSummary(d.data.summary); }
      }
      if (ratingRes.status === "fulfilled" && ratingRes.value.ok) {
        const d = await ratingRes.value.json();
        if (d.success) setRatingsGiven(d.data || []);
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

  // Ratings-given stats
  const totalRated = ratingsGiven.length;
  const avgConduct  = totalRated ? (ratingsGiven.reduce((s, r) => s + r.conductRating,  0) / totalRated).toFixed(1) : null;
  const avgGameplay = totalRated ? (ratingsGiven.reduce((s, r) => s + r.gameplayRating, 0) / totalRated).toFixed(1) : null;

  return (
    <div className="organizer-dashboard-container">
      {/* Header */}
      <div className="dashboard-header-section">
        <div className="header-left">
          <h1 className="dashboard-title">My Performance</h1>
          <p className="dashboard-subtitle">Feedback received from players · Ratings given to players</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-section">
        <div className="tab-navigation">
          <button
            className={`tab-btn ${activeTab === "feedback" ? "active" : ""}`}
            onClick={() => setActiveTab("feedback")}
          >
            <span className="tab-icon">📋</span>
            <span className="tab-text">Feedback Received</span>
            <span className="tab-badge">{summary?.count ?? 0}</span>
          </button>
          <button
            className={`tab-btn ${activeTab === "ratings" ? "active" : ""}`}
            onClick={() => setActiveTab("ratings")}
          >
            <span className="tab-icon">⭐</span>
            <span className="tab-text">Ratings Given to Players</span>
            <span className="tab-badge">{ratingsGiven.length}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading…</p></div>
      ) : activeTab === "feedback" ? (

        /* ── FEEDBACK RECEIVED ── */
        <>
          {summary && summary.count > 0 && (
            <div className="op-stats-row">
              <div className="op-stat">
                <div className="op-stat-value">{summary.count}</div>
                <div className="op-stat-label">Responses</div>
              </div>
              {summary.avgGame != null && (
                <div className="op-stat">
                  <div className="op-stat-value op-gold">{summary.avgGame}</div>
                  <div className="op-stat-label">Avg Game</div>
                </div>
              )}
              {summary.avgOrganiser != null && (
                <div className="op-stat">
                  <div className="op-stat-value op-lime">{summary.avgOrganiser}</div>
                  <div className="op-stat-label">Avg Organiser</div>
                </div>
              )}
              {summary.avgVenue != null && (
                <div className="op-stat">
                  <div className="op-stat-value op-green">{summary.avgVenue}</div>
                  <div className="op-stat-label">Avg Venue</div>
                </div>
              )}
              {Object.keys(summary.tagCounts).length > 0 && (
                <div className="op-top-tags">
                  <div className="op-stat-label" style={{ marginBottom: 6 }}>Top Tags</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                    {Object.entries(summary.tagCounts)
                      .sort(([, a], [, b]) => b - a)
                      .slice(0, 5)
                      .map(([tag, count]) => (
                        <span key={tag} className="op-tag">
                          {tag} <span className="op-tag-count">×{count}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {feedback.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No feedback yet</h3>
              <p>Players submit feedback after completed games. Their ratings and comments appear here.</p>
            </div>
          ) : (
            <div className="op-cards">
              {feedback.map((fb) => (
                <div key={fb._id} className="op-card">
                  {/* Game info header */}
                  <div className="op-card-header">
                    <div className="op-card-main">
                      <div className="op-card-name">{fb.gameInfo?.title || "Game"}</div>
                      <div className="op-card-meta">
                        {fb.gameInfo?.format && <span className="op-badge">{fb.gameInfo.format}</span>}
                        {fb.gameInfo?.scheduledAt && (
                          <span className="op-muted">
                            {new Date(fb.gameInfo.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                        {fb.gameInfo?.turf?.name && <span className="op-muted">{fb.gameInfo.turf.name}</span>}
                      </div>
                    </div>
                    <div className="op-card-sub">by {fb.submittedBy?.name || "Player"}</div>
                  </div>

                  {/* Ratings row */}
                  <div className="op-ratings-row">
                    <div className="op-rating-cell">
                      <div className="op-rating-label">Game</div>
                      <Stars value={fb.gameRating} size={17} />
                    </div>
                    {fb.organiserRating && (
                      <div className="op-rating-cell">
                        <div className="op-rating-label">Organiser</div>
                        <Stars value={fb.organiserRating} size={17} />
                      </div>
                    )}
                    {fb.venueRating && (
                      <div className="op-rating-cell">
                        <div className="op-rating-label">Venue</div>
                        <Stars value={fb.venueRating} size={17} />
                      </div>
                    )}
                  </div>

                  {fb.tags?.length > 0 && (
                    <div className="op-tags-row">
                      {fb.tags.map((tag) => (
                        <span key={tag} className="op-tag op-tag-feedback">{tag}</span>
                      ))}
                    </div>
                  )}

                  {fb.comment && (
                    <div className="op-comment">"{fb.comment}"</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </>

      ) : (

        /* ── RATINGS GIVEN TO PLAYERS ── */
        <>
          {totalRated > 0 && (
            <div className="op-stats-row">
              <div className="op-stat">
                <div className="op-stat-value">{totalRated}</div>
                <div className="op-stat-label">Players Rated</div>
              </div>
              {avgConduct && (
                <div className="op-stat">
                  <div className="op-stat-value op-gold">{avgConduct}</div>
                  <div className="op-stat-label">Avg Conduct Given</div>
                </div>
              )}
              {avgGameplay && (
                <div className="op-stat">
                  <div className="op-stat-value op-gold">{avgGameplay}</div>
                  <div className="op-stat-label">Avg Gameplay Given</div>
                </div>
              )}
            </div>
          )}

          {ratingsGiven.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">⭐</div>
              <h3>No ratings given yet</h3>
              <p>After completing a game and marking attendance, rate your players. All ratings appear here.</p>
            </div>
          ) : (
            <div className="op-cards">
              {ratingsGiven.map((r) => (
                <div key={r._id} className="op-card">
                  <div className="op-card-header">
                    <div className="op-card-main">
                      <div className="op-card-name">{r.player?.name || "Player"}</div>
                      <div className="op-card-meta">
                        {r.game?.title && <span className="op-muted">{r.game.title}</span>}
                        {r.game?.format && <span className="op-badge">{r.game.format}</span>}
                        {r.game?.scheduledAt && (
                          <span className="op-muted">
                            {new Date(r.game.scheduledAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                          </span>
                        )}
                      </div>
                    </div>
                    {r.preferredPosition && r.preferredPosition !== "any" && (
                      <span className="op-badge op-badge-pos">
                        {r.preferredPosition.charAt(0).toUpperCase() + r.preferredPosition.slice(1)}
                      </span>
                    )}
                  </div>

                  <div className="op-ratings-row">
                    <div className="op-rating-cell">
                      <div className="op-rating-label">Conduct</div>
                      <Stars value={r.conductRating} size={17} />
                    </div>
                    <div className="op-rating-cell">
                      <div className="op-rating-label">Gameplay</div>
                      <Stars value={r.gameplayRating} size={17} />
                    </div>
                    {r.gkAffinity != null && (
                      <div className="op-rating-cell">
                        <div className="op-rating-label">GK Affinity</div>
                        <span className="op-stat-value" style={{ fontSize: 18 }}>{r.gkAffinity}%</span>
                      </div>
                    )}
                  </div>

                  {r.notes && <div className="op-comment">"{r.notes}"</div>}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
