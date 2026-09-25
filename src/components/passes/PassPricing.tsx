import { Check } from "lucide-react";
import { PASS_PRICING_NOTES, PASS_PRICING_NOTES_LIVE, type PassPlan } from "@/config/passes";
import { PassBuyLink } from "./PassBuyLink";

/**
 * The plans.
 *
 * `plans` comes from the live catalogue (`utils/passCatalogue.ts`) and falls
 * back to the config when the API cannot be reached — this page must render
 * whatever happens to the backend.
 *
 * `live` is what decides the notes and the button: with real products on sale
 * each card gets a Buy link, and the closing note stops saying "contact the
 * organisers", which was true for as long as there was no checkout and is a
 * dead end now that there is one.
 *
 * `id="pricing"` is what the comparison table below scrolls back up to.
 */
export function PassPricing({ plans, live }: { plans: PassPlan[]; live: boolean }) {
  return (
    <section id="pricing" className="lp-section pa-pricing">
      <div className="lp-wrap">
        <div className="pa-pricing-head">
          <h2 className="lp-h2">Choose how long you want to play</h2>
          <p className="lp-lead">
            {live
              ? "Every pass covers the games described on it. Reserve each game through the website; admission is subject to available spots."
              : "These are example plans, shown to compare how passes work. A real pass is priced by what it covers, so the ones on sale can differ. Reserve every game through the website; admission is subject to available spots."}
          </p>
        </div>

        <div className="pa-plans">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={plan.featured ? "pa-plan pa-plan-featured" : "pa-plan"}
            >
              {plan.badge && <div className="pa-plan-badge">{plan.badge}</div>}

              {/* Marked on the card itself, not only in the small print below
                  it. Somebody scanning the prices never reaches a footnote, and
                  an unlabelled figure on a pricing card IS a price. */}
              {!live && <div className="pa-plan-example">Example</div>}

              <div className="pa-plan-kind">{plan.kind}</div>
              <h3 className="pa-plan-name">{plan.name}</h3>
              <div className="pa-plan-price">{plan.price}</div>
              <div className="pa-plan-validity">{plan.validity}</div>

              <ul className="lp-checklist">
                {plan.features.map((feature) => (
                  <li key={feature}>
                    <span className="lp-check">
                      <Check size={14} strokeWidth={3} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <div className="pa-plan-closer">{plan.closer}</div>

              {/* Only when there is something to buy. The link decides for
                  itself whether that means the store or the login first. */}
              {live && <PassBuyLink planName={plan.name} />}
            </div>
          ))}
        </div>

        <div className="pa-pricing-notes">
          {(live ? PASS_PRICING_NOTES_LIVE : PASS_PRICING_NOTES).map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
