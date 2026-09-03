import { ABOUT_ORGANISERS, ABOUT_TECHNOLOGY } from "@/config/about";

/** One list, rendered twice — the two halves are deliberately symmetrical. */
function MarkList({ items }: { items: string[] }) {
  return (
    <ul className="ab-marklist">
      {items.map((item) => (
        <li key={item}>
          <span className="ab-mark" aria-hidden="true" />
          {item}
        </li>
      ))}
    </ul>
  );
}

export function AboutSystem() {
  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <div className="ab-head">
          <h2 className="lp-h2">
            Technology and organisers.
            <br />
            Designed together.
          </h2>
        </div>

        <div className="ab-duo">
          <div className="ab-duo-panel">
            <h3 className="lp-h3 lp-accent">Technology</h3>
            <MarkList items={ABOUT_TECHNOLOGY} />
          </div>

          <div className="ab-duo-panel">
            <h3 className="lp-h3">Organiser network</h3>
            <MarkList items={ABOUT_ORGANISERS} />
          </div>
        </div>

        <p className="ab-closer ab-closer-centre">
          Technology makes the process <span className="lp-accent">scalable</span>.
          Organisers make the experience <span className="lp-accent">dependable</span>.
        </p>
      </div>
    </section>
  );
}
