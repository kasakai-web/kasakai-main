"use client";
import { Fragment, useState, type ReactNode } from "react";

import { avatarColorFor, avatarInitials } from "@/utils/avatar";
import {resolveImageUrl} from "@/utils/api";
import ProgressBar from "@/components/ui/ProgressBar";
import Image from "next/image";
import type { OfferInfo } from "@/utils/offers";
import { confirmLabel, type ConfirmInfo } from "@/utils/confirmInfo";
import { expiryLine, type PricingInfo } from "@/utils/earlyBird";
import EarlyBirdTag from "./EarlyBirdTag";

export type EventStatus = "confirmed" | "tentative" | "full" | "cancelled" | "open" | "draft" | "completed";

export type GameRepeat = "daily" | "weekly" | "monthly";

export const REPEAT_LABEL: Record<GameRepeat, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
};

/** At most this many tags on a game card, COUNTING the date/status pill — so
 *  one more beside it, picked in priority order with early bird first. */
export const MAX_CARD_TAGS = 2;


/** The early-bird price in rupees while it is below list and the game can be
 *  booked, else null. */
export function earlyBirdPrice(
  pricingInfo: EventCardProps["pricingInfo"],
  bookable: boolean,
): number | null {
  if (!bookable || !pricingInfo || pricingInfo.currentPricePaise >= pricingInfo.listPricePaise) return null;
  return Math.round(pricingInfo.currentPricePaise / 100);
}

export interface EventCardProps {
  id: string;
  title?: string;
  venue: string;
  city: string;
  area?: string;
  status: EventStatus;
  awaitingResult?: boolean;
  formatChangedOptOut?: boolean;
  onRejoin?: () => void;
  date: string;
  time: string;
  format: string;
  repeat?: GameRepeat | null;
  fee: number;
  passEligible?: boolean;
  /** What a pass does to THIS game for this viewer, computed server-side
   *  (`passService.passInfoFrom`). The boolean above is the old binary answer
   *  and stays for callers that have not been given this yet; only this one can
   *  say "₹150 off" or name the pass doing it. */
  passInfo?: {
    covered: boolean;
    passName: string | null;
    benefitPaise: number;
    payablePaise: number;
  } | null;
  /** The offer this viewer's own seat would get right now — the server's
   *  `offerInfo`, never re-derived here. Absent for a signed-out viewer, on a
   *  game they are already in, and wherever a pass covers the seat. */
  offerInfo?: OfferInfo | null;
  /** The SHARED codes this viewer could type on this game, best first — the
   *  server's `codeOffers`. Counted on the card's coupon tag, never applied to
   *  the card's price: a code only counts once it is entered at booking. */
  codeOffers?: OfferInfo[];
  /** The early-bird ladder as the server prices it right now (`pricingInfo`),
   *  null on a flat game. The card shows the early price beside the list price
   *  struck through. */
  pricingInfo?: PricingInfo | null;
  spotsTotal: number;
  spotsLeft: number;
  isRegistered: boolean;
  // Gave up their own seat but still has a row on the game (guests may play on, and
  // they can rejoin). Still "registered" as far as the game is concerned, so the
  // badge must say so rather than claiming they are playing.
  optedOut?: boolean;
  isWaitlisted?: boolean;
  isWaitlistApproved?: boolean;
  requiresApproval?: boolean;
  // The roster was full when the game's cutoff passed, so joining is shut —
  // including the waitlist. Server-computed (`registrationLocked`); it lifts by
  // itself as soon as anyone drops out, so the card must never cache it.
  registrationLocked?: boolean;
  /** "Minimum reached · confirms 6:00 PM" / "3 more needed" — the server's
   *  `confirmInfo`, set only on a game that auto-confirms at its minimum. */
  confirmInfo?: ConfirmInfo | null;
  /** This viewer is one of the organiser's approved hosts and may book a host
   *  spot here right now — the server's `hostInfo.viewerCanBook`, the same gate
   *  the booking runs. Booked from the game's Players tab. */
  hostSpotOpen?: boolean;
  requestStatus?: "pending" | "approved_unpaid" | null;
  onCancelRequest?: () => void;
  /**
   * The organiser approved this request while the player's wallet was short.
   * Settling it is its own endpoint (/confirm-approved) — NOT a fresh booking,
   * which the server refuses outright while a live request exists.
   */
  onPayApproved?: () => void;
  cancelReason?: string;
  players: { name: string; initials: string; pos: string; profileImage?: string }[];
  organiserName?: string;
  onBook: (game: any) => void;
  onViewDetails: () => void;
  onRateGame?: () => void;
}

function buildAvatarStackLabel(players: { name: string }[]): string|null {
  const total = players.length;
  if (total === 0) return null;
  if (total === 1) return players[0].name;
  if (total === 2) return `${players[0].name} and ${players[1].name}`;
  const othersCount = total - 2;
  return `${players[0].name}, ${players[1].name} and ${othersCount} other${othersCount === 1 ? "" : "s"}`;
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
  repeat = null,
  fee,
  passEligible = false,
  passInfo = null,
  offerInfo = null,
  codeOffers = [],
  pricingInfo = null,
  spotsTotal,
  spotsLeft,
  isRegistered,
  optedOut = false,
  isWaitlisted = false,
  isWaitlistApproved = false,
  requiresApproval = false,
  registrationLocked = false,
  confirmInfo = null,
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
  const earlyPrice = earlyBirdPrice(pricingInfo, offerable);
  // The struck price is the list price the ladder is measured against.
  const listPrice = earlyPrice !== null && pricingInfo ? Math.round(pricingInfo.listPricePaise / 100) : fee;
  const earlyNote = earlyPrice !== null ? expiryLine(pricingInfo) : null;
  // "9 more needed" / "Minimum reached" — never shown beside an early-bird badge.
  const confirmTag = !isCancelled && !isAwaiting ? confirmLabel(confirmInfo) : null;
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

  const badges: { key: string; node: ReactNode }[] = [];
  if (earlyPrice !== null) {
    badges.push({
      key: "early",
      node: (
        <EarlyBirdTag className="registered-badge early-bird-badge" price={`₹${earlyPrice}`} original={`₹${listPrice}`} detail={earlyNote}>
          🐦 Early bird
        </EarlyBirdTag>
      ),
    });
  }
  if (isWaitlisted && spotsLeft > 0 && !isCancelled) badges.push({ key: "wl-spot", node: <span className="registered-badge waitlist-approved-badge">⚡ Spot Available!</span> });
  if (isWaitlisted && spotsLeft === 0 && !isCancelled) badges.push({ key: "wl", node: <span className="registered-badge waitlisted-badge">📋 Waitlisted</span> });
  if (!isRegistered && !isWaitlisted && !isCancelled && requestStatus === "pending") badges.push({ key: "req", node: <span className="registered-badge waitlisted-badge">⏳ Requested</span> });
  if (!isRegistered && !isWaitlisted && !isCancelled && requestStatus === "approved_unpaid") badges.push({ key: "approved", node: <span className="registered-badge waitlist-approved-badge">✅ Approved — pay to lock</span> });
  if (isRegistered && !isCancelled && optedOut) badges.push({ key: "optout", node: <span className="registered-badge waitlisted-badge">↩ Not attending</span> });
  if (isRegistered && !isCancelled && !optedOut) badges.push({ key: "reg", node: <span className="registered-badge">✓ Registered</span> });
  if (isRegistered && isCancelled) badges.push({ key: "was", node: <span className="registered-badge was-registered">Was Registered</span> });
  if (confirmTag && earlyPrice === null) {
    badges.push({
      key: "confirm",
      node: (
        <span
          className={`registered-badge confirm-badge ${confirmInfo?.state === "min_reached" ? "waitlist-approved-badge" : "waitlisted-badge"}`}
          title="This game is confirmed automatically once it has its minimum players, between the organiser's 1st and 2nd check-in."
        >
          {confirmTag}
        </span>
      ),
    });
  }
  if (hostSpotOpen && !isRegistered && !isCancelled) badges.push({ key: "host", node: <span className="registered-badge waitlist-approved-badge">🎖 Host spot open</span> });
  // The card shows the full price either way; the booking sheet applies an
  // automatic offer and lists codes to tap.
  if (earlyPrice === null && offer) {
    badges.push({
      key: "offer",
      node: (
        <span className="registered-badge coupon-badge" title={[offer.title, offer.savingText, offer.endsLabel].filter(Boolean).join(" · ")}>
          🏷<span className="coupon-label"> Offer applied</span>
        </span>
      ),
    });
  } else if (earlyPrice === null && codes.length > 0) {
    badges.push({
      key: "codes",
      node: (
        <span className="registered-badge coupon-badge" title="Pick a code when you book">
          🎟 {codes.length}<span className="coupon-label"> coupon{codes.length === 1 ? "" : "s"}</span>
        </span>
      ),
    });
  }
  if (earlyPrice === null && !isRegistered && !isCancelled && !hostSpotOpen && !isAwaiting && status !== "completed" && !isWaitlisted && !requestStatus && repeat && REPEAT_LABEL[repeat]) {
    badges.push({ key: "repeat", node: <span className="registered-badge repeat-badge">🔁 {REPEAT_LABEL[repeat]}</span> });
  }

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
          {/* The status pill counts toward MAX_CARD_TAGS, so one badge beside
              it, in priority order — early bird first whenever the game has an
              early-bird price. Early bird replaces "9 more needed" and the
              repeat and coupon badges outright. */}
          {badges.slice(0, MAX_CARD_TAGS - 1).map((b) => <Fragment key={b.key}>{b.node}</Fragment>)}
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
          ) : earlyPrice !== null ? (
            // Early-bird: the list price struck through, then the price the next
            // seat sells at — read left to right as "was ₹300, now ₹250".
            <div className="card-price-early" aria-label={`${earlyPrice} rupees, was ${listPrice}`}>
              <div className="price-original is-early">₹{listPrice}</div>
              <div className="price-rupee">₹</div>
              <div className="price-amount is-early">{earlyPrice}</div>
            </div>
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
