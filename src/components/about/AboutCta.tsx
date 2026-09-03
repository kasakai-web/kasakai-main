"use client";

import { ArrowRight } from "lucide-react";
import { findGameHref } from "@/components/landing/authLinks";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

/**
 * Closing CTA. Same destination as the hero's button — one page must not offer
 * the same label twice and mean two different things.
 */
export function AboutCta() {
  const isLoggedIn = useIsLoggedIn();

  return (
    <section className="lp-section" style={{ borderBottom: "none" }}>
      <div className="lp-wrap ab-cta">
        <div className="ab-cta-copy">
          <h2 className="lp-h2">
            Your next game
            <br />
            should be
            <br />
            <span className="lp-accent">this easy.</span>
          </h2>
          <p className="lp-lead">
            Find a relevant game, book your spot and show up ready to play. Come
            solo, bring your friends or join with your team.
          </p>
        </div>

        <a href={findGameHref(isLoggedIn)} className="lp-btn lp-btn-solid" style={{ flexShrink: 0 }}>
          Find a game <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
