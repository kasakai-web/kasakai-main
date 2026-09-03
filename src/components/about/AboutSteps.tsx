import { ABOUT_STEPS } from "@/config/about";

export function AboutSteps() {
  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <div className="ab-head">
          <h2 className="lp-h2">
            Four steps.
            <br />
            That is all.
          </h2>
        </div>

        <div className="ab-quad">
          {ABOUT_STEPS.map((step) => (
            <div key={step.number} className="ab-quad-cell">
              <div className="ab-quad-num" aria-hidden="true">
                {step.number}
              </div>
              <h3 className="lp-h3">{step.title}</h3>
              <p className="lp-lead">{step.description}</p>
            </div>
          ))}
        </div>

        <p className="ab-closer">
          You focus on playing. Kasa Kai manages everything around it.
        </p>
      </div>
    </section>
  );
}
