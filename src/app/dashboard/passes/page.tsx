"use client";

// ── My Passes ────────────────────────────────────────────────────────────────
//
// The player's own view of every pass they hold or have held. One card each:
// what it covers in a sentence, what is left on it, when it runs out, and what
// it has actually been worth to them.
//
// That last line is the renewal pitch and it costs nothing to compute — the
// server already sums it off the redemption ledger.
//
// Every word describing a pass comes from the server's `described` block, which
// is `passRules.describePass`. Nothing here re-derives a rule: the engine that
// decides whether a pass covers a game is the same one that writes the sentence
// saying so, which is why the card and the till can never disagree.

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { useWalletTopUp } from "@/hooks/useWalletTopUp";
import { PassStore } from "@/components/pass/PassStore";
import "../player-dashboard.css";
import "./passes.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DescribedPass {
  benefitText: string;
  scopeText: string;
  summary: string;
  expiresText: string;
  coversGuests: number;
  limits: {
    maxRedemptions: number;
    maxBenefitPaise: number;
    maxPerDay: number;
    maxPerWeek: number;
    maxPerMonth: number;
  };
  used: { redemptions: number; benefitPaise: number };
  remaining: { redemptions: number | null; benefitPaise: number | null };
}

interface MyPass {
  _id: string;
  code: string;
  name: string;
  status: "pending" | "active" | "exhausted" | "expired" | "revoked" | "refunded";
  source: "purchase" | "grant" | "migration" | "compensation";
  activatesAt: string | null;
  expiresAt: string | null;
  pricePaidPaise: number;
  grantReason: string | null;
  revokeReason: string | null;
  described: DescribedPass;
  savedPaise: number;
  gamesCovered: number;
  lastRedeemedAt: string | null;
}

interface Redemption {
  _id: string;
  benefitPaise: number;
  feePaise: number;
  createdAt: string;
  game?: { _id: string; title?: string; scheduledAt?: string } | null;
}

const rupees = (paise: number) =>
  `₹${Math.round((paise || 0) / 100).toLocaleString("en-IN")}`;

const shortDate = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleDateString("en-IN", {
        day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata",
      })
    : "";

// How many whole days are left, counted in IST calendar days — a pass is good
// through the whole of its expiry day, so "expires today" is not "expired".
const daysLeft = (iso?: string | null): number | null => {
  if (!iso) return null;
  const end = new Date(iso);
  const endOfDay = new Date(
    Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()) + 24 * 3600 * 1000,
  );
  return Math.ceil((endOfDay.getTime() - Date.now()) / (24 * 3600 * 1000));
};

const countdown = (pass: MyPass): string => {
  if (pass.status === "revoked")  return "Withdrawn";
  if (pass.status === "refunded") return "Refunded";
  if (pass.status === "expired")  return `Expired ${shortDate(pass.expiresAt)}`;
  if (!pass.expiresAt)            return "No expiry";
  const left = daysLeft(pass.expiresAt);
  if (left === null)  return "No expiry";
  if (left <= 0)      return "Expires today";
  if (left === 1)     return "Expires tomorrow";
  if (left <= 30)     return `${left} days left`;
  return `Valid to ${shortDate(pass.expiresAt)}`;
};

// ── Card ──────────────────────────────────────────────────────────────────────

function PassCard({ pass }: { pass: MyPass }) {
  const [usage, setUsage] = useState<Redemption[] | null>(null);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const spent = !["active", "pending"].includes(pass.status);

  const { maxRedemptions, maxBenefitPaise } = pass.described.limits;
  // A pass bounded by games shows games; one bounded only by value shows value;
  // an unbounded one has no meter to show, because there is nothing to run out.
  const meter = maxRedemptions
    ? {
        used: pass.described.used.redemptions,
        total: maxRedemptions,
        label: `${pass.described.used.redemptions} of ${maxRedemptions} games used`,
        left: `${pass.described.remaining.redemptions ?? 0} left`,
      }
    : maxBenefitPaise
      ? {
          used: pass.described.used.benefitPaise,
          total: maxBenefitPaise,
          label: `${rupees(pass.described.used.benefitPaise)} of ${rupees(maxBenefitPaise)} used`,
          left: `${rupees(pass.described.remaining.benefitPaise ?? 0)} left`,
        }
      : null;

  const loadUsage = async () => {
    if (usage || loadingUsage) { setUsage(usage ? null : usage); return; }
    const { token } = getSession();
    if (!token) return;
    setLoadingUsage(true);
    try {
      const res = await fetch(buildApiUrl(`/passes/mine/${pass._id}/redemptions`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d?.success) setUsage(d.data?.rows || []);
    } catch {
      // Non-critical: the card is still complete without its history.
    } finally {
      setLoadingUsage(false);
    }
  };

  return (
    <div className={`mp-card ${spent ? "mp-spent" : ""}`}>
      <div className="mp-card-top">
        <div className="mp-card-name">{pass.name}</div>
        <span className={`mp-status mp-status-${pass.status}`}>{pass.status}</span>
      </div>

      <div className="mp-scope">{pass.described.summary}</div>

      {meter && (
        <div className="mp-meter">
          <div className="mp-meter-track">
            <div
              className={`mp-meter-fill ${meter.used >= meter.total ? "mp-meter-done" : ""}`}
              style={{ width: `${Math.min(100, Math.round((meter.used / meter.total) * 100))}%` }}
            />
          </div>
          <div className="mp-meter-label">
            <span>{meter.label}</span>
            <span>{meter.left}</span>
          </div>
        </div>
      )}

      <div className="mp-facts">
        <div><strong>{countdown(pass)}</strong></div>
        {pass.status === "pending" && pass.activatesAt && (
          <div>Starts {shortDate(pass.activatesAt)}</div>
        )}
        {pass.described.coversGuests > 0 && (
          <div>Covers {pass.described.coversGuests} guest{pass.described.coversGuests > 1 ? "s" : ""} a game</div>
        )}
        {pass.source === "grant" && pass.grantReason && <div>Given to you — {pass.grantReason}</div>}
        {pass.status === "revoked" && pass.revokeReason && <div>{pass.revokeReason}</div>}
      </div>

      {pass.gamesCovered > 0 && (
        <div className="mp-saved">
          You&apos;ve saved {rupees(pass.savedPaise)} on {pass.gamesCovered} game
          {pass.gamesCovered === 1 ? "" : "s"}
          {pass.pricePaidPaise > 0 && <span> · paid {rupees(pass.pricePaidPaise)}</span>}
        </div>
      )}

      {pass.gamesCovered > 0 && (
        <button className="mp-usage-toggle" onClick={loadUsage}>
          {loadingUsage ? "Loading…" : usage ? "Hide where it was used" : "Where was it used?"}
        </button>
      )}

      {usage && usage.length > 0 && (
        <div className="mp-usage">
          {usage.map((r) => (
            <div key={r._id} className="mp-usage-row">
              <span>
                {r.game?.title || "Game"}
                {r.game?.scheduledAt ? ` · ${shortDate(r.game.scheduledAt)}` : ""}
              </span>
              <b>−{rupees(r.benefitPaise)}</b>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function MyPassesPage() {
  const router = useRouter();
  const { isAuthorized } = useAuthGuard({
    requiredRole: "player",
    redirectTo: "/login?role=player",
  });

  const [live, setLive] = useState<MyPass[]>([]);
  const [past, setPast] = useState<MyPass[]>([]);
  const [totals, setTotals] = useState({ savedPaise: 0, gamesCovered: 0, spentPaise: 0 });
  const [loading, setLoading] = useState(true);
  // The same top-up sheet a booking uses: a pass that costs more than the wallet
  // holds is a recharge, not a refusal.
  const { requestTopUp, topUpSheet } = useWalletTopUp();

  const fetchPasses = useCallback(async () => {
    const { token } = getSession();
    if (!token) { clearSession(); router.replace("/login?role=player"); return; }
    setLoading(true);
    try {
      const res = await fetch(buildApiUrl("/passes/mine"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d?.success) {
        setLive(d.data?.live || []);
        setPast(d.data?.past || []);
        setTotals(d.data?.totals || { savedPaise: 0, gamesCovered: 0, spentPaise: 0 });
      }
    } catch {
      // Leaves the empty state up, which reads correctly either way.
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!isAuthorized) { setLoading(false); return; }
    fetchPasses();
  }, [isAuthorized, fetchPasses]);

  return (
    <div className="player-dashboard-container">
      {topUpSheet}
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">My <span>Passes</span></div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading…</p></div>
      ) : (
        <>
          {totals.gamesCovered > 0 && (
            <div className="mp-summary">
              <div className="mp-stat">
                <div className="mp-stat-value mp-lime">{rupees(totals.savedPaise)}</div>
                <div className="mp-stat-label">Saved</div>
              </div>
              <div className="mp-stat">
                <div className="mp-stat-value">{totals.gamesCovered}</div>
                <div className="mp-stat-label">Games covered</div>
              </div>
              {totals.spentPaise > 0 && (
                <div className="mp-stat">
                  <div className="mp-stat-value">{rupees(totals.spentPaise)}</div>
                  <div className="mp-stat-label">Spent on passes</div>
                </div>
              )}
            </div>
          )}

          {live.length === 0 && past.length === 0 ? (
            <div className="mp-empty">
              <div className="mp-empty-title">No passes yet</div>
              <p className="mp-empty-body">
                A pass covers your entry to the games it applies to — a city, a
                time of day, a set of venues. Passes are issued by the KasaKai
                team; ask your organiser how to get one.
              </p>
            </div>
          ) : (
            <>
              {live.length > 0 && (
                <>
                  <div className="mp-section-head">
                    <span className="mp-section-title">Your passes</span>
                    <span className="mp-section-count">{live.length}</span>
                  </div>
                  <div className="mp-cards">
                    {live.map((p) => <PassCard key={p._id} pass={p} />)}
                  </div>
                </>
              )}

              {past.length > 0 && (
                <>
                  <div className="mp-section-head">
                    <span className="mp-section-title">Past passes</span>
                    <span className="mp-section-count">{past.length}</span>
                  </div>
                  <div className="mp-cards">
                    {past.map((p) => <PassCard key={p._id} pass={p} />)}
                  </div>
                </>
              )}
            </>
          )}

          {/* Below what they already hold: somebody opening this page is usually
              checking a pass, not shopping. */}
          <PassStore requestTopUp={requestTopUp} onPurchased={fetchPasses} />
        </>
      )}
    </div>
  );
}
