"use client";

import { avatarColorFor, avatarInitials } from "@/utils/avatar";
import {resolveImageUrl} from "@/utils/api";
import ProgressBar from "@/components/ui/ProgressBar";
import Image from "next/image";
import { ChevronRight, Info, MapPin } from "lucide-react";
import type { OfferInfo } from "@/utils/offers";

export type EventStatus = "confirmed" | "tentative" | "full" | "cancelled" | "open" | "draft" | "completed";



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

export function EventCard({
  id,
  venue,
  city,
  area,
  status,
  awaitingResult = false,
  formatChangedOptOut = false,
  onRejoin,
  date,
  time,
  format,
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
  requiresApproval = false,
  registrationLocked = false,
  hostSpotOpen = false,
  requestStatus = null,
  onCancelRequest,
  onPayApproved,
  cancelReason,
  players,
  organiserName,
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

  const formatFeedTime = () => {
    // Accepts "21:00" as well as the en-IN locale's "09:00 pm".
    const match = time.trim().match(/^(\d{1,2}):(\d{2})\s*([ap]\.?m\.?)?$/i);
    if (!match) return time;
    const hour = Number(match[1]);
    const meridiem = match[3]?.replace(/\./g, "").toUpperCase();
    const suffix = meridiem ?? (hour >= 12 ? "PM" : "AM");
    return `${hour % 12 || 12}:${match[2]} ${suffix}`;
  };

  const feedDateLabel = new Date(date).toLocaleDateString("en-GB", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const feedStatusTag = formatChangedOptOut
    ? { label: "Format changed", kind: "changed" }
    : isAwaiting
      ? { label: "Awaiting result", kind: "tentative" }
      : isCancelled
        ? { label: "Cancelled", kind: "cancelled" }
        : effectiveStatus === "full"
          ? { label: "Full", kind: "full" }
          : effectiveStatus === "confirmed"
            ? { label: "Confirmed", kind: "confirmed" }
            : effectiveStatus === "completed"
              ? { label: "Completed", kind: "completed" }
              : null;
  const feedRegistrationTag = isRegistered && isCancelled
    ? { label: "Was registered", kind: "muted" }
    : isRegistered && optedOut
      ? { label: "Not attending", kind: "warn" }
      : isRegistered
        ? { label: "Registered", kind: "registered" }
        : isWaitlisted && spotsLeft > 0 && !isCancelled
          ? { label: "Spot available", kind: "registered" }
          : isWaitlisted && !isCancelled
            ? { label: "Waitlisted", kind: "warn" }
            : requestStatus === "pending" && !isCancelled
              ? { label: "Requested", kind: "warn" }
              : requestStatus === "approved_unpaid" && !isCancelled
                ? { label: "Approved · pay to lock", kind: "registered" }
                : null;
  const showHostTag = hostSpotOpen && !isRegistered && !isCancelled;

  // The left stripe carries the card's most important state at a glance.
  const accent = isCancelled
    ? "cancelled"
    : status === "completed"
      ? "completed"
      : formatChangedOptOut || isAwaiting || (isRegistered && optedOut)
        ? "warn"
        : status === "confirmed"
          ? "confirmed"
          : isRegistered
            ? "registered"
            : isFull
              ? "full"
              : "open";

  const feedBookingAction = formatChangedOptOut ? (
    <button type="button" className="kk-game-book" onClick={() => onRejoin?.()}>Rejoin</button>
  ) : isCancelled ? (
    <button type="button" className="kk-game-book is-muted" disabled>Cancelled</button>
  ) : isRegistered && onRateGame ? (
    // Completed games awaiting this player's feedback.
    <button type="button" className="kk-game-book" onClick={onRateGame}>Rate game</button>
  ) : isRegistered && optedOut ? (
    <button type="button" className="kk-game-book is-secondary" onClick={onViewDetails}>Manage</button>
  ) : isRegistered ? (
    <button type="button" className="kk-game-book is-registered" disabled>Registered</button>
  ) : isWaitlisted && spotsLeft > 0 ? (
    <button type="button" className="kk-game-book" onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: false })}>⚽Book</button>
  ) : isWaitlisted ? (
    <button type="button" className="kk-game-book is-muted" disabled>On Waitlist</button>
  ) : requestStatus === "pending" ? (
    <button type="button" className="kk-game-book is-secondary" onClick={() => onCancelRequest?.()} title="Cancel your join request">Requested · Cancel</button>
  ) : requestStatus === "approved_unpaid" ? (
    <button type="button" className="kk-game-book" onClick={() => onPayApproved?.()}>Pay to book</button>
  ) : registrationLocked ? (
    <button type="button" className="kk-game-book is-muted" disabled title="Registration closed at the cutoff. If someone drops out, the slot reopens.">Registration closed</button>
  ) : isFull ? (
    <button type="button" className="kk-game-book is-waitlist" onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: true })}>Join waitlist</button>
  ) : (
    <button type="button" className="kk-game-book" onClick={() => onBook({ id, venue, date, time, format, fee, spots: spotsLeft, waitlist: false })}>
      {requiresApproval ? "Request to join" : "⚽Book"}
    </button>
  );

  // A pass shows the full fee struck through beside what the seat costs. An
  // automatic offer does not change the card's price — the tag flags it, and
  // the booking sheet shows what it takes off.
  const discountedPrice = passCovers
    ? passInfo && passInfo.payablePaise > 0 ? Math.round(passInfo.payablePaise / 100) : 0
    : null;
  const displayPrice = discountedPrice ?? fee;
  const showSpots = !isCancelled && !isAwaiting && status !== "completed";
  // A game that is over or called off has no fill level worth reading.
  const showCapacity = !isCancelled && status !== "completed";

  return (
    <article
      className={`kk-game-card is-${accent}${isRegistered && !isCancelled ? " is-mine" : ""}`}
      aria-label={`${venue}, ${feedDateLabel} at ${formatFeedTime()}`}
    >
      <div className="kk-game-main">
        <div className="kk-game-time">
          <strong>{formatFeedTime()}</strong>
          <small>{feedDateLabel}</small>
        </div>
        <div className="kk-game-venue">
          <h2 title={venue}>{venue}</h2>
          <div className="kk-game-meta">
            <span className="kk-game-area">
              <MapPin size={12} aria-hidden="true" />
              {area || city}
            </span>
            <span className="kk-game-tag kk-game-format">{format}</span>
            {feedStatusTag && (
              <span className={`kk-game-tag kk-game-status-${feedStatusTag.kind}`}>
                {feedStatusTag.label}
              </span>
            )}
            {feedRegistrationTag && (
              <span className={`kk-game-tag kk-game-reg-${feedRegistrationTag.kind}`}>
                {feedRegistrationTag.label}
              </span>
            )}
            {showHostTag && <span className="kk-game-tag kk-game-reg-registered">Host spot open</span>}
            {passCovers && <span className="kk-game-tag kk-game-pass">Pass</span>}
            {offer ? (
              <span
                className="kk-game-tag kk-game-pass"
                title={[offer.title, offer.savingText, offer.endsLabel].filter(Boolean).join(" · ")}
              >
                Offer applied
              </span>
            ) : codes.length > 0 && (
              <span className="kk-game-tag kk-game-pass" title="Pick a code when you book">
                {codes.length} coupon{codes.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
        </div>
        <div className="kk-game-rate">
          <span className="kk-game-price" aria-label={`${displayPrice} rupees per player`}>
            {discountedPrice !== null && <small className="kk-game-old-price">₹{fee}</small>}
            ₹{displayPrice}
          </span>
          {feedBookingAction}
        </div>
      </div>

      {showCapacity && (
        <div className="kk-game-capacity">
          <ProgressBar spotsTotal={spotsTotal} spotsLeft={spotsLeft} />
        </div>
      )}
      {isCancelled && cancelReason && (
        <div className="kk-game-reason">
          <Info size={13} aria-hidden="true" />
          <span><strong>Reason:</strong> {cancelReason}</span>
        </div>
      )}
      <div className="kk-game-footer">
        <div className="kk-game-people" title={organiserName ? `Organised by ${organiserName}` : undefined}>
          {players.length > 0 && (
            <div className="kk-game-players" aria-label={`${players.length} players joined`}>
              {players.slice(0, 3).map((player, index) => {
                const imageUrl = resolveImageUrl(player.profileImage);
                return (
                  <span key={`${player.name}-${index}`} className="kk-game-player-avatar" title={player.name}>
                    {imageUrl ? (
                      <Image
                        src={imageUrl}
                        width={26}
                        height={26}
                        alt={player.name}
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                          const fallback = event.currentTarget.nextElementSibling as HTMLElement | null;
                          if (fallback) fallback.style.display = "grid";
                        }}
                      />
                    ) : null}
                    <span
                      className="kk-game-player-fallback"
                      style={{ display: imageUrl ? "none" : "grid", backgroundColor: avatarColorFor(player.name) }}
                    >
                      {avatarInitials(player.name)}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
          {showSpots && (
            <span className={`kk-game-spots${spotsLeft <= 0 ? " is-full" : ""}`}>
              {spotsLeft <= 0 ? "No spots left" : `${spotsLeft} ${spotsLeft === 1 ? "spot" : "spots"} left`}
            </span>
          )}
        </div>
        <button type="button" className="kk-game-details" onClick={onViewDetails} aria-haspopup="dialog">
          Details <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}
