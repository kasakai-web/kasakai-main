"use client";

import { useState } from "react";
import { createBookingOrder, verifyBookingPayment } from "@/utils/screening-api";

const TC_ITEMS = [
  "No refunds on purchased tickets, even in case of rescheduling.",
  "Carry a valid ID proof for entry.",
  "Outside food and beverages are not permitted inside.",
  "People in an inebriated state may not be allowed entry.",
  "Organizers hold the right to deny late entry to the event.",
];

interface TierLine { name: string; qty: number; price: number; }

interface Props {
  total: number;
  eventId: string;
  tierQuantities: Record<string, number>;
  tierBreakdown?: TierLine[];
  onSuccess: (entryCode: string) => void;
  onBack: () => void;
}

type RzpHandler = {
  open: () => void;
};
type RzpConstructor = new (options: unknown) => RzpHandler;

// Loads checkout.js once — resolves immediately if already on page
function loadRazorpay(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== "undefined" && (window as unknown as Record<string, unknown>).Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load payment gateway. Check your connection."));
    document.body.appendChild(script);
  });
}

export function ScreeningPaymentSheet({ total, eventId, tierQuantities, tierBreakdown = [], onSuccess, onBack }: Props) {
  const [tcOpen,   setTcOpen]   = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  async function handlePay() {
    if (loading) return;
    setLoading(true);
    setError(null);

    try {
      // 1. Create order on backend (amount verified server-side)
      const order = await createBookingOrder(eventId, tierQuantities);

      // 2. Free ticket — no payment needed, confirm immediately
      if (order.isFree) {
        onSuccess(order.entryCode);
        setLoading(false);
        return;
      }

      // 3. Load Razorpay checkout.js if not already loaded
      await loadRazorpay();

      // 4. Open checkout — wraps in a Promise so we can await it cleanly
      let paymentDismissed = false;
      await new Promise<void>((resolve, reject) => {
        const options = {
          key:         order.keyId,
          amount:      order.amount,
          currency:    "INR",
          name:        "Kasa Kai Screening",
          description: "Match Screening Ticket",
          order_id:    order.orderId,
          theme:       { color: "#c8f135" },

          handler: async function (response: {
            razorpay_order_id:   string;
            razorpay_payment_id: string;
            razorpay_signature:  string;
          }) {
            try {
              const ticket = await verifyBookingPayment({
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              });
              onSuccess(ticket.entryCode);
              resolve();
            } catch (e) {
              reject(e);
            }
          },

          modal: {
            ondismiss: () => {
              paymentDismissed = true;
              setLoading(false);
              resolve();
            },
          },
        };

        const RzpClass = (window as unknown as { Razorpay: RzpConstructor }).Razorpay;
        new RzpClass(options).open();
      });
      if (paymentDismissed) {
        setError("Payment not completed. Your tickets are still available — try again when ready.");
        setTimeout(() => setError(null), 5000);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Payment failed. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center px-0 md:px-4 scr-sheet-overlay">
      <div className="w-full md:max-w-lg bg-[#111111] md:rounded-[24px] rounded-t-[24px] border border-white/10 shadow-2xl relative scr-sheet">

        {/* Close */}
        <button
          onClick={onBack}
          disabled={loading}
          className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors disabled:opacity-40"
        >
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black text-[#3B82F6] uppercase tracking-widest leading-none block mb-1">
              Razorpay Secured
            </span>
            <span className="text-2xl font-black text-white tracking-tight italic leading-none">Checkout</span>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Payable</span>
            <span className="text-xl font-black text-[#c8f135]">{total === 0 ? "Free" : `₹${total}`}</span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            margin: "16px 24px 0",
            padding: "10px 14px",
            background: "rgba(239,68,68,0.1)",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: "10px",
            color: "#ef4444",
            fontSize: "12px",
            fontWeight: 600,
          }}>
            {error}
          </div>
        )}

        {/* Ticket breakdown */}
        {tierBreakdown.length > 0 && (
          <div style={{ margin: "0 24px", padding: "14px 16px", background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: "12px" }}>
            <p style={{ fontSize: "9px", fontWeight: 900, color: "#777", textTransform: "uppercase", letterSpacing: ".18em", marginBottom: "10px" }}>
              Order Summary
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              {tierBreakdown.map((line, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 900, color: "#c8f135", background: "rgba(200,241,53,.08)", border: "1px solid rgba(200,241,53,.15)", padding: "2px 8px", borderRadius: "6px" }}>
                      ×{line.qty}
                    </span>
                    <span style={{ fontSize: "12px", fontWeight: 700, color: "#888" }}>{line.name}</span>
                  </div>
                  <span style={{ fontSize: "12px", fontWeight: 900, color: "#e8e8e8" }}>
                    {line.price === 0 ? "Free" : `₹${(line.price * line.qty).toLocaleString()}`}
                  </span>
                </div>
              ))}
            </div>
            {tierBreakdown.length > 1 && (
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "10px", paddingTop: "10px", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontSize: "11px", fontWeight: 900, color: "#777", textTransform: "uppercase", letterSpacing: ".12em" }}>
                  {tierBreakdown.reduce((s, l) => s + l.qty, 0)} tickets total
                </span>
                <span style={{ fontSize: "13px", fontWeight: 900, color: "#c8f135" }}>
                  {total === 0 ? "Free" : `₹${total.toLocaleString()}`}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Pay button */}
        <div className="p-6 space-y-5">
          <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            {loading ? "Processing…" : "Choose Payment Method"}
          </span>

          <div className="space-y-3">
            <button
              onClick={handlePay}
              disabled={loading}
              className="w-full p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between hover:bg-white/6 hover:border-[#c8f135]/20 transition-all group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-4">
                <div className="w-11 h-11 bg-[#c8f135]/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="#c8f135" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="7" height="7" rx="1" />
                    <rect x="14" y="3" width="7" height="7" rx="1" />
                    <rect x="3" y="14" width="7" height="7" rx="1" />
                    <path d="M14 14h3v3M17 17h3M17 14h3" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-sm font-black text-white leading-none mb-1">
                    {loading ? "Opening checkout…" : "UPI / Card / Net Banking"}
                  </p>
                  <p className="text-[10px] text-zinc-500 uppercase tracking-wider">GPay · PhonePe · PayTM · All Cards</p>
                </div>
              </div>
              {loading ? (
                <svg className="animate-spin" width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" stroke="#c8f135" strokeWidth="3" strokeOpacity="0.25" />
                  <path d="M12 2a10 10 0 0110 10" stroke="#c8f135" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <div className="w-5 h-5 border-2 border-zinc-700 rounded-full flex items-center justify-center group-hover:border-[#c8f135] transition-colors">
                  <div className="w-2 h-2 bg-[#c8f135] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}
            </button>
          </div>

          {/* Terms & Conditions */}
          <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)", paddingTop: "12px" }}>
            <button
              className="scr-tc-toggle"
              onClick={() => setTcOpen((v) => !v)}
              type="button"
            >
              <span style={{ fontSize: "10px", fontWeight: 800, color: "#777", letterSpacing: ".18em", textTransform: "uppercase" }}>
                Terms &amp; Conditions
              </span>
              <svg
                width="14" height="14" fill="none" viewBox="0 0 24 24"
                stroke="#666" strokeWidth="2.5" strokeLinecap="round"
                style={{ transform: tcOpen ? "rotate(180deg)" : "none", transition: "transform .2s" }}
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {tcOpen && (
              <ul className="scr-tc-list">
                {TC_ITEMS.map((t, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "8px" }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#555", flexShrink: 0, marginTop: "7px" }} />
                    <span style={{ fontSize: "11px", color: "#888", lineHeight: 1.65 }}>{t}</span>
                  </li>
                ))}
              </ul>
            )}

            <p style={{ textAlign: "center", fontSize: "9px", fontWeight: 800, color: "#555", textTransform: "uppercase", letterSpacing: ".2em", paddingTop: "12px" }}>
              By proceeding you agree to the above T&amp;C
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
