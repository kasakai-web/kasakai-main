"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import { HERO_STATS } from "@/config/landing";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { enterHref } from "./authLinks";

const scrollTo = (id: string) => () =>
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

export function LandingHero({ liveCount }: { liveCount: number | null }) {
  const isLoggedIn = useIsLoggedIn();

  return (
    <section id="home" className="lp-hero">
      <div className="lp-hero-copy">
        <h1 className="lp-h1">
          Your city.
          <br />
          Your game.
          <br />
          <span className="lp-accent">Your people.</span>
        </h1>

        <p className="lp-lead">
          Join organised games and experiences near you. Come solo, meet great
          people, and leave with a plan for next week.
        </p>

        <div className="lp-hero-actions">
          <button type="button" className="lp-btn lp-btn-solid" onClick={scrollTo("events")}>
            Find a game <ArrowRight size={18} />
          </button>
          <button type="button" className="lp-link lp-link-muted" onClick={scrollTo("how-it-works")}>
            See how it works <ArrowDown size={16} />
          </button>
        </div>

        <div className="lp-stats">
          {HERO_STATS.map((stat) => (
            <div key={stat.label}>
              <div className="lp-stat-num">{stat.value}</div>
              <div className="lp-stat-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="lp-hero-visual">
        <picture>
          {/* Same R2 assets the old hero used — a mobile crop below 524px. */}
          <source
            media="(max-width: 524px)"
            srcSet="https://pub-ccd9e78e9dec4ad6a14a20eeea6cb535.r2.dev/images/scr-1783774221022-fcnpk0pftd8.jpg"
          />
          <img
            className="lp-hero-img"
            src="https://pub-ccd9e78e9dec4ad6a14a20eeea6cb535.r2.dev/images/scr-1783774213911-94kyh5t0fvu.jpg"
            alt="Players at a Kasa Kai turf meet"
            fetchPriority="high"
            decoding="async"
          />
        </picture>

        <div className="lp-hero-scrim" />

        <div className="lp-hero-panel">
          <div className="lp-eyebrow">This is your sign</div>
          <h2 className="lp-h2">
            Stop scrolling.
            <br />
            Start playing.
          </h2>

          <div className="lp-live-card">
            <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
              <div className="lp-live-orb">⚽</div>
              <div style={{ minWidth: 0 }}>
                {/* Reads off the same public games feed the grid below renders,
                    so the headline number can never contradict the cards. */}
                <div className="lp-live-title">
                  {liveCount === null
                    ? "Games this week"
                    : `${liveCount} game${liveCount === 1 ? "" : "s"} coming up`}
                </div>
                <div className="lp-live-sub">Across every Kasa Kai city</div>
              </div>
            </div>
            <a href={enterHref(isLoggedIn)} className="lp-live-badge" style={{ textDecoration: "none" }}>
              {isLoggedIn ? "VIEW" : "JOIN"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
