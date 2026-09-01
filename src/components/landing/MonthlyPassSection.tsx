"use client";

import { ArrowRight, Check } from "lucide-react";
import { PASS_BENEFITS } from "@/config/landing";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";
import { passHref } from "./authLinks";

export function MonthlyPassSection() {
  const isLoggedIn = useIsLoggedIn();

  return (
    // The dedicated passes page is still to be built — until it exists the CTA
    // goes through the normal sign-up flow, where passes are bought today.
    <section id="passes" className="lp-pass">
      <div className="lp-wrap lp-pass-inner">
        <div className="lp-pass-copy">
          <div className="lp-eyebrow">For regular players</div>
          <h2 className="lp-h2">
            Play more.
            <br />
            <span className="lp-accent">Plan less.</span>
          </h2>
          <p className="lp-lead">
            The Kasa Kai Monthly Pass turns your weekly football habit into one
            simple plan.
          </p>

          <ul className="lp-checklist">
            {PASS_BENEFITS.map((benefit) => (
              <li key={benefit}>
                <span className="lp-check">
                  <Check size={14} strokeWidth={3} />
                </span>
                {benefit}
              </li>
            ))}
          </ul>

          <a href={passHref(isLoggedIn)} className="lp-btn lp-btn-solid">
            Explore monthly pass <ArrowRight size={18} />
          </a>
        </div>

        <div className="lp-pass-art">
          <div className="lp-pass-glow" aria-hidden="true" />
          <div className="lp-pass-card">
            <div className="lp-pass-card-top">
              <span className="lp-pass-brand">KASA KAI</span>
              <span className="lp-pass-kind">Monthly Pass</span>
            </div>

            {/* Same stacked KASA/KAI mark the navbar and footer use. */}
            <div className="lp-pass-mark" aria-hidden="true">
              <span>KASA</span>
              <span>KAI</span>
            </div>

            <div className="lp-pass-card-bottom">
              <span className="lp-pass-member">Member 0001</span>
              <div>
                <div className="lp-pass-price">
                  <span className="from">from</span>
                  <span className="amount">₹2,000</span>
                  <span className="per">/ mo</span>
                </div>
                <div className="lp-pass-city">Gurugram · 2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
