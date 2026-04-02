"use client";

import React, { useState, useEffect } from "react";

type BookingGame = {
  id?: string;
  _id?: string;
  venue: string;
  date: string;
  time: string;
  format: string;
  fee: number;
  spots: number;
  waitlist?: boolean;
};

interface BookingModalProps {
  game: BookingGame | null;
  onClose: () => void;
  onConfirm: (game: BookingGame, plusOne: boolean) => void;
  walletBalance: number;
}

export function BookingModal({ game, onClose, onConfirm, walletBalance }: BookingModalProps) {
  const [plusOne, setPlusOne] = useState(false);
  const [position, setPosition] = useState("DEF");
  const [preference, setPreference] = useState("No Preference");
  const [success, setSuccess] = useState(false);
  const [notification, setNotification] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  if (!game || !game.venue) return null;

  const totalFee = game.fee * (plusOne ? 2 : 1);
  const isWaitlist = game.waitlist;
  const canAfford = isWaitlist || walletBalance >= totalFee;

  // Extract venue and city from "venue,city" format
  const [venueName, venueCity] = game.venue.split(",").map(s => s.trim());

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      onConfirm(game, plusOne);
      // Wait a bit for the parent to process
      await new Promise(resolve => setTimeout(resolve, 500));
      setSuccess(true);
      setNotification(true);
      // Auto-hide notification after 4 seconds
      setTimeout(() => setNotification(false), 4000);
    } catch (error) {
      console.error("Registration error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const closeAll = () => {
    setSuccess(false);
    setPlusOne(false);
    setNotification(false);
    setIsLoading(false);
    onClose();
  };

  return (
    <>
      <div className={`overlay show`} onClick={closeAll}></div>
      <div className={`booking-modal show`}>
        {!success ? (
          <div id="bookingForm">
            <div className="bm-header">
              <div className="bm-title-group">
                <div className="bm-eyebrow">{isWaitlist ? "Join Waitlist" : "Game Sign-up"}</div>
                <div className="bm-title">
                  {venueName}
                  <br />
                  {venueCity || ""}
                </div>
              </div>
              <button className="bm-close" onClick={closeAll}>
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
              <div>
                <div className="bm-section-title">Your position</div>
                <div className="position-grid">
                  {["GK", "DEF", "MID", "FWD"].map((pos) => (
                    <button
                      key={pos}
                      className={`pos-opt ${position === pos ? "selected" : ""}`}
                      onClick={() => setPosition(pos)}
                    >
                      {pos}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="bm-section-title">Team preference</div>
                <div className="pref-row">
                  {["No Preference", "Same as friend", "Opposite to friend"].map((pref) => (
                    <button
                      key={pref}
                      className={`pref-opt ${preference === pref ? "selected" : ""}`}
                      onClick={() => setPreference(pref)}
                    >
                      {pref}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
                <div className="bm-section-title">Add +1</div>
                <div className="toggle-row">
                  <div>
                    <div className="toggle-label">Bring a guest</div>
                    <div className="toggle-sub">Adds ₹<span>{game.fee}</span> to total</div>
                  </div>
                  <button
                    className={`toggle-switch ${plusOne ? "on" : ""}`}
                    onClick={() => setPlusOne(!plusOne)}
                  ></button>
                </div>
              </div>
              <div className="wallet-summary">
                <div className="ws-left">
                  <div className="ws-label">Total fee</div>
                  <div className="ws-fee">₹{totalFee}</div>
                  <div className="ws-balance">Wallet: ₹{walletBalance}</div>
                </div>
                <div className="ws-right">
                  <div className="ws-after">After payment</div>
                  <div className="ws-after-val">₹{walletBalance - totalFee}</div>
                </div>
              </div>
              <button
                className="bm-confirm-btn"
                disabled={!canAfford || isLoading}
                onClick={handleConfirm}
              >
                <span>
                  {isLoading ? "Processing..." : isWaitlist ? "Join Waitlist — No Charge Yet" : `Confirm & Pay ₹${totalFee}`}
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
                ? `You've joined the waitlist for ${venueName}. You'll be notified immediately if a spot opens.`
                : `Successfully registered for ${venueName}. Your spot is confirmed and ₹${totalFee} has been deducted from your wallet.`}
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

      {/* Success Toast Notification */}
      {notification && (
        <div className="notification-toast success">
          <div className="notification-content">
            <span className="notification-icon">✓</span>
            <span className="notification-text">Successfully registered for {venueName}!</span>
          </div>
        </div>
      )}
    </>
  );
}
