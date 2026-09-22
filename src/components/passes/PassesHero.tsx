import { LANDING_TESTIMONIAL } from "@/config/landing";

/**
 * Opening pitch: what a pass is, in the terms someone deciding whether to buy
 * one thinks in — a month of football against the price of one night out.
 *
 * The quote beside it is the landing page's testimonial rather than a second
 * one of its own. The two pages are one click apart and describe the same
 * community; inventing a separate voice for each would be the kind of copy
 * nobody can source later.
 */
export function PassesHero() {
  return (
    <section className="lp-section pa-hero">
      <div className="lp-wrap pa-hero-inner">
        <div className="pa-hero-copy">
          <h1 className="lp-h1">
            Football for the month—at{" "}
            <span className="lp-accent">less than the cost</span> of one party
            night.
          </h1>

          <p className="lp-lead">
            Play regularly without paying for every match. Join properly
            organised community football games, meet people who love the game
            and make football part of your routine.
          </p>
          <p className="lp-lead">
            Come solo or bring your friends. We arrange the venue, players,
            teams, timings and match coordination. You just book your spot and
            show up.
          </p>

          <div className="pa-hero-meta">
            No team required · All skill levels welcome · Book pass-eligible
            games in your city
          </div>
        </div>

        <div className="pa-hero-art">
          <div className="pa-hero-glow" aria-hidden="true" />
          <figure className="pa-hero-quote-block">
            <blockquote className="pa-hero-quote">
              {LANDING_TESTIMONIAL.quote}
            </blockquote>
            <figcaption className="pa-hero-author">
              — {LANDING_TESTIMONIAL.name}, {LANDING_TESTIMONIAL.role}
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  );
}
