"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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
  close?: () => void;
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
  type: "topup" | "debit" | "refund" | "lock" | "unlock" | "backout_fee" | "bonus" | "withdrawal" | "pass_cover";
  amountPaise: number;
  balanceAfterPaise: number;
  description?: string;
  status: "success" | "pending" | "failed";
  game?: { _id: string; title?: string; scheduledAt?: string };
  createdAt: string;
}

const TX_CONFIG: Record<string, { label: string; sign: string; color: string; icon: string }> = {
  topup:       { label: "Recharge",         sign: "+", color: "#4ade80", icon: "⬆" },
  bonus:       { label: "Bonus",            sign: "+", color: "#4ade80", icon: "🎁" },
  refund:      { label: "Refund",           sign: "+", color: "#60a5fa", icon: "↩" },
  debit:       { label: "Game signup",      sign: "−", color: "#f87171", icon: "⬇" },
  backout_fee: { label: "Cancellation fee", sign: "−", color: "#f87171", icon: "⚠" },
  withdrawal:  { label: "Withdrawal",       sign: "−", color: "#f59e0b", icon: "💸" },
  lock:        { label: "Locked",           sign: "−", color: "#a78bfa", icon: "🔒" },
  unlock:      { label: "Unlocked",         sign: "+", color: "#a78bfa", icon: "🔓" },
  pass_cover:  { label: "Pass covered",     sign: "",  color: "#c8ff3e", icon: "🎟" },
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
  const [reconciling, setReconciling] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState<ModalStep>("amount");
  const [amountStr, setAmountStr] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [razorpayReady, setRazorpayReady] = useState(false);

  // "processing" covers two very different waits: handing off to the Razorpay
  // window, and verifying a payment that already went through. Only the first
  // one is safe to abandon.
  const [processingPhase, setProcessingPhase] = useState<"checkout" | "verifying">("checkout");
  const [showStuckEscape, setShowStuckEscape] = useState(false);
  const rzpRef = useRef<RazorpayInstance | null>(null);
  // Bumped on every payment attempt and on every abandon, so a slow order-create
  // that resolves after the user backed out can't open checkout behind their back.
  const attemptRef = useRef(0);

  const fetchWallet = useCallback(async () => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }

    try {
      const res = await fetch(buildApiUrl("/players/me/wallet"), {
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

  // Ask the backend to settle any pending topups against Razorpay, then show the
  // reconciled ledger. Used both on demand and automatically when pending rows exist.
  const reconcilePending = useCallback(async () => {
    const { token } = getSession();
    if (!token) return;
    setReconciling(true);
    try {
      const res = await fetch(buildApiUrl("/players/me/wallet/reconcile"), {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setWallet(data.data.wallet);
        setTransactions(data.data.transactions);
      }
    } catch {
      // Non-critical — the hourly job will resolve these anyway.
    } finally {
      setReconciling(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) { setLoading(false); return; }
    fetchWallet();
  }, [isAuthorized, fetchWallet]);

  // One automatic sweep per visit when something is unresolved, so a stuck
  // PENDING row settles itself instead of sitting there until the job runs.
  const hasPending = transactions.some((t) => t.status === "pending");
  const sweptRef = useRef(false);
  useEffect(() => {
    if (!isAuthorized || loading || !hasPending || sweptRef.current) return;
    sweptRef.current = true;
    reconcilePending();
  }, [isAuthorized, loading, hasPending, reconcilePending]);

  // If checkout.js was already loaded on a previous visit (cached), the <Script>
  // onLoad may not fire — pick up the existing global so the Pay button works.
  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) setRazorpayReady(true);
  }, []);

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

  // A blocked pop-up means checkout never opens, so ondismiss never fires and
  // nothing else can move us off the spinner. Offer a way out after a grace
  // period long enough that a normally-slow handoff doesn't trip it.
  useEffect(() => {
    if (modalStep !== "processing" || processingPhase !== "checkout") return;
    const t = setTimeout(() => setShowStuckEscape(true), 5000);
    return () => clearTimeout(t);
  }, [modalStep, processingPhase]);

  const openModal = () => {
    setModalStep("amount");
    setAmountStr("");
    setTermsAccepted(false);
    setModalError(null);
    setProcessingPhase("checkout");
    setShowStuckEscape(false);
    setShowModal(true);
  };

  const closeModal = () => {
    if (modalStep === "processing") return; // don't close mid-payment
    setShowModal(false);
  };

  // Bail out of a handoff that never landed. If checkout did open behind the
  // page, close it too so the user isn't left with an orphaned payment window.
  const abandonCheckout = () => {
    try {
      rzpRef.current?.close?.();
    } catch {
      // Checkout may never have opened — nothing to close.
    }
    rzpRef.current = null;
    attemptRef.current += 1; // invalidate any order-create still in flight
    setShowStuckEscape(false);
    setModalStep("cancelled");
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
    // Trust the actual global too — the onLoad state can lag behind a cached/
    // already-loaded script. Only block if Razorpay genuinely isn't available.
    const rzpAvailable = razorpayReady || (typeof window !== "undefined" && !!window.Razorpay);
    if (!rzpAvailable) {
      setModalError("Payment system is still loading. Please wait a moment and try again.");
      return;
    }

    const amount = parseFloat(amountStr);
    const amountPaise = Math.round(amount * 100);

    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }

    setModalError(null);
    setProcessingPhase("checkout");
    setShowStuckEscape(false);
    setModalStep("processing");

    const attempt = (attemptRef.current += 1);

    try {
      // Create order on backend — amount is validated and stored server-side
      const orderRes = await fetch(buildApiUrl("/players/me/wallet/orders"), {
        method:  "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body:    JSON.stringify({ amountPaise }),
      });
      const orderData = await orderRes.json();

      // User hit "Cancel & try again" (or restarted) while this was in flight —
      // don't yank them back into a checkout they already walked away from.
      if (attemptRef.current !== attempt) return;

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
            rzpRef.current = null;
            setShowStuckEscape(false);
            setModalStep("cancelled");
          },
        },
        handler: async (response: RazorpayResponse) => {
          // Payment succeeded on Razorpay side — verify on our backend. Past this
          // point the wait is ours, not the browser's, so no escape hatch.
          rzpRef.current = null;
          setShowStuckEscape(false);
          setProcessingPhase("verifying");
          setModalStep("processing");
          try {
            const verifyRes = await fetch(buildApiUrl("/players/me/wallet/verify"), {
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

      rzpRef.current = rzp;
      rzp.open();
    } catch {
      if (attemptRef.current !== attempt) return;
      setModalError("Something went wrong. Please try again.");
      setModalStep("terms");
    }
  };

  if (!isAuthorized) return null;

  return (
    <>
      {/* Razorpay checkout.js — load early (afterInteractive) so it's ready by
          the time the user reaches the Pay step. onError lets the user recover
          instead of being stuck on a permanently-"loading" payment system. */}
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onLoad={() => setRazorpayReady(true)}
        onReady={() => setRazorpayReady(true)}
        onError={() => setModalError("Couldn't load the payment system. Check your connection (or disable any ad-blocker) and try again.")}
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
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                gap: 12, marginBottom: 14,
              }}>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em", color: "#666" }}>
                  Transaction History
                </div>
                {hasPending && (
                  <button
                    onClick={reconcilePending}
                    disabled={reconciling}
                    style={{
                      background: "transparent", border: "1px solid #2a2a2a",
                      color: reconciling ? "#555" : "#888", borderRadius: 6,
                      padding: "5px 12px", fontSize: 11, fontWeight: 600,
                      cursor: reconciling ? "default" : "pointer", whiteSpace: "nowrap",
                    }}
                  >
                    {reconciling ? "Checking…" : "Check pending"}
                  </button>
                )}
              </div>

              {hasPending && (
                <div style={{
                  background: "rgba(245,158,11,0.05)",
                  border: "1px solid rgba(245,158,11,0.18)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  marginBottom: 12,
                  fontSize: 11,
                  color: "#c99a4a",
                  lineHeight: 1.6,
                }}>
                  Pending recharges haven&apos;t been added to your balance yet. We check
                  these against Razorpay automatically — if a payment went through it
                  will be credited, and if it didn&apos;t you were never charged.
                </div>
              )}

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
                    const isPassCover = tx.type === "pass_cover";
                    const cfg = TX_CONFIG[tx.type] ?? { label: tx.type, sign: "", color: "#ccc", icon: "•" };
                    const isCredit = ["topup", "refund", "bonus", "unlock", "pass_cover"].includes(tx.type);
                    const desc = tx.description || (tx.game?.title ? `${cfg.label} – ${tx.game.title}` : cfg.label);
                    // Only a settled transaction has actually moved money. Pending and
                    // failed rows must not be dressed up in credit green, and their
                    // balanceAfterPaise is a stale snapshot from order-creation time —
                    // showing it as "Bal:" claims a balance that never existed.
                    const isSettled = tx.status === "success";
                    const amountColor = !isSettled
                      ? (tx.status === "failed" ? "#555" : "#f59e0b")
                      : cfg.color;
                    return (
                      <div key={tx._id} style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        padding: "14px 16px",
                        background: isPassCover ? "rgba(200,255,62,0.04)" : "rgba(255,255,255,0.025)",
                        borderRadius: 8,
                        border: isPassCover ? "1px solid rgba(200,255,62,0.15)" : "1px solid #1a1a1a",
                      }}>
                        <div style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: !isSettled ? "rgba(255,255,255,0.04)"
                            : isPassCover ? "rgba(200,255,62,0.12)"
                            : isCredit ? "rgba(74,222,128,0.1)"
                            : "rgba(248,113,113,0.1)",
                          opacity: isSettled ? 1 : 0.55,
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
                            {isPassCover && (
                              <span style={{ marginLeft: 8, color: "#c8ff3e", fontWeight: 600 }}>
                                Pass Active — entry free
                              </span>
                            )}
                            {!isPassCover && tx.status !== "success" && (
                              <span style={{ marginLeft: 8, color: tx.status === "failed" ? "#f87171" : "#f59e0b", fontWeight: 600 }}>
                                {tx.status.toUpperCase()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: amountColor,
                            textDecoration: tx.status === "failed" ? "line-through" : "none",
                          }}>
                            {isPassCover ? "FREE" : `${isSettled ? cfg.sign : ""}${fmtRupees(tx.amountPaise)}`}
                          </div>
                          <div style={{ fontSize: 11, color: "#444", marginTop: 2 }}>
                            {isSettled
                              ? `Bal: ${fmtRupees(tx.balanceAfterPaise)}`
                              : tx.status === "failed" ? "Not charged" : "Awaiting confirmation"}
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
                  {!showStuckEscape && (
                    <div style={{ fontSize: 12, color: "#555", marginTop: 8 }}>
                      Please do not close this window.
                    </div>
                  )}

                  {/* Escape hatch: a blocked pop-up means checkout never opens and
                      ondismiss never fires, so the spinner would otherwise sit here
                      forever with no explanation and no way out. */}
                  {showStuckEscape && (
                    <div style={{
                      background: "rgba(245,158,11,0.06)",
                      border: "1px solid rgba(245,158,11,0.22)",
                      borderRadius: 8,
                      padding: "14px",
                      marginTop: 20,
                      textAlign: "left",
                    }}>
                      <div style={{ fontSize: 11, color: "#c99a4a", lineHeight: 1.6, marginBottom: 12 }}>
                        <strong style={{ color: "#f59e0b", fontWeight: 700 }}>Payment window didn&apos;t open?</strong>{" "}
                        Your browser has probably blocked the pop-up. Look for the blocked
                        pop-up icon in your address bar and allow pop-ups for this site,
                        then cancel below and try again. Nothing has been charged.
                      </div>
                      <button
                        onClick={abandonCheckout}
                        style={{
                          width: "100%", background: "transparent",
                          border: "1px solid rgba(245,158,11,0.4)", color: "#f59e0b",
                          borderRadius: 8, padding: "10px",
                          fontSize: 12, fontWeight: 700, cursor: "pointer",
                        }}
                      >
                        Cancel &amp; try again
                      </button>
                    </div>
                  )}
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
                  {/* Back */}
                  <button
                    onClick={() => { setModalStep("amount"); setModalError(null); }}
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 5,
                      background: "none", border: "none", color: "#555", cursor: "pointer",
                      fontSize: 12, marginBottom: 20, padding: 0,
                    }}
                  >
                    <span style={{ fontSize: 14, lineHeight: 1 }}>←</span> Back
                  </button>

                  {/* Amount hero */}
                  <div style={{
                    textAlign: "center",
                    background: "linear-gradient(160deg, #141414, #0e0e0e)",
                    border: "1px solid #1f1f1f",
                    borderRadius: 14,
                    padding: "20px 16px",
                    marginBottom: 16,
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#555", marginBottom: 6 }}>
                      Adding to Wallet
                    </div>
                    <div style={{ fontSize: 38, fontWeight: 900, color: "#c8ff3e", letterSpacing: "-1px", lineHeight: 1 }}>
                      ₹{amountStr}
                    </div>
                    <div style={{ fontSize: 11, color: "#444", marginTop: 6 }}>Kasa Kai Wallet</div>
                  </div>

                  {/* Summary rows */}
                  <div style={{
                    border: "1px solid #1a1a1a",
                    borderRadius: 10,
                    overflow: "hidden",
                    marginBottom: 14,
                  }}>
                    {[
                      { icon: "💳", label: "Payment via", value: "UPI / Card / Net Banking" },
                      { icon: "⚡", label: "Processed by", value: "Razorpay" },
                    ].map(({ icon, label, value }, i, arr) => (
                      <div key={label} style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 14px",
                        borderBottom: i < arr.length - 1 ? "1px solid #1a1a1a" : "none",
                        background: "#0d0d0d",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 14 }}>{icon}</span>
                          <span style={{ fontSize: 12, color: "#666" }}>{label}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#aaa" }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  {/* Pop-up warning — Razorpay checkout opens in a pop-up, and UPI
                      apps are launched from it. If pop-ups are blocked the checkout
                      never opens and the user is left on the processing spinner. */}
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    background: "rgba(245,158,11,0.06)",
                    border: "1px solid rgba(245,158,11,0.22)",
                    borderRadius: 8,
                    padding: "12px 14px",
                    marginBottom: 14,
                  }}>
                    <span style={{ fontSize: 14, lineHeight: 1.4, flexShrink: 0 }}>⚠</span>
                    <span style={{ fontSize: 11, color: "#c99a4a", lineHeight: 1.6 }}>
                      <strong style={{ color: "#f59e0b", fontWeight: 700 }}>Allow pop-ups for this site.</strong>{" "}
                      The payment window opens as a pop-up. If pop-ups are blocked, your
                      UPI or banking app won&apos;t open and this page will stay stuck on
                      the loading screen.
                    </span>
                  </div>

                  {/* Terms checkbox */}
                  <label style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    cursor: "pointer", marginBottom: 16,
                    padding: "12px 14px",
                    background: termsAccepted ? "rgba(200,255,62,0.04)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${termsAccepted ? "rgba(200,255,62,0.2)" : "#1f1f1f"}`,
                    borderRadius: 8,
                    transition: "border-color 0.2s, background 0.2s",
                  }}>
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => { setTermsAccepted(e.target.checked); setModalError(null); }}
                      style={{ marginTop: 1, accentColor: "#c8ff3e", width: 15, height: 15, flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 11, color: "#666", lineHeight: 1.6 }}>
                      I agree to the{" "}
                      <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e", textDecoration: "none" }}>Terms</a>
                      ,{" "}
                      <a href="/refund-policy" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e", textDecoration: "none" }}>Refund Policy</a>
                      {" "}&amp;{" "}
                      <a href="/privacy" target="_blank" rel="noopener noreferrer" style={{ color: "#c8ff3e", textDecoration: "none" }}>Privacy Policy</a>
                    </span>
                  </label>

                  {modalError && (
                    <div style={{ color: "#f87171", fontSize: 12, marginBottom: 12 }}>{modalError}</div>
                  )}

                  {/* Pay button */}
                  <button
                    onClick={handleProceedToPayment}
                    disabled={!termsAccepted}
                    style={{
                      width: "100%",
                      background: termsAccepted ? "#c8ff3e" : "#161616",
                      color: termsAccepted ? "#000" : "#444",
                      border: `1px solid ${termsAccepted ? "transparent" : "#222"}`,
                      borderRadius: 10, padding: "14px",
                      fontSize: 14, fontWeight: 800,
                      cursor: termsAccepted ? "pointer" : "not-allowed",
                      letterSpacing: "0.02em",
                      transition: "background 0.2s, color 0.2s",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    }}
                  >
                    <span>Pay ₹{amountStr}</span>
                    {termsAccepted && <span style={{ fontSize: 12, opacity: 0.7, fontWeight: 500 }}>via Razorpay →</span>}
                  </button>

                  {/* Security line */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 12 }}>
                    <span style={{ fontSize: 10, color: "#333" }}>🔒</span>
                    <span style={{ fontSize: 10, color: "#333", letterSpacing: "0.04em" }}>256-bit SSL · Secured by Razorpay</span>
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
