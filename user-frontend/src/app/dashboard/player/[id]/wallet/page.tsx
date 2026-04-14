"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl, getSession, clearSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import "../../../player-dashboard.css";

interface WalletData {
  _id: string;
  balancePaise: number;
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
  backout_fee: { label: "Backout fee", sign: "−", color: "#f87171", icon: "⚠" },
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

  // Recharge modal state
  const [showRecharge, setShowRecharge] = useState(false);
  const [rechargeAmountStr, setRechargeAmountStr] = useState("");
  const [rechargeLoading, setRechargeLoading] = useState(false);
  const [rechargeError, setRechargeError] = useState<string | null>(null);
  const [rechargeSuccess, setRechargeSuccess] = useState(false);

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
    } catch (err: any) {
      setError(err.message || "Failed to load wallet");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) { setLoading(false); return; }
    fetchWallet();
  }, [isAuthorized, fetchWallet]);

  const handleRecharge = async () => {
    setRechargeError(null);
    const amount = parseFloat(rechargeAmountStr);
    if (!amount || amount <= 0) {
      setRechargeError("Enter a valid amount.");
      return;
    }
    if (amount > 100000) {
      setRechargeError("Maximum top-up is ₹1,00,000.");
      return;
    }

    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }

    setRechargeLoading(true);
    try {
      const res = await fetch(buildApiUrl("/api/v1/players/me/wallet/topup"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ amountPaise: Math.round(amount * 100) }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setRechargeError(data.message || "Top-up failed. Please try again.");
        return;
      }
      setRechargeSuccess(true);
      setWallet(data.data.wallet);
      await fetchWallet();
      setTimeout(() => {
        setShowRecharge(false);
        setRechargeSuccess(false);
        setRechargeAmountStr("");
      }, 1800);
    } catch {
      setRechargeError("Network error. Please try again.");
    } finally {
      setRechargeLoading(false);
    }
  };

  if (!isAuthorized) return null;

  return (
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

            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
              {[
                { label: "Total Added",   val: wallet?.totalTopUpPaise    ?? 0, color: "#4ade80" },
                { label: "Total Spent",   val: wallet?.totalSpentPaise    ?? 0, color: "#f87171" },
                { label: "Total Refunded",val: wallet?.totalRefundedPaise ?? 0, color: "#60a5fa" },
              ].map(({ label, val, color }) => (
                <div key={label} style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid #222",
                  borderRadius: 8,
                  padding: "10px 16px",
                  flex: "1 1 120px",
                }}>
                  <div style={{ fontSize: 11, color: "#666", marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
                  <div style={{ fontSize: 18, fontWeight: 700, color }}>{fmtRupees(val)}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => { setShowRecharge(true); setRechargeError(null); setRechargeSuccess(false); }}
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

      {/* Recharge modal */}
      {showRecharge && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
            display: "flex", alignItems: "center", justifyContent: "center",
            zIndex: 999, padding: 16,
          }}
          onClick={() => !rechargeLoading && setShowRecharge(false)}
        >
          <div
            style={{
              background: "#111", border: "1px solid #2a2a2a", borderRadius: 14,
              padding: "32px 28px", width: "100%", maxWidth: 400,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {rechargeSuccess ? (
              <div style={{ textAlign: "center", padding: "16px 0" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>✓</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: "#4ade80", marginBottom: 6 }}>
                  Wallet Recharged!
                </div>
                <div style={{ fontSize: 13, color: "#888" }}>
                  ₹{rechargeAmountStr} added to your wallet.
                </div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Recharge Wallet
                </div>
                <div style={{ fontSize: 12, color: "#666", marginBottom: 20 }}>
                  Enter the amount you want to add.
                  {/* Razorpay payment will be integrated here. */}
                </div>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12, color: "#888", display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Amount (₹)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100000}
                    placeholder="e.g. 500"
                    value={rechargeAmountStr}
                    onChange={(e) => setRechargeAmountStr(e.target.value)}
                    style={{
                      width: "100%", background: "#0a0a0a", border: "1px solid #333",
                      borderRadius: 8, padding: "12px 14px", color: "#fff",
                      fontSize: 22, fontWeight: 700, outline: "none",
                      boxSizing: "border-box",
                    }}
                    onKeyDown={(e) => e.key === "Enter" && handleRecharge()}
                    autoFocus
                  />
                </div>

                {/* Quick amount chips */}
                <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
                  {[100, 200, 500, 1000].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setRechargeAmountStr(String(amt))}
                      style={{
                        background: rechargeAmountStr === String(amt) ? "rgba(200,255,62,0.15)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${rechargeAmountStr === String(amt) ? "rgba(200,255,62,0.4)" : "#2a2a2a"}`,
                        color: rechargeAmountStr === String(amt) ? "#c8ff3e" : "#aaa",
                        borderRadius: 6, padding: "6px 14px", fontSize: 13,
                        fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>

                {rechargeError && (
                  <div style={{ color: "#f87171", fontSize: 12, marginBottom: 14 }}>
                    {rechargeError}
                  </div>
                )}

                <div style={{ display: "flex", gap: 10 }}>
                  <button
                    onClick={() => setShowRecharge(false)}
                    disabled={rechargeLoading}
                    style={{
                      flex: 1, background: "transparent", border: "1px solid #333",
                      color: "#888", borderRadius: 8, padding: "12px",
                      fontSize: 13, fontWeight: 600, cursor: "pointer",
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleRecharge}
                    disabled={rechargeLoading || !rechargeAmountStr}
                    style={{
                      flex: 2, background: rechargeLoading ? "#555" : "#c8ff3e",
                      color: "#000", border: "none", borderRadius: 8,
                      padding: "12px", fontSize: 13, fontWeight: 700,
                      cursor: rechargeLoading ? "not-allowed" : "pointer",
                    }}
                  >
                    {rechargeLoading ? "Processing…" : `Proceed to Payment`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
