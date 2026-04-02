"use client";

import React, { useState } from "react";

export type EventStatus = "confirmed" | "tentative" | "full" | "cancelled";

export interface EventCardProps {
  id: string;
  venue: string;
  city: string;
  status: EventStatus;
  date: string;
  time: string;
  format: string;
  fee: number;
  spotsTotal: number;
  spotsLeft: number;
  isRegistered: boolean;
  players: { name: string; initials: string; pos: string }[];
  onBook: (game: any) => void;
}

export function EventCard({
  id,
  venue,
  city,
  status,
  date,
  time,
  format,
  fee,
  spotsTotal,
  spotsLeft,
  isRegistered,
  players,
  onBook,
}: EventCardProps) {
  const [showPlayers, setShowPlayers] = useState(false);
  
  const isFull = spotsLeft <= 0;
  const effectiveStatus = isFull ? "full" : status;

  const fillPercentage = spotsTotal > 0 ? ((spotsTotal - spotsLeft) / spotsTotal) * 100 : 0;
  let fillClass = "mid";
  if (fillPercentage > 80) fillClass = "low";
  if (fillPercentage < 50) fillClass = "high";

  return (
    <div className={`event-card ${effectiveStatus} ${isRegistered ? 'registered' : ''}`}>
      {/* Header with badge and price */}
      <div className="card-header">
        <div className="header-top">
          <span className={`status-badge ${effectiveStatus}`}>
            {effectiveStatus === 'full' ? '🔴 Full' : effectiveStatus === 'confirmed' ? '✓ Confirmed' : 'Tentative'}
          </span>
          {isRegistered && <span className="registered-badge">✓ Registered</span>}
        </div>
        <div className="card-price">
          <div className="price-rupee">₹</div>
          <div className="price-amount">{fee}</div>
        </div>
      </div>

      {/* Venue Information */}
      <div className="card-venue-section">
        <h3 className="card-venue">🏟️ {venue}</h3>
        <p className="card-city">📍 {city}</p>
      </div>

      {/* Key Details Grid */}
      <div className="card-details-grid">
        <div className="detail-item">
          <span className="detail-label">Date</span>
          <span className="detail-value">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Time</span>
          <span className="detail-value">{time}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Format</span>
          <span className="detail-value">{format}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Spots</span>
          <span className="detail-value">{spotsLeft}/{spotsTotal}</span>
        </div>
      </div>

      {/* Players Capacity Bar */}
      <div className="capacity-section">
        <div className="capacity-bar">
          <div
            className={`capacity-fill ${fillClass}`}
            style={{ width: `${fillPercentage}%` }}
          ></div>
        </div>
        <div className="capacity-text">
          <span className="players-count">{spotsTotal - spotsLeft}</span>
          <span className="total-slots">of {spotsTotal}</span>
        </div>
      </div>

      {/* Registered Players Preview */}
      {players && players.length > 0 && (
        <div className="players-preview">
          <button 
            className="view-players-btn"
            onClick={() => setShowPlayers(!showPlayers)}
          >
            <div className="avatar-stack">
              {players.slice(0, 3).map((p, i) => (
                <div key={i} className="avatar-mini">{p.initials}</div>
              ))}
              {players.length > 3 && <div className="avatar-more">+{players.length - 3}</div>}
            </div>
            <span className="players-label">{players.length} player{players.length !== 1 ? 's' : ''} registered</span>
          </button>

          {showPlayers && (
            <div className="players-detail-panel">
              <div className="players-grid">
                {players.map((p, i) => (
                  <div key={i} className="player-item">
                    <div className="player-avatar">{p.initials}</div>
                    <div className="player-info">
                      <div className="player-name">{p.name}</div>
                      <div className="player-pos">{p.pos}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="card-actions">
        {isRegistered ? (
          <button
            className="card-btn registered-btn"
            disabled
          >
            <span>✓ You&apos;re Registered</span>
          </button>
        ) : (
          <>
            {isFull ? (
              <button
                className="card-btn waitlist-btn"
                onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: true })}
              >
                <span>📋 Join Waitlist</span>
              </button>
            ) : (
              <button
                className="card-btn signup-btn"
                onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: false })}
              >
                <span>⚽ Sign Up</span>
              </button>
            )}
            {/* <button className="card-btn share-btn">📤 Share</button> */}
          </>
        )}
      </div>
    </div>
  );
}
