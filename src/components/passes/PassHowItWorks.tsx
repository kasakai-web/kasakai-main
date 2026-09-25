import { PASS_EXCLUDES, PASS_INCLUDES, PASS_STEPS } from "@/config/passes";

/**
 * How a pass turns into a game, beside what it does and does not cover.
 *
 * The two lists are the same component with one difference — the lit rule
 * beside an included line, the dim one beside an excluded line — so a reader
 * scanning the column can tell them apart without reading either heading.
 */
export function PassHowItWorks() {
  return (
    <section className="lp-section">
      <div className="lp-wrap pa-how">
        <div>
          <h2 className="lp-h2 pa-how-head">
            From purchase to kickoff in{" "}
            <span className="lp-accent">five simple steps</span>
          </h2>

          <ol className="pa-steps">
            {PASS_STEPS.map((step) => (
              <li key={step.number} className="pa-step">
                <span className="pa-step-num" aria-hidden="true">
                  {step.number}
                </span>
                <div>
                  <h3 className="pa-step-title">{step.title}</h3>
                  <p className="pa-step-desc">{step.description}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div>
          <h2 className="lp-h2 pa-how-head">What your pass includes</h2>
          <p className="lp-lead pa-how-lead">
            We organise the game. You enjoy playing it.
          </p>

          <ul className="lp-marklist pa-included">
            {PASS_INCLUDES.map((item) => (
              <li key={item}>
                <span className="lp-mark" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>

          <h3 className="lp-h3 pa-excluded-head">
            What is{" "}
            <span className="pa-dim">not automatically included</span>
          </h3>

          <ul className="lp-marklist">
            {PASS_EXCLUDES.map((item) => (
              <li key={item}>
                <span className="lp-mark" aria-hidden="true" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
