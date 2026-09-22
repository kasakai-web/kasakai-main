"use client";

import { ArrowRight } from "lucide-react";
import { findGameHref } from "@/components/landing/authLinks";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

/**
 * The closing line, and the only action this page offers.
 *
 * It goes to the games, not to a pass checkout, because there is no pass
 * checkout — the pricing section says to contact the organisers, and a button
 * that quietly meant something else would be the page contradicting itself.
 */
export function PassCta() {
  const isLoggedIn = useIsLoggedIn();

  return (
    <section className="lp-section pa-cta" style={{ borderBottom: "none" }}>
      <div className="lp-wrap pa-cta-inner">
        <h2 className="lp-h1">
          Your next month can have
          <br />
          <span className="lp-accent">more football</span> in it.
        </h2>
        <p className="lp-lead">
          Stop waiting for a complete team or the perfect plan. Choose a pass,
          book an available game and step onto the turf.
        </p>
        <div className="pa-cta-kicker">Just show up. The game is ready.</div>

        {/* Plain <a>, not <Link>: this CTA crosses into a document that changes
            the session, and useIsLoggedIn is written around that being a real
            navigation. */}
        <a href={findGameHref(isLoggedIn)} className="lp-btn lp-btn-solid">
          Find a game <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
