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
import {
  describeFunding,
  formatRupees,
  SPOT_NOT_HELD_NOTE,
  KEEP_WALLET_FUNDED_NOTE,
} from "@/utils/walletFunding";

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
  /** The server's computed view of what a pass does to this game for this
   *  viewer. Only this can express a PARTIAL cover; `passEligible` is the old
   *  binary answer and is kept as the fallback. */
  passInfo?: {
    covered: boolean;
    passName: string | null;
    benefitPaise: number;
    payablePaise: number;
    partial?: boolean;
  } | null;
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
  /** Spendable wallet balance in RUPEES. Applied first, always. */
  walletBalance: number;
  playerPositions?: string[];
  playerId?: string;
  /** Who is already in this game, so the player can ask to play with or against them. */
  roster?: RosterEntry[];
  /**
   * How far through a wallet top-up this booking is, when one is happening.
   * 'booking' means the money is in the wallet and the booking is being
   * attempted — the sheet must not offer a way out of that.
   */
  paymentPhase?: "idle" | "topping-up" | "booking";
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
  paymentPhase = "idle",
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
  const passInfo      = game.passInfo || null;
  const passEligible  = passInfo ? passInfo.covered : Boolean(game.passEligible);
  // What the pass takes off the player's OWN seat. Guests are covered only when
  // the pass says so, and the server has already decided that — this is simply
  // the difference it quoted.
  const passBenefit   = passInfo ? Math.round(passInfo.benefitPaise / 100) : (passEligible ? game.fee : 0);
  // How many guests can be confirmed (fit in available spots after player takes 1)
  const spotsForGuests = isWaitlist ? 0 : Math.max(0, (game.spots ?? 0) - 1);
  // Guests beyond spotsForGuests go to waitlist
  const confirmedGuestCount = Math.min(guests.length, spotsForGuests);
  const waitlistGuestCount  = Math.max(0, guests.length - spotsForGuests);
  // What the player's own seat costs after the pass. Taken from the server's
  // quote rather than re-derived, so the number beside the button is the number
  // the debit will take.
  const playerFee = passInfo
    ? Math.round(passInfo.payablePaise / 100)
    : (passEligible ? 0 : game.fee);
  const totalFee  = playerFee + (game.fee * confirmedGuestCount);

  // How this booking gets paid for: from the wallet, topped up first if it is
  // short. Recomputed on every render, so adding a guest moves the numbers
  // immediately. Rupees in, rupees out; the engine works in paise, which is also
  // what the server debits in.
  const funding     = describeFunding(totalFee * 100, walletBalance * 100);
  const walletUsed  = funding.mode === "wallet" ? totalFee : Math.min(walletBalance, totalFee);
  const topUpNeeded = funding.topUpPaise / 100;
  const walletLeft  = walletBalance + topUpNeeded - totalFee;
  // A booking is never blocked on balance — a short wallet is a recharge to do
  // first, in the same action. The only thing that stops the button now is a
  // recharge already in flight.
  const busy = isLoading || paymentPhase !== "idle";
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
    // Once the money is in the wallet the booking is being attempted one way or
    // the other — closing the sheet would only hide it happening.
    if (paymentPhase === "booking") return;
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
                  ⏳ This game needs the organiser&apos;s approval to join. You&apos;ll pay{" "}
                  <b>₹{playerFee}</b> only once your request is approved — from your wallet, or by card if it
                  doesn&apos;t cover it. You can add guests after you&apos;re in.
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
                <InfoTip defaultOpen text="You will get a notification once a spot opens up. Register to confirm your spot">
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
                    <div className="ws-balance" style={{ color: "#888" }}>
                      Charged only when the organiser approves — from your wallet, or by card if it doesn&apos;t cover it · Wallet: ₹{walletBalance}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  {/* The payment breakdown. Replaces the old "after payment
                      ₹-172" and its blocking "Insufficient balance": a wallet
                      that does not cover the total is no longer a dead end, it
                      is just a smaller amount to pay. */}
                  <div className="wallet-summary bm-pay">
                    <div className="ws-left" style={{ width: "100%" }}>
                      <div className="ws-label">
                        Total fee
                        {guests.length > 0 && (
                          <span style={{ color: "var(--muted,#666)", fontWeight: 400, marginLeft: "6px" }}>
                            (you + {guests.length} guest{guests.length > 1 ? "s" : ""})
                          </span>
                        )}
                      </div>

                      {passEligible && totalFee === 0 ? (
                        <>
                          <div className="ws-fee" style={{ color: "#c8ff3e" }}>Free</div>
                          <div className="ws-balance" style={{ color: "#888" }}>
                            <s style={{ color: "#555" }}>₹{game.fee}</s> · Covered by {passInfo?.passName || "Pass"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="ws-fee">{formatRupees(totalFee * 100)}</div>

                          <div className="bm-pay-rows">
                            {/* An explicit line, never a silently lower total:
                                the fee, what the pass took off it, and what is
                                left to pay. */}
                            {passEligible && passBenefit > 0 && (
                              <>
                                <div className="bm-pay-row">
                                  <span>Game fee</span>
                                  <span>{formatRupees(game.fee * 100)}</span>
                                </div>
                                <div className="bm-pay-row">
                                  <span>{passInfo?.passName || "Pass"}</span>
                                  <span className="bm-pay-free">−{formatRupees(passBenefit * 100)}</span>
                                </div>
                              </>
                            )}
                            <div className="bm-pay-row">
                              <span>Wallet balance</span>
                              <span className="bm-pay-wallet">{formatRupees(walletBalance * 100)}</span>
                            </div>
                            <div className="bm-pay-row bm-pay-row--total">
                              <span>{topUpNeeded > 0 ? "Add to wallet" : "Paid from wallet"}</span>
                              <span>{formatRupees((topUpNeeded > 0 ? topUpNeeded : totalFee) * 100)}</span>
                            </div>
                          </div>

                          <div className="ws-balance" style={{ marginTop: 6 }}>
                            {walletUsed > 0 || topUpNeeded > 0
                              ? <>Left after booking: {formatRupees(Math.max(0, walletLeft) * 100)}</>
                              : <>Wallet: {formatRupees(walletBalance * 100)}</>}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Secondary. The recharge happens inside the booking, so this
                      is about the NEXT one being a single tap. */}
                  {topUpNeeded > 0 && playerId && (
                    <div className="bm-recharge-note">
                      <Link href="/dashboard/wallet" className="bm-recharge-link">Recharge wallet</Link>
                      <span>{KEEP_WALLET_FUNDED_NOTE}</span>
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
                    <Link href="/dashboard/profile" style={{ color: "#c8ff3e", textDecoration: "underline", fontWeight: 600 }}>
                      upload your profile photo
                    </Link>
                  ) : (
                    <strong>upload your profile photo</strong>
                  )}{" "}
                  first. A real photo is required to join games.
                </div>
              )}

              {/* Said before the recharge starts, never after. Adding money buys
                  wallet credit, not a seat — somebody else can take the last spot
                  while the payment window is open, and the money stays theirs. */}
              {!isWaitlist && !needsApproval && funding.needsTopUp && (
                <div className="bm-spot-note">{SPOT_NOT_HELD_NOTE}</div>
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

              {/* One button, and it always names what it will actually do: add
                  the difference when the wallet is short, spend the wallet when
                  it is not, and neither when there is nothing to pay.
                  `funding.actionLabel` comes from the same engine the server
                  prices with, so the two cannot disagree. */}
              <button className="bm-confirm-btn" disabled={busy} onClick={handleConfirm} type="button">
                <span>
                  {paymentPhase === "booking"
                    ? "Money added — confirming your spot..."
                    : paymentPhase === "topping-up"
                    ? "Waiting for payment..."
                    : isLoading
                    ? "Processing..."
                    : isWaitlist
                    ? "Join Waitlist — No Charge Yet"
                    : needsApproval
                    ? (playerFee > 0 ? `Request to Join — ₹${playerFee} on Approval` : "Request to Join")
                    : passEligible && totalFee === 0
                    ? "Confirm — Free (Pass Covered)"
                    : funding.actionLabel}
                </span>
              </button>

              {/* The money is in their wallet and the booking is being attempted.
                  Closing the sheet now would not stop anything, so it stops
                  offering. */}
              {paymentPhase === "booking" && (
                <div className="bm-spot-note" style={{ marginTop: 10 }}>
                  Money added to your wallet — confirming your spot. Please don&apos;t close this.
                </div>
              )}
            </div>
        </div>
      </div>
    </>
  );
}
