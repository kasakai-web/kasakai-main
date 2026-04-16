"use client";

import React, { useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import "./GameFeedbackModal.css";

interface PendingGame {
  _id: string;
  title?: string;
  format: string;
  scheduledAt: string;
  turf?: { name?: string; location?: { city?: string } };
}

interface Props {
  game: PendingGame;
  onSubmit: () => void;
  onSkip: () => void;
  isPopup?: boolean; // true = full-screen overlay popup on login
}

const TAGS = [
  "Great Atmosphere",
  "Well Organized",
  "Good Turf",
  "Friendly Players",
  "Poor Turf",
  "Disorganized",
  "Late Start",
  "Would Play Again",
];

function StarPicker({
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
    <div className="gfm-star-row">
      <span className="gfm-star-label">{label}</span>
      <div className="gfm-stars">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            className={`gfm-star ${n <= (hovered || value) ? "filled" : ""}`}
            onMouseEnter={() => setHovered(n)}
            onMouseLeave={() => setHovered(0)}
            onClick={() => onChange(n)}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export function GameFeedbackModal({ game, onSubmit, onSkip, isPopup = false }: Props) {
  const [gameRating, setGameRating]         = useState(0);
  const [organiserRating, setOrganiserRating] = useState(0);
  const [venueRating, setVenueRating]       = useState(0);
  const [selectedTags, setSelectedTags]     = useState<string[]>([]);
  const [comment, setComment]               = useState("");
  const [submitting, setSubmitting]         = useState(false);
  const [error, setError]                   = useState("");

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleSubmit = async () => {
    if (gameRating === 0) {
      setError("Please give an overall rating.");
      return;
    }
    setSubmitting(true);
    setError("");
    const { token } = getSession();
    if (!token) { setSubmitting(false); return; }
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${game._id}/feedback`), {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          gameRating,
          organiserRating: organiserRating || null,
          venueRating:     venueRating     || null,
          tags:            selectedTags,
          comment:         comment.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.message || "Failed to submit feedback");
        setSubmitting(false);
        return;
      }
      onSubmit();
    } catch (e) {
      setError((e as Error).message || "An error occurred");
      setSubmitting(false);
    }
  };

  const turfName = game.turf?.name || "the venue";
  const city     = game.turf?.location?.city ? `, ${game.turf.location.city}` : "";
  const dateStr  = new Date(game.scheduledAt).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className={`gfm-overlay ${isPopup ? "gfm-popup" : ""}`} onClick={isPopup ? undefined : onSkip}>
      <div className="gfm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gfm-header">
          <div className="gfm-header-icon">⭐</div>
          <div>
            <div className="gfm-title">How was your game?</div>
            <div className="gfm-subtitle">
              {turfName}{city} · {dateStr} · {game.format}
            </div>
          </div>
          <button className="gfm-skip-btn" onClick={onSkip} title="Skip for now">
            ✕
          </button>
        </div>

        {/* Ratings */}
        <div className="gfm-body">
          <div className="gfm-section">
            <div className="gfm-section-label">Overall Game *</div>
            <StarPicker label="" value={gameRating} onChange={setGameRating} />
          </div>

          <div className="gfm-section gfm-optional-ratings">
            <div className="gfm-section-label">Optional Ratings</div>
            <StarPicker label="Organiser" value={organiserRating} onChange={setOrganiserRating} />
            <StarPicker label="Venue"     value={venueRating}     onChange={setVenueRating}     />
          </div>

          {/* Tags */}
          <div className="gfm-section">
            <div className="gfm-section-label">Tags</div>
            <div className="gfm-tags">
              {TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`gfm-tag ${selectedTags.includes(tag) ? "selected" : ""}`}
                  onClick={() => toggleTag(tag)}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Comment */}
          <div className="gfm-section">
            <div className="gfm-section-label">Comment (private)</div>
            <textarea
              className="gfm-textarea"
              rows={3}
              placeholder="Tell us what you thought — visible only to you and the admin…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={1000}
            />
          </div>

          {error && <div className="gfm-error">{error}</div>}
        </div>

        {/* Footer */}
        <div className="gfm-footer">
          <button className="gfm-btn-skip" onClick={onSkip} disabled={submitting}>
            Skip — Rate Later
          </button>
          <button
            className="gfm-btn-submit"
            onClick={handleSubmit}
            disabled={submitting || gameRating === 0}
          >
            {submitting ? "Submitting…" : "Submit Feedback"}
          </button>
        </div>
      </div>
    </div>
  );
}
