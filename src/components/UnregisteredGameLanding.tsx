"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { buildApiUrl } from "@/utils/api";
import "./UnregisteredGameLanding.css";
import ProgressBar from "./ui/ProgressBar";

interface GameDetails {
  _id: string;
  title: string;
  scheduledAt: string;
  format: string;
  totalSlots: number;
  spotsRemaining: number;
  feeInPaise: number;
  status: string;
  durationMins?: number;
  reportingMinsBeforeGame?: number;
  turf: { name: string; address?: { city?: string } } | null;
  organiser: { _id: string; name: string; profileImage?: string | null } | null;
  registrations: Array<{
    player?: { name: string; profileImage?: string | null };
    plusOneName?: string | null;
  }>;
  organiserIsPlaying?: boolean;
  waitlist: Array<{ player?: { name: string } }>;
  guestWaitlist: Array<{ player?: { name: string } }>;
  _playerDataBlurred?: boolean;
}

interface Props {
  gameId: string;
  onSignupClick: (gameId: string) => void;
}

/** Names come back blurred for unregistered viewers, so rows show a placeholder. */
function Avatar({ tone = "player" }: { tone?: "player" | "organiser" }) {
  return <div className={`ugl-avatar blurred ${tone === "organiser" ? "organiser" : ""}`}>?</div>;
}

function LinkIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}

function statusBadge(status: string, isFull: boolean): { label: string; tone: string } {
  if (status === "cancelled") return { label: "Cancelled", tone: "red" };
  if (status === "completed") return { label: "Completed", tone: "grey" };
  if (status === "live") return { label: "Live", tone: "green" };
  if (isFull) return { label: "Full", tone: "amber" };
  return { label: "Open", tone: "green" };
}

export function UnregisteredGameLanding({ gameId, onSignupClick }: Props) {
  const [game, setGame] = useState<GameDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<"players" | "details">("players");

  useEffect(() => {
    const fetchGame = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(buildApiUrl(`/api/v1/games/${gameId}/public`));
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || "Failed to load game details");
        }

        setGame(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load game");
      } finally {
        setLoading(false);
      }
    };

    if (gameId) {
      fetchGame();
    }
  }, [gameId]);

  const handleCopyLink = () => {
    const url = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${gameId}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="ugl-page">
        <div className="ugl-status">
          <div className="ugl-status-icon">⚽</div>
          <p className="ugl-status-text">Loading game details…</p>
        </div>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="ugl-page">
        <div className="ugl-status">
          <div className="ugl-status-icon">⚠️</div>
          <h1 className="ugl-status-title">Game Not Found</h1>
          <p className="ugl-status-text">{error || "This game is no longer available or has ended."}</p>
          <Link href="/" className="ugl-status-link">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  const { turf, organiser, registrations, waitlist, spotsRemaining, totalSlots } = game;
  const seatedPlayers = registrations.filter((r) => r.player);
  const guests = registrations.filter((r) => r.plusOneName);
  const isFull = spotsRemaining === 0;
  const fee = Math.round(game.feeInPaise / 100);
  const badge = statusBadge(game.status, isFull);

  const organiserPlaying = !!game.organiserIsPlaying && !!organiser;
  const takenCount = Math.max(0, totalSlots - spotsRemaining);
  const fillPercent = totalSlots > 0 ? Math.min(100, (takenCount / totalSlots) * 100) : 0;
  const IST = "Asia/Kolkata";
  const scheduled = new Date(game.scheduledAt);
  const durationMins = Number(game.durationMins ?? 60);
  const reportMins = Number(game.reportingMinsBeforeGame ?? 30);

  const timeAt = (offsetMins: number) =>
    Number.isNaN(scheduled.getTime())
      ? "TBC"
      : new Date(scheduled.getTime() + offsetMins * 60000).toLocaleTimeString("en-IN", {
          timeZone: IST,
          hour: "2-digit",
          minute: "2-digit",
        });

  const dateLong = scheduled.toLocaleDateString("en-IN", {
    timeZone: IST,
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const venueName = turf?.name || "TBC";
  const cityName = turf?.address?.city || "TBC";
  const metaLine = [turf?.name, turf?.address?.city, dateLong].filter(Boolean).join(" · ");

  const detailCells: Array<{ label: string; value: string; sub?: string; accent?: boolean; full?: boolean }> = [
    { label: "Format", value: game.format || "TBC" },
    { label: "Duration", value: `${durationMins} mins` },
    { label: "Fee", value: fee === 0 ? "Free" : `₹${fee}`, sub: "per player" },
    {
      label: "Total slots",
      value: `${takenCount} / ${totalSlots}`,
      sub: spotsRemaining > 0 ? `${spotsRemaining} spot${spotsRemaining === 1 ? "" : "s"} left` : "Full",
      accent: true,
    },
    { label: "Report by", value: timeAt(-reportMins) },
    { label: "Kick-off", value: timeAt(0) },
    { label: "Ends", value: timeAt(durationMins) },
    { label: "Venue", value: `${venueName}, ${cityName}`, full: true },
  ];

  return (
    <div className="ugl-page">
      <div className="ugl-shell">
        <div className="ugl-topbar">
          <Link href={`/login?role=player&redirect=/join/${gameId}`} className="ugl-login-link">
            Log in
          </Link>
        </div>

        <div className="ugl-event-head">
          <div className="ugl-head-row">
            <span className="ugl-eyebrow">Event Details</span>
            <span className={`ugl-status-badge ${badge.tone}`}>{badge.label}</span>
          </div>

          <h1 className="ugl-event-title">{game.title}</h1>
          {metaLine && <p className="ugl-event-meta">{metaLine}</p>}

          <button
            type="button"
            className={`ugl-copy-btn${copied ? " copied" : ""}`}
            onClick={handleCopyLink}
          >
            <LinkIcon />
            {copied ? "Copied" : "Copy Link"}
          </button>
        </div>

        <div className="ugl-tabs">
          <button
            type="button"
            className={`ugl-tab${tab === "players" ? " active" : ""}`}
            onClick={() => setTab("players")}
          >
            Players
            <span className="ugl-tab-count">{takenCount}</span>
          </button>
          <button
            type="button"
            className={`ugl-tab${tab === "details" ? " active" : ""}`}
            onClick={() => setTab("details")}
          >
            Details
          </button>
        </div>

        {tab === "players" ? (
          <div className="ugl-panel">
            <div className="ugl-section-head">
              <span className="ugl-section-title">Players</span>
            </div>
            <ProgressBar spotsTotal={totalSlots} spotsLeft={spotsRemaining} />
            {takenCount === 0 ? (
              <p className="ugl-empty-text">No players confirmed yet — be the first in.</p>
            ) : (
              <div className="ugl-list">
                {organiserPlaying && (
                  <div className="ugl-row organiser">
                    <Avatar tone="organiser" />
                    <div className="ugl-row-text">
                      <div className="ugl-row-name blurred">{organiser.name}</div>
                      <div className="ugl-row-sub">Organiser</div>
                    </div>
                    <span className="ugl-row-pill">Organiser</span>
                  </div>
                )}

                {seatedPlayers.map((reg, index) => (
                  <div className="ugl-row" key={`p-${index}`}>
                    <Avatar />
                    <div className="ugl-row-text">
                      <div className="ugl-row-name blurred">{reg.player?.name || "Player"}</div>
                    </div>
                  </div>
                ))}

                {guests.map((guest, index) => (
                  <div className="ugl-row" key={`g-${index}`}>
                    <Avatar />
                    <div className="ugl-row-text">
                      <div className="ugl-row-name blurred">{guest.plusOneName}</div>
                    </div>
                    <span className="ugl-row-pill guest">Guest</span>
                  </div>
                ))}
              </div>
            )}

            {waitlist.length > 0 && (
              <div className="ugl-banner">
                ⏳ {waitlist.length} player{waitlist.length > 1 ? "s are" : " is"} on the waitlist for this game.
              </div>
            )}

            <div className="ugl-locked-note">
              🔒 Player names are hidden until you join. Sign up to see who&apos;s playing.
            </div>
          </div>
        ) : (
          <div className="ugl-panel">
            <div className="ugl-dt-grid">
              {detailCells.map((cell) => (
                <div key={cell.label} className={`ugl-dt-cell${cell.full ? " full" : ""}`}>
                  <div className="ugl-dt-label">{cell.label}</div>
                  <div className={`ugl-dt-val${cell.accent ? " accent" : ""}`}>{cell.value}</div>
                  {cell.sub && <div className="ugl-dt-sub">{cell.sub}</div>}
                </div>
              ))}
            </div>

            {isFull && (
              <div className="ugl-banner">
                ⏳ This game is full. Join the waitlist — you get the spot if someone backs out, and
                there&apos;s no charge until then.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="ugl-cta-bar">
        <div className="ugl-cta-inner">
          <button type="button" className="ugl-cta" onClick={() => onSignupClick(gameId)}>
            ⚽ {isFull ? "Sign-up to join waitlist" : "Sign-up to book now"}
          </button>
          <p className="ugl-cta-hint">
            By booking, you agree to our <a href="/terms">Terms</a> and{" "}
            <a href="/privacy">Privacy Policy</a>
          </p>
        </div>
      </div>
    </div>
  );
}
