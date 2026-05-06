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

type RegisteredPlayer = { name: string; id?: string };

interface BookingModalProps {
  game: BookingGame | null;
  onClose: () => void;
  onConfirm: (
    game: BookingGame,
    guests: Guest[],
    teamPreference: string,
    willingIfFormatChange: boolean,
    playWith: string[],
    playAgainst: string[],
  ) => void;
  walletBalance: number;
  playerPositions?: string[];
  playerId?: string;
  registeredPlayers?: RegisteredPlayer[];
}

const POSITIONS = ["GK", "DEF", "MID", "FWD"] as const;
const POSITION_LABELS: Record<string, string> = {
  GK: "Goalkeeper",
  DEF: "Defender",
  MID: "Midfielder",
  FWD: "Forward",
  ANY: "Any Position",
};

const TEAM_OPTIONS = [
  { label: "No Preference", cls: "" },
  { label: "Red Team", cls: "pref-red" },
  { label: "Blue Team", cls: "pref-blue" },
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
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bm-guest-card ${expanded ? "expanded" : "collapsed"}`}>
      <div className="bm-guest-header">
        <button
          type="button"
          className="bm-guest-expand-btn"
          onClick={() => setExpanded((value) => !value)}
          aria-label={expanded ? "Collapse guest" : "Expand guest"}
        >
          <span className="bm-guest-label">
            {guest.name || `Guest ${index + 1}`}
          </span>
          {!expanded && (
            <span className="bm-guest-summary-pills">
              {guest.position !== "Any" && (
                <span className="bm-pill bm-pill-pos">{guest.position}</span>
              )}
              {guest.teamPreference !== "No Preference" && (
                <span className={`bm-pill ${guest.teamPreference === "Red Team" ? "bm-pill-red" : "bm-pill-blue"}`}>
                  {guest.teamPreference}
                </span>
              )}
            </span>
          )}
          <svg
            className={`bm-chevron ${expanded ? "up" : "down"}`}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        <button className="bm-guest-remove" type="button" onClick={onRemove} title="Remove guest">
          ✕
        </button>
      </div>

      {expanded && (
        <div className="bm-guest-fields">
          <div className="bm-guest-meta">
            <span className="bm-guest-fee">+₹{gameFee}</span>
          </div>

          <div className="bm-guest-row">
            <div className="bm-guest-row-label">Name</div>
            <input
              className="bm-guest-name-input"
              type="text"
              placeholder="Guest name"
              value={guest.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              maxLength={40}
            />
          </div>

          <div className="bm-guest-row">
            <div className="bm-guest-row-label">Position</div>
            <div className="bm-guest-positions">
              <button
                type="button"
                className={`bm-guest-pos ${guest.position === "Any" ? "selected" : ""}`}
                onClick={() => onUpdate({ position: "Any" })}
              >
                Any
              </button>
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`bm-guest-pos ${guest.position === pos ? "selected" : ""}`}
                  onClick={() => onUpdate({ position: pos })}
                  title={POSITION_LABELS[pos]}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="bm-guest-row">
            <div className="bm-guest-row-label">Team</div>
            <div className="bm-guest-teams">
              {TEAM_OPTIONS.map(({ label, cls }) => (
                <button
                  key={label}
                  type="button"
                  className={`bm-guest-team ${cls} ${guest.teamPreference === label ? "selected" : ""}`}
                  onClick={() => onUpdate({ teamPreference: label })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
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
  registeredPlayers = [],
}: BookingModalProps) {
  const [teamPreference, setTeamPreference] = useState<string>("No Preference");
  const [guests, setGuests] = useState<Guest[]>([]);
  const [willingIfFormatChange, setWillingIfFormatChange] = useState(true);
  const [playWith, setPlayWith] = useState<string[]>([]);
  const [playAgainst, setPlayAgainst] = useState<string[]>([]);
  const [success, setSuccess] = useState(false);
  const [notification, setNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);

  if (!game || !game.venue) return null;

  const totalFee = game.fee * (1 + guests.length);
  const isWaitlist = game.waitlist;
  const canAfford = isWaitlist || walletBalance >= totalFee;
  const canAddGuest = guests.length < MAX_GUESTS;

  const [venueName, venueCity] = game.venue.split(",").map((value) => value.trim());
  const hasPositions = playerPositions.length > 0;

  const addGuest = () => {
    if (!canAddGuest) return;
    const rawName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "";
    const firstName = rawName.trim().split(/\s+/)[0] || "Guest";
    const guestNumber = guests.length + 1;
    setGuests((previous) => [...previous, { name: `${firstName} + ${guestNumber}`, position: "Any", teamPreference: "No Preference" }]);
  };

  const removeGuest = (index: number) => {
    setGuests((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  };

  const updateGuest = (index: number, patch: Partial<Guest>) => {
    setGuests((previous) => previous.map((guest, currentIndex) => (currentIndex === index ? { ...guest, ...patch } : guest)));
  };

  const togglePref = (list: string[], setList: (v: string[]) => void, name: string) => {
    setList(list.includes(name) ? list.filter((n) => n !== name) : [...list, name]);
  };

  const handleConfirm = async () => {
    const hasPhoto = typeof window !== "undefined" && !!localStorage.getItem("userProfileImage");
    if (!hasPhoto) { setPhotoError(true); return; }
    setPhotoError(false);
    setIsLoading(true);
    try {
      onConfirm(game, guests, teamPreference, willingIfFormatChange, playWith, playAgainst);
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
    setWillingIfFormatChange(true);
    setPlayWith([]);
    setPlayAgainst([]);
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
            <div className="bm-header">
              <div className="bm-title-group">
                <div className="bm-eyebrow">{isWaitlist ? "Join Waitlist" : "Book"}</div>
                <div className="bm-title">
                  {venueName}
                  {venueCity ? (
                    <>
                      <br />
                      {venueCity}
                    </>
                  ) : null}
                </div>
              </div>
              <button className="bm-close" onClick={closeAll} type="button">
                ✕
              </button>
            </div>

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
              <div className="bm-pos-team-row">
                <div className="bm-pos-col">
                  <div className="bm-section-title">Your Position</div>
                  {hasPositions ? (
                    <>
                      <div className="bm-pos-badge">
                        <span className="bm-pos-badge-code">{playerPositions[0]}</span>
                        {POSITION_LABELS[playerPositions[0]] && playerPositions[0] !== "ANY" && (
                          <span className="bm-pos-badge-label">{POSITION_LABELS[playerPositions[0]]}</span>
                        )}
                      </div>
                      <p className="bm-pos-hint">
                        <span style={{ color: "var(--lime,#c4d56c)" }}>ⓘ</span>{" "}
                        {playerId ? (
                          <Link href={`/dashboard/player/${playerId}/profile`} style={{ color: "var(--lime,#c4d56c)", textDecoration: "underline" }}>
                            Update profile
                          </Link>
                        ) : "Update profile"} to change.
                      </p>
                    </>
                  ) : (
                    <p className="bm-pos-hint">
                      No position.{" "}
                      {playerId && (
                        <Link href={`/dashboard/player/${playerId}/profile`} style={{ color: "var(--lime,#c4d56c)", textDecoration: "underline" }}>
                          Add in profile
                        </Link>
                      )}
                    </p>
                  )}
                </div>

                <div className="bm-team-col">
                  <div className="bm-section-title">Your Team Preference</div>
                  <select
                    value={teamPreference}
                    onChange={(e) => setTeamPreference(e.target.value)}
                    className="bm-team-select"
                  >
                    <option value="No Preference">No Preference</option>
                    <option value="Red Team">Red Team</option>
                    <option value="Blue Team">Blue Team</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="bm-section-title">Format Changes</div>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", color: "var(--white)" }}>
                  <input
                    type="checkbox"
                    checked={willingIfFormatChange}
                    onChange={(e) => setWillingIfFormatChange(e.target.checked)}
                    style={{ marginTop: 4 }}
                  />
                  <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                    If the organiser changes the format, I&apos;m still willing to play.
                  </span>
                </label>
                <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--muted,#666)" }}>
                  This helps the organiser decide whether to switch format if numbers change.
                </p>
              </div>

              {registeredPlayers.length > 0 && (
                <div>
                  <div className="bm-section-title">Play With / Play Against</div>
                  <p style={{ margin: "0 0 10px", fontSize: 11, color: "var(--muted,#666)" }}>
                    Optional — tap a player to set a preference. These help the organiser balance teams.
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {registeredPlayers.map((p) => {
                      const withSelected    = playWith.includes(p.name);
                      const againstSelected = playAgainst.includes(p.name);
                      return (
                        <div key={p.id ?? p.name} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ flex: 1, fontSize: 13, color: "var(--white)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.name}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (againstSelected) togglePref(playAgainst, setPlayAgainst, p.name);
                              togglePref(playWith, setPlayWith, p.name);
                            }}
                            style={{
                              padding: "3px 10px",
                              fontSize: 11,
                              borderRadius: 20,
                              border: "1px solid",
                              cursor: "pointer",
                              background: withSelected ? "rgba(74,222,128,0.18)" : "transparent",
                              borderColor: withSelected ? "#4ade80" : "rgba(255,255,255,0.15)",
                              color: withSelected ? "#4ade80" : "#666",
                            }}
                          >
                            With
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (withSelected) togglePref(playWith, setPlayWith, p.name);
                              togglePref(playAgainst, setPlayAgainst, p.name);
                            }}
                            style={{
                              padding: "3px 10px",
                              fontSize: 11,
                              borderRadius: 20,
                              border: "1px solid",
                              cursor: "pointer",
                              background: againstSelected ? "rgba(248,113,113,0.18)" : "transparent",
                              borderColor: againstSelected ? "#f87171" : "rgba(255,255,255,0.15)",
                              color: againstSelected ? "#f87171" : "#666",
                            }}
                          >
                            Against
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                    type="button"
                  >
                    + Add Guest
                  </button>
                </div>

                {guests.length > 0 && (
                  <div className="bm-guests-list">
                    {guests.map((guest, index) => (
                      <GuestCard
                        key={index}
                        index={index}
                        guest={guest}
                        gameFee={game.fee}
                        onUpdate={(patch) => updateGuest(index, patch)}
                        onRemove={() => removeGuest(index)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {isWaitlist ? (
                <div className="wallet-summary" style={{ background: "rgba(200,255,62,0.06)", border: "1px solid rgba(200,255,62,0.2)" }}>
                  <div className="ws-left">
                    <div className="ws-label">Waitlist</div>
                    <div className="ws-fee" style={{ color: "#c8ff3e" }}>No charge</div>
                    <div className="ws-balance" style={{ color: "#888" }}>Payment only required when you claim a spot</div>
                  </div>
                </div>
              ) : (
                <>
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
                    <div style={{ color: "#ff6b6b", fontSize: "12px", margin: "-4px 0 8px", textAlign: "center" }}>
                      Insufficient balance.{" "}
                      {playerId && (
                        <Link
                          href={`/dashboard/player/${playerId}/wallet`}
                          style={{ color: "#c8ff3e", textDecoration: "underline", fontWeight: 600 }}
                        >
                          Recharge your wallet
                        </Link>
                      )}
                    </div>
                  )}
                </>
              )}

              {photoError && (
                <div style={{
                  background: "rgba(220,38,38,0.1)", border: "1px solid rgba(220,38,38,0.35)",
                  borderRadius: 8, padding: "10px 14px", fontSize: 12, color: "#f87171",
                  lineHeight: 1.5, textAlign: "center",
                }}>
                  📸 Please{" "}
                  {playerId ? (
                    <Link href={`/dashboard/player/${playerId}/profile`} style={{ color: "#c8ff3e", textDecoration: "underline", fontWeight: 600 }}>
                      upload your profile photo
                    </Link>
                  ) : (
                    <strong>upload your profile photo</strong>
                  )}{" "}
                  first. A real photo is required to join games.
                </div>
              )}

              <button className="bm-confirm-btn" disabled={!canAfford || isLoading} onClick={handleConfirm} type="button">
                <span>{isLoading ? "Processing..." : isWaitlist ? "Join Waitlist — No Charge Yet" : `Confirm & Pay ₹${totalFee}`}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="success-state show">
            <div className="success-icon">{isWaitlist ? "📋" : "✓"}</div>
            <div className="success-title">{isWaitlist ? "You're on the Waitlist!" : "You're In!"}</div>
            <div className="success-sub">
              {isWaitlist
                ? `You've joined the waitlist for ${venueName}.`
                : `Registered for ${venueName}. ₹${totalFee} deducted from your wallet.${guests.length > 0 ? ` ${guests.length} guest${guests.length > 1 ? "s" : ""} added.` : ""}`}
            </div>
            <button className="bm-confirm-btn" style={{ maxWidth: "240px", marginTop: "8px" }} onClick={closeAll} type="button">
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
