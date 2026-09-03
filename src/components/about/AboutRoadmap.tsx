import { ABOUT_ROADMAP } from "@/config/about";

export function AboutRoadmap() {
  return (
    <section className="lp-section">
      <div className="lp-wrap ab-split">
        <div>
          <div className="lp-eyebrow">Where we are going</div>
          <h2 className="lp-h2">
            Starting with
            <br />
            Turf Meets.
            <br />
            <span className="lp-accent">
              Building for every
              <br />
              interest.
            </span>
          </h2>
        </div>

        <div>
          <p className="lp-lead" style={{ marginBottom: 40 }}>
            Turf Meets are where we are proving the model. Once the system is
            strong, the same foundation extends into more sports and eventually
            into creative, entertainment and social experiences.
          </p>

          <ul className="ab-road">
            {ABOUT_ROADMAP.map((milestone) => (
              <li key={milestone.phase} className="ab-road-item">
                <div className="ab-road-phase">
                  <span className="ab-road-dot" aria-hidden="true" />
                  {milestone.phase}
                </div>
                <div>
                  <h3 className="lp-h3">{milestone.title}</h3>
                  <p className="lp-lead">{milestone.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
