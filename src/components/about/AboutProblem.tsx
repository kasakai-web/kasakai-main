import { ABOUT_FRICTIONS } from "@/config/about";

export function AboutProblem() {
  return (
    <section id="problem" className="lp-section">
      <div className="lp-wrap ab-split">
        <div>
          <div className="lp-eyebrow">The problem</div>
          <h2 className="lp-h2">
            The desire to play
            <br />
            exists.
            <br />
            <span className="lp-accent">
              The path to
              <br />
              participation is
              <br />
              broken.
            </span>
          </h2>
        </div>

        <div>
          <p className="lp-lead" style={{ marginBottom: 32 }}>
            Finding a game, coordinating players, handling payments and managing
            last-minute chaos turns a simple plan into unnecessary work. In turf
            football this friction is even more visible.
          </p>

          <ul className="ab-frictions">
            {ABOUT_FRICTIONS.map((friction) => (
              <li key={friction.text} className="ab-friction">
                <span className="ab-friction-icon" aria-hidden="true">
                  {friction.icon}
                </span>
                {friction.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
