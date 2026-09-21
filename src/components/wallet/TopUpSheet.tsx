"use client";

// The sheet that appears when a booking costs more than the wallet holds.
//
// It is an ordinary wallet recharge — the same order, the same verify, the same
// recharge offers — shown at the moment the player needs one, with the amount
// the booking is short by already chosen. Topping up MORE is offered on purpose:
// the ladder and the offer tiers are how a player ends up able to book the next
// game in one tap, and how a ₹500 recharge earns its bonus.
//
// What it must never do is suggest that recharging books anything. The money
// goes into the wallet; the booking is attempted afterwards and can still lose
// the race. That is said here, before the payment, in `SPOT_NOT_HELD_NOTE`.
//
// The sheet owns the payment and resolves with the outcome; `postWithTopUp`
// re-sends the booking when it resolves credited.

import React, { useEffect, useMemo, useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import {
  formatRupees,
  normaliseTopUp,
  SPOT_NOT_HELD_NOTE,
} from "@/utils/walletFunding";
import { payTopUp, type TopUpNeed, type TopUpOutcome } from "@/utils/walletTopup";
import {
  activeTiers,
  bonusForAmount,
  nextTierUpsell,
  INACTIVE_OFFER,
  type RechargeOffer,
} from "@/utils/rechargeOffer";

type Props = {
  need: TopUpNeed;
  /** Called exactly once, with what happened. */
  onDone: (outcome: TopUpOutcome) => void;
};

type Step = "amount" | "paying";

export function TopUpSheet({ need, onDone }: Props) {
  const minPaise = Math.max(need.topUpPaise || 0, need.minTopUpPaise || 1000);
  const suggestions = need.suggestions?.length ? need.suggestions : [minPaise];

  const [amountPaise, setAmountPaise] = useState(minPaise);
  const [customStr, setCustomStr] = useState("");
  const [step, setStep] = useState<Step>("amount");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<RechargeOffer>(INACTIVE_OFFER);

  // The live offer, already narrowed by the server to what THIS player can earn.
  // Decoration: a promo that cannot be read must never block a recharge.
  useEffect(() => {
    let alive = true;
    (async () => {
      const { token } = getSession();
      if (!token) return;
      try {
        const res = await fetch(buildApiUrl("/players/me/wallet/offer"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (alive) setOffer(data?.success && data.data?.active ? data.data : INACTIVE_OFFER);
      } catch {
        if (alive) setOffer(INACTIVE_OFFER);
      }
    })();
    return () => { alive = false; };
  }, []);

  const bonusPaise = useMemo(() => bonusForAmount(amountPaise, offer), [amountPaise, offer]);
  const upsell = useMemo(() => nextTierUpsell(amountPaise, offer), [amountPaise, offer]);
  const hasOffer = activeTiers(offer).length > 0;

  const pick = (paise: number) => {
    setAmountPaise(paise);
    setCustomStr("");
    setError(null);
  };

  const typeCustom = (value: string) => {
    const clean = value.replace(/[^\d]/g, "");
    setCustomStr(clean);
    setAmountPaise(clean ? Number(clean) * 100 : 0);
    setError(null);
  };

  const close = () => {
    if (step === "paying") return; // a payment window is open; nothing to cancel here
    onDone({ credited: false });
  };

  const submit = async () => {
    const checked = normaliseTopUp(amountPaise, minPaise);
    if (!checked.ok) { setError(checked.error); return; }
    if (!termsAccepted) { setError("Please accept the Terms & Conditions to proceed."); return; }

    setError(null);
    setStep("paying");
    const outcome = await payTopUp(checked.amountPaise);

    if (outcome.credited) { onDone(outcome); return; }
    if (outcome.error) { setError(outcome.error); setStep("amount"); return; }
    // Closed the gateway window without paying — back to the amount step rather
    // than dropping them out of a booking they were halfway through.
    setStep("amount");
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
        {step === "paying" ? (
          <div style={{ textAlign: "center", padding: "26px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>💳</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#c8ff3e", marginBottom: 8 }}>
              Adding {formatRupees(amountPaise)} to your wallet
            </div>
            <div style={{ fontSize: 12.5, color: "#888", lineHeight: 1.6 }}>
              Finish the payment in the Razorpay window. We&apos;ll add the money to your
              wallet and then try your booking — don&apos;t close this page.
            </div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#fff", marginBottom: 4 }}>
              Add money to book
            </div>
            <div style={{ fontSize: 12.5, color: "#777", lineHeight: 1.6, marginBottom: 16 }}>
              This booking costs {formatRupees(need.totalPaise)} and your wallet has{" "}
              {formatRupees(need.availablePaise)}.
            </div>

            {/* The shortfall, stated once and plainly — this is the number the
                first chip is set to, and the minimum anything else may be. */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "linear-gradient(160deg, #141414, #0e0e0e)",
              border: "1px solid #1f1f1f", borderRadius: 12,
              padding: "14px 16px", marginBottom: 16,
            }}>
              <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#555" }}>
                You need at least
              </span>
              <span style={{ fontSize: 22, fontWeight: 900, color: "#c8ff3e", letterSpacing: "-0.5px" }}>
                {formatRupees(minPaise)}
              </span>
            </div>

            {hasOffer && (
              <div style={{
                background: "rgba(74,222,128,0.07)",
                border: "1px solid rgba(74,222,128,0.28)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 14,
                fontSize: 11.5, color: "#4ade80", fontWeight: 600, lineHeight: 1.6,
              }}>
                🎁 Recharge offer live — add more now and the bonus is yours to spend on
                this game or the next.
              </div>
            )}

            {/* Amounts. The first is exactly what this booking needs; the rest are
                round numbers above it. Nothing below the need is offered. */}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
              {suggestions.map((paise) => {
                const chipBonus = bonusForAmount(paise, offer);
                const selected = !customStr && amountPaise === paise;
                return (
                  <button
                    key={paise}
                    type="button"
                    onClick={() => pick(paise)}
                    style={{
                      background: selected ? "rgba(200,255,62,0.15)" : "rgba(255,255,255,0.05)",
                      border: `1px solid ${selected ? "rgba(200,255,62,0.4)" : "#2a2a2a"}`,
                      color: selected ? "#c8ff3e" : "#aaa",
                      borderRadius: 6, padding: "8px 14px", fontSize: 13,
                      fontWeight: 700, cursor: "pointer", lineHeight: 1.3,
                    }}
                  >
                    {formatRupees(paise)}
                    {chipBonus > 0 && (
                      <span style={{ color: "#4ade80", fontSize: 11, fontWeight: 700 }}>
                        {" "}+{formatRupees(chipBonus)}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div style={{ position: "relative", marginBottom: 12 }}>
              <span style={{
                position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)",
                fontSize: 15, color: "#666", fontWeight: 700,
              }}>₹</span>
              <input
                inputMode="numeric"
                value={customStr}
                onChange={(e) => typeCustom(e.target.value)}
                placeholder="Other amount"
                style={{
                  width: "100%", background: "#0d0d0d", border: "1px solid #232323",
                  borderRadius: 8, padding: "12px 14px 12px 30px", color: "#fff",
                  fontSize: 15, fontWeight: 700, outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {bonusPaise > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 10, flexWrap: "wrap",
                background: "rgba(74,222,128,0.08)",
                border: "1px solid rgba(74,222,128,0.3)",
                borderRadius: 8, padding: "10px 14px", marginBottom: 10,
              }}>
                <span style={{ fontSize: 12.5, color: "#4ade80", fontWeight: 700 }}>
                  🎁 {formatRupees(bonusPaise)} bonus
                </span>
                <span style={{ fontSize: 12, color: "#888" }}>
                  {formatRupees(amountPaise + bonusPaise)} credited
                </span>
              </div>
            )}

            {upsell && (
              <button
                type="button"
                onClick={() => pick(upsell.atPaise)}
                style={{
                  width: "100%", textAlign: "left",
                  background: "rgba(200,255,62,0.06)",
                  border: "1px dashed rgba(200,255,62,0.35)",
                  borderRadius: 8, padding: "10px 14px", marginBottom: 10,
                  cursor: "pointer", color: "#c8ff3e", fontSize: 12.5, fontWeight: 600,
                }}
              >
                Add {formatRupees(upsell.addPaise)} more → get {formatRupees(upsell.bonusPaise)} bonus
                <span style={{ color: "#666", fontWeight: 500 }}> (tap to set {formatRupees(upsell.atPaise)})</span>
              </button>
            )}

            {/* Said before the money moves, never after. */}
            <div style={{
              background: "rgba(245,158,11,0.06)",
              border: "1px solid rgba(245,158,11,0.22)",
              borderRadius: 8, padding: "11px 14px", marginBottom: 14,
              fontSize: 11, color: "#c99a4a", lineHeight: 1.6,
            }}>
              {SPOT_NOT_HELD_NOTE}
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
                disabled={!amountPaise}
                style={{
                  flex: 2, background: amountPaise ? "#c8ff3e" : "#333",
                  color: amountPaise ? "#000" : "#777", border: "none",
                  borderRadius: 8, padding: "13px", fontSize: 13.5, fontWeight: 800,
                  cursor: amountPaise ? "pointer" : "not-allowed",
                }}
              >
                {amountPaise ? `Add ${formatRupees(amountPaise)} & book` : "Enter an amount"}
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

export default TopUpSheet;
