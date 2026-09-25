"use client";

import { ArrowRight } from "lucide-react";
import { findGameHref } from "@/components/landing/authLinks";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

/**
 * The closing line, and the last action this page offers.
 *
 * It used to go to the games rather than to a checkout, because there was no
 * checkout: a pass was assigned by an admin and the pricing section said to
 * contact the organisers. There is one now, so when passes are actually on sale
 * (`canBuy`) this points at it. With nothing on sale it still points at the
 * games, because a buy button for a thing that cannot be bought is the page
 * contradicting itself — the failure this comment was originally written about.
 */
export function PassCta({ canBuy = false }: { canBuy?: boolean }) {
  const isLoggedIn = useIsLoggedIn();
  const href = canBuy
    ? (isLoggedIn ? "/dashboard/passes" : "/login?role=player")
    : findGameHref(isLoggedIn);

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
        <a href={href} className="lp-btn lp-btn-solid">
          {canBuy ? "Get your pass" : "Find a game"} <ArrowRight size={18} />
        </a>
      </div>
    </section>
  );
}
