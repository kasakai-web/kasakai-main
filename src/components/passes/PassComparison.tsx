import { PASS_COMPARISON } from "@/config/passes";

/**
 * The same two plans as a table, for the reader who wants them line by line.
 *
 * The CTA underneath is a plain `#pricing` anchor rather than a scripted
 * scroll: it is the one link on this page that has to work before any
 * JavaScript does, because the section it points at is where the money is.
 */
export function PassComparison() {
  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <h2 className="lp-h2 pa-table-head">Pass comparison</h2>

        <div className="pa-table-scroll">
          <table className="pa-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                <th scope="col" className="pa-col-a">15-Day Pass</th>
                <th scope="col" className="pa-col-b">Monthly Pass</th>
              </tr>
            </thead>
            <tbody>
              {PASS_COMPARISON.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  <td className="pa-col-a">{row.fifteen}</td>
                  <td className="pa-col-b">{row.monthly}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="pa-table-hint">Scroll the table sideways to compare both passes</p>

        <div className="pa-table-cta">
          <a href="#pricing" className="lp-btn lp-btn-ghost">
            Play for the month — get the ₹3,000 pass
          </a>
        </div>
      </div>
    </section>
  );
}
