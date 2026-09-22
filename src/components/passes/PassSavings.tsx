import { PASS_SAVINGS, PASS_SAVINGS_BASIS } from "@/config/passes";

/**
 * What the pass is worth at four playing frequencies. Every figure is derived
 * from PASS_SAVINGS_BASIS, which is why the basis is printed twice — beside the
 * heading and again in the small print. An illustration that hides its
 * assumption is a claim, not a comparison.
 */
export function PassSavings() {
  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <div className="lp-eyebrow">Savings</div>
        <h2 className="lp-h2 pa-table-head">
          Play more and bring down your cost per game
        </h2>
        <p className="lp-lead pa-savings-lead">
          The pass becomes more valuable every time you play.{" "}
          <span className="pa-savings-basis">
            (Illustration using a regular game price of {PASS_SAVINGS_BASIS})
          </span>
        </p>

        <div className="pa-table-scroll">
          <table className="pa-table">
            <thead>
              <tr>
                <th scope="col">Playing frequency</th>
                <th scope="col">Approx. pay-per-game cost</th>
                <th scope="col">Recommended pass</th>
                <th scope="col" className="pa-th-accent">Approximate saving</th>
              </tr>
            </thead>
            <tbody>
              {PASS_SAVINGS.map((row) => (
                <tr key={row.frequency} className={row.highlight ? "pa-row-lit" : undefined}>
                  <th scope="row">{row.frequency}</th>
                  <td>{row.payPerGame}</td>
                  <td>{row.pass}</td>
                  <td className="pa-cell-accent">{row.saving}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="pa-table-hint">Scroll the table sideways for the full comparison</p>

        <p className="pa-smallprint">
          Small print: illustrations use {PASS_SAVINGS_BASIS} per game. Actual
          single-game prices, game availability and savings may vary.
        </p>
      </div>
    </section>
  );
}
