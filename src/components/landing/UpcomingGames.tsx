"use client";

import { useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import type { PublicGame } from "@/hooks/usePublicGames";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { bookHref, detailsHref, enterHref } from "./authLinks";

const HOW_MANY = 3;

// All date reasoning is done in IST, so a visitor abroad sees the same "Today"
// the game actually falls on. Mirrors EventCard's getDateLabel.
const istYMD = (d: number | string | Date) =>
  new Date(d).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });

const dayMonth = (d: string) =>
  new Date(d)
    .toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata", day: "numeric", month: "short" })
    .toUpperCase();

const timeLabel = (d: string) =>
  new Date(d)
    .toLocaleTimeString("en-GB", {
      timeZone: "Asia/Kolkata",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })
    .toLowerCase();

const dateBadge = (d: string) => {
  const game = istYMD(d);
  if (game === istYMD(Date.now())) return "TODAY";
  if (game === istYMD(Date.now() + 86_400_000)) return "TOMORROW";
  return dayMonth(d);
};

/** The tab a game belongs to. Falls back to the raw city, then to a catch-all. */
const cityOf = (g: PublicGame) => g.metroLabel || g.city || "Other cities";

export function UpcomingGames({
  games,
  loading,
  error,
}: {
  games: PublicGame[];
  loading: boolean;
  error: string | null;
}) {
  const [city, setCity] = useState<string | null>(null);

  // Read once here and hand it down, so every card on the grid agrees about the
  // session instead of each subscribing to it separately.
  const isLoggedIn = useIsLoggedIn();

  // Tabs are built from what the feed actually returned rather than hardcoded,
  // so a new Kasa Kai city appears here the day its first game is listed.
  const cities = useMemo(() => {
    const seen: string[] = [];
    games.forEach((g) => {
      const label = cityOf(g);
      if (!seen.includes(label)) seen.push(label);
    });
    return seen;
  }, [games]);

  const activeCity = city && cities.includes(city) ? city : cities[0] ?? null;

  const shown = useMemo(
    () => games.filter((g) => !activeCity || cityOf(g) === activeCity).slice(0, HOW_MANY),
    [games, activeCity],
  );

  return (
    <section id="events" className="lp-section">
      <div className="lp-wrap">
        <div className="lp-games-head">
          <div>
            <h2 className="lp-h2">
              Upcoming{activeCity ? ` in ${activeCity}` : " games"}
            </h2>
            <p className="lp-lead">No team needed. Choose a game and show up.</p>
          </div>

          {cities.length > 1 && (
            <div className="lp-city-tabs" role="tablist" aria-label="Choose a city">
              {cities.map((label) => (
                <button
                  key={label}
                  type="button"
                  role="tab"
                  aria-selected={label === activeCity}
                  className={`lp-city-tab${label === activeCity ? " active" : ""}`}
                  onClick={() => setCity(label)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {loading ? (
          <div className="lp-game-grid">
            {Array.from({ length: HOW_MANY }).map((_, i) => (
              <div key={i} className="lp-game-skeleton" />
            ))}
          </div>
        ) : error ? (
          <div className="lp-games-note">
            {error}. Please refresh, or{" "}
            <a href={enterHref(isLoggedIn)} className="lp-link">
              {isLoggedIn ? "open your dashboard" : "sign up"}
            </a>{" "}
            to browse every game.
          </div>
        ) : shown.length === 0 ? (
          <div className="lp-games-note">
            {/* No link for a signed-in player: the dashboard reads the same
                empty feed, so "Create an account" would be both wrong and a
                dead end. They are already on the list that gets told. */}
            No games are open right now.{" "}
            {isLoggedIn ? (
              <>We&apos;ll tell you the moment the next one goes live.</>
            ) : (
              <>
                <a href={enterHref(isLoggedIn)} className="lp-link">
                  Create an account
                </a>{" "}
                and we&apos;ll tell you the moment the next one goes live.
              </>
            )}
          </div>
        ) : (
          <div className="lp-game-grid">
            {shown.map((game) => (
              <GameCard key={game._id} game={game} isLoggedIn={isLoggedIn} />
            ))}
          </div>
        )}

        <div className="lp-games-more">
          <a href={enterHref(isLoggedIn)} className="lp-btn lp-btn-outline">
            View more games <ArrowRight size={18} />
          </a>
        </div>
      </div>
    </section>
  );
}

function GameCard({ game, isLoggedIn }: { game: PublicGame; isLoggedIn: boolean }) {
  const total = game.totalSlots || 0;
  const left = Math.max(0, game.spotsLeft ?? 0);
  const filled = Math.max(0, total - left);
  const pct = total > 0 ? Math.min(100, (filled / total) * 100) : 0;
  const isFull = total > 0 && left === 0;

  return (
    <article className="lp-game-card">
      <div className="lp-game-top">
        <span className="lp-date-pill">📅 {dateBadge(game.scheduledAt)}</span>
        <span className="lp-price-pill">
          <span className="rupee">₹</span>
          {game.fee}
        </span>
      </div>

      <h3 className="lp-game-title">{game.title}</h3>

      <div className="lp-game-venue">
        <span>🏟️ {game.venue}</span>
        {game.city && (
          <>
            <span className="sep">·</span>
            <span className="city">📍 {game.city}</span>
          </>
        )}
      </div>

      <div className="lp-game-facts">
        <div className="lp-fact">
          <span className="lp-fact-label">Date</span>
          <span className="lp-fact-value">{dayMonth(game.scheduledAt)}</span>
        </div>
        <div className="lp-fact">
          <span className="lp-fact-label">Time</span>
          <span className="lp-fact-value">{timeLabel(game.scheduledAt)}</span>
        </div>
        <div className="lp-fact">
          <span className="lp-fact-label">Format</span>
          <span className="lp-fact-value">{game.format}</span>
        </div>
      </div>

      {/* The public feed sends no player identities, so these are placeholders
          standing in for a roster only signed-in players can see — not real
          people behind a blur. */}
      <div className="lp-roster">
        <div className="lp-roster-stack" aria-hidden="true">
          <span className="lp-roster-dot" />
          <span className="lp-roster-dot" />
          <span className="lp-roster-dot" />
        </div>
        <span className="lp-roster-text">
          {filled > 0 ? `${filled} joined · sign up to see who` : "Be the first to join"}
        </span>
      </div>

      <div className="lp-progress-row">
        <div
          className="lp-progress"
          role="progressbar"
          aria-valuenow={filled}
          aria-valuemin={0}
          aria-valuemax={total}
          aria-label="Spots filled"
        >
          <div className="lp-progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <div className="lp-progress-count">
          {filled}
          <span className="of">of {total}</span>
        </div>
      </div>

      <div className="lp-game-actions">
        <a
          href={isFull ? detailsHref(game._id) : bookHref(game._id, isLoggedIn)}
          className="lp-book-btn"
        >
          {isFull ? "⏳ Join waitlist" : "⚽ Book"}
        </a>
        <a href={detailsHref(game._id)} className="lp-details-btn">
          View details →
        </a>
      </div>
    </article>
  );
}
