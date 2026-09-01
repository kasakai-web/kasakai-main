"use client";

import { COMMUNITY_STATS, LANDING_TESTIMONIAL } from "@/config/landing";

export function CommunitySection() {
  return (
    <section id="about" className="lp-section">
      <div className="lp-wrap lp-community">
        <div className="lp-quote">
          <span className="lp-quote-mark" aria-hidden="true">
            &ldquo;
          </span>
          <p className="lp-quote-text">{LANDING_TESTIMONIAL.quote}</p>
          <div className="lp-quote-author">
            <div className="lp-avatar">{LANDING_TESTIMONIAL.initials}</div>
            <div>
              <div className="lp-quote-name">{LANDING_TESTIMONIAL.name}</div>
              <div className="lp-quote-role">{LANDING_TESTIMONIAL.role}</div>
            </div>
          </div>
        </div>

        <div className="lp-community-copy">
          <div className="lp-eyebrow">Built for belonging</div>
          <h2 className="lp-h2">A community that starts with showing up.</h2>
          <p className="lp-lead">
            We remove the difficult part — finding people, planning a venue and
            filling a game — so you can focus on playing and connecting.
          </p>

          <div className="lp-bigstats">
            {COMMUNITY_STATS.map((stat) => (
              <div key={stat.label}>
                <div className="lp-bigstat-num">{stat.value}</div>
                <div className="lp-stat-label" style={{ marginTop: 0 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
