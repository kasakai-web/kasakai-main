"use client";

import  { useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import "./GameFeedbackModal.css";

interface PendingGame {
  _id: string;
  title?: string;
  format: string;
  scheduledAt: string;
  // Populated by the server as `name address.city` — see getPendingFeedback.
  turf?: { name?: string; address?: { city?: string } };
}

interface Props {
  game: PendingGame;
  onSubmit: () => void;
  onSkip: () => void;
  isPopup?: boolean; // true = full-screen overlay popup on login
}

const POSITIVE_TAGS = [
  "Great Atmosphere",
  "Well Organized",
  "Good Turf",
  "Friendly Players",
  "Would Play Again",
  "Well distributed teams",
  "Punctual game",
];

const NEGATIVE_TAGS = [
  "Poor Turf",
  "Disorganized",
  "Late Start",
  "Uneven teams",
];

function StarPicker({
  value,
  onChange,
  label,
  size = "sm",
}: {
  value: number;
  onChange: (v: number) => void;
  label: string;
  size?: "sm" | "lg";
}) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="gfm-star-row">
      <span className="gfm-star-label">{label}</span>
      <div className={`gfm-stars gfm-stars--${size}`}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
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

function Chevron() {
  return (
    <svg
      className="gfm-chevron"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
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
  const [detailsOpen, setDetailsOpen]       = useState(false);

  const toggleTag = (tag: string) =>
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );

  const handleGameRating = (v: number) => {
    const wasLow = gameRating >= 1 && gameRating <= 3;
    const isLow  = v <= 3;
    setGameRating(v);
    setDetailsOpen(isLow);
    if (wasLow && !isLow) {
      setOrganiserRating(0);
      setVenueRating(0);
      setSelectedTags([]);
      setComment("");
    }
  };

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
  const city     = game.turf?.address?.city ? `, ${game.turf.address.city}` : "";
  const dateStr  = new Date(game.scheduledAt).toLocaleDateString("en-IN", {
    weekday: "short", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className={`gfm-overlay ${isPopup ? "gfm-popup" : ""}`} onClick={onSkip}>
      <div className="gfm-modal" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="gfm-header">
          <div className="gfm-header-icon" aria-hidden="true">★</div>
          <div>
            {/* The game being rated, named. A regular's games all carry the same
                recurring title ("Tuesday Morning Game | Lakeside Turf"), so the
                DATE is the only thing that tells one prompt from the next —
                without it, two prompts in a row read as being asked to rate the
                same game twice. */}
            <div className="gfm-title">How was your game?</div>
            <div className="gfm-game-name">{game.title || "Completed game"}</div>
            <div className="gfm-subtitle">
              {turfName}{city} · {dateStr} · {game.format}
            </div>
          </div>
          <button className="gfm-skip-btn" onClick={onSkip} title="Skip for now" aria-label="Close">
            ✕
          </button>
        </div>

        {/* Ratings */}
        <div className="gfm-body">
          <div className="gfm-section gfm-overall">
            <div className="gfm-section-label">Overall Game *</div>
            <StarPicker label="" value={gameRating} onChange={handleGameRating} size="lg" />
          </div>

          <div className={`gfm-details ${detailsOpen ? "open" : ""}`}>
            <button
              type="button"
              className="gfm-details-toggle"
              onClick={() => setDetailsOpen((o) => !o)}
              aria-expanded={detailsOpen}
              aria-controls="gfm-details-panel"
            >
              <span className="gfm-section-label">Optional Ratings</span>
              <Chevron />
            </button>

            <div className="gfm-details-panel" id="gfm-details-panel">
              <div className="gfm-details-inner">
                <div className="gfm-section">
                  <StarPicker label="Organiser" value={organiserRating} onChange={setOrganiserRating} />
                  <StarPicker label="Venue"     value={venueRating}     onChange={setVenueRating}     />
                </div>

                {/* Tags — positive (green) and negative (red) on separate rows */}
                <div className="gfm-section">
                  <div className="gfm-section-label">Tags</div>
                  <div className="gfm-tags gfm-tags--positive">
                    {POSITIVE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`gfm-tag gfm-tag--positive ${selectedTags.includes(tag) ? "selected" : ""}`}
                        onClick={() => toggleTag(tag)}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                  <div className="gfm-tags gfm-tags--negative">
                    {NEGATIVE_TAGS.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        className={`gfm-tag gfm-tag--negative ${selectedTags.includes(tag) ? "selected" : ""}`}
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
              </div>
            </div>
          </div>

          {error && <div className="gfm-error">{error}</div>}
        </div>

        {/* Footer */}
        <div className="gfm-footer">
          <button className="gfm-btn-skip" onClick={onSkip} disabled={submitting}>
            {isPopup ? "Skip — Don't ask again" : "Skip — Rate Later"}
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
