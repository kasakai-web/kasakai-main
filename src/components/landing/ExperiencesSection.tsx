"use client";

import { ArrowRight } from "lucide-react";
import { LANDING_VIDEOS } from "@/config/landing";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { enterHref } from "./authLinks";

export function ExperiencesSection() {
  const isLoggedIn = useIsLoggedIn();

  return (
    <section id="experiences" className="lp-section">
      <div className="lp-wrap lp-split">
        <div>
          <div className="lp-eyebrow">More than a match</div>
          <h2 className="lp-h2">
            Plans worth
            <br />
            leaving home
            <br />
            for.
          </h2>
          <p className="lp-lead">
            From a midweek kickabout to a big-match screening, Kasa Kai makes it
            easy to find people who are into the same things as you.
          </p>
          <a href={enterHref(isLoggedIn)} className="lp-link">
            Explore the community <ArrowRight size={17} />
          </a>
        </div>

        <div className="lp-bento">
          <div className="lp-bento-wide">
            <div className="lp-bento-orb">⚽</div>
            <div className="lp-bento-numeral" aria-hidden="true">
              01
            </div>
            <div className="lp-bento-body">
              <div className="lp-eyebrow" style={{ marginBottom: 12 }}>
                Play
              </div>
              <h3 className="lp-h3">Turf meets</h3>
              <p className="lp-lead" style={{ maxWidth: 420 }}>
                Organised football, balanced teams and a host who keeps things
                moving.
              </p>
            </div>
          </div>

          {LANDING_VIDEOS.map((video) => (
            <div key={video.id} className="lp-bento-video">
              <iframe
                src={`https://www.youtube.com/embed/${video.id}?rel=0`}
                title={video.title}
                loading="lazy"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
