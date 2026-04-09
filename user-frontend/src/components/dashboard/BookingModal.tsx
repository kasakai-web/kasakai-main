"use client";

import React, { useState } from "react";
import Link from "next/link";

type BookingGame = {
  id?: string;
  _id?: string;
  title?: string;
  venue: string;
  date: string;
  time: string;
  format: string;
  fee: number;
  spots: number;
  waitlist?: boolean;
};

type Guest = {
  name: string;
  position: string;
  teamPreference: string;
};

export type BookingGuest = Guest;

interface BookingModalProps {
  game: BookingGame | null;
  onClose: () => void;
  onConfirm: (game: BookingGame, guests: Guest[], teamPreference: string) => void;
  walletBalance: number;
  playerPositions?: string[];
  playerId?: string;
}

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
};

const TEAM_OPTIONS = [
  { label: "No Preference", cls: "" },
  { label: "Red Team",      cls: "pref-red" },
  { label: "Blue Team",     cls: "pref-blue" },
] as const;

const MAX_GUESTS = 4;

function GuestCard({
  index,
  guest,
  gameFee,
  onUpdate,
  onRemove,
}: {
  index: number;
  guest: Guest;
  gameFee: number;
  onUpdate: (g: Partial<Guest>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="bm-guest-card">
      <div className="bm-guest-header">
        <span className="bm-guest-label">Guest {index + 1}</span>
        <div className="bm-guest-meta">
          <span className="bm-guest-fee">+₹{gameFee}</span>
          <button className="bm-guest-remove" onClick={onRemove} title="Remove guest">✕</button>
        </div>
      </div>

      {/* Name */}
      <div className="bm-guest-row">
        <div className="bm-guest-row-label">Name</div>
        <input
          className="bm-guest-name-input"
          type="text"
          placeholder="Guest first name"
          value={guest.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          maxLength={40}
        />
      </div>

      {/* Position */}
      <div className="bm-guest-row">
        <div className="bm-guest-row-label">Position</div>
        <div className="bm-guest-positions">
          {POSITIONS.map((pos) => (
            <button
              key={pos}
              className={`bm-guest-pos ${guest.position === pos ? "selected" : ""}`}
              onClick={() => onUpdate({ position: pos })}
              title={POSITION_LABELS[pos]}
            >
              {pos}
            </button>
          ))}
        </div>
      </div>

      {/* Team preference */}
      <div className="bm-guest-row">
        <div className="bm-guest-row-label">Team</div>
        <div className="bm-guest-teams">
          {TEAM_OPTIONS.map(({ label, cls }) => (
            <button
              key={label}
              className={`bm-guest-team ${cls} ${guest.teamPreference === label ? "selected" : ""}`}
              onClick={() => onUpdate({ teamPreference: label })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function BookingModal({
  game,
  onClose,
  onConfirm,
  walletBalance,
  playerPositions = [],
  playerId,
}: BookingModalProps) {
  const [teamPreference, setTeamPreference] = useState<string>("No Preference");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [success, setSuccess] = useState(false);
  const [notification, setNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!game || !game.venue) return null;

  const totalFee = game.fee * (1 + guests.length);
  const isWaitlist = game.waitlist;
  const canAfford = isWaitlist || walletBalance >= totalFee;
  const canAddGuest = guests.length < MAX_GUESTS;

  const [venueName, venueCity] = game.venue.split(",").map((s) => s.trim());
  const hasPositions = playerPositions.length > 0;

  const allGuestsNamed = guests.every((g) => g.name.trim().length > 0);

  const addGuest = () => {
    if (!canAddGuest) return;
    setGuests((prev) => [...prev, { name: "", position: "DEF", teamPreference: "No Preference" }]);
  };

  const removeGuest = (idx: number) => {
    setGuests((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateGuest = (idx: number, patch: Partial<Guest>) => {
    setGuests((prev) => prev.map((g, i) => (i === idx ? { ...g, ...patch } : g)));
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      onConfirm(game, guests, teamPreference);
      await new Promise((resolve) => setTimeout(resolve, 500));
      setSuccess(true);
      setNotification(true);
      setTimeout(() => setNotification(false), 4000);
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeAll = () => {
    setSuccess(false);
    setGuests([]);
    setNotification(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <>
      <div className="overlay show" onClick={closeAll} />

      <div className="booking-modal show">
        {!success ? (
          <div id="bookingForm">
            {/* Header */}
            <div className="bm-header">
              <div className="bm-title-group">
                <div className="bm-eyebrow">{isWaitlist ? "Join Waitlist" : "Game Sign-up"}</div>
                <div className="bm-title">
                  {venueName}
                  {venueCity ? <><br />{venueCity}</> : null}
                </div>
              </div>
              <button className="bm-close" onClick={closeAll}>✕</button>
            </div>

            {/* Event details */}
            <div className="bm-game-info">
              <div className="bm-info-item">
                <div className="bm-info-label">Date</div>
                <div className="bm-info-value">{game.date}</div>
              </div>
              <div className="bm-info-item">
                <div className="bm-info-label">Time</div>
                <div className="bm-info-value">{game.time}</div>
              </div>
              <div className="bm-info-item">
                <div className="bm-info-label">Format</div>
                <div className="bm-info-value">{game.format}</div>
              </div>
              <div className="bm-info-item">
                <div className="bm-info-label">Spots Left</div>
                <div className="bm-info-value">{isWaitlist ? "Waitlist" : game.spots}</div>
              </div>
            </div>

            <div className="bm-body">
              {/* Your position (read-only) */}
              <div>
                <div className="bm-section-title">Your Position</div>
                {hasPositions ? (
                  <>
                    <div className="position-grid">
                      {playerPositions.map((pos) => (
                        <button
                          key={pos}
                          className="pos-opt selected"
                          disabled
                          style={{ cursor: "default", opacity: 1 }}
                        >
                          {pos}
                          {POSITION_LABELS[pos] && (
                            <span style={{ display: "block", fontSize: "10px", opacity: 0.7, marginTop: "2px" }}>
                              {POSITION_LABELS[pos]}
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                    <p style={{ margin: "8px 0 0", fontSize: "11px", color: "var(--muted,#666)", display: "flex", alignItems: "center", gap: "4px" }}>
                      <span style={{ color: "var(--lime,#c4d56c)" }}>ⓘ</span>
                      {playerId ? (
                        <>To change,{" "}
                          <Link href={`/dashboard/player/${playerId}/profile`} style={{ color: "var(--lime,#c4d56c)", textDecoration: "underline" }}>
                            update your profile
                          </Link>.
                        </>
                      ) : "Update your profile to change position."}
                    </p>
                  </>
                ) : (
                  <p style={{ fontSize: "12px", color: "var(--muted,#666)", margin: "4px 0 0" }}>
                    No position set.{" "}
                    {playerId && (
                      <Link href={`/dashboard/player/${playerId}/profile`} style={{ color: "var(--lime,#c4d56c)", textDecoration: "underline" }}>
                        Add one in your profile
                      </Link>
                    )}
                  </p>
                )}
              </div>

              {/* Your team preference */}
              <div>
                <div className="bm-section-title">Your Team Preference</div>
                <div className="pref-row">
                  {TEAM_OPTIONS.map(({ label, cls }) => (
                    <button
                      key={label}
                      className={`pref-opt ${cls} ${teamPreference === label ? "selected" : ""}`}
                      onClick={() => setTeamPreference(label)}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bring friends section */}
              <div className="bm-guests-section">
                <div className="bm-guests-header">
                  <div>
                    <div className="bm-section-title" style={{ marginBottom: "2px" }}>Bring Friends</div>
                    <div className="bm-guests-sub">
                      {guests.length === 0
                        ? "Add up to 4 friends — each adds ₹" + game.fee
                        : `${guests.length} of ${MAX_GUESTS} guests added · +₹${game.fee * guests.length} total`}
                    </div>
                  </div>
                  <button
                    className={`bm-add-guest-btn ${!canAddGuest ? "disabled" : ""}`}
                    onClick={addGuest}
                    disabled={!canAddGuest}
                  >
                    + Add Guest
                  </button>
                </div>

                {guests.length > 0 && (
                  <div className="bm-guests-list">
                    {guests.map((guest, idx) => (
                      <GuestCard
                        key={idx}
                        index={idx}
                        guest={guest}
                        gameFee={game.fee}
                        onUpdate={(patch) => updateGuest(idx, patch)}
                        onRemove={() => removeGuest(idx)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Wallet summary */}
              <div className="wallet-summary">
                <div className="ws-left">
                  <div className="ws-label">
                    Total fee
                    {guests.length > 0 && (
                      <span style={{ color: "var(--muted,#666)", fontWeight: 400, marginLeft: "6px" }}>
                        (you + {guests.length} guest{guests.length > 1 ? "s" : ""})
                      </span>
                    )}
                  </div>
                  <div className="ws-fee">₹{totalFee}</div>
                  <div className="ws-balance">Wallet: ₹{walletBalance}</div>
                </div>
                <div className="ws-right">
                  <div className="ws-after">After payment</div>
                  <div className="ws-after-val" style={{ color: walletBalance - totalFee < 0 ? "#ff6b6b" : undefined }}>
                    ₹{walletBalance - totalFee}
                  </div>
                </div>
              </div>

              {!canAfford && (
                <p style={{ color: "#ff6b6b", fontSize: "12px", margin: "-4px 0 8px", textAlign: "center" }}>
                  Insufficient wallet balance for {1 + guests.length} player{guests.length > 0 ? "s" : ""}.
                </p>
              )}

              {guests.length > 0 && !allGuestsNamed && (
                <p style={{ color: "#ff6b6b", fontSize: "12px", margin: "-4px 0 8px", textAlign: "center" }}>
                  Please enter a name for each guest.
                </p>
              )}

              <button
                className="bm-confirm-btn"
                disabled={!canAfford || isLoading || !allGuestsNamed}
                onClick={handleConfirm}
              >
                <span>
                  {isLoading
                    ? "Processing..."
                    : isWaitlist
                    ? "Join Waitlist — No Charge Yet"
                    : `Confirm & Pay ₹${totalFee}`}
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="success-state show">
            <div className="success-icon">✓</div>
            <div className="success-title">You&apos;re In!</div>
            <div className="success-sub">
              {isWaitlist
                ? `You've joined the waitlist for ${venueName}.`
                : `Registered for ${venueName}. ₹${totalFee} deducted from your wallet.${guests.length > 0 ? ` ${guests.length} guest${guests.length > 1 ? "s" : ""} added.` : ""}`}
            </div>
            <button
              className="bm-confirm-btn"
              style={{ maxWidth: "240px", marginTop: "8px" }}
              onClick={closeAll}
            >
              <span>View My Games</span>
            </button>
          </div>
        )}
      </div>

      {notification && (
        <div className="notification-toast success">
          <div className="notification-content">
            <span className="notification-icon">✓</span>
            <span className="notification-text">
              Registered for {venueName}!{guests.length > 0 ? ` +${guests.length} guest${guests.length > 1 ? "s" : ""}` : ""}
            </span>
          </div>
        </div>
      )}
    </>
  );
}
