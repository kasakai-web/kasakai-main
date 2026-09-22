import { Check } from "lucide-react";
import { PASS_PLANS, PASS_PRICING_NOTES } from "@/config/passes";

/**
 * The two plans.
 *
 * Neither card carries a buy button on purpose: a pass is assigned by an admin
 * (the "My Pass" card on /dashboard/profile is where a player sees theirs), so
 * the notes below end at "contact the organisers". A button promising instant
 * checkout would be the one thing on this page that is not true yet.
 *
 * `id="pricing"` is what the comparison table below scrolls back up to.
 */
export function PassPricing() {
  return (
    <section id="pricing" className="lp-section pa-pricing">
      <div className="lp-wrap">
        <div className="pa-pricing-head">
          <h2 className="lp-h2">Choose how long you want to play</h2>
          <p className="lp-lead">
            Both passes give you access to pass-eligible Kasa Kai football games
            during the selected validity period. Reserve every game through the
            website; admission is subject to available spots.
          </p>
        </div>

        <div className="pa-plans">
          {PASS_PLANS.map((plan) => (
            <div
              key={plan.id}
              className={plan.featured ? "pa-plan pa-plan-featured" : "pa-plan"}
            >
              {plan.badge && <div className="pa-plan-badge">{plan.badge}</div>}

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
            </div>
          ))}
        </div>

        <div className="pa-pricing-notes">
          {PASS_PRICING_NOTES.map((note) => (
            <p key={note}>{note}</p>
          ))}
        </div>
      </div>
    </section>
  );
}
