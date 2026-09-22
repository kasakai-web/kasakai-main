import { Check } from "lucide-react";
import { PASS_VALUE_POINTS } from "@/config/passes";

/**
 * The argument for the pass, before any price is shown: one payment, more
 * football, less arranging. The last card spans both columns so a five-item
 * list never leaves a hole in a two-column grid.
 */
export function PassValue() {
  return (
    <section className="lp-section">
      <div className="lp-wrap pa-value">
        <div className="pa-value-copy">
          <div className="lp-eyebrow">The core value</div>
          <h2 className="lp-h2">
            One payment.
            <br />
            More football.
            <br />
            <span className="lp-accent">A stronger community.</span>
          </h2>
          <p className="lp-lead">
            A single night out can easily cost more than ₹3,000. The Kasa Kai
            Monthly Pass gives you 30 days of football, fitness, competition and
            community for the same—or often a lower—amount.
          </p>
          <p className="lp-lead">
            Instead of searching for players, calling turfs and collecting
            payments every time, choose an available game, reserve your spot and
            get ready to play.
          </p>
        </div>

        <div className="pa-cards">
          {PASS_VALUE_POINTS.map((point, i) => (
            <div
              key={point.title}
              className={
                i === PASS_VALUE_POINTS.length - 1 && PASS_VALUE_POINTS.length % 2
                  ? "pa-card pa-card-wide"
                  : "pa-card"
              }
            >
              <span className="pa-card-orb" aria-hidden="true">
                <Check size={20} strokeWidth={3} />
              </span>
              <h3 className="lp-h3">{point.title}</h3>
              <p>{point.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
