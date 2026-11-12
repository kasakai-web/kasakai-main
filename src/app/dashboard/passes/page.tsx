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
import { PassStore } from "@/components/pass/PassStore";
import { PassTimeline, daysLeft, passDate } from "@/components/pass/PassTimeline";
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
  validityDays: number | null;
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

const STATUS_LABEL: Record<MyPass["status"], string> = {
  active: "Active",
  pending: "Not started",
  exhausted: "Used up",
  expired: "Expired",
  revoked: "Withdrawn",
  refunded: "Refunded",
};

// What the right-hand end of the timeline says about today.
const countdown = (pass: MyPass): string | null => {
  if (pass.status === "revoked")  return "Withdrawn";
  if (pass.status === "refunded") return "Refunded";
  if (pass.status === "expired")  return "Ended";
  const left = daysLeft(pass.expiresAt);
  if (left === null) return null;
  if (left === 0)    return "Ended";
  if (left === 1)    return "Last day today";
  if (left === 2)    return "Ends tomorrow";
  return `${left} days left`;
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

  const left = countdown(pass);
  const ending = pass.status === "active" && (daysLeft(pass.expiresAt) ?? 99) <= 3;

  return (
    <div className={`kp-ticket kp-status-${pass.status} ${spent ? "kp-spent" : ""}`}>
      <div className="kp-head">
        <div className="kp-head-row">
          <span className="kp-kicker">KasaKai · Pass</span>
          <span className={`kp-chip kp-chip-${pass.status}`}>{STATUS_LABEL[pass.status]}</span>
        </div>
        <div className="kp-name">{pass.name}</div>
        <div className="kp-scope">{pass.described.summary}</div>
      </div>

      <div className="kp-perf" aria-hidden="true" />

      <div className="kp-body">
        {pass.activatesAt ? (
          <PassTimeline
            from={pass.activatesAt}
            until={pass.expiresAt}
            showProgress={!spent}
            caption={left && <b className={ending ? "kp-warn" : ""}>{left}</b>}
          />
        ) : (
          // Waiting for its first covered booking: no dates exist yet.
          <div className="kp-timeline">
            <div className="kp-timeline-label">Valid</div>
            <div className="kp-pending-note">
              Starts on your first covered game
              {pass.validityDays ? <> · runs <b>{pass.validityDays} days</b> from then</> : null}
            </div>
          </div>
        )}

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

        {(pass.described.coversGuests > 0 || (pass.source === "grant" && pass.grantReason) ||
          (pass.status === "revoked" && pass.revokeReason)) && (
          <div className="mp-facts">
            {pass.described.coversGuests > 0 && (
              <div>Covers {pass.described.coversGuests} guest{pass.described.coversGuests > 1 ? "s" : ""} a game</div>
            )}
            {pass.source === "grant" && pass.grantReason && <div>Given to you — {pass.grantReason}</div>}
            {pass.status === "revoked" && pass.revokeReason && <div>{pass.revokeReason}</div>}
          </div>
        )}

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
                  {r.game?.scheduledAt ? ` · ${passDate(r.game.scheduledAt)}` : ""}
                </span>
                <b>−{rupees(r.benefitPaise)}</b>
              </div>
            ))}
          </div>
        )}
      </div>
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
  const [showHistory, setShowHistory] = useState(false);

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
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">My <span>Passes</span></div>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="spinner" /><p>Loading…</p></div>
      ) : (
        <>
          {/* The shelf first: it is what this page has that nothing else in the
              app does. A held pass is also shown on every game it covers. */}
          <PassStore
            onPurchased={() => {
              fetchPasses();
              window.dispatchEvent(new Event("kk-passes-changed"));
            }}
          />

          <div className="mp-section-head">
            <span className="mp-section-title">Your passes</span>
            {live.length > 0 && <span className="mp-section-count">{live.length}</span>}
          </div>

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

          {live.length > 0 ? (
            <div className="mp-cards">
              {live.map((p) => <PassCard key={p._id} pass={p} />)}
            </div>
          ) : (
            <div className="mp-empty">
              <div className="mp-empty-title">No active pass</div>
              <p className="mp-empty-body">
                A pass covers your entry to the games it applies to — a city, a
                time of day, a set of venues. Pick one above to get started.
              </p>
            </div>
          )}

          {/* History is there when asked for and out of the way otherwise:
              expired and withdrawn passes are reference, not something to act on. */}
          {past.length > 0 && (
            <>
              <button
                type="button"
                className="mp-history-toggle"
                aria-expanded={showHistory}
                onClick={() => setShowHistory((v) => !v)}
              >
                <span>{showHistory ? "Hide pass history" : "View pass history"}</span>
                <span className="mp-history-count">{past.length}</span>
                <span className={`mp-history-chevron ${showHistory ? "mp-open" : ""}`} aria-hidden="true">▾</span>
              </button>
              {showHistory && (
                <div className="mp-cards mp-history">
                  {past.map((p) => <PassCard key={p._id} pass={p} />)}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
