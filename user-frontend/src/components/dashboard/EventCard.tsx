"use client";

import React, { useState } from "react";

export type EventStatus = "confirmed" | "tentative" | "full" | "cancelled";

export interface EventCardProps {
  id: number;
  venue: string;
  status: EventStatus;
  date: string;
  time: string;
  format: string;
  fee: number;
  spotsTotal: number;
  spotsLeft: number;
  players: { name: string; initials: string; pos: string }[];
  onBook: (game: any) => void;
}

export function EventCard({
  id,
  venue,
  status,
  date,
  time,
  format,
  fee,
  spotsTotal,
  spotsLeft,
  players,
  onBook,
}: EventCardProps) {
  const [showPlayers, setShowPlayers] = useState(false);
  
  const waitlist = spotsLeft === 0;
  const isJoined = false; // Mock state

  const fillPercentage = ((spotsTotal - spotsLeft) / spotsTotal) * 100;
  let fillClass = "mid";
  if (fillPercentage > 80) fillClass = "low"; // almost full => low spots left
  if (fillPercentage < 50) fillClass = "high"; // plenty of spots => high spots left

  return (
    <div className={`event-card ${status} ${waitlist ? "full" : ""}`}>
      <div className="card-top">
        <span className={`status-badge ${status === "full" || waitlist ? "full" : status}`}>
          {waitlist ? "Full" : status}
        </span>
        <div className="card-price">
          <div className="card-price-amount">₹{fee}</div>
          <div className="card-price-label">per spot</div>
        </div>
      </div>
      <div className="card-venue">{venue}</div>
      <div className="card-meta">
        <div className="meta-item">
          <span className="meta-icon">📅</span>
          <span className="meta-text">{date}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">🕗</span>
          <span className="meta-text">{time}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">👥</span>
          <span className="meta-text">{format}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">⚡</span>
          <span className="meta-text">{spotsLeft} spots left</span>
        </div>
      </div>
      <div className="spots-row">
        <div className="spots-bar">
          <div
            className={`spots-fill ${fillClass}`}
            style={{ width: `${fillPercentage}%` }}
          ></div>
        </div>
        <span className="spots-text">
          {spotsTotal - spotsLeft}/{spotsTotal} players
        </span>
      </div>

      <button className="view-players" onClick={() => setShowPlayers(!showPlayers)}>
        👥 {showPlayers ? "Hide" : "View"} Registered Players ({players.length})
      </button>

      {showPlayers && (
        <div className="players-panel open">
          <div className="players-grid">
            {players.map((p, i) => (
              <div key={i} className="player-chip">
                <div className="pc-avatar">{p.initials}</div>
                <div>
                  <div className="pc-name">{p.name}</div>
                  <div className="pc-pos">{p.pos}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isJoined ? (
        <>
          <div className="joined-tag">✓ You&apos;re registered · Team A · Yellow</div>
          <div className="card-actions">
            <button className="card-btn primary" style={{ flex: 1, background: "rgba(200,255,62,.08)", color: "var(--lime)" }} disabled>
              <span>Registered ✓</span>
            </button>
            <button className="card-btn cancel-joined">Back Out</button>
          </div>
        </>
      ) : (
        <div className="card-actions">
          {waitlist ? (
            <button
              className="card-btn waitlist"
              onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: true })}
            >
              <span>Join Waitlist</span>
            </button>
          ) : (
            <button
              className="card-btn primary"
              onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: false })}
            >
              <span>Sign Up</span>
            </button>
          )}
          <button className="card-btn secondary">Share</button>
        </div>
      )}
    </div>
  );
}
