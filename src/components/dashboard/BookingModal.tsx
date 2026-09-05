"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  PreferenceDisclaimer,
  TeamRequestPicker,
  type RosterEntry,
  type TeamRequest,
} from "@/components/PlayPreferences";
import { InfoTip, InfoTipButton, InfoTipPanel } from "@/components/ui/InfoTip";

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
  passEligible?: boolean;
  requiresApproval?: boolean;
  /** This game charges for giving up a slot near kick-off (server's `backoutInfo.active`). */
  cancellationFeeApplies?: boolean;
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
  onConfirm: (
    game: BookingGame,
    guests: Guest[],
    teamPreference: string,
    willingIfFormatChange: boolean,
    waitlistGuests?: Guest[],
    teamRequests?: TeamRequest[],
  ) => Promise<void> | void;
  walletBalance: number;
  playerPositions?: string[];
  playerId?: string;
  /** Who is already in this game, so the player can ask to play with or against them. */
  roster?: RosterEntry[];
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

const MAX_GUESTS_HARD_CAP = 9; // absolute upper bound regardless of slot count

function GuestCard({
  index,
  guest,
  gameFee,
  onUpdate,
  onRemove,
  isWaitlisted,
}: {
  index: number;
  guest: Guest;
  gameFee: number;
  onUpdate: (g: Partial<Guest>) => void;
  onRemove: () => void;
  isWaitlisted?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasPrefs = guest.position !== "Any" || guest.teamPreference !== "No Preference";

  return (
    <div
      className={`bm-guest-card ${expanded ? "expanded" : "collapsed"}${isWaitlisted ? " bm-guest-card--waitlist" : ""}`}
      style={isWaitlisted ? { borderColor: "rgba(245,158,11,0.35)", background: "rgba(245,158,11,0.04)" } : undefined}
    >
      <div className="bm-guest-header" style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {/* Name input — always visible, editable immediately */}
        <input
          className="bm-guest-name-input"
          type="text"
          placeholder={`Guest ${index + 1}`}
          value={guest.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          maxLength={40}
          style={{ flex: 1, minWidth: 0 }}
          onClick={(e) => e.stopPropagation()}
        />

        {/* Waitlist badge */}
        {isWaitlisted && (
          <span style={{
            flexShrink: 0, fontSize: 9, fontWeight: 700, padding: "2px 6px",
            borderRadius: 4, background: "rgba(245,158,11,0.15)",
            color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)",
            letterSpacing: "0.06em", textTransform: "uppercase" as const,
          }}>WL</span>
        )}

        {/* Preference summary pills when collapsed */}
        {!expanded && hasPrefs && (
          <span className="bm-guest-summary-pills" style={{ flexShrink: 0 }}>
            {guest.position !== "Any" && (
              <span className="bm-pill bm-pill-pos">{guest.position}</span>
            )}
            {guest.teamPreference !== "No Preference" && (
              <span className={`bm-pill ${guest.teamPreference === "Red Team" ? "bm-pill-red" : "bm-pill-blue"}`}>
                {guest.teamPreference === "Red Team" ? "Red" : "Blue"}
              </span>
            )}
          </span>
        )}

        {/* Expand toggle — opens position + team prefs */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-label={expanded ? "Collapse preferences" : "Set position & team"}
          style={{ flexShrink: 0, background: "none", border: "none", padding: "2px 4px", cursor: "pointer", color: "var(--muted, #888)", display: "flex", alignItems: "center" }}
          title={expanded ? "Collapse" : "Set position & team preference"}
        >
          <svg
            className={`bm-chevron ${expanded ? "up" : "down"}`}
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Remove button */}
        <button
          className="bm-guest-remove"
          type="button"
          onClick={onRemove}
          title="Remove guest"
          style={{ flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Expanded: fee + position + team */}
      {expanded && (
        <div className="bm-guest-fields">
          <div className="bm-guest-meta">
            {isWaitlisted
              ? <span style={{ fontSize: 11, color: "#f59e0b", fontWeight: 600 }}>Waitlist — no charge until slot opens</span>
              : <span className="bm-guest-fee">+₹{gameFee}</span>
            }
          </div>

          <div className="bm-guest-row">
            <div className="bm-guest-row-label">Position</div>
            <div className="bm-guest-positions">
              <button
                type="button"
                className={`bm-guest-pos ${guest.position === "Any" ? "selected" : ""}`}
                onClick={() => onUpdate({ position: "Any" })}
              >Any</button>
              {POSITIONS.map((pos) => (
                <button
                  key={pos}
                  type="button"
                  className={`bm-guest-pos ${guest.position === pos ? "selected" : ""}`}
                  onClick={() => onUpdate({ position: pos })}
                  title={POSITION_LABELS[pos]}
                >{pos}</button>
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
                >{label}</button>
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
  roster = [],
}: BookingModalProps) {
  const [teamPreference, setTeamPreference] = useState<string>("No Preference");
  const [teamRequests, setTeamRequests] = useState<TeamRequest[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [willingIfFormatChange, setWillingIfFormatChange] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);

  if (!game || !game.venue) return null;

  const isWaitlist    = game.waitlist;
  // Approval-gated join: the player files a request the organiser must approve.
  // No charge now (charged on approval), and guests are added after approval.
  const needsApproval = !isWaitlist && Boolean(game.requiresApproval);
  const passEligible  = Boolean(game.passEligible);
  // How many guests can be confirmed (fit in available spots after player takes 1)
  const spotsForGuests = isWaitlist ? 0 : Math.max(0, (game.spots ?? 0) - 1);
  // Guests beyond spotsForGuests go to waitlist
  const confirmedGuestCount = Math.min(guests.length, spotsForGuests);
  const waitlistGuestCount  = Math.max(0, guests.length - spotsForGuests);
  // Player fee is 0 when pass eligible; guests always pay full fee
  const playerFee = passEligible ? 0 : game.fee;
  const totalFee  = playerFee + (game.fee * confirmedGuestCount);
  const canAfford = isWaitlist || walletBalance >= totalFee;
  const canAddGuest = guests.length < MAX_GUESTS_HARD_CAP;
  // Button switches label once confirmed slots are full
  const nextGuestIsWaitlist = !isWaitlist && guests.length >= spotsForGuests;

  const [venueName, venueCity] = game.venue.split(",").map((value) => value.trim());
  const hasPositions = playerPositions.length > 0;

  const addGuest = () => {
    if (!canAddGuest) return;
    const rawName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "";
    const firstName = rawName.trim().split(/\s+/)[0] || "Guest";
    const pattern = new RegExp(`^${firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\+ (\\d+)$`);
    setGuests((previous) => {
      const usedNums = previous.flatMap((g) => { const m = pattern.exec(g.name); return m ? [parseInt(m[1], 10)] : []; });
      const nextNum = usedNums.length > 0 ? Math.max(...usedNums) + 1 : 1;
      return [...previous, { name: `${firstName} + ${nextNum}`, position: "Any", teamPreference: "No Preference" }];
    });
  };

  const removeGuest = (index: number) => {
    const rawName = typeof window !== "undefined" ? localStorage.getItem("userName") || "" : "";
    const firstName = rawName.trim().split(/\s+/)[0] || "Guest";
    setGuests((previous) => {
      const filtered = previous.filter((_, i) => i !== index);
      // Renumber only auto-generated names; custom names are left unchanged
      const pattern = new RegExp(`^${firstName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\+ \\d+$`);
      let autoCounter = 0;
      return filtered.map((g) => {
        if (pattern.test(g.name)) return { ...g, name: `${firstName} + ${++autoCounter}` };
        return g;
      });
    });
  };

  const updateGuest = (index: number, patch: Partial<Guest>) => {
    setGuests((previous) => previous.map((guest, currentIndex) => (currentIndex === index ? { ...guest, ...patch } : guest)));
  };

  const handleConfirm = async () => {
    const hasPhoto = typeof window !== "undefined" && !!localStorage.getItem("userProfileImage");
    if (!hasPhoto) { setPhotoError(true); return; }
    setPhotoError(false);
    setIsLoading(true);
    try {
      const confirmedGuests = isWaitlist ? guests : guests.slice(0, spotsForGuests);
      const overflowGuests  = isWaitlist ? []     : guests.slice(spotsForGuests);
      await onConfirm(game, confirmedGuests, teamPreference, willingIfFormatChange, overflowGuests, teamRequests);
    } finally {
      setIsLoading(false);
    }
  };

  const closeAll = () => {
    setGuests([]);
    setWillingIfFormatChange(true);
    setIsLoading(false);
    onClose();
  };

  return (
    <>
      <div className="overlay show" onClick={closeAll} />

      <div className="booking-modal show">
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
              {/* ── Preferences accordion ── */}
              <div className="bm-prefs-accordion">
                <button
                  type="button"
                  className="bm-prefs-trigger"
                  onClick={() => setPrefsOpen((v) => !v)}
                  aria-expanded={prefsOpen}
                >
                  <span className="bm-prefs-label">Preferences</span>
                  <svg className={`bm-chevron ${prefsOpen ? "up" : "down"}`} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {prefsOpen && (
                  <div className="bm-prefs-panel">
                    {/* Position */}
                    <div className="bm-pref-row">
                      <div className="bm-pref-row-label">Position</div>
                      <div className="bm-pref-row-val">
                        <span className="bm-pref-chip bm-pref-chip--pos" style={{ fontSize: 12, padding: "3px 10px" }}>
                          {hasPositions ? playerPositions[0] : "ANY"}
                        </span>
                        <span className="bm-prefs-hint">
                          {playerId ? (
                            <Link href="/dashboard/profile" style={{ color: "var(--lime,#c4d56c)" }}>
                              Edit in profile →
                            </Link>
                          ) : "Set in profile"}
                        </span>
                      </div>
                    </div>

                    {/* Team preference */}
                    <div className="bm-pref-row">
                      <div className="bm-pref-row-label">Team</div>
                      <div className="bm-pref-row-val">
                        {(["No Preference", "Red Team", "Blue Team"] as const).map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setTeamPreference(opt)}
                            className={`bm-pref-opt${teamPreference === opt ? " selected" : ""}${opt === "Red Team" ? " bm-pref-opt--red" : opt === "Blue Team" ? " bm-pref-opt--blue" : ""}`}
                          >
                            {opt === "No Preference" ? "None" : opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Format change */}
                    <InfoTip text="Turf and team size may change based on player turnout">
                      <div>
                        <div className="bm-pref-row">
                          <div className="bm-pref-row-label" style={{ display: "flex", alignItems: "center", gap: 5, width: "auto" }}>
                            Format change
                            <InfoTipButton label="About format changes" />
                          </div>
                          <div className="bm-pref-row-val">
                            <button
                              type="button"
                              onClick={() => setWillingIfFormatChange(true)}
                              className={`bm-pref-opt${willingIfFormatChange ? " selected" : ""}`}
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setWillingIfFormatChange(false)}
                              className={`bm-pref-opt${!willingIfFormatChange ? " selected" : ""}`}
                            >
                              No
                            </button>
                          </div>
                        </div>
                        <InfoTipPanel style={{ marginTop: 6, padding: "7px 10px" }} />
                      </div>
                    </InfoTip>

                    {/* Who to line up with — only offered when the squad is visible */}
                    {roster.length > 0 && (
                      <div style={{ marginTop: 4 }}>
                        <TeamRequestPicker
                          roster={roster}
                          value={teamRequests}
                          onChange={setTeamRequests}
                        />
                      </div>
                    )}

                    <PreferenceDisclaimer />
                  </div>
                )}
              </div>

              {/* Pass banner */}
              {passEligible && !isWaitlist && (
                <div style={{
                  background: "rgba(200,255,62,0.07)",
                  border: "1px solid rgba(200,255,62,0.3)",
                  borderRadius: 10,
                  padding: "12px 14px",
                  marginBottom: 14,
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 16 }}>🎟️</span>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#c8ff3e" }}>
                      Your Pass is Active
                    </span>
                    <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: "#4ade80", background: "rgba(74,222,128,0.12)", border: "1px solid rgba(74,222,128,0.25)", borderRadius: 20, padding: "2px 8px" }}>
                      FREE
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#aaa", lineHeight: 1.6 }}>
                    Your entry fee{" "}
                    <span style={{ textDecoration: "line-through", color: "#666" }}>₹{game.fee}</span>
                    {" → "}
                    <strong style={{ color: "#c8ff3e" }}>₹0</strong> — covered by your pass.
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, color: "#666", lineHeight: 1.5, borderTop: "1px solid rgba(200,255,62,0.1)", paddingTop: 6 }}>
                    ⚠️ Pass applies to <strong style={{ color: "#aaa" }}>your slot only</strong>. Guests are not covered — each guest pays the full ₹{game.fee} entry fee.
                  </div>
                </div>
              )}

              {needsApproval && (
                <div style={{
                  background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.3)",
                  borderRadius: 10, padding: "11px 14px", marginBottom: 14, fontSize: 12.5, color: "#f59e0b", lineHeight: 1.6,
                }}>
                  ⏳ This game needs the organiser&apos;s approval to join. You&apos;ll be charged{" "}
                  <b>₹{playerFee}</b> only once your request is approved. You can add guests after you&apos;re in.
                </div>
              )}

              {!needsApproval && (
              <div className="bm-guests-section">
                <div className="bm-guests-header">
                  <div>
                    <div className="bm-section-title" style={{ marginBottom: "2px" }}>Bring Friends</div>
                    <div className="bm-guests-sub">
                      {guests.length === 0
                        ? spotsForGuests > 0 || isWaitlist
                          ? isWaitlist
                            ? `Add guests — no charge until a slot opens`
                            : `Add up to ${spotsForGuests} confirmed guest${spotsForGuests !== 1 ? "s" : ""} — each adds ₹${game.fee}`
                          : "Game is full — guests will join the waitlist"
                        : confirmedGuestCount > 0 && waitlistGuestCount > 0
                          ? `${confirmedGuestCount} confirmed · ${waitlistGuestCount} on waitlist · +₹${game.fee * confirmedGuestCount} now`
                          : waitlistGuestCount > 0
                            ? `${waitlistGuestCount} guest${waitlistGuestCount > 1 ? "s" : ""} on waitlist — no charge now`
                            : `${guests.length} guest${guests.length > 1 ? "s" : ""} added · +₹${game.fee * guests.length} total`}
                    </div>
                  </div>
                  <button
                    className={`bm-add-guest-btn ${!canAddGuest ? "disabled" : ""}${nextGuestIsWaitlist ? " bm-add-guest-btn--waitlist" : ""}`}
                    onClick={addGuest}
                    disabled={!canAddGuest}
                    type="button"
                    style={nextGuestIsWaitlist ? { color: "#f59e0b", borderColor: "rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.08)" } : undefined}
                  >
                    {nextGuestIsWaitlist ? "+ Add to Waitlist" : "+ Add Guest"}
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
                        isWaitlisted={!isWaitlist && index >= spotsForGuests}
                      />
                    ))}
                  </div>
                )}
              </div>
              )}

              {isWaitlist ? (
                <InfoTip text="You will get a notification once a spot opens up. Register to confirm your spot">
                  <div className="wallet-summary" style={{ background: "rgba(200,255,62,0.06)", border: "1px solid rgba(200,255,62,0.2)" }}>
                    <div className="ws-left">
                      <div className="ws-label">Waitlist</div>
                      <div className="ws-fee" style={{ color: "#c8ff3e", display: "flex", alignItems: "center", gap: 8 }}>
                        No charge
                        <InfoTipButton label="How the waitlist works" size={16} />
                      </div>
                      <div className="ws-balance" style={{ color: "#888" }}>Payment only required when you claim a spot</div>
                      <InfoTipPanel style={{ marginTop: 8, padding: "7px 10px" }} />
                    </div>
                  </div>
                </InfoTip>
              ) : needsApproval ? (
                <div className="wallet-summary" style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <div className="ws-left">
                    <div className="ws-label">On approval</div>
                    <div className="ws-fee" style={{ color: "#f59e0b" }}>{playerFee > 0 ? `₹${playerFee}` : "Free"}</div>
                    <div className="ws-balance" style={{ color: "#888" }}>Charged only when the organiser approves · Wallet: ₹{walletBalance}</div>
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
                      {passEligible && guests.length === 0 ? (
                        <>
                          <div className="ws-fee" style={{ color: "#c8ff3e" }}>Free</div>
                          <div className="ws-balance" style={{ color: "#888" }}>
                            <s style={{ color: "#555" }}>₹{game.fee}</s> · Covered by Pass
                          </div>
                        </>
                      ) : passEligible && guests.length > 0 ? (
                        <>
                          <div className="ws-fee">₹{totalFee}</div>
                          <div className="ws-balance" style={{ fontSize: 11, color: "#888" }}>
                            You: <span style={{ color: "#c8ff3e" }}>Free (Pass)</span>
                            {" · "}Guest{guests.length > 1 ? "s" : ""}: ₹{game.fee * confirmedGuestCount}
                            {" · "}Wallet: ₹{walletBalance}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ws-fee">₹{totalFee}</div>
                          <div className="ws-balance">Wallet: ₹{walletBalance}</div>
                        </>
                      )}
                    </div>
                    {totalFee > 0 && (
                      <div className="ws-right">
                        <div className="ws-after">After payment</div>
                        <div className="ws-after-val" style={{ color: walletBalance - totalFee < 0 ? "#ff6b6b" : undefined }}>
                          ₹{walletBalance - totalFee}
                        </div>
                      </div>
                    )}
                  </div>

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
                    <Link href="/dashboard/profile" style={{ color: "#c8ff3e", textDecoration: "underline", fontWeight: 600 }}>
                      upload your profile photo
                    </Link>
                  ) : (
                    <strong>upload your profile photo</strong>
                  )}{" "}
                  first. A real photo is required to join games.
                </div>
              )}

              {/* A join REQUEST is charged only on approval, but the player must already
                  hold the fee — otherwise an approved request could never be seated. So
                  we block the request (not just direct bookings) when balance is short. */}
              {!isWaitlist && !canAfford && (
                <div style={{ color: "#ff6b6b", fontSize: "12px", margin: "-4px 0 8px", textAlign: "center" }}>
                  Insufficient balance.{" "}
                  {playerId && (
                    <Link
                      href="/dashboard/wallet"
                      style={{ color: "#c8ff3e", textDecoration: "underline", fontWeight: 600 }}
                    >
                      Recharge your wallet
                    </Link>
                  )}
                  {needsApproval && " before requesting to join."}
                </div>
              )}

              {/* Said at the moment of commitment, not after. Deliberately a pointer
                  rather than the scale itself: what a departure costs depends on when
                  it happens, and the tiers are a table that belongs in the rules. */}
              {game.cancellationFeeApplies && (
                <div className="bm-cancel-note">
                  Cancellation charges apply to this game. See <strong>Game Rules</strong> in
                  View More Details before you book.
                </div>
              )}

              <button className="bm-confirm-btn" disabled={!canAfford || isLoading} onClick={handleConfirm} type="button">
                <span>
                  {isLoading
                    ? "Processing..."
                    : isWaitlist
                    ? "Join Waitlist — No Charge Yet"
                    : needsApproval
                    ? (playerFee > 0 ? `Request to Join — ₹${playerFee} on Approval` : "Request to Join")
                    : passEligible && totalFee === 0
                    ? "Confirm — Free (Pass Covered)"
                    : `Confirm & Pay ₹${totalFee}`}
                </span>
              </button>
            </div>
        </div>
      </div>
    </>
  );
}
