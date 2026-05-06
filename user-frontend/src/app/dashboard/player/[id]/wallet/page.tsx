"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Script from "next/script";
import { buildApiUrl, getSession, clearSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useAutoRefresh } from "@/hooks/useAutoRefresh";
import "../../../player-dashboard.css";

// Razorpay checkout type (loaded via CDN script)
declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}
interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; contact?: string; email?: string };
  theme: { color: string };
  modal: { ondismiss: () => void };
  handler: (response: RazorpayResponse) => void;
}
interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}
interface RazorpayInstance {
  open: () => void;
}

interface WalletData {
  _id: string;
  balancePaise: number;
  lockedPaise: number;
  availablePaise: number;
  totalTopUpPaise: number;
  totalSpentPaise: number;
  totalRefundedPaise: number;
  currency: string;
}

interface Transaction {
  _id: string;
  type: "topup" | "debit" | "refund" | "lock" | "unlock" | "backout_fee" | "bonus" | "withdrawal";
  amountPaise: number;
  balanceAfterPaise: number;
  description?: string;
  status: "success" | "pending" | "failed";
  game?: { _id: string; title?: string; scheduledAt?: string };
  createdAt: string;
}

const TX_CONFIG: Record<string, { label: string; sign: string; color: string; icon: string }> = {
  topup:       { label: "Recharge",    sign: "+", color: "#4ade80", icon: "⬆" },
  bonus:       { label: "Bonus",       sign: "+", color: "#4ade80", icon: "🎁" },
  refund:      { label: "Refund",      sign: "+", color: "#60a5fa", icon: "↩" },
  debit:       { label: "Game signup", sign: "−", color: "#f87171", icon: "⬇" },
  backout_fee: { label: "Cancellation fee", sign: "−", color: "#f87171", icon: "⚠" },
  withdrawal:  { label: "Withdrawal",  sign: "−", color: "#f59e0b", icon: "💸" },
  lock:        { label: "Locked",      sign: "−", color: "#a78bfa", icon: "🔒" },
  unlock:      { label: "Unlocked",    sign: "+", color: "#a78bfa", icon: "🔓" },
};

function fmtRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 0 })}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Modal steps
type ModalStep = "amount" | "terms" | "processing" | "success" | "cancelled";

export default function WalletPage() {
  const router = useRouter();
  const routeParams = useParams<{ id?: string | string[] }>();
  const playerId = Array.isArray(routeParams?.id) ? routeParams.id[0] : routeParams?.id;

  const { isAuthorized } = useAuthGuard({
    requiredRole: "player",
    routeUserId: playerId,
    redirectTo: "/login?role=player",
  });

  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("amount");
  const [amountStr, setAmountStr] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  const fetchWallet = useCallback(async () => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }

    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me/wallet"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        clearSession(); router.replace("/login?role=player"); return;
      }
      if (!res.ok) throw new Error("Failed to load wallet");
      const data = await res.json();
      if (data.success) {
        setWallet(data.data.wallet);
        setTransactions(data.data.transactions);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) { setLoading(false); return; }
    fetchWallet();
  }, [isAuthorized, fetchWallet]);

  useAutoRefresh(isAuthorized ? fetchWallet : null, {
    interval:  30_000,
    onFocus:   true,
    onVisible: true,
    enabled:   isAuthorized,
  });

  // Real-time: update balance instantly on wallet-update socket event, then refetch for new tx
  useEffect(() => {
    const handler = (e: Event) => {
      const { balancePaise, lockedPaise, availablePaise } = (e as CustomEvent<{ balancePaise: number; lockedPaise: number; availablePaise: number }>).detail;
      setWallet((prev) => prev ? { ...prev, balancePaise, lockedPaise, availablePaise } : prev);
      fetchWallet();
    };
    window.addEventListener("kk-wallet-update", handler);
    return () => window.removeEventListener("kk-wallet-update", handler);
  }, [fetchWallet]);

  const openModal = () => {
    setModalStep("amount");
    setAmountStr("");
    setTermsAccepted(false);
    setModalError(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (modalStep === "processing") return; // don't close mid-payment
    setShowModal(false);
  };

  // Step 1 → Step 2: validate amount then show T&C
  const handleAmountContinue = () => {
    const amount = parseFloat(amountStr);
    if (!amount || amount <= 0 || isNaN(amount)) {
      setModalError("Please enter a valid amount.");
      return;
    }
    if (amount < 10) {
      setModalError("Minimum recharge is ₹10.");
      return;
    }
    if (amount > 100000) {
      setModalError("Maximum recharge is ₹1,00,000.");
      return;
    }
    setModalError(null);
    setModalStep("terms");
  };

  // Step 2 → Payment: create order then open Razorpay
  const handleProceedToPayment = async () => {
    if (!termsAccepted) {
      setModalError("Please accept the Terms & Conditions to proceed.");
      return;
    }
    if (!razorpayReady) {
      setModalError("Payment system loading, please try again.");
      return;
    }

    const amount = parseFloat(amountStr);
    const amountPaise = Math.round(amount * 100);

    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }

    setModalError(null);
    setModalStep("processing");

    try {
      // Create order on backend — amount is validated and stored server-side
      const orderRes = await fetch(buildApiUrl("/api/v1/players/me/wallet/orders"), {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ amountPaise }),
      });
      const orderData = await orderRes.json();

      if (!orderRes.ok || !orderData.success) {
        setModalError(orderData.message || "Failed to create payment order.");
        setModalStep("terms");
        return;
      }

      const { orderId, amount: orderAmount, currency, keyId } = orderData.data;

      // Open Razorpay checkout popup
      const rzp = new window.Razorpay({
        key:         keyId,
        amount:      orderAmount,   // authoritative amount from backend
        currency,
        name:        "Kasa Kai",
        description: "Wallet Recharge",
        order_id:    orderId,
        prefill: {},
        theme: { color: "#c8ff3e" },
        modal: {
          ondismiss: () => {
            // Payment cancelled or popup closed by user
            setModalStep("cancelled");
          },
        },
        handler: async (response: RazorpayResponse) => {
          // Payment succeeded on Razorpay side — verify on our backend
          setModalStep("processing");
          try {
            const verifyRes = await fetch(buildApiUrl("/api/v1/players/me/wallet/verify"), {
              method:  "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              body:    JSON.stringify({
                razorpayOrderId:  response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });
            const verifyData = await verifyRes.json();

            if (verifyData.success) {
              if (verifyData.data?.wallet) setWallet(verifyData.data.wallet);
              setModalStep("success");
              fetchWallet(); // refresh transactions too
            } else {
              setModalError(verifyData.message || "Payment verification failed. Contact support.");
              setModalStep("terms");
            }
          } catch {
            // Webhook will still credit wallet even if this fails
            setModalError("Verification request failed. Your wallet will be updated shortly.");
            setModalStep("cancelled");
          }
        },
      });

      rzp.open();
    } catch {
      setModalError("Something went wrong. Please try again.");
      setModalStep("terms");
    }
  };

  if (!isAuthorized) return null;

  return (
    <>
      {/* Razorpay checkout.js — loaded once, available globally */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onLoad={() => setRazorpayReady(true)}
      />

      <div className="player-dashboard-container">
        {/* Header */}
        <div className="page-header">
          <div className="page-title-group">
            <div className="page-eyebrow">Wallet</div>
            <div className="page-title">Your <span>Balance</span></div>
          </div>
        </div>

        {loading ? (
          <div className="loading-container">
            <div className="spinner" />
            <p>Loading wallet…</p>
          </div>
        ) : error ? (
          <div style={{ color: "#f87171", padding: "24px", textAlign: "center" }}>{error}</div>
        ) : (
          <div style={{ maxWidth: 680, width: "100%" }}>

            {/* Balance card */}
            <div style={{
              background: "rgba(200,255,62,0.06)",
              border: "1px solid rgba(200,255,62,0.25)",
              borderRadius: 12,
              padding: "28px 28px 24px",
              marginBottom: 24,
            }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "#888", marginBottom: 8 }}>
                Available Balance
              </div>
              <div style={{ fontSize: 42, fontWeight: 800, color: "#c8ff3e", letterSpacing: "-0.02em", marginBottom: 20 }}>
                {wallet ? fmtRupees(wallet.availablePaise ?? wallet.balancePaise) : "₹0"}
              </div>

              <button
                onClick={openModal}
                style={{
                  background: "#c8ff3e",
                  color: "#000",
                  border: "none",
                  borderRadius: 8,
                  padding: "12px 28px",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  letterSpacing: "0.04em",
                }}
              >
                + Recharge Wallet
              </button>
            </div>

            {/* Transaction history */}
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666", marginBottom: 14 }}>
                Transaction History
              </div>

              {transactions.length === 0 ? (
                <div style={{
                  background: "rgba(255,255,255,0.02)",
                  border: "1px solid #1a1a1a",
                  borderRadius: 10,
                  padding: "32px",
                  textAlign: "center",
                  color: "#555",
                  fontSize: 14,
                }}>
                  No transactions yet. Recharge to get started.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {transactions.map((tx) => {
                    const cfg = TX_CONFIG[tx.type] ?? { label: tx.type, sign: "", color: "#ccc", icon: "•" };
                    const isCredit = ["topup", "refund", "bonus", "unlock"].includes(tx.type);
                    const desc = tx.description || (tx.game?.title ? `${cfg.label} – ${tx.game.title}` : cfg.label);
                    return (
                      <div key={tx._id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        background: "rgba(255,255,255,0.025)",
                        borderRadius: 8,
                        border: "1px solid #1a1a1a",
                      }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: isCredit ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 16,
                          flexShrink: 0,
                        }}>
                          {cfg.icon}
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: "#e0e0e0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {desc}
                          </div>
                          <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>
                            {fmtDate(tx.createdAt)}
                            {tx.status !== "success" && (
                              <span style={{ marginLeft: 8, color: tx.status === "failed" ? "#f87171" : "#f59e0b", fontWeight: 600 }}>
                                {tx.status.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontSize: 15, fontWeight: 700, color: cfg.color }}>
                            {cfg.sign}{fmtRupees(tx.amountPaise)}
                          </div>
                          <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                            Bal: {fmtRupees(tx.balanceAfterPaise)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Recharge Modal ── */}
        {showModal && (
          <div
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)",
              display: "flex", alignItems: "center", justifyContent: "center",
              zIndex: 999, padding: 16,
            }}
            onClick={closeModal}
          >
            <div
              style={{
                background: "#111", border: "1px solid #2a2a2a", borderRadius: 14,
                padding: "32px 28px", width: "100%", maxWidth: 420,
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* ── Step: success ── */}
              {modalStep === "success" && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 52, marginBottom: 14 }}>✓</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: "#4ade80", marginBottom: 8 }}>
                    Wallet Recharged!
                  </div>
                  <div style={{ fontSize: 14, color: "#888", marginBottom: 8 }}>
                    ₹{amountStr} has been added to your wallet.
                  </div>
                  <div style={{ fontSize: 13, color: "#555", marginBottom: 24 }}>
                    New balance: {wallet ? fmtRupees(wallet.availablePaise ?? wallet.balancePaise) : "—"}
                  </div>
                  <button
                    onClick={closeModal}
                    style={{
                      background: "#c8ff3e", color: "#000", border: "none", borderRadius: 8,
                      padding: "12px 32px", fontSize: 14, fontWeight: 700, cursor: "pointer",
                    }}
                  >
                    Done
                  </button>
                </div>
              )}

              {/* ── Step: cancelled / payment dismissed ── */}
              {modalStep === "cancelled" && (
                <div style={{ textAlign: "center", padding: "16px 0" }}>
                  <div style={{ fontSize: 40, marginBottom: 14 }}>ⓘ</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>
                    Payment Not Completed
                  </div>
                  <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6, marginBottom: 8 }}>
                    Your payment was not completed.
                  </div>
                  <div style={{
                    background: "rgba(200,255,62,0.06)",
                    border: "1px solid rgba(200,255,62,0.15)",
                    borderRadius: 8,
                    padding: "12px 16px",
                    fontSize: 13,
                    color: "#c8ff3e",
                    marginBottom: 24,
                    lineHeight: 1.6,
                  }}>
                    If any amount was deducted from your bank, it will be automatically
                    credited back to your Kasa Kai wallet within a few minutes — not to your bank account.
                  </div>
                  {modalError && (
                    <div style={{ color: "#f87171", fontSize: 12, marginBottom: 14 }}>
                      {modalError}
                    </div>
                  )}
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={closeModal}
                      style={{
                        flex: 1, background: "transparent", border: "1px solid #333",
                        color: "#888", borderRadius: 8, padding: "12px",
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Close
                    </button>
                    <button
                      onClick={() => { setModalStep("amount"); setModalError(null); }}
                      style={{
                        flex: 2, background: "#c8ff3e", color: "#000", border: "none",
                        borderRadius: 8, padding: "12px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      }}
                    >
                      Try Again
                    </button>
                  </div>
                </div>
              )}

              {/* ── Step: processing ── */}
              {modalStep === "processing" && (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ marginBottom: 16 }}>
                    <div className="spinner" />
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: "#ccc" }}>
                    Processing payment…
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                    Please do not close this window.
                  </div>
                </div>
              )}

              {/* ── Step: amount entry ── */}
              {modalStep === "amount" && (
                <>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                    Recharge Wallet
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
                    Enter the amount you want to add (₹10 – ₹1,00,000)
                  </div>

                  <div style={{ marginBottom: 16 }}>
                    <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                      Amount (₹)
                    </label>
                    <input
                      type="number"
                      min={10}
                      max={100000}
                      placeholder="e.g. 500"
                      value={amountStr}
                      onChange={(e) => { setAmountStr(e.target.value); setModalError(null); }}
                      style={{
                        width: "100%", background: "#0a0a0a", border: "1px solid #333",
                        borderRadius: 8, padding: "12px 14px", color: "#fff",
                        fontSize: 22, fontWeight: 700, outline: "none", boxSizing: "border-box",
                      }}
                      onKeyDown={(e) => e.key === "Enter" && handleAmountContinue()}
                      autoFocus
                    />
                  </div>

                  {/* Quick amount chips */}
                  <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                    {[100, 200, 500, 1000].map((amt) => (
                      <button
                        key={amt}
                        onClick={() => setAmountStr(String(amt))}
                        style={{
                          background: amountStr === String(amt) ? "rgba(200,255,62,0.15)" : "rgba(255,255,255,0.05)",
                          border: `1px solid ${amountStr === String(amt) ? "rgba(200,255,62,0.4)" : "#2a2a2a"}`,
                          color: amountStr === String(amt) ? "#c8ff3e" : "#aaa",
                          borderRadius: 6, padding: "6px 14px", fontSize: 13,
                          fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>

                  {modalError && (
                    <div style={{ color: "#f87171", fontSize: 12, marginBottom: 14 }}>{modalError}</div>
                  )}

                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={closeModal}
                      style={{
                        flex: 1, background: "transparent", border: "1px solid #333",
                        color: "#888", borderRadius: 8, padding: "12px",
                        fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAmountContinue}
                      disabled={!amountStr}
                      style={{
                        flex: 2, background: amountStr ? "#c8ff3e" : "#333",
                        color: amountStr ? "#000" : "#666", border: "none", borderRadius: 8,
                        padding: "12px", fontSize: 13, fontWeight: 700,
                        cursor: amountStr ? "pointer" : "not-allowed",
                      }}
                    >
                      Continue →
                    </button>
                  </div>
                </>
              )}

              {/* ── Step: terms & conditions ── */}
              {modalStep === "terms" && (
                <>
                  <button
                    onClick={() => { setModalStep("amount"); setModalError(null); }}
                    style={{
                      background: "none", border: "none", color: "#555", cursor: "pointer",
                      fontSize: 12, marginBottom: 16, padding: 0,
                    }}
                  >
                    ← Back
                  </button>

                  <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 4 }}>
                    Review &amp; Pay
                  </div>
                  <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>
                    You are about to add <strong style={{ color: "#c8ff3e" }}>₹{amountStr}</strong> to your wallet.
                  </div>

                  {/* Summary box */}
                  <div style={{
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid #222",
                    borderRadius: 10,
                    padding: "16px",
                    marginBottom: 20,
                  }}>
                    <Row label="Amount" value={`₹${amountStr}`} />
                    <Row label="Payment via" value="Razorpay (UPI / Card / Net Banking)" />
                    <Row label="Credited to" value="Kasa Kai Wallet" highlight />
                    <Row label="Refund policy" value="Wallet credit only — not to bank" />
                  </div>

                  {/* Legal checkbox */}
                  <label style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    cursor: "pointer", marginBottom: 20,
                  }}>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => { setTermsAccepted(e.target.checked); setModalError(null); }}
                      style={{ marginTop: 2, accentColor: "#c8ff3e", width: 16, height: 16, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>
                      I have read and agree to the{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e" }}>
                        Terms &amp; Conditions
                      </a>
                      ,{" "}
                      <a href="/refund-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e" }}>
                        Refund Policy
                      </a>
                      , and{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e" }}>
                        Privacy Policy
                      </a>
                      . I understand that wallet top-ups are non-refundable to my bank account.
                    </span>
                  </label>

                  {modalError && (
                    <div style={{ color: "#f87171", fontSize: 12, marginBottom: 14 }}>{modalError}</div>
                  )}

                  <button
                    onClick={handleProceedToPayment}
                    disabled={!termsAccepted}
                    style={{
                      width: "100%",
                      background: termsAccepted ? "#c8ff3e" : "#222",
                      color: termsAccepted ? "#000" : "#555",
                      border: `1px solid ${termsAccepted ? "transparent" : "#333"}`,
                      borderRadius: 8, padding: "14px",
                      fontSize: 14, fontWeight: 700,
                      cursor: termsAccepted ? "pointer" : "not-allowed",
                      letterSpacing: "0.03em",
                    }}
                  >
                    Pay ₹{amountStr} via Razorpay
                  </button>

                  <div style={{ textAlign: "center", marginTop: 12, fontSize: 11, color: "#444" }}>
                    Secured by Razorpay · 256-bit SSL encryption
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #1a1a1a" }}>
      <span style={{ fontSize: 12, color: "#555" }}>{label}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: highlight ? "#c8ff3e" : "#aaa" }}>{value}</span>
    </div>
  );
}
