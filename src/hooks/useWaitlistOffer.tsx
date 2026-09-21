"use client";

// "Those spots have just gone — join the waitlist?"
//
// The race this answers is the whole reason bookings are funded from the wallet:
// a player tops up, comes back, and somebody else has taken the last spot. Their
// money is safe — it is in their wallet, not spent on a seat that does not exist
// — so the only question left is what they want to do about the game.
//
// It is asked, never assumed. A waitlist place is a commitment to turn up if one
// frees, and joining someone to it because their payment was slow is a decision
// they did not make. The money is theirs either way, which is exactly what makes
// "Not now" a real option.
//
// The prompt is here, once, so the booking sheet and the invite page cannot
// offer different deals after the same race.

import React, { useCallback, useRef, useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";

export type WaitlistOffer = {
  gameId: string;
  /** What just happened, in the app's own words. */
  reason: string;
  /** "₹500 is in your wallet." — omitted when no money moved. */
  moneyNote?: string;
  /** Preferences to carry over, so the waitlist entry matches what they booked. */
  body?: Record<string, unknown>;
};

export type WaitlistResult = {
  joined: boolean;
  position?: number;
  error?: string;
};

export function useWaitlistOffer(): {
  offerWaitlist: (offer: WaitlistOffer) => Promise<WaitlistResult>;
  waitlistPrompt: React.ReactNode;
} {
  const [offer, setOffer] = useState<WaitlistOffer | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const resolverRef = useRef<((result: WaitlistResult) => void) | null>(null);

  const offerWaitlist = useCallback((next: WaitlistOffer) => {
    return new Promise<WaitlistResult>((resolve) => {
      resolverRef.current?.({ joined: false });
      resolverRef.current = resolve;
      setError(null);
      setBusy(false);
      setOffer(next);
    });
  }, []);

  const finish = useCallback((result: WaitlistResult) => {
    setOffer(null);
    setBusy(false);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(result);
  }, []);

  const join = useCallback(async () => {
    if (!offer || busy) return;
    const { token } = getSession();
    if (!token) { finish({ joined: false, error: "Please sign in again." }); return; }

    setBusy(true);
    setError(null);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${offer.gameId}/waitlist`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(offer.body || {}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        // The commonest refusal is "spots are still available" — somebody else
        // dropped out in the seconds since. Say so and leave the sheet open, so
        // they can close it and simply book.
        setError(data?.message || "Couldn't add you to the waitlist.");
        setBusy(false);
        return;
      }
      finish({ joined: true, position: data.waitlistPosition });
    } catch {
      setError("Couldn't reach the server. Please try again.");
      setBusy(false);
    }
  }, [offer, busy, finish]);

  const waitlistPrompt = offer ? (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1120, padding: 16,
      }}
      onClick={() => !busy && finish({ joined: false })}
    >
      <div
        style={{
          background: "#111", border: "1px solid #2a2a2a", borderRadius: 14,
          padding: "26px 24px", width: "100%", maxWidth: 380, textAlign: "center",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontSize: 38, marginBottom: 12 }}>⏳</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 8 }}>
          {offer.reason}
        </div>
        {offer.moneyNote && (
          <div style={{
            background: "rgba(74,222,128,0.08)", border: "1px solid rgba(74,222,128,0.28)",
            borderRadius: 8, padding: "10px 14px", marginBottom: 12,
            fontSize: 12.5, color: "#4ade80", fontWeight: 600, lineHeight: 1.6,
          }}>
            {offer.moneyNote}
          </div>
        )}
        <div style={{ fontSize: 12.5, color: "#888", lineHeight: 1.7, marginBottom: 16 }}>
          Join the waitlist and we&apos;ll tell you the moment a spot frees up. There&apos;s
          nothing to pay — you only pay if you take a spot.
        </div>

        {error && (
          <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>{error}</div>
        )}

        <div style={{ display: "flex", gap: 10 }}>
          <button
            type="button"
            disabled={busy}
            onClick={() => finish({ joined: false })}
            style={{
              flex: 1, background: "transparent", border: "1px solid #333",
              color: "#888", borderRadius: 8, padding: "12px",
              fontSize: 13, fontWeight: 600, cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            Not now
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={join}
            style={{
              flex: 2, background: busy ? "#333" : "#c8ff3e", color: busy ? "#777" : "#000",
              border: "none", borderRadius: 8, padding: "12px",
              fontSize: 13.5, fontWeight: 800, cursor: busy ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "Adding you…" : "Join waitlist"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { offerWaitlist, waitlistPrompt };
}
