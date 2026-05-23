"use client";

import { useState, useEffect, useCallback, memo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Screening, TicketTier } from "./types";
import { createBookingOrder, verifyBookingPayment, fetchMyTickets } from "@/utils/screening-api";
import { ScreeningHeader } from "./ScreeningHeader";
import "@/components/screening/screening.css";

const HIGHLIGHTS = [
  { label: "Live Screen",      d: "M2 3h20v14H2zM8 21h8M12 17v4" },
  { label: "Food & Drinks",    d: "M18 8h1a4 4 0 010 8h-1M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8zM6 1v3M10 1v3M14 1v3" },
  { label: "Electric Crowd",   d: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" },
];

function buildThingsToKnow(s: Screening): { text: string; paths: string[]; warn?: boolean }[] {
  const items: { text: string; paths: string[]; warn?: boolean }[] = [];
  const globePaths = ["M12 2a10 10 0 100 20A10 10 0 0012 2zM2 12h20M12 2c-2.5 4-4 8-4 10s1.5 6 4 10M12 2c2.5 4 4 8 4 10s-1.5 6-4 10"];
  const clockPaths = ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M12 6v6l4 2"];
  const ticketPaths = ["M20 12V22H4V12", "M22 7H2v5h20V7z", "M12 7v15"];
  const personPaths = ["M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", "M12 11a4 4 0 100-8 4 4 0 000 8"];
  const housePaths = ["M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", "M9 22V12h6v10"];
  const heartPaths = ["M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"];
  const crossCircle = ["M12 2a10 10 0 100 20A10 10 0 0012 2z", "M4.93 4.93l14.14 14.14"];

  if (s.languages?.length) items.push({ text: s.languages.join(' & '), paths: globePaths });
  if (s.gatesOpenBefore && s.gatesOpenBefore > 0) items.push({ text: `Gates open ${s.gatesOpenBefore} min early`, paths: clockPaths });
  if (s.minAgePaid && s.minAgePaid > 0) items.push({ text: `${s.minAgePaid}+ ticket required`, paths: ticketPaths });
  if (s.minAgeEntry && s.minAgeEntry > 0) items.push({ text: `${s.minAgeEntry}+ entry only`, paths: personPaths });
  if (s.isIndoor === true)  items.push({ text: "Indoor venue",  paths: housePaths });
  if (s.isIndoor === false) items.push({ text: "Outdoor venue", paths: housePaths });
  if (s.isSeated === true)  items.push({ text: "Seated",             paths: heartPaths });
  if (s.isSeated === false) items.push({ text: "Standing",           paths: heartPaths });
  if (s.isSeated === null) items.push({ text: "Seated & Standing", paths: heartPaths });
  if (s.kidFriendly === false) items.push({ text: "No kids",      paths: crossCircle, warn: true });
  if (s.petFriendly === false) items.push({ text: "No pets",      paths: crossCircle, warn: true });
  if (s.kidFriendly === true)  items.push({ text: "Kids welcome", paths: globePaths });
  if (s.petFriendly === true)  items.push({ text: "Pets welcome", paths: globePaths });
  return items;
}

const TERMS = [
  "Please carry a valid ID proof along with you.",
  "No refunds on purchased tickets are possible, even in case of any rescheduling.",
  "Security procedures, including frisking remain the right of the management.",
  "No dangerous or potentially hazardous objects including but not limited to weapons, knives, guns, fireworks, helmets, laser devices, bottles, musical instruments will be allowed in the venue.",
  "The sponsors/performers/organizers are not responsible for any injury or damage occurring due to the event. Any claims would be settled in courts in Mumbai.",
  "People in an inebriated state may not be allowed entry.",
  "Organizers hold the right to deny late entry to the event.",
  "Venue rules apply.",
];

// ── Razorpay loader ────────────────────────────────────────────────────────
function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).Razorpay) {
      resolve(); return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment gateway."));
    document.body.appendChild(script);
  });
}

// ── Stepper ────────────────────────────────────────────────────────────────
const Stepper = memo(function Stepper({ value, onChange, max = 10 }: { value: number; onChange: (n: number) => void; max?: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
      <button
        className="sd-step-btn"
        style={{ borderRadius: "8px 0 0 8px" }}
        disabled={value === 0}
        onClick={() => onChange(Math.max(0, value - 1))}
      >−</button>
      <div className="sd-step-val" style={{ color: value > 0 ? "#c8f135" : "#444" }}>{value}</div>
      <button
        className="sd-step-btn"
        style={{ borderRadius: "0 8px 8px 0" }}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >+</button>
    </div>
  );
});

// ── Tier row ───────────────────────────────────────────────────────────────
const TierRow = memo(function TierRow({ tier, qty, onChange }: { tier: TicketTier; qty: number; onChange: (n: number) => void }) {
  const avail     = tier.available ?? 999;
  const soldOut   = avail <= 0;
  const remaining = avail - qty;          // decreases as user picks tickets
  const scarce    = !soldOut && remaining > 0 && remaining < 5;
  const max       = Math.min(avail, 10);
  const isActive  = qty > 0 && !soldOut;

  return (
    <div className={soldOut ? "sd-tier-sold" : isActive ? "sd-tier active" : "sd-tier"}>

      {/* Name + qty badge */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", marginBottom: tier.description ? "6px" : "12px" }}>
        <span style={{ fontSize: "14px", fontWeight: 800, color: soldOut ? "#555" : isActive ? "#f0f0f0" : "#c0c0c0", lineHeight: 1.3, letterSpacing: "-0.01em" }}>
          {tier.name}
        </span>
        {isActive && (
          <span style={{ fontSize: "8px", fontWeight: 900, color: "#c8f135", background: "rgba(200,241,53,.12)", border: "1px solid rgba(200,241,53,.28)", padding: "2px 8px", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase", flexShrink: 0, marginTop: "2px" }}>
            ×{qty}
          </span>
        )}
      </div>

      {/* Description */}
      {tier.description && (
        <p style={{ margin: "0 0 12px", fontSize: "11.5px", color: soldOut ? "#1a1a1a" : "#888", lineHeight: 1.65 }}>
          {tier.description}
        </p>
      )}

      {/* Price + stepper row — always on the same line */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "5px" }}>
            <span style={{ fontSize: "21px", fontWeight: 900, color: soldOut ? "#222" : "#c8f135", lineHeight: 1 }}>
              {tier.price === 0 ? "Free" : `₹${tier.price.toLocaleString()}`}
            </span>
            {tier.price > 0 && !soldOut && (
              <span style={{ fontSize: "10px", color: "#888", fontWeight: 600 }}>/ person</span>
            )}
          </div>
          {scarce && (
            <div style={{ marginTop: "5px" }}>
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#d97706", background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.22)", padding: "2px 9px", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                Only {remaining} left
              </span>
            </div>
          )}
          {soldOut && (
            <div style={{ marginTop: "5px" }}>
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#ef4444", background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.25)", padding: "2px 9px", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                Sold out
              </span>
            </div>
          )}
        </div>

        {soldOut ? (
          <div style={{ padding: "8px 14px", background: "#0e0e0e", border: "1px solid #2a2a2a", borderRadius: "8px", fontSize: "9px", fontWeight: 900, color: "#555", letterSpacing: ".12em", textTransform: "uppercase", flexShrink: 0 }}>
            Sold Out
          </div>
        ) : (
          <Stepper value={qty} onChange={onChange} max={max} />
        )}
      </div>
    </div>
  );
});

// ── Booking widget ─────────────────────────────────────────────────────────
const BookingWidget = memo(function BookingWidget({
  screening, quantities, onChange, isLoggedIn, existingCode,
}: {
  screening: Screening;
  quantities: Record<string, number>;
  onChange: (id: string, n: number) => void;
  isLoggedIn: boolean;
  existingCode?: string | null;
}) {
  const router = useRouter();
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [confirmedCode, setConfirmedCode] = useState<string | null>(null);

  const totalQty = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalAmt = screening.tiers.reduce((s, t) => s + (quantities[t.id] ?? 0) * t.price, 0);
  const hasTickets = totalQty > 0;

  type RzpConstructor = new (options: unknown) => { open: () => void };

  const handleBook = async () => {
    if (!isLoggedIn) { router.push(`/screening/login?redirect=/screening/${screening.id}`); return; }
    if (!hasTickets || loading) return;
    setLoading(true);
    setError(null);
    try {
      const tierQuantities: Record<string, number> = {};
      for (const t of screening.tiers) {
        const q = quantities[t.id] ?? 0;
        if (q > 0) tierQuantities[t.id] = q;
      }
      const order = await createBookingOrder(screening.id, tierQuantities);

      if (order.isFree) {
        setConfirmedCode(order.entryCode);
        setLoading(false);
        return;
      }

      await loadRazorpay();

      let paymentDismissed = false;
      await new Promise<void>((resolve, reject) => {
        const RzpClass = (window as unknown as { Razorpay: RzpConstructor }).Razorpay;
        new RzpClass({
          key:         order.keyId,
          amount:      order.amount,
          currency:    "INR",
          name:        "Kasa Kai Screening",
          description: screening.matchTitle,
          order_id:    order.orderId,
          theme:       { color: "#c8f135" },
          handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
            try {
              const ticket = await verifyBookingPayment({
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              setConfirmedCode(ticket.entryCode);
              resolve();
            } catch (e) { reject(e); }
          },
          modal: { ondismiss: () => { paymentDismissed = true; setLoading(false); resolve(); } },
        }).open();
      });
      if (paymentDismissed) {
        setError("Payment not completed. Your tickets are still available — try again when ready.");
        setTimeout(() => setError(null), 5000);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Just completed a booking in this session → show full confirmation screen
  if (confirmedCode) {
    return (
      <div className="sd-confirmed">
        <div className="sd-widget-lime" />
        <div style={{ padding: "28px 22px", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "rgba(200,241,53,.08)", border: "1.5px solid rgba(200,241,53,.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px", boxShadow: "0 0 28px rgba(200,241,53,.08)" }}>
            <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 13l4 4L19 7"/>
            </svg>
          </div>
          <p style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", letterSpacing: ".28em", textTransform: "uppercase", marginBottom: "8px" }}>Booking Confirmed</p>
          <h3 style={{ fontSize: "20px", fontWeight: 900, color: "#e8e8e8", margin: "0 0 6px" }}>You&apos;re all set!</h3>
          <p style={{ fontSize: "12px", color: "#777", lineHeight: 1.65, margin: "0 0 20px" }}>Show this code at the venue entrance.</p>

          <div className="sd-code-box">
            <p style={{ fontSize: "9px", fontWeight: 900, color: "#666", letterSpacing: ".22em", textTransform: "uppercase", marginBottom: "8px" }}>Entry Code</p>
            <p className="sd-code-val">{confirmedCode}</p>
          </div>

          {totalAmt > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", padding: "11px 14px", background: "#0e0e0e", border: "1px solid #181818", borderRadius: "8px" }}>
              <span style={{ fontSize: "11px", color: "#888", fontWeight: 700 }}>{totalQty} ticket{totalQty > 1 ? "s" : ""}</span>
              <span style={{ fontSize: "16px", fontWeight: 900, color: "#e8e8e8" }}>₹{totalAmt.toLocaleString()}</span>
            </div>
          )}

          <Link
            href="/screening"
            className="no-underline"
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "44px", background: "transparent", color: "#666", border: "1px solid #2a2a2a", borderRadius: "8px", fontSize: "11px", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase", transition: "border-color .15s,color .15s" }}
            onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#3a3a3a"; el.style.color = "#999"; }}
            onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#2a2a2a"; el.style.color = "#666"; }}
          >
            Browse More Events
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="sd-widget">
      <div className="sd-widget-lime" />
      <div className="sd-widget-body">

        {/* Existing booking banner — shown when user already has a ticket */}
        {existingCode && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "10px 13px", marginBottom: "14px",
            background: "rgba(200,241,53,0.05)", border: "1px solid rgba(200,241,53,0.18)",
            borderRadius: "8px",
          }}>
            <div>
              <p style={{ fontSize: "8px", fontWeight: 900, color: "#9ab828", textTransform: "uppercase", letterSpacing: ".2em", margin: "0 0 3px" }}>Active Booking</p>
              <p style={{ fontSize: "13px", fontWeight: 900, color: "#c8f135", letterSpacing: ".18em", margin: 0 }}>{existingCode}</p>
            </div>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(200,241,53,0.5)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5"/>
            </svg>
          </div>
        )}

        <div style={{ marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
            <p style={{ fontSize: "10px", fontWeight: 900, color: "#c8f135", letterSpacing: ".22em", textTransform: "uppercase", margin: 0 }}>
              {existingCode ? "Add More Tickets" : "Select Tickets"}
            </p>
            <p style={{ fontSize: "11px", color: "#777", margin: 0, fontWeight: 700, flexShrink: 0 }}>
              from <span style={{ color: "#c8f135", fontWeight: 900 }}>{screening.startingPrice === 0 ? "Free" : `₹${screening.startingPrice.toLocaleString()}`}</span>
            </p>
          </div>
          <div style={{ height: "1px", background: "#151515", margin: "12px 0 0" }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "18px" }}>
          {screening.tiers.map((t) => (
            <TierRow key={t.id} tier={t} qty={quantities[t.id] ?? 0} onChange={(n) => onChange(t.id, n)} />
          ))}
        </div>

        <div style={{ borderTop: "1px solid #141414", margin: "0 0 14px" }} />

        {error && (
          <div style={{ marginBottom: "12px", padding: "9px 12px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", fontSize: "11px", color: "#ef4444", fontWeight: 600 }}>
            {error}
          </div>
        )}

        {/* Already booked + no new tickets selected → show Booked state */}
        {existingCode && !hasTickets ? (
          <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "rgba(200,241,53,0.05)", border: "1px solid rgba(200,241,53,0.18)", borderRadius: "10px" }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(200,241,53,0.08)", border: "1.5px solid rgba(200,241,53,0.25)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2.5" strokeLinecap="round">
                <path d="M5 13l4 4L19 7"/>
              </svg>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: "9px", fontWeight: 900, color: "#9ab828", textTransform: "uppercase", letterSpacing: ".22em", margin: "0 0 3px" }}>Booked</p>
              <p style={{ fontSize: "11px", color: "#888", margin: 0, lineHeight: 1.5 }}>You have a ticket. Select more above to add slots.</p>
            </div>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: "16px" }}>
              <p style={{ fontSize: "9px", fontWeight: 900, color: hasTickets ? "#777" : "#666", letterSpacing: ".18em", textTransform: "uppercase", marginBottom: "4px" }}>
                {hasTickets ? `${totalQty} ticket${totalQty > 1 ? "s" : ""}` : "No tickets selected"}
              </p>
              <p style={{ fontSize: "22px", fontWeight: 900, lineHeight: 1, color: hasTickets ? "#e8e8e8" : "#666", margin: 0 }}>
                {hasTickets ? `₹${totalAmt.toLocaleString()}` : "—"}
              </p>
            </div>

            <button onClick={handleBook} disabled={loading} className={`sd-cta ${loading ? "inactive" : (hasTickets || !isLoggedIn) ? "lime" : "hint"}`}>
              {loading ? (
                <><svg className="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity=".25"/><path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/></svg> Processing…</>
              ) : isLoggedIn ? (
                hasTickets
                  ? <>{existingCode ? "Book More Tickets" : "Confirm Booking"} <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg></>
                  : "Select tickets above"
              ) : (
                <><svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3"/></svg> Login to Book</>
              )}
            </button>

            <div className="sd-trust">
              {[
                { d: "M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z", l: "Verified" },
                { d: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z", l: "Secure" },
                { d: "M13 10V3L4 14h7v7l9-11h-7z", l: "Instant" },
              ].map(({ d, l }) => (
                <div key={l} className="sd-trust-item">
                  <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="rgba(200,241,53,.45)" strokeWidth="2" strokeLinecap="round"><path d={d}/></svg>
                  <span className="sd-trust-label">{l}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
});

// ── Cancelled widget ───────────────────────────────────────────────────────
const CancelledWidget = memo(function CancelledWidget() {
  return (
    <div className="sd-widget" style={{ border: "1px solid rgba(239,68,68,0.18)" }}>
      <div style={{ height: 3, background: "linear-gradient(90deg, #ef4444, #7f1d1d)", borderRadius: "4px 4px 0 0" }} />
      <div className="sd-widget-body" style={{ textAlign: "center", padding: "32px 22px" }}>
        <div style={{ width: 56, height: 56, borderRadius: "50%", background: "rgba(239,68,68,0.08)", border: "1.5px solid rgba(239,68,68,0.22)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 18px" }}>
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </div>
        <p style={{ fontSize: "9px", fontWeight: 900, color: "#ef4444", letterSpacing: ".28em", textTransform: "uppercase", marginBottom: "8px" }}>Event Cancelled</p>
        <h3 style={{ fontSize: "18px", fontWeight: 900, color: "#e8e8e8", margin: "0 0 10px" }}>This event has been cancelled</h3>
        <p style={{ fontSize: "12px", color: "#777", lineHeight: 1.7, margin: "0 0 22px" }}>
          Tickets are no longer available. If you had a booking, a refund will be processed automatically.
        </p>
        <Link
          href="/screening"
          className="no-underline"
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", height: "44px", background: "transparent", color: "#666", border: "1px solid #2a2a2a", borderRadius: "8px", fontSize: "11px", fontWeight: 800, letterSpacing: ".12em", textTransform: "uppercase" }}
          onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#3a3a3a"; el.style.color = "#999"; }}
          onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = "#2a2a2a"; el.style.color = "#666"; }}
        >
          Browse Other Events
        </Link>
      </div>
    </div>
  );
});

// ── Section header ─────────────────────────────────────────────────────────
const SH = memo(function SH({ children }: { children: React.ReactNode }) {
  return (
    <div className="sd-section-head">
      <div className="sd-section-bar" />
      <h2 className="sd-section-label">{children}</h2>
    </div>
  );
});

// ── Terms & Conditions Modal ───────────────────────────────────────────────
function TCModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="sd-tc-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="sd-tc-modal">

        <div className="sd-tc-header">
          <div>
            <p style={{ fontSize: "9px", fontWeight: 900, color: "#777", letterSpacing: ".22em", textTransform: "uppercase", marginBottom: "4px" }}>Event Policy</p>
            <h3 style={{ fontSize: "17px", fontWeight: 900, color: "#e8e8e8", margin: 0 }}>Terms &amp; Conditions</h3>
          </div>
          <button className="sd-tc-close" onClick={onClose}>
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#666" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="sd-tc-body scr-scroll">
          <ul className="sd-terms-list">
            {TERMS.map((t, i) => (
              <li key={i} className="sd-terms-item">
                <span className="sd-terms-num">{String(i + 1).padStart(2, "0")}</span>
                <span className="sd-terms-text">{t}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="sd-tc-footer">
          <button className="sd-tc-ok" onClick={onClose}>Got It</button>
        </div>

      </div>
    </div>
  );
}

// ── 404 ────────────────────────────────────────────────────────────────────
function NotFound() {
  return (
    <div className="sd-not-found">
      <div style={{ width: 64, height: 64, border: "1px solid #1c1c1c", borderRadius: "14px", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#2e2e2e" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M15 9l-6 6M9 9l6 6"/>
        </svg>
      </div>
      <div>
        <h1 style={{ fontSize: "22px", fontWeight: 900, color: "#e8e8e8", marginBottom: "8px" }}>Event not found</h1>
        <p style={{ color: "#444", fontSize: "13px", lineHeight: 1.6 }}>This screening may have ended or the link is incorrect.</p>
      </div>
      <Link href="/screening" className="no-underline" style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 26px", background: "#c8f135", color: "#000", fontSize: "11px", fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", borderRadius: "8px" }}>
        ← Browse Screenings
      </Link>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────
export function ScreeningDetailClient({ screening }: { screening: Screening | null }) {
  const [isLoggedIn,   setIsLoggedIn]   = useState(false);
  const [quantities,   setQuantities]   = useState<Record<string, number>>({});
  const [tcModalOpen,  setTcModalOpen]  = useState(false);
  const [existingCode, setExistingCode] = useState<string | null>(null);
  const [notifToast,   setNotifToast]   = useState<{ title: string; body: string } | null>(null);
  const [heroImgErr,   setHeroImgErr]   = useState(false);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail as { type: string; title: string; body: string };
      if (data?.type !== "screening_booked") return;
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      setNotifToast({ title: data.title, body: data.body });
      toastTimerRef.current = setTimeout(() => setNotifToast(null), 6000);
    };
    window.addEventListener("kk-new-notification", handler);
    return () => {
      window.removeEventListener("kk-new-notification", handler);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setIsLoggedIn(!!localStorage.getItem("authToken"));
    const h = () => setIsLoggedIn(!!localStorage.getItem("authToken"));
    window.addEventListener("kk-auth-changed", h);
    return () => window.removeEventListener("kk-auth-changed", h);
  }, []);

  // Check if user already has a confirmed ticket for this event
  useEffect(() => {
    if (!isLoggedIn) { setExistingCode(null); return; }
    fetchMyTickets()
      .then(data => {
        const match = data.confirmed.find(t => t.event?._id === screening?.id);
        if (match) setExistingCode(match.entryCode);
      })
      .catch(() => {});
  }, [isLoggedIn, screening?.id]);

  const setQty = useCallback((id: string, n: number) =>
    setQuantities((p) => ({ ...p, [id]: n })), []);

  if (!screening) return <NotFound />;

  return (
    <div className="sd-page">

      <ScreeningHeader isLoggedIn={isLoggedIn} />

      {/* ── Hero ── */}
      <div className="sd-hero" style={{ position: "relative" }}>
        {!heroImgErr && screening.image ? (
          <>
            {/* Blurred background fill */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screening.image}
              alt=""
              aria-hidden="true"
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", filter: "blur(28px) brightness(0.22) saturate(0.5)", transform: "scale(1.12)", pointerEvents: "none" }}
            />
            {/* Contained poster */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screening.image}
              alt={screening.matchTitle}
              onError={() => setHeroImgErr(true)}
              style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", maxHeight: "86%", maxWidth: "62%", objectFit: "contain", filter: "drop-shadow(0 12px 48px rgba(0,0,0,0.9))", borderRadius: "4px" }}
            />
          </>
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, background: "linear-gradient(160deg, #0d0d1a 0%, #090910 100%)" }}>
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1" y="1" width="22" height="15" rx="2" stroke="#1e2240" strokeWidth="1.5" fill="#0c0c1a"/>
              <path d="M12 16v3" stroke="#1e2240" strokeWidth="1.5"/>
              <path d="M8 21h8" stroke="#1e2240" strokeWidth="1.5"/>
              <line x1="3" y1="7" x2="21" y2="7" stroke="#12122a" strokeWidth="0.75"/>
              <line x1="3" y1="11" x2="21" y2="11" stroke="#12122a" strokeWidth="0.75"/>
              <circle cx="12" cy="8.5" r="4" stroke="#1e2240" strokeWidth="1" fill="#10102a"/>
              <polygon points="10.5,6.5 10.5,10.5 14.5,8.5" fill="#1e2240"/>
            </svg>
            <span style={{ fontSize: "10px", fontWeight: 800, color: "#1e2240", letterSpacing: "0.2em", textTransform: "uppercase" }}>No Preview Available</span>
          </div>
        )}
        <div className="sd-hero-grad" />
        <div className="sd-hero-grad-l" />

        <div className="sd-hero-top">
          <Link href="/screening" className="sd-back-pill">
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M19 12H5M12 5l-7 7 7 7"/>
            </svg>
            All Screenings
          </Link>
        </div>

        <div className="sd-hero-bottom">
          {screening.status === 'cancelled' ? (
            <div className="sd-live-badge" style={{ background: "rgba(239,68,68,0.15)", borderColor: "rgba(239,68,68,0.35)" }}>
              <svg width="8" height="8" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="3" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#ef4444", letterSpacing: ".22em", textTransform: "uppercase" }}>Event Cancelled</span>
            </div>
          ) : (
            <div className="sd-live-badge">
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#ef4444", display: "inline-block", animation: "sd-blink 2s infinite" }} />
              <span style={{ fontSize: "9px", fontWeight: 900, color: "#f87171", letterSpacing: ".22em", textTransform: "uppercase" }}>Live Event</span>
            </div>
          )}
          <h1 className="sd-hero-title">{screening.matchTitle}</h1>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="sd-wrap" style={{ paddingTop: 0 }}>

        {/* Info strip */}
        <div className="sd-strip">
          {[
            {
              icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
              text: `${screening.day}, ${screening.date}`,
            },
            {
              icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>,
              text: screening.time,
            },
            {
              icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>,
              text: `${screening.venueName}, ${screening.location}`,
            },
            {
              icon: <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#888" strokeWidth="2" strokeLinecap="round"><path d="M20 12V22H4V12"/><path d="M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>,
              text: `from ₹${screening.startingPrice}`,
            },
          ].map(({ icon, text }, i) => (
            <div key={i} className="sd-chip">
              {icon}
              <span className="sd-chip-text">{text}</span>
            </div>
          ))}
        </div>

        {/* Two-column grid */}
        <div className="sd-grid">

          {/* ── Left column ── */}
          <div className="sd-content">

            {/* About */}
            <div className="sd-section">
              <SH>About This Event</SH>
              <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.85, margin: 0 }}>
                {screening.description}
              </p>
            </div>

            {/* Organised By — shown only when admin enables showOrganiser */}
            {screening.showOrganiser && screening.contacts.length > 0 && (
              <div className="sd-section">
                <SH>Organised By</SH>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {screening.contacts.map((c, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: "14px", padding: "14px 16px", background: "#0c0c0c", border: "1px solid #1e1e1e", borderRadius: "12px" }}>
                      <div style={{ width: 38, height: 38, borderRadius: "10px", background: "rgba(200,241,53,0.07)", border: "1px solid rgba(200,241,53,0.18)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
                        </svg>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {c.name && <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 800, color: "#d0d0d0" }}>{c.name}</p>}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#888", textDecoration: "none", marginBottom: c.email ? "3px" : 0, transition: "color 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#c8f135")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#888")}>
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 8.63a19.79 19.79 0 01-3.07-8.64A2 2 0 012 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14z"/></svg>
                            {c.phone}
                          </a>
                        )}
                        {c.email && (
                          <a href={`mailto:${c.email}`} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#888", textDecoration: "none", transition: "color 0.15s" }}
                            onMouseEnter={e => (e.currentTarget.style.color = "#c8f135")}
                            onMouseLeave={e => (e.currentTarget.style.color = "#888")}>
                            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                            {c.email}
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Highlights */}
            <div className="sd-section">
              <SH>What to Expect</SH>
              <div className="sd-highlights">
                {HIGHLIGHTS.map(({ label, d }) => (
                  <div key={label} className="sd-hl-card">
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="1.8" strokeLinecap="round" style={{ flexShrink: 0 }}>
                      <path d={d} />
                    </svg>
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile booking widget */}
            <div id="mob-booking" className="sd-mob-widget">
              <SH>{screening.status === 'cancelled' ? "Event Status" : "Book Tickets"}</SH>
              {screening.status === 'cancelled'
                ? <CancelledWidget />
                : <BookingWidget screening={screening} quantities={quantities} onChange={setQty} isLoggedIn={isLoggedIn} existingCode={existingCode} />
              }
            </div>

            {/* Venue */}
            <div className="sd-section">
              <SH>Venue</SH>
              <div className="sd-venue-card">
                <div style={{ display: "flex", alignItems: "flex-start", gap: "14px" }}>
                  {/* Map pin icon — clickable when Maps URL is set */}
                  {screening.locationUrl ? (
                    <a href={screening.locationUrl} target="_blank" rel="noopener noreferrer"
                      style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(200,241,53,.12)", border: "1px solid rgba(200,241,53,.35)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, textDecoration: "none", transition: "background 0.15s" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(200,241,53,.2)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "rgba(200,241,53,.12)")}>
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </a>
                  ) : (
                    <div style={{ width: 40, height: 40, borderRadius: "10px", background: "rgba(200,241,53,.06)", border: "1px solid rgba(200,241,53,.14)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="2" strokeLinecap="round">
                        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                      </svg>
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: "15px", fontWeight: 900, color: "#d0d0d0", marginBottom: "4px" }}>{screening.venueName}</p>
                    <p style={{ fontSize: "12px", color: "#666", lineHeight: 1.65, marginBottom: "12px" }}>{screening.location}</p>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                      {screening.isIndoor != null && (
                        <span style={{ fontSize: "10px", fontWeight: 800, color: "#888", padding: "4px 11px", background: "#111", border: "1px solid #242424", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                          {screening.isIndoor ? "Indoor" : "Outdoor"}
                        </span>
                      )}
                      {screening.locationUrl ? (
                        <a href={screening.locationUrl} target="_blank" rel="noopener noreferrer"
                          style={{ fontSize: "10px", fontWeight: 800, color: "#c8f135", padding: "4px 11px", background: "rgba(200,241,53,0.07)", border: "1px solid rgba(200,241,53,0.25)", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "5px" }}>
                          <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                          </svg>
                          Get Directions
                        </a>
                      ) : (
                        <span style={{ fontSize: "10px", fontWeight: 800, color: "#888", padding: "4px 11px", background: "#111", border: "1px solid #242424", borderRadius: "999px", letterSpacing: ".1em", textTransform: "uppercase" }}>
                          {screening.location.includes(",") ? screening.location.split(",")[1].trim() : screening.location}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Things to Know */}
            {buildThingsToKnow(screening).length > 0 && (
            <div className="sd-section">
              <SH>Things to Know</SH>
              <div className="sd-know-grid2">
                {buildThingsToKnow(screening).map(({ text, paths, warn }) => (
                  <div key={text} className="sd-know-cell">
                    <div className="sd-know-icon">
                      <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke={warn ? "#e05555" : "#666"} strokeWidth="1.8" strokeLinecap="round">
                        {paths.map((d, i) => <path key={i} d={d} />)}
                      </svg>
                    </div>
                    <span className="sd-know-text" style={warn ? { color: "#e07070" } : undefined}>{text}</span>
                  </div>
                ))}
              </div>
            </div>
            )}


            {/* Terms & Conditions — opens popup */}
            <div className="sd-section">
              <SH>Terms &amp; Conditions</SH>
              <button className="sd-tc-btn" onClick={() => setTcModalOpen(true)}>
                <div>
                  <p style={{ fontSize: "13px", fontWeight: 700, color: "#888", margin: 0 }}>View event terms &amp; refund policy</p>
                  <p style={{ fontSize: "11px", color: "#777", margin: "3px 0 0", fontWeight: 600 }}>{TERMS.length} conditions apply</p>
                </div>
                <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#666" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M9 18l6-6-6-6"/>
                </svg>
              </button>
            </div>

            {/* Back to screenings */}
            <div style={{ paddingBottom: "8px" }}>
              <Link href="/screening" className="sd-back-btn">
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Back to All Screenings
              </Link>
            </div>

          </div>

          {/* ── Right column (sticky, desktop only) ── */}
          <div className="sd-sidebar">
            {screening.status === 'cancelled'
              ? <CancelledWidget />
              : <BookingWidget screening={screening} quantities={quantities} onChange={setQty} isLoggedIn={isLoggedIn} existingCode={existingCode} />
            }
          </div>

        </div>
      </div>

      {/* ── T&C Modal ── */}
      {tcModalOpen && <TCModal onClose={() => setTcModalOpen(false)} />}

      {/* ── Booking confirmation toast (real-time via Socket.io) ── */}
      {notifToast && (() => {
        const [msgPart, codePart] = notifToast.body.split(/Entry code:\s*/i);
        return (
          <div
            style={{
              position: "fixed", bottom: "calc(86px + env(safe-area-inset-bottom))", right: "16px", zIndex: 500,
              background: "#111", border: "1px solid rgba(200,241,53,0.35)",
              boxShadow: "0 0 40px rgba(200,241,53,0.1), 0 8px 40px rgba(0,0,0,0.7)",
              maxWidth: "300px", width: "calc(100vw - 32px)",
              animation: "scrFadeIn 0.3s ease both", overflow: "hidden",
            }}
          >
            <div style={{ height: "3px", background: "linear-gradient(90deg,#c8f135,transparent)" }} />
            <div style={{ padding: "14px 16px 16px" }}>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "7px", marginBottom: "9px" }}>
                    <div style={{
                      width: "20px", height: "20px", borderRadius: "50%", flexShrink: 0,
                      background: "rgba(200,241,53,0.1)", border: "1px solid rgba(200,241,53,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </div>
                    <span style={{ fontSize: "9px", fontWeight: 900, color: "#c8f135", textTransform: "uppercase", letterSpacing: "0.2em" }}>
                      {notifToast.title}
                    </span>
                  </div>
                  <p style={{ fontSize: "12px", color: "#777", lineHeight: 1.55, margin: codePart ? "0 0 10px" : "0" }}>
                    {msgPart?.trim()}
                  </p>
                  {codePart && (
                    <div style={{
                      display: "inline-flex", alignItems: "center", gap: "8px",
                      padding: "7px 12px",
                      background: "rgba(200,241,53,0.06)", border: "1px solid rgba(200,241,53,0.18)",
                    }}>
                      <span style={{ fontSize: "8px", fontWeight: 900, color: "#444", textTransform: "uppercase", letterSpacing: "0.2em" }}>Code</span>
                      <span style={{ fontSize: "15px", fontWeight: 900, color: "#c8f135", letterSpacing: "0.2em" }}>{codePart.trim()}</span>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => { if (toastTimerRef.current) clearTimeout(toastTimerRef.current); setNotifToast(null); }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#3a3a3a", padding: "2px", flexShrink: 0, lineHeight: 1 }}
                  onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#666")}
                  onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.color = "#3a3a3a")}
                >
                  <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        );
      })()}


    </div>
  );
}
