"use client";

// ── Hosting ──────────────────────────────────────────────────────────────────
//
// For a player an organiser trusts to run their games on the day. Four things,
// in the order they need attention:
//
//   Requests       an organiser asked you to facilitate a game (run it without
//                  playing) — Accept or Decline
//   Your games     games you are running, as a host (you booked a host spot) or
//                  a facilitator; each opens the host tools
//   Host spots     spots held for you in your organisers' upcoming games, at
//                  their discount — book them from the game page as usual
//   You host for   the organisers who made you a host; you can step down
//
// Everything on this page comes from one read (GET /hosting/me). Whether a host
// spot is bookable, and at what price, is the server's answer — the booking uses
// the same gate.

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Toast, useToast } from "@/components/ui/Toast";
import {
  fetchHosting,
  respondToFacilitation,
  stepDownAsHost,
  rupees,
  whenText,
  type HostingGameCard,
  type HostingSummary,
} from "@/utils/hosting";
import "../player-dashboard.css";
import "./hosting.css";

const venueOf = (g: HostingGameCard) =>
  [g.turf?.name, g.turf?.address?.area || g.turf?.address?.city].filter(Boolean).join(", ");

export default function HostingPage() {
  const router = useRouter();
  const { isAuthorized } = useAuthGuard({ requiredRole: "player", redirectTo: "/login?role=player" });
  const { toast, showToast, hideToast } = useToast();

  const [data, setData] = useState<HostingSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [stepDown, setStepDown] = useState<HostingSummary["hostFor"][number] | null>(null);

  const load = useCallback(async () => {
    try {
      setData(await fetchHosting());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't load your hosting.");
    }
  }, []);

  useEffect(() => { if (isAuthorized) load(); }, [isAuthorized, load]);

  // Something changed that the sidebar badge reads.
  const announce = () => window.dispatchEvent(new CustomEvent("kk-hosting-changed"));

  const answer = async (g: HostingGameCard, accept: boolean) => {
    setBusy(g._id);
    try {
      await respondToFacilitation(g._id, accept);
      showToast("success", accept ? "You're facilitating" : "Declined", g.title || "Game", 2500);
      announce();
      load();
    } catch (err) {
      showToast("error", "Couldn't answer", err instanceof Error ? err.message : undefined, 3500);
    } finally {
      setBusy(null);
    }
  };

  const confirmStepDown = async () => {
    if (!stepDown) return;
    setBusy(stepDown._id);
    try {
      await stepDownAsHost(stepDown._id);
      showToast("success", "You've stepped down", stepDown.organiser?.name || undefined, 2500);
      setStepDown(null);
      announce();
      load();
    } catch (err) {
      showToast("error", "Couldn't step down", err instanceof Error ? err.message : undefined, 3500);
    } finally {
      setBusy(null);
    }
  };

  if (!isAuthorized) return null;

  return (
    <div className="player-dashboard-container">
      <div className="page-header">
        <div className="page-title-group">
          <div className="page-title">Hosting</div>
          <p className="hs-intro">
            Organisers trust you to run their games on the day — check-in, teams and wrap-up. Book a host
            spot at their discount, or run a game without playing when an organiser asks.
          </p>
        </div>
      </div>

      {error && <div className="hs-error">{error}</div>}
      {!data && !error && (
        <div className="loading-container"><div className="spinner" /><p>Loading…</p></div>
      )}

      {data && (
        <>
          {/* ── Requests ── */}
          {data.invites.length > 0 && (
            <>
              <div className="hs-section-head">
                <span className="hs-section-title">Asked to run a game</span>
                <span className="hs-section-count">{data.invites.length}</span>
              </div>
              <div className="hs-list">
                {data.invites.map((g) => (
                  <div key={g._id} className="hs-card hs-card--accent">
                    <div className="hs-card-main">
                      <div className="hs-card-title">{g.title || "Game"}</div>
                      <div className="hs-card-meta">
                        {whenText(g.scheduledAt)}{venueOf(g) ? ` · ${venueOf(g)}` : ""}
                        {g.format ? ` · ${g.format}` : ""}
                      </div>
                      <div className="hs-card-meta">
                        {g.invitedByName || g.organiser?.name || "The organiser"} asked you to facilitate — you won&apos;t take a spot.
                      </div>
                      {g.note && <div className="hs-card-note">&ldquo;{g.note}&rdquo;</div>}
                    </div>
                    <div className="hs-card-actions">
                      <button className="hs-btn hs-btn--ghost" disabled={busy !== null} onClick={() => answer(g, false)}>
                        Decline
                      </button>
                      <button className="hs-btn hs-btn--primary" disabled={busy !== null} onClick={() => answer(g, true)}>
                        {busy === g._id ? "…" : "Accept"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Your games ── */}
          <div className="hs-section-head">
            <span className="hs-section-title">Games you&apos;re running</span>
            <span className="hs-section-count">{data.running.length}</span>
          </div>
          {data.running.length === 0 ? (
            <div className="hs-empty">
              Nothing yet. Book a host spot below, or accept a request to facilitate — the host tools for that
              game will appear here.
            </div>
          ) : (
            <div className="hs-list">
              {data.running.map((g) => (
                <div key={g._id} className="hs-card">
                  <div className="hs-card-main">
                    <div className="hs-card-title">
                      {g.title || "Game"}
                      <span className="hs-badge">{g.staffRole === "facilitator" ? "Facilitator" : "Host"}</span>
                      {g.status === "completed" && <span className="hs-badge hs-badge--muted">Completed</span>}
                    </div>
                    <div className="hs-card-meta">
                      {whenText(g.scheduledAt)}{venueOf(g) ? ` · ${venueOf(g)}` : ""}
                      {g.organiser?.name ? ` · for ${g.organiser.name}` : ""}
                    </div>
                  </div>
                  <div className="hs-card-actions">
                    <button className="hs-btn hs-btn--primary" onClick={() => router.push(`/dashboard/hosting/${g._id}`)}>
                      Open host tools
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Host spots ── */}
          {data.isHost && (
            <>
              <div className="hs-section-head">
                <span className="hs-section-title">Host spots open for you</span>
                <span className="hs-section-count">{data.openSpots.length}</span>
              </div>
              {data.openSpots.length === 0 ? (
                <div className="hs-empty">
                  No open host spots right now. You&apos;ll get a notification when one of your organisers adds a
                  game with host spots.
                </div>
              ) : (
                <div className="hs-list">
                  {data.openSpots.map((g) => (
                    <div key={g._id} className="hs-card">
                      <div className="hs-card-main">
                        <div className="hs-card-title">{g.title || "Game"}</div>
                        <div className="hs-card-meta">
                          {whenText(g.scheduledAt)}{venueOf(g) ? ` · ${venueOf(g)}` : ""}
                          {g.organiser?.name ? ` · ${g.organiser.name}` : ""}
                        </div>
                        <div className="hs-card-meta">
                          {g.hostSpotsOpen} host spot{g.hostSpotsOpen === 1 ? "" : "s"} open ·{" "}
                          <span className="hs-price">{rupees(g.pricePaise)}</span>
                          {(g.discountPaise || 0) > 0 && <span className="hs-price-was">{rupees(g.feeInPaise)}</span>}
                        </div>
                      </div>
                      <div className="hs-card-actions">
                        <button className="hs-btn hs-btn--primary" onClick={() => router.push(`/dashboard?openGame=${g._id}`)}>
                          Book as host
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ── You host for ── */}
          {data.hostFor.length > 0 && (
            <>
              <div className="hs-section-head">
                <span className="hs-section-title">You host for</span>
              </div>
              <div className="hs-list">
                {data.hostFor.map((h) => (
                  <div key={h._id} className="hs-card">
                    <div className="hs-card-main">
                      <div className="hs-card-title">{hostForTitle(h)}</div>
                      {(h.scope ?? "organiser") !== "organiser" && (
                        <div className="hs-card-meta">
                          {h.covers ? h.covers.map((o) => o.name).join(", ") : "Host spots in any organiser's games"}
                          {h.organiser?.name ? ` · recommended by ${h.organiser.name}` : ""}
                        </div>
                      )}
                      {h.since && (
                        <div className="hs-card-meta">
                          Host since {new Date(h.since).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}
                        </div>
                      )}
                    </div>
                    <div className="hs-card-actions">
                      <button className="hs-btn hs-btn--danger" disabled={busy !== null} onClick={() => setStepDown(h)}>
                        Step down
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {!data.isHost && data.invites.length === 0 && data.running.length === 0 && (
            <div className="hs-empty" style={{ marginTop: 16 }}>
              You aren&apos;t hosting for anyone yet. Organisers recommend the regulars they trust, and KasaKai
              approves them — you&apos;ll get a notification if that&apos;s you.
            </div>
          )}
        </>
      )}

      <ConfirmationModal
        open={!!stepDown}
        title="Step down as host?"
        message={`You'll stop hosting for ${stepDown ? hostForTitle(stepDown).replace(/^All organisers$/, "every organiser") : "this organiser"}: no more host spots, and any games you were asked to facilitate are handed back. Host spots you've already booked stay yours.`}
        confirmLabel="Step down"
        loading={busy !== null}
        onConfirm={confirmStepDown}
        onCancel={() => setStepDown(null)}
      />

      {toast && <Toast type={toast.type} title={toast.title} subtitle={toast.subtitle} onClose={hideToast} />}
    </div>
  );
}

/** "Bilal" / "All organisers" / "3 organisers" — who one approval lets you host for. */
function hostForTitle(h: HostingSummary["hostFor"][number]) {
  const scope = h.scope ?? "organiser";
  if (scope === "all") return "All organisers";
  if (scope === "organisers") return h.scopeLabel || `${h.covers?.length ?? 0} organisers`;
  return h.organiser?.name || "Organiser";
}
