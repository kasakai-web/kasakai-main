"use client";

import { avatarColorFor, avatarInitials } from "@/utils/avatar";
import {resolveImageUrl} from "@/utils/api";
import ProgressBar from "@/components/ui/ProgressBar";
import Image from "next/image";
import { useState } from "react";
import { REPEAT_LABEL, type EventCardProps } from "../EventCard";

function buildAvatarStackLabel(players: { name: string }[]): string|null {
  const total = players.length;
  if (total === 0) return null;
  if (total === 1) return players[0].name;
  if (total === 2) return `${players[0].name} and ${players[1].name}`;
  const othersCount = total - 2;
  return `${players[0].name}, ${players[1].name} and ${othersCount} other${othersCount === 1 ? "" : "s"}`;
}


// The pre-redesign game card, kept verbatim from main so the old dashboard can
// still be served (see utils/uiFlags.ts). Props come from the new card's
// interface so the two cannot drift; delete with the rest of legacy/.
export function LegacyEventCard({
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
  repeat = null,
  fee,
  passEligible = false,
  passInfo = null,
  offerInfo = null,
  codeOffers = [],
  spotsTotal,
  spotsLeft,
  isRegistered,
  optedOut = false,
  isWaitlisted = false,
  isWaitlistApproved = false,
  requiresApproval = false,
  registrationLocked = false,
  hostSpotOpen = false,
  requestStatus = null,
  onCancelRequest,
  onPayApproved,
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
  // "Included with your pass" wins over any entry-price offer (PRD §3A), and a
  // game the player can no longer book shows no price promise at all.
  const passCovers = Boolean((passInfo?.covered || passEligible) && fee > 0);
  const offer = !passCovers && !isRegistered && !isCancelled && !isAwaiting && fee > 0 && offerInfo && offerInfo.savingPaise > 0
    ? offerInfo
    : null;
  const offerable = !passCovers && !isRegistered && !isCancelled && !isAwaiting && fee > 0;
  const codes = offerable ? (codeOffers || []).filter((o) => o.code && o.savingPaise > 0) : [];
  // Read the clock once per mount: render must stay pure, and a card's "Today" has
  // never refreshed on its own anyway — only on a re-render or reload.
  const [now] = useState(() => Date.now());

  const getDateLabel = () => {
    // Compare calendar days in IST (en-CA → "YYYY-MM-DD"), independent of the viewer's timezone.
    const istYMD = (d: number | string | Date) =>
      new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
    const todayIST    = istYMD(now);
    const tomorrowIST = istYMD(now + 86_400_000);
    const gameIST     = istYMD(date);
    if (gameIST === todayIST)    return "Today";
    if (gameIST === tomorrowIST) return "Tomorrow";
    return new Date(date).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" });
  };

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
          {!isRegistered && repeat && REPEAT_LABEL[repeat] && (
            <span className="registered-badge repeat-badge">🔁 {REPEAT_LABEL[repeat]}</span>
          )}
          {/* The card shows the full price either way; the booking sheet applies
              an automatic offer and lists codes to tap. */}
          {offer ? (
            <span className="registered-badge coupon-badge" title={[offer.title, offer.savingText, offer.endsLabel].filter(Boolean).join(" · ")}>
              🏷<span className="coupon-label"> Offer applied</span>
            </span>
          ) : codes.length > 0 && (
            <span className="registered-badge coupon-badge" title="Pick a code when you book">
              🎟 {codes.length}<span className="coupon-label"> coupon{codes.length === 1 ? "" : "s"}</span>
            </span>
          )}
          {isWaitlisted && spotsLeft > 0 && !isCancelled && <span className="registered-badge waitlist-approved-badge">⚡ Spot Available!</span>}
          {isWaitlisted && spotsLeft === 0 && !isCancelled && <span className="registered-badge waitlisted-badge">📋 Waitlisted</span>}
          {!isRegistered && !isWaitlisted && !isCancelled && requestStatus === "pending" && <span className="registered-badge waitlisted-badge">⏳ Requested</span>}
          {!isRegistered && !isWaitlisted && !isCancelled && requestStatus === "approved_unpaid" && <span className="registered-badge waitlist-approved-badge">✅ Approved — pay to lock</span>}
          {isRegistered && !isCancelled && optedOut && <span className="registered-badge waitlisted-badge">↩ Not attending</span>}
          {isRegistered && !isCancelled && !optedOut && <span className="registered-badge">✓ Registered</span>}
          {isRegistered && isCancelled && <span className="registered-badge was-registered">Was Registered</span>}
          {hostSpotOpen && !isRegistered && !isCancelled && <span className="registered-badge waitlist-approved-badge">🎖 Host spot open</span>}
        </div>
        <div className="card-price">
          {/* A covered seat shows the old price struck through and what they
              actually pay — which is ₹0 for a full cover and a real number for a
              discount pass. The pass's name is left off: it crowded the price
              block, and the booking sheet names it on its own line. */}
          {passCovers ? (
            <>
              <div className="price-original">₹{fee}</div>
              <div className="price-free">
                {passInfo && passInfo.payablePaise > 0
                  ? `₹${Math.round(passInfo.payablePaise / 100)}`
                  : "₹0"}
              </div>
            </>
          ) : (
            // An automatic offer does not change the card's price — the pill
            // flags it, and the booking sheet shows what it takes off.
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

      {/* Signed-up players — stacked photos (signup order, capped at 3) + names */}
      {players.length > 0 && (
        <div className="card-avatars-row">
          <div className="avatar-stack">
            {players.slice(0, 3).map((p, i) => {
              const imageUrl = resolveImageUrl(p.profileImage);
              return (
                <div key={i} className="avatar-mini" style={imageUrl ? undefined : { background: avatarColorFor(p.name) }}>
                  {imageUrl && (
                    <Image  
                    width={28} 
                    height={28}
                      loading="lazy"
                      src={imageUrl}
                      alt={p.name}
                      className="avatar-mini-img"
                      onError={(e) => {
                        const img = e.currentTarget;
                        img.style.display = "none";
                        const fallback = img.nextElementSibling as HTMLElement | null;
                        if (fallback) fallback.style.display = "flex";
                      }}
                    />
                  )}
                  <span className="avatar-mini-fallback" style={imageUrl ? { display: "none" } : undefined}>
                    {avatarInitials(p.name)}
                  </span>
                </div>
              );
            })}
          </div>
          <span className="players-names-label">{buildAvatarStackLabel(players)}</span>
        </div>
      )}

      {/* Players Capacity Bar */}
      <ProgressBar   spotsTotal={spotsTotal} spotsLeft={spotsLeft} />
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
        ) : isRegistered && optedOut ? (
          // Not a dead end: the detail modal is where they rejoin or leave for good.
          <button className="card-btn waitlist-btn" onClick={onViewDetails}>
            <span>↩ Not attending · Manage</span>
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
          <button className="card-btn signup-btn" onClick={() => onPayApproved?.()}>
            <span>✅ Pay to lock your spot</span>
          </button>
        ) : (
          <>
            {registrationLocked ? (
              // Not "full": full is a state the waitlist answers. This is the
              // roster being closed, which the waitlist cannot get you around.
              <button className="card-btn waitlist-btn" disabled title="Registration closed at the cutoff. If someone drops out, the slot reopens.">
                <span>🔒 Registration Closed</span>
              </button>
            ) : isFull ? (
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
