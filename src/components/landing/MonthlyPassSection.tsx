import { ArrowRight, Check } from "lucide-react";
import { PASS_BENEFITS } from "@/config/landing";
import { PASSES_HREF } from "./authLinks";

export function MonthlyPassSection() {
  return (
    <section id="passes" className="lp-pass">
      <div className="lp-wrap lp-pass-inner">
        <div className="lp-pass-copy">
          <div className="lp-eyebrow">For regular players</div>
          <h2 className="lp-h2">
            Play more.
            <br />
            <span className="lp-accent">Plan less.</span>
          </h2>
          {/* Names no specific plan: what is on sale is decided in the admin
              catalogue and varies by what each pass covers, so "the Monthly
              Pass" was advertising one product that may not exist. */}
          <p className="lp-lead">
            A Kasa Kai pass turns your weekly football habit into one simple
            plan.
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

          <a href={PASSES_HREF} className="lp-btn lp-btn-solid">
            Explore passes <ArrowRight size={18} />
          </a>

          {/* The one thing /passes cannot say for a reader who never gets
              there: the passes it prices are Gurugram-only for now. */}
          <p className="lp-pass-scope">
            Currently, passes are only available for Gurugram
          </p>
        </div>

        <div className="lp-pass-art">
          <div className="lp-pass-glow" aria-hidden="true" />
          <div className="lp-pass-card">
            <div className="lp-pass-card-top">
              <span className="lp-pass-brand">KASA KAI</span>
              <span className="lp-pass-kind">Football Pass</span>
            </div>

            {/* Same stacked KASA/KAI mark the navbar and footer use. */}
            <div className="lp-pass-mark" aria-hidden="true">
              <span>KASA</span>
              <span>KAI</span>
            </div>

            <div className="lp-pass-card-bottom">
              <span className="lp-pass-member">Member 0001</span>
              {/* The art carried "from ₹2,000 / mo", which matched neither the
                  prices on /passes nor the products actually on sale — a third
                  number for the same thing. The card says what a pass IS; the
                  page it links to is where prices come from. */}
              <div>
                <div className="lp-pass-city">Gurugram · 2026</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
