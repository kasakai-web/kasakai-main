"use client";

// The sheet that opens when a player taps Buy on a pass.
//
// It looks like the recharge sheet on purpose — same frame, same Terms box,
// same "Secured by Razorpay" — but the money goes to the PASS, not the wallet.
// The player pays exactly the pass price at Razorpay and nothing is read from
// or added to their balance. The only exception is said here before they pay:
// if the pass stops being buyable while they are paying, the payment lands in
// their wallet rather than being lost.

import React, { useState } from "react";
import { payForPass, type PassPaymentOutcome } from "@/utils/passCheckout";

export type PassCheckoutItem = {
  code: string;
  name: string;
  subtitle?: string;
  pricePaise: number;
  listPricePaise?: number;
  summary: string;
};

type Props = {
  item: PassCheckoutItem;
  /** Called exactly once, with what happened. */
  onDone: (outcome: PassPaymentOutcome) => void;
};

const rupees = (paise: number) => `₹${Math.round((paise || 0) / 100).toLocaleString("en-IN")}`;

export function PassCheckoutSheet({ item, onDone }: Props) {
  const [paying, setPaying] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (paying) return; // a payment window is open; nothing to cancel here
    onDone({ status: "cancelled" });
  };

  const submit = async () => {
    if (!termsAccepted) { setError("Please accept the Terms & Conditions to proceed."); return; }
    setError(null);
    setPaying(true);
    const outcome = await payForPass(item.code);

    // Closed the gateway window without paying — back to the sheet rather than
    // dropping them out of a purchase they were halfway through.
    if (outcome.status === "cancelled") { setPaying(false); return; }
    // Refused before any money moved and the shelf is still right: let them read why.
    if (outcome.status === "error" && !outcome.refresh) {
      setError(outcome.message);
      setPaying(false);
      return;
    }
    onDone(outcome);
  };

  return (
    <div
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.78)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1100, padding: 16,
      }}
      onClick={close}
    >
      <div
        style={{
          background: "#111", border: "1px solid #2a2a2a", borderRadius: 14,
          padding: "26px 24px", width: "100%", maxWidth: 420,
          maxHeight: "90vh", overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {paying ? (
          <div style={{ textAlign: "center", padding: "26px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#c8ff3e", marginBottom: 8 }}>
              Paying {rupees(item.pricePaise)} for {item.name}
            </div>
            <div style={{ fontSize: 12.5, color: "#888", lineHeight: 1.6 }}>
              Finish the payment in the Razorpay window. Your pass is issued as soon as
              it lands — don&apos;t close this page.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              Buy {item.name}
            </div>
            {item.subtitle && (
              <div style={{ fontSize: 12.5, color: "#777", lineHeight: 1.6 }}>{item.subtitle}</div>
            )}
            <div style={{ fontSize: 12.5, color: "#999", lineHeight: 1.6, margin: "8px 0 16px" }}>
              {item.summary}
            </div>

            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "linear-gradient(160deg, #141414, #0e0e0e)",
              border: "1px solid #1f1f1f", borderRadius: 12,
              padding: "14px 16px", marginBottom: 16,
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555" }}>
                You pay
              </span>
              <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                {item.listPricePaise && item.listPricePaise > item.pricePaise ? (
                  <s style={{ fontSize: 13, color: "#555" }}>{rupees(item.listPricePaise)}</s>
                ) : null}
                <span style={{ fontSize: 22, fontWeight: 900, color: "#c8ff3e", letterSpacing: "-0.5px" }}>
                  {rupees(item.pricePaise)}
                </span>
              </span>
            </div>

            {/* Said before the money moves, never after. */}
            <div style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.22)",
              borderRadius: 8, padding: "11px 14px", marginBottom: 14,
              fontSize: 11, color: "#c99a4a", lineHeight: 1.6,
            }}>
              Paid directly by card or UPI — your wallet balance isn&apos;t used. If this pass
              sells out or comes off sale while you&apos;re paying, the payment is added to your
              wallet instead.
            </div>

            <label style={{
              display: "flex", alignItems: "flex-start", gap: 10,
              cursor: "pointer", marginBottom: 14, padding: "11px 14px",
              background: termsAccepted ? "rgba(200,255,62,0.04)" : "rgba(255,255,255,0.02)",
              border: `1px solid ${termsAccepted ? "rgba(200,255,62,0.2)" : "#1f1f1f"}`,
              borderRadius: 8,
            }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => { setTermsAccepted(e.target.checked); setError(null); }}
                style={{ marginTop: 1, accentColor: "#c8ff3e", width: 15, height: 15, flexShrink: 0 }}
              />
              <span style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>
                I agree to the{" "}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e", textDecoration: "none" }}>Terms</a>,{" "}
                <a href="/refund-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e", textDecoration: "none" }}>Refund Policy</a>
                {" "}&amp;{" "}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e", textDecoration: "none" }}>Privacy Policy</a>
              </span>
            </label>

            {error && (
              <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12, lineHeight: 1.6 }}>{error}</div>
            )}

            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={close}
                style={{
                  flex: 1, background: "transparent", border: "1px solid #333",
                  color: "#888", borderRadius: 8, padding: "13px",
                  fontSize: 13, fontWeight: 600, cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                style={{
                  flex: 2, background: "#c8ff3e", color: "#000", border: "none",
                  borderRadius: 8, padding: "13px", fontSize: 13.5, fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Pay {rupees(item.pricePaise)}
              </button>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 12 }}>
              <span style={{ fontSize: 10, color: "#333" }}>🔒</span>
              <span style={{ fontSize: 10, color: "#333", letterSpacing: "0.04em" }}>
                256-bit SSL · Secured by Razorpay
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PassCheckoutSheet;
