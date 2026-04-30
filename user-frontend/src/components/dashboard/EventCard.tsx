"use client";

import React, { useEffect, useRef, useState } from "react";

export type EventStatus = "confirmed" | "tentative" | "full" | "cancelled" | "open" | "draft" | "completed";

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
  isWaitlisted?: boolean;
  isWaitlistApproved?: boolean;
  cancelReason?: string;
  players: { name: string; initials: string; pos: string }[];
  onBook: (game: any) => void;
  onViewDetails: () => void;
  onRateGame?: () => void;
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
  isWaitlisted = false,
  isWaitlistApproved = false,
  cancelReason,
  players,
  onBook,
  onViewDetails,
  onRateGame,
}: EventCardProps) {
  const isCancelled = status === "cancelled";
  const isFull = !isCancelled && spotsLeft <= 0;
  const effectiveStatus = isCancelled ? "cancelled" : isFull ? "full" : status;

  const fillPercentage = spotsTotal > 0 ? ((spotsTotal - spotsLeft) / spotsTotal) * 100 : 0;
  let fillClass = "mid";
  if (fillPercentage > 80) fillClass = "low";
  if (fillPercentage < 50) fillClass = "high";

  // Flash the spots count when it changes (someone just registered or backed out)
  const prevSpots = useRef(spotsLeft);
  const [spotsFlash, setSpotsFlash] = useState<"down" | "up" | null>(null);
  useEffect(() => {
    if (prevSpots.current === spotsLeft) return;
    setSpotsFlash(spotsLeft < prevSpots.current ? "down" : "up");
    prevSpots.current = spotsLeft;
    const t = setTimeout(() => setSpotsFlash(null), 1200);
    return () => clearTimeout(t);
  }, [spotsLeft]);

  return (
    <div className={`event-card ${effectiveStatus} ${isRegistered ? 'registered' : ''}`}>
      {/* Header with badge and price */}
      <div className="card-header">
        <div className="header-top">
          <span className={`status-badge ${effectiveStatus}`}>
            {effectiveStatus === 'cancelled'
              ? '✕ Cancelled'
              : effectiveStatus === 'full'
              ? '🔴 Full'
              : effectiveStatus === 'confirmed'
              ? '✓ Confirmed'
              : effectiveStatus === 'completed'
              ? '✅ Completed'
              : '📅 Incoming'}
          </span>
          {isWaitlisted && spotsLeft > 0 && !isCancelled && <span className="registered-badge waitlist-approved-badge">⚡ Spot Available!</span>}
          {isWaitlisted && spotsLeft === 0 && !isCancelled && <span className="registered-badge waitlisted-badge">📋 Waitlisted</span>}
          {isRegistered && !isCancelled && <span className="registered-badge">✓ Registered</span>}
          {isRegistered && isCancelled && <span className="registered-badge was-registered">Was Registered</span>}
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
        <div className={`detail-item${spotsFlash ? " spots-flash" : ""}`}>
          <span className="detail-label">Spots</span>
          <span
            className="detail-value"
            style={spotsFlash === "down" ? { color: "#f87171" } : spotsFlash === "up" ? { color: "#4ade80" } : undefined}
          >
            {spotsLeft}/{spotsTotal}
          </span>
        </div>
      </div>

      {/* Players Capacity Bar */}
      <div className="capacity-section">
        <div className="capacity-bar">
          <div
            className={`capacity-fill ${fillClass}`}
            style={{ width: `${fillPercentage}%`, transition: "width 0.6s ease" }}
          ></div>
        </div>
        <div className="capacity-text">
          <span
            className="players-count"
            style={spotsFlash === "down" ? { color: "#f87171" } : spotsFlash === "up" ? { color: "#4ade80" } : undefined}
          >
            {spotsTotal - spotsLeft}
          </span>
          <span className="total-slots">of {spotsTotal}</span>
        </div>
      </div>

      {/* Cancel Reason */}
      {isCancelled && cancelReason && (
        <div className="cancel-reason-section">
          <div className="cancel-reason-label">Reason</div>
          <div className="cancel-reason-text">{cancelReason}</div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="card-actions">
        {isCancelled ? (
          <button className="card-btn cancelled-btn" disabled>
            <span>✕ Event Cancelled</span>
          </button>
        ) : isRegistered && onRateGame ? (
          <button className="card-btn signup-btn" onClick={onRateGame}>
            <span>⭐ Rate this game</span>
          </button>
        ) : isRegistered ? (
          <button className="card-btn registered-btn" disabled>
            <span>✓ Registered</span>
          </button>
        ) : isWaitlisted && spotsLeft > 0 ? (
          // Waitlisted player + spot just opened → active "Sign Up Now!" button
          <button
            className="card-btn signup-btn"
            onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: false })}
          >
            <span>⚽ Book Your Seat — Hurry!</span>
          </button>
        ) : isWaitlisted ? (
          <button className="card-btn waitlist-btn" disabled>
            <span>📋 On Waitlist</span>
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
                <span>⚽ Book</span>
              </button>
            )}
          </>
        )}
        <button className="card-btn details-btn" onClick={onViewDetails}>
          <span>View More Details</span>
        </button>
      </div>
    </div>
  );
}
