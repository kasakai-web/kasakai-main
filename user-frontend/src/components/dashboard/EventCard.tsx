"use client";

import React from "react";

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
}: EventCardProps) {
  const isCancelled = status === "cancelled";
  const isFull = !isCancelled && spotsLeft <= 0;
  const effectiveStatus = isCancelled ? "cancelled" : isFull ? "full" : status;

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
            {effectiveStatus === 'cancelled'
              ? '✕ Cancelled'
              : effectiveStatus === 'full'
              ? '🔴 Full'
              : effectiveStatus === 'confirmed'
              ? '✓ Confirmed'
              : effectiveStatus === 'completed'
              ? '✅ Completed'
              : 'Tentative'}
          </span>
          {isWaitlisted && isWaitlistApproved && !isCancelled && <span className="registered-badge waitlist-approved-badge">✓ Waitlist Approved</span>}
          {isWaitlisted && !isWaitlistApproved && !isCancelled && <span className="registered-badge waitlisted-badge">📋 Waitlisted</span>}
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
        ) : isWaitlisted && isWaitlistApproved ? (
          <button className="card-btn approved-waitlist-btn" disabled>
            <span>✓ Spot Approved!</span>
          </button>
        ) : isWaitlisted ? (
          <button className="card-btn waitlist-btn" disabled>
            <span>📋 On Waitlist</span>
          </button>
        ) : isRegistered ? (
          <button className="card-btn registered-btn" disabled>
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
          </>
        )}
        <button className="card-btn details-btn" onClick={onViewDetails}>
          <span>View More Details</span>
        </button>
      </div>
    </div>
  );
}
