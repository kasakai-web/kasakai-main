"use client";

import React, { useEffect, useRef, useState } from "react";

export type EventStatus = "confirmed" | "tentative" | "full" | "cancelled" | "open" | "draft" | "completed";

export interface EventCardProps {
  id: string;
  title?: string;
  venue: string;
  city: string;
  status: EventStatus;
  awaitingResult?: boolean;
  formatChangedOptOut?: boolean;
  onRejoin?: () => void;
  date: string;
  time: string;
  format: string;
  fee: number;
  passEligible?: boolean;
  spotsTotal: number;
  spotsLeft: number;
  isRegistered: boolean;
  isWaitlisted?: boolean;
  isWaitlistApproved?: boolean;
  requiresApproval?: boolean;
  requestStatus?: "pending" | "approved_unpaid" | null;
  onCancelRequest?: () => void;
  cancelReason?: string;
  players: { name: string; initials: string; pos: string }[];
  onBook: (game: any) => void;
  onViewDetails: () => void;
  onRateGame?: () => void;
}

export function EventCard({
  id,
  title,
  venue,
  city,
  status,
  awaitingResult = false,
  formatChangedOptOut = false,
  onRejoin,
  date,
  time,
  format,
  fee,
  passEligible = false,
  spotsTotal,
  spotsLeft,
  isRegistered,
  isWaitlisted = false,
  isWaitlistApproved = false,
  requiresApproval = false,
  requestStatus = null,
  onCancelRequest,
  cancelReason,
  players,
  onBook,
  onViewDetails,
  onRateGame,
}: EventCardProps) {
  const isCancelled = status === "cancelled";
  // A past game still open/tentative/confirmed is "awaiting result" — it happened
  // but the organiser hasn't recorded the outcome. Show that instead of a stale
  // "Confirmed"/"Open" badge, and don't let it read as "Completed".
  const isAwaiting = awaitingResult && !isCancelled && status !== "completed";
  const isFull = !isCancelled && !isAwaiting && spotsLeft <= 0;
  const effectiveStatus = isCancelled ? "cancelled" : isFull ? "full" : status;

  const getDateLabel = () => {
    // Compare calendar days in IST (en-CA → "YYYY-MM-DD"), independent of the viewer's timezone.
    const istYMD = (d: number | string | Date) =>
      new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const todayIST    = istYMD(Date.now());
    const tomorrowIST = istYMD(Date.now() + 86_400_000);
    const gameIST     = istYMD(date);
    if (gameIST === todayIST)    return "Today";
    if (gameIST === tomorrowIST) return "Tomorrow";
    return new Date(date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  };

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
          <span className={`status-badge ${formatChangedOptOut ? 'cancelled' : isAwaiting ? 'tentative' : effectiveStatus}`}>
            {formatChangedOptOut
              ? '🔄 Format changed'
              : isAwaiting
              ? '⏳ Awaiting result'
              : effectiveStatus === 'cancelled'
              ? '✕ Cancelled'
              : effectiveStatus === 'full'
              ? '🔴 Full'
              : effectiveStatus === 'confirmed'
              ? '✓ Confirmed'
              : effectiveStatus === 'completed'
              ? '✅ Completed'
              : `📅 ${getDateLabel()}`}
          </span>
          {isWaitlisted && spotsLeft > 0 && !isCancelled && <span className="registered-badge waitlist-approved-badge">⚡ Spot Available!</span>}
          {isWaitlisted && spotsLeft === 0 && !isCancelled && <span className="registered-badge waitlisted-badge">📋 Waitlisted</span>}
          {!isRegistered && !isWaitlisted && !isCancelled && requestStatus === "pending" && <span className="registered-badge waitlisted-badge">⏳ Requested</span>}
          {!isRegistered && !isWaitlisted && !isCancelled && requestStatus === "approved_unpaid" && <span className="registered-badge waitlist-approved-badge">✅ Approved — pay to lock</span>}
          {isRegistered && !isCancelled && <span className="registered-badge">✓ Registered</span>}
          {isRegistered && isCancelled && <span className="registered-badge was-registered">Was Registered</span>}
        </div>
        <div className="card-price">
          {passEligible && fee > 0 ? (
            <>
              <div className="price-original">₹{fee}</div>
              <div className="price-free">₹0</div>
            </>
          ) : (
            <>
              <div className="price-rupee">₹</div>
              <div className="price-amount">{fee}</div>
            </>
          )}
        </div>
      </div>

      {/* Venue Information */}
      <div className="card-venue-section">
        {title && <h3 className="card-title">{title}</h3>}
        <p className="card-location">
          <span className="card-venue">🏟️ {venue}</span>
          <span className="card-loc-sep">·</span>
          <span className="card-city">📍 {city}</span>
        </p>
      </div>

      {/* Key Details Grid */}
      <div className="card-details-grid">
        <div className="detail-item">
          <span className="detail-label">Date</span>
          <span className="detail-value">{new Date(date).toLocaleDateString('en-GB', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' })}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Time</span>
          <span className="detail-value">{time}</span>
        </div>
        <div className="detail-item">
          <span className="detail-label">Format</span>
          <span className="detail-value">{format}</span>
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
        {formatChangedOptOut ? (
          <button className="card-btn signup-btn" onClick={() => onRejoin?.()}>
            <span>🔄 Rejoin the new format</span>
          </button>
        ) : isCancelled ? (
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
            <span>⚽ Book Your Slot — Hurry!</span>
          </button>
        ) : isWaitlisted ? (
          <button className="card-btn waitlist-btn" disabled>
            <span>📋 On Waitlist</span>
          </button>
        ) : requestStatus === "pending" ? (
          <button className="card-btn waitlist-btn" onClick={() => onCancelRequest?.()} title="Cancel your join request">
            <span>⏳ Requested · Cancel</span>
          </button>
        ) : requestStatus === "approved_unpaid" ? (
          <button
            className="card-btn signup-btn"
            onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: false })}
          >
            <span>✅ Pay to lock your spot</span>
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
                <span>{requiresApproval ? "🙋 Request to Join" : "⚽ Book"}</span>
              </button>
            )}
          </>
        )}
        <button className="card-btn details-btn" onClick={onViewDetails}>
          <span>View More Details</span>
          <span className="details-btn-arrow">→</span>
        </button>
      </div>
    </div>
  );
}
