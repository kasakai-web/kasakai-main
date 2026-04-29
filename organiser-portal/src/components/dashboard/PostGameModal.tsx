"use client";

import React, { useState, useEffect, useCallback } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import "./PostGameModal.css";

// ── Types ──────────────────────────────────────────────────────────────────
interface Registration {
  _id: string;
  player?: { _id: string; name: string; phone?: string };
  plusOneName?: string | null;
  attended?: "present" | "absent" | "not_marked";
}

interface Game {
  _id: string;
  title: string;
  format: string;
  scheduledAt: string;
  turf?: { name?: string };
  registrations: Registration[];
  attendanceMarked?: boolean;
}

type AttendanceStatus = "present" | "absent";

interface FeedbackSummary {
  count: number;
  avgGame: number | null;
  avgOrganiser: number | null;
  avgVenue: number | null;
  tagCounts: Record<string, number>;
}
interface FeedbackEntry {
  _id: string;
  submittedBy: { name: string };
  gameRating: number;
  organiserRating?: number;
  venueRating?: number;
  tags: string[];
  comment?: string;
}

interface PlayerRatingDraft {
  playerId: string;
  name: string;
  conductRating: number;
  gameplayRating: number;
  preferredPosition: string;
  gkAffinity: number | null;
  playWith: string[];
  playAgainst: string[];
  notes: string;
}

interface Props {
  game: Game;
  onClose: () => void;
  onDone: () => void;
}

const POSITIONS = ["goalkeeper", "defender", "midfielder", "forward", "any"];

// ── Star Rating component ──────────────────────────────────────────────────
function StarRating({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="pgm-star-row">
      <span className="pgm-star-label">{label}</span>
      <div className="pgm-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`pgm-star ${n <= (hovered || value) ? "filled" : ""}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
        <span className="pgm-star-value">{value}/5</span>
      </div>
    </div>
  );
}

// ── Main Modal ─────────────────────────────────────────────────────────────
export function PostGameModal({ game, onClose, onDone }: Props) {
  const [step, setStep] = useState<"attendance" | "ratings" | "summary">("attendance");
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [savingAttendance, setSavingAttendance] = useState(false);
  const [savingRatings, setSavingRatings] = useState(false);
  const [error, setError] = useState("");
  const [ratings, setRatings] = useState<Record<string, PlayerRatingDraft>>({});
  const [feedbackSummary, setFeedbackSummary] = useState<FeedbackSummary | null>(null);
  const [feedbackEntries, setFeedbackEntries] = useState<FeedbackEntry[]>([]);

  // Pre-load existing attendance marks — map legacy no_show → absent
  useEffect(() => {
    const init: Record<string, AttendanceStatus> = {};
    for (const reg of game.registrations) {
      const s = reg.attended as string | undefined;
      if (s === "present") init[reg._id] = "present";
      else if (s === "absent" || s === "no_show") init[reg._id] = "absent";
      else init[reg._id] = "present";
    }
    setAttendance(init);
  }, [game]);


  // ── Step 1: save attendance + complete game ──────────────────────────────
  const handleSaveAttendance = async () => {
    setSavingAttendance(true);
    setError("");
    const { token } = getSession();
    if (!token) { setSavingAttendance(false); return; }

    try {
      // 1. Complete the game (no-op if already completed)
      const completeRes = await fetch(
        buildApiUrl(`/api/v1/games/organisers/${game._id}/complete`),
        { method: "PATCH", headers: { Authorization: `Bearer ${token}` } }
      );
      const completeData = await completeRes.json();
      // Allow "already completed" gracefully
      if (!completeRes.ok && !completeData.message?.includes("already completed")) {
        setError(completeData.message || "Failed to complete game");
        setSavingAttendance(false);
        return;
      }

      // 2. Save attendance
      const attendancePayload = game.registrations.map((reg) => ({
        regId:  reg._id,
        status: attendance[reg._id] === "absent" ? "absent" : "present",
      }));

      const attRes = await fetch(
        buildApiUrl(`/api/v1/games/organisers/${game._id}/attendance`),
        {
          method:  "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body:    JSON.stringify({ attendance: attendancePayload }),
        }
      );
      const attData = await attRes.json();
      if (!attRes.ok || !attData.success) {
        setError(attData.message || "Failed to save attendance");
        setSavingAttendance(false);
        return;
      }

      // Build initial rating drafts for all attended real players
      const attended = game.registrations.filter(
        (r) => !r.plusOneName && r.player && attendance[r._id] === "present"
      );
      const drafts: Record<string, PlayerRatingDraft> = {};
      for (const reg of attended) {
        const pid = reg.player!._id;
        drafts[pid] = {
          playerId:          pid,
          name:              reg.player!.name,
          conductRating:     3,
          gameplayRating:    3,
          preferredPosition: "any",
          gkAffinity:        null,
          playWith:          [],
          playAgainst:       [],
          notes:             "",
        };
      }

      // Merge with any previously saved ratings (saved ratings take priority)
      try {
        const rRes = await fetch(
          buildApiUrl(`/api/v1/games/organisers/${game._id}/player-ratings`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const rData = await rRes.json();
        if (rData.success) {
          for (const r of rData.data ?? []) {
            const pid = r.player._id;
            // Only restore if the player was marked present in this round
            if (drafts[pid]) {
              drafts[pid] = {
                playerId:          pid,
                name:              r.player.name,
                conductRating:     r.conductRating,
                gameplayRating:    r.gameplayRating,
                preferredPosition: r.preferredPosition || "any",
                gkAffinity:        r.gkAffinity ?? null,
                playWith:          r.playWith?.map((x: any) => x.toString()) ?? [],
                playAgainst:       r.playAgainst?.map((x: any) => x.toString()) ?? [],
                notes:             r.notes || "",
              };
            }
          }
        }
      } catch {}

      setRatings(drafts);
      setStep("ratings");
    } catch (e) {
      setError((e as Error).message || "An error occurred");
    } finally {
      setSavingAttendance(false);
    }
  };

  // ── Load player feedback for organiser ──────────────────────────────────
  const loadGameFeedback = useCallback(async () => {
    const { token } = getSession();
    if (!token) return;
    try {
      const res = await fetch(
        buildApiUrl(`/api/v1/games/organisers/${game._id}/game-feedback`),
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      if (data.success) {
        setFeedbackSummary(data.data.summary);
        setFeedbackEntries(data.data.feedback || []);
      }
    } catch {}
  }, [game._id]);

  // ── Step 2: save ratings ─────────────────────────────────────────────────
  const handleSaveRatings = async () => {
    setSavingRatings(true);
    setError("");
    const { token } = getSession();
    if (!token) { setSavingRatings(false); return; }
    try {
      const payload = Object.values(ratings).map((r) => ({
        playerId:          r.playerId,
        conductRating:     r.conductRating,
        gameplayRating:    r.gameplayRating,
        preferredPosition: r.preferredPosition,
        gkAffinity:        r.gkAffinity && r.gkAffinity > 0 ? r.gkAffinity : null,
        playWith:          r.playWith,
        playAgainst:       r.playAgainst,
        notes:             r.notes || null,
      }));

      if (payload.length > 0) {
        const res = await fetch(
          buildApiUrl(`/api/v1/games/organisers/${game._id}/player-ratings`),
          {
            method:  "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body:    JSON.stringify({ ratings: payload }),
          }
        );
        const data = await res.json();
        if (!res.ok || !data.success) {
          setError(data.message || "Failed to save ratings");
          setSavingRatings(false);
          return;
        }
      }
      // Go to summary step and load player feedback
      await loadGameFeedback();
      setStep("summary");
    } catch (e) {
      setError((e as Error).message || "An error occurred");
    } finally {
      setSavingRatings(false);
    }
  };

  const updateRating = (pid: string, field: keyof PlayerRatingDraft, value: any) => {
    setRatings((prev) => ({ ...prev, [pid]: { ...prev[pid], [field]: value } }));
  };

  const togglePlayerPreference = (
    pid: string,
    field: "playWith" | "playAgainst",
    targetId: string
  ) => {
    setRatings((prev) => {
      const current = prev[pid]?.[field] ?? [];
      const updated = current.includes(targetId)
        ? current.filter((x) => x !== targetId)
        : [...current, targetId];
      return { ...prev, [pid]: { ...prev[pid], [field]: updated } };
    });
  };

  // ── Helpers ──────────────────────────────────────────────────────────────
  const playerRegs = game.registrations.filter((r) => !r.plusOneName && r.player);
  const guestRegs  = game.registrations.filter((r) => r.plusOneName);
  const attendedIds = Object.entries(attendance)
    .filter(([, s]) => s === "present")
    .map(([regId]) => regId);

  const attendedPlayers = playerRegs.filter((r) => attendedIds.includes(r._id));
  const ratingList = Object.values(ratings);

  const presentCount = Object.values(attendance).filter((s) => s === "present").length;
  const absentCount  = Object.values(attendance).filter((s) => s === "absent").length;

  return (
    <div className="pgm-overlay" onClick={onClose}>
      <div className="pgm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="pgm-header">
          <div>
            <div className="pgm-title">
              {step === "attendance" ? "Mark Attendance" : step === "ratings" ? "Rate Players" : "Game Summary"}
            </div>
            <div className="pgm-subtitle">
              {game.title} · {game.format} ·{" "}
              {new Date(game.scheduledAt).toLocaleDateString("en-IN", {
                day: "numeric", month: "short", year: "numeric",
              })}
            </div>
          </div>
          <button className="pgm-close" onClick={onClose}>✕</button>
        </div>

        {/* Step indicator */}
        <div className="pgm-steps">
          <div className={`pgm-step ${step === "attendance" ? "active" : "done"}`}>
            <span className="pgm-step-num">{step === "attendance" ? "1" : "✓"}</span>
            <span className="pgm-step-label">Attendance</span>
          </div>
          <div className="pgm-step-line" />
          <div className={`pgm-step ${step === "ratings" ? "active" : step === "summary" ? "done" : ""}`}>
            <span className="pgm-step-num">{step === "summary" ? "✓" : "2"}</span>
            <span className="pgm-step-label">Rate Players</span>
          </div>
          <div className="pgm-step-line" />
          <div className={`pgm-step ${step === "summary" ? "active" : ""}`}>
            <span className="pgm-step-num">3</span>
            <span className="pgm-step-label">Summary</span>
          </div>
        </div>

        {error && <div className="pgm-error">{error}</div>}

        {/* ── STEP 1: Attendance ── */}
        {step === "attendance" && (
          <div className="pgm-body">
            <div className="pgm-summary-row">
              <span className="pgm-summary-chip present">{presentCount} Present</span>
              <span className="pgm-summary-chip absent">{absentCount} Absent</span>
            </div>

            {playerRegs.length === 0 && (
              <div className="pgm-empty">No players registered for this game.</div>
            )}

            <div className="pgm-player-list">
              {playerRegs.map((reg) => (
                <div key={reg._id} className="pgm-attendance-row">
                  <div className="pgm-player-info">
                    <span className="pgm-player-avatar">
                      {(reg.player!.name || "P").substring(0, 2).toUpperCase()}
                    </span>
                    <span className="pgm-player-name">{reg.player!.name}</span>
                  </div>
                  <div className="pgm-attendance-btns">
                    <button
                      type="button"
                      className={`pgm-att-btn pgm-att-present ${attendance[reg._id] === "present" ? "active" : ""}`}
                      onClick={() => setAttendance((prev) => ({ ...prev, [reg._id]: "present" }))}
                    >
                      ✓ Present
                    </button>
                    <button
                      type="button"
                      className={`pgm-att-btn pgm-att-absent ${attendance[reg._id] === "absent" ? "active" : ""}`}
                      onClick={() => setAttendance((prev) => ({ ...prev, [reg._id]: "absent" }))}
                    >
                      ✕ Absent
                    </button>
                  </div>
                </div>
              ))}

              {guestRegs.length > 0 && (
                <div className="pgm-guests-note">
                  {guestRegs.length} guest slot{guestRegs.length > 1 ? "s" : ""} — guests are
                  not individually rated.
                </div>
              )}
            </div>

            <div className="pgm-footer">
              <button className="pgm-btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button
                className="pgm-btn-primary"
                onClick={handleSaveAttendance}
                disabled={savingAttendance}
              >
                {savingAttendance
                  ? "Saving…"
                  : `Save Attendance & Complete Game →`}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Summary + Player Feedback ── */}
        {step === "summary" && (
          <div className="pgm-body">
            {/* Attendance recap */}
            <div className="pgm-summary-row" style={{ padding: "14px 24px 0" }}>
              <span className="pgm-summary-chip present">{presentCount} Present</span>
              <span className="pgm-summary-chip absent">{absentCount} Absent</span>
              <span style={{ marginLeft: "auto", fontSize: 11, color: "#555" }}>
                {Object.keys(ratings).length} player{Object.keys(ratings).length !== 1 ? "s" : ""} rated
              </span>
            </div>

            {/* Player feedback section */}
            <div style={{ padding: "16px 24px 0" }}>
              <div className="pgm-section-head" style={{ fontSize: 12, fontWeight: 700, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 12 }}>
                Player Feedback Received
              </div>

              {!feedbackSummary || feedbackSummary.count === 0 ? (
                <div className="pgm-empty" style={{ padding: "20px 0" }}>
                  No player feedback submitted yet. Players will be prompted to rate after the game.
                </div>
              ) : (
                <>
                  {/* Aggregate averages */}
                  <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
                    {feedbackSummary.avgGame != null && (
                      <div style={{ background: "#111114", border: "1px solid #1e1e22", borderRadius: 8, padding: "10px 14px", minWidth: 90, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Game</div>
                        <div style={{ fontSize: 22, color: "#fbbf24", fontWeight: 800 }}>{feedbackSummary.avgGame}</div>
                        <div style={{ fontSize: 9, color: "#444" }}>/ 5 avg</div>
                      </div>
                    )}
                    {feedbackSummary.avgOrganiser != null && (
                      <div style={{ background: "#111114", border: "1px solid #1e1e22", borderRadius: 8, padding: "10px 14px", minWidth: 90, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Organiser</div>
                        <div style={{ fontSize: 22, color: "#c4d56c", fontWeight: 800 }}>{feedbackSummary.avgOrganiser}</div>
                        <div style={{ fontSize: 9, color: "#444" }}>/ 5 avg</div>
                      </div>
                    )}
                    {feedbackSummary.avgVenue != null && (
                      <div style={{ background: "#111114", border: "1px solid #1e1e22", borderRadius: 8, padding: "10px 14px", minWidth: 90, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Venue</div>
                        <div style={{ fontSize: 22, color: "#4ade80", fontWeight: 800 }}>{feedbackSummary.avgVenue}</div>
                        <div style={{ fontSize: 9, color: "#444" }}>/ 5 avg</div>
                      </div>
                    )}
                    <div style={{ background: "#111114", border: "1px solid #1e1e22", borderRadius: 8, padding: "10px 14px", minWidth: 90, textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>Responses</div>
                      <div style={{ fontSize: 22, color: "#888", fontWeight: 800 }}>{feedbackSummary.count}</div>
                    </div>
                  </div>

                  {/* Top tags */}
                  {Object.keys(feedbackSummary.tagCounts).length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 10, color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>Common Tags</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {Object.entries(feedbackSummary.tagCounts)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 6)
                          .map(([tag, count]) => (
                            <span key={tag} style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: "rgba(196,213,108,0.1)", color: "#c4d56c", border: "1px solid rgba(196,213,108,0.2)" }}>
                              {tag} <span style={{ opacity: 0.6 }}>×{count}</span>
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Individual feedback cards */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {feedbackEntries.map((fb) => (
                      <div key={fb._id} style={{ background: "#111114", border: "1px solid #1e1e22", borderRadius: 8, padding: "12px 14px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#ccc" }}>{fb.submittedBy?.name || "Player"}</span>
                          <div style={{ display: "flex", gap: 2 }}>
                            {[1,2,3,4,5].map(n => (
                              <span key={n} style={{ fontSize: 14, color: n <= fb.gameRating ? "#fbbf24" : "#2a2a2a" }}>★</span>
                            ))}
                          </div>
                        </div>
                        {fb.tags?.length > 0 && (
                          <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: fb.comment ? 6 : 0 }}>
                            {fb.tags.map(tag => (
                              <span key={tag} style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(255,255,255,0.05)", color: "#666", border: "1px solid #222" }}>{tag}</span>
                            ))}
                          </div>
                        )}
                        {fb.comment && (
                          <div style={{ fontSize: 12, color: "#777", fontStyle: "italic", marginTop: 4 }}>"{fb.comment}"</div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="pgm-footer">
              <button className="pgm-btn-secondary" onClick={() => setStep("ratings")}>← Back</button>
              <button className="pgm-btn-primary" onClick={onDone}>Done ✓</button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Rate Players ── */}
        {step === "ratings" && (
          <div className="pgm-body">
            {ratingList.length === 0 ? (
              <div className="pgm-empty">
                No players were marked as present. Nothing to rate.
              </div>
            ) : (
              <div className="pgm-rating-list">
                {ratingList.map((r) => {
                  const otherAttended = attendedPlayers.filter(
                    (p) => p.player!._id !== r.playerId
                  );
                  return (
                    <div key={r.playerId} className="pgm-rating-card">
                      <div className="pgm-rating-card-header">
                        <span className="pgm-player-avatar">
                          {r.name.substring(0, 2).toUpperCase()}
                        </span>
                        <span className="pgm-player-name">{r.name}</span>
                      </div>

                      <StarRating
                        label="Conduct"
                        value={r.conductRating}
                        onChange={(v) => updateRating(r.playerId, "conductRating", v)}
                      />
                      <StarRating
                        label="Gameplay"
                        value={r.gameplayRating}
                        onChange={(v) => updateRating(r.playerId, "gameplayRating", v)}
                      />

                      <div className="pgm-field-row">
                        <label className="pgm-field-label">Preferred Position</label>
                        <select
                          className="pgm-select"
                          value={r.preferredPosition}
                          onChange={(e) =>
                            updateRating(r.playerId, "preferredPosition", e.target.value)
                          }
                        >
                          {POSITIONS.map((p) => (
                            <option key={p} value={p}>
                              {p.charAt(0).toUpperCase() + p.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>

                      {(r.preferredPosition === "goalkeeper" ||
                        r.preferredPosition === "any") && (
                        <StarRating
                          label="GK Affinity"
                          value={r.gkAffinity ?? 0}
                          onChange={(v) => updateRating(r.playerId, "gkAffinity", v)}
                        />
                      )}

                      {otherAttended.length > 0 && (
                        <>
                          <div className="pgm-pref-section">
                            <div className="pgm-pref-label">Play With</div>
                            <div className="pgm-pref-chips">
                              {otherAttended.map((p) => (
                                <button
                                  key={p.player!._id}
                                  type="button"
                                  className={`pgm-chip pgm-chip-with ${
                                    r.playWith.includes(p.player!._id) ? "selected" : ""
                                  }`}
                                  onClick={() =>
                                    togglePlayerPreference(
                                      r.playerId,
                                      "playWith",
                                      p.player!._id
                                    )
                                  }
                                >
                                  {p.player!.name}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="pgm-pref-section">
                            <div className="pgm-pref-label">Play Against</div>
                            <div className="pgm-pref-chips">
                              {otherAttended.map((p) => (
                                <button
                                  key={p.player!._id}
                                  type="button"
                                  className={`pgm-chip pgm-chip-against ${
                                    r.playAgainst.includes(p.player!._id) ? "selected" : ""
                                  }`}
                                  onClick={() =>
                                    togglePlayerPreference(
                                      r.playerId,
                                      "playAgainst",
                                      p.player!._id
                                    )
                                  }
                                >
                                  {p.player!.name}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="pgm-field-row">
                        <label className="pgm-field-label">Notes (optional)</label>
                        <textarea
                          className="pgm-textarea"
                          rows={2}
                          placeholder="Any notes about this player…"
                          value={r.notes}
                          onChange={(e) =>
                            updateRating(r.playerId, "notes", e.target.value)
                          }
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pgm-footer">
              <button
                className="pgm-btn-secondary"
                onClick={() => setStep("attendance")}
              >
                ← Back
              </button>
              <button
                className="pgm-btn-ghost"
                onClick={async () => { await loadGameFeedback(); setStep("summary"); }}
                disabled={savingRatings}
              >
                Skip Ratings
              </button>
              <button
                className="pgm-btn-primary"
                onClick={handleSaveRatings}
                disabled={savingRatings || ratingList.length === 0}
              >
                {savingRatings ? "Saving…" : "Save Ratings ✓"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
