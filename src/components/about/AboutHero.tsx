"use client";

import { ArrowDown, ArrowRight } from "lucide-react";
import { ABOUT_HERO_STATS } from "@/config/about";
import { findGameHref } from "@/components/landing/authLinks";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

export function AboutHero() {
  const isLoggedIn = useIsLoggedIn();

  const toJourney = () =>
    document.getElementById("problem")?.scrollIntoView({ behavior: "smooth" });

  return (
    <section id="about-hero" className="lp-section ab-hero">
      <div className="lp-wrap ab-hero-inner">
        <div className="ab-hero-copy">
          <div className="lp-eyebrow">Since 2017 · About us</div>

          <h1 className="lp-h1">
            Making
            <br />
            participation
            <br />
            <span className="lp-accent">simple.</span>
          </h1>

          <p className="lp-lead">
            We started by creating experiences across sports, entertainment and
            social gatherings. Today we are focused on one problem — Turf Meets —
            building the technology and organiser network that make joining a
            game easy.
          </p>

          <div className="ab-hero-actions">
            {/* Plain <a>, not <Link>: these auth CTAs cross into a document
                that changes the session, and useIsLoggedIn is written around
                that being a real navigation. */}
            <a href={findGameHref(isLoggedIn)} className="lp-btn lp-btn-solid">
              Find a game <ArrowRight size={18} />
            </a>
            <button type="button" className="lp-link lp-link-muted" onClick={toJourney}>
              Explore our journey <ArrowDown size={16} />
            </button>
          </div>
        </div>

        <div className="ab-figures">
          {ABOUT_HERO_STATS.map((stat) => (
            <div key={stat.label} className="ab-figure">
              <div className="ab-figure-num">{stat.value}</div>
              <div className="ab-figure-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
