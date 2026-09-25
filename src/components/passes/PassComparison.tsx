import { PASS_COMPARISON, PASS_COMPARISON_COMMON, type PassPlan } from "@/config/passes";

/**
 * The plans as a table, for the reader who wants them line by line.
 *
 * Two shapes, because there are two sources. On LIVE data the columns are the
 * real products and the per-plan rows are built from them — a table hardcoded
 * to "15-Day Pass ₹1,600 / Monthly Pass ₹3,000" sitting under cards priced from
 * the catalogue is the same contradiction the cards were fixed to remove, just
 * further down the page. On the config FALLBACK it is exactly the table it has
 * always been.
 *
 * The CTA underneath is a plain `#pricing` anchor rather than a scripted
 * scroll: it is the one link on this page that has to work before any
 * JavaScript does, because the section it points at is where the money is.
 */
export function PassComparison({ plans, live }: { plans: PassPlan[]; live: boolean }) {
  if (live) return <LiveComparison plans={plans} />;

  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <h2 className="lp-h2 pa-table-head">Pass comparison</h2>
        {/* The columns are the two example plans, so the table has to say so
            where the table is read. */}
        <p className="lp-lead pa-savings-lead">
          An example comparison. The passes actually on sale are priced by what
          they cover, so their validity and limits can differ from these.
        </p>

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

/**
 * The same table, built from whatever is actually on sale.
 *
 * One column per product, so it works for one pass or four. The per-plan rows
 * come from the catalogue; the rest are the pass-agnostic lines that are true
 * whatever the admin has published.
 */
function LiveComparison({ plans }: { plans: PassPlan[] }) {
  // A single product has nothing to compare against — the pricing card above
  // already says everything this table would repeat.
  if (plans.length < 2) return null;

  const rows = [
    { feature: "Price",    values: plans.map((p) => p.price) },
    { feature: "Validity", values: plans.map((p) => p.validity || "—") },
    ...PASS_COMPARISON_COMMON.map((row) => ({
      feature: row.feature,
      values: plans.map(() => row.value),
    })),
  ];

  return (
    <section className="lp-section">
      <div className="lp-wrap">
        <h2 className="lp-h2 pa-table-head">Pass comparison</h2>

        <div className="pa-table-scroll">
          <table className="pa-table">
            <thead>
              <tr>
                <th scope="col">Feature</th>
                {plans.map((plan) => (
                  <th key={plan.id} scope="col">{plan.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.feature}>
                  <th scope="row">{row.feature}</th>
                  {row.values.map((value, i) => (
                    <td key={plans[i].id}>{value}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
