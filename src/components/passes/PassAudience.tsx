import { Check } from "lucide-react";
import { PASS_AUDIENCE } from "@/config/passes";

/** Who the pass is for, said plainly enough that a reader can rule themselves in. */
export function PassAudience() {
  return (
    <section className="lp-section pa-audience">
      <div className="pa-audience-glow" aria-hidden="true" />
      <div className="lp-wrap pa-audience-inner">
        <h2 className="lp-h2">The pass is made for you if...</h2>

        <ul className="pa-ticks">
          {PASS_AUDIENCE.map((item) => (
            <li key={item} className="pa-tick">
              <Check size={22} strokeWidth={2.5} aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>

        <p className="pa-audience-closer">
          Beginner, returning player or regular baller—if you want to play,
          there is a place for you.
        </p>
      </div>
    </section>
  );
}
