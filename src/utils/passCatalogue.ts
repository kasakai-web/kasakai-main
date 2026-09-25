// The live pass catalogue, for the public /passes page.
//
// Prices used to live in `config/passes.ts` as strings, which meant the page
// advertised one number while the store charged another the moment an admin
// edited a product. They come from the server now — `GET /passes/catalogue`,
// which needs no session because the page is read by people who have never had
// one.
//
// ── The fallback is the point ────────────────────────────────────────────────
//
// If the API is unreachable, the page renders `PASS_PLANS` from the config
// exactly as it did before. A marketing page that 500s because the backend
// blipped is far worse than one showing slightly stale copy, and this is the
// page a paid campaign lands on. The config therefore stays — not as dead code,
// but as what this page says when it cannot ask.

import { PASS_PLANS, type PassPlan } from "@/config/passes";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://localhost:5000/api/v1";

type CataloguePass = {
  code: string;
  name: string;
  subtitle: string;
  description: string;
  highlights: string[];
  pricePaise: number;
  listPricePaise: number;
  summary: string;
  benefitText: string;
  scopeText: string;
  validityText: string;
  limits: { maxRedemptions: number; maxBenefitPaise: number };
};

const rupees = (paise: number) => `₹${Math.round((paise || 0) / 100).toLocaleString("en-IN")}`;

/** A catalogue row in the shape the pricing cards already render. */
function toPlan(row: CataloguePass, index: number, total: number): PassPlan {
  const features = row.highlights.length
    ? row.highlights
    : // A product whose admin wrote no highlights still gets a truthful card,
      // derived from its own terms rather than left blank.
      [
        row.summary,
        row.limits.maxRedemptions
          ? `Up to ${row.limits.maxRedemptions} games on the pass`
          : "No cap on the number of games",
        "Book every game through the site, subject to spots",
      ];

  return {
    id: row.code,
    kind: row.subtitle || (index === 0 ? "Flexible start" : "Full month"),
    name: row.name,
    price: row.pricePaise ? rupees(row.pricePaise) : "—",
    validity: row.validityText || "",
    features,
    closer: row.description || row.summary,
    // The dearest plan is the featured one when there is more than one, which is
    // where the old hardcoded config put the badge too.
    featured: total > 1 && index === total - 1,
    badge: total > 1 && index === total - 1 ? "Best value" : undefined,
  };
}

/**
 * The plans to render, live if we can reach the API and from config if not.
 *
 * Cached for ten minutes: a price list changes when an admin edits a product,
 * which is rare, and this page is otherwise static.
 */
export async function getPassPlans(): Promise<{ plans: PassPlan[]; live: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/passes/catalogue`, {
      next: { revalidate: 600 },
    });
    if (!res.ok) return { plans: PASS_PLANS, live: false };

    const body = await res.json();
    const rows: CataloguePass[] = body?.data || [];
    // Nothing on sale is not an error — it means every pass is grant-only
    // today, and the config's copy is still the honest thing to show.
    if (!Array.isArray(rows) || rows.length === 0) return { plans: PASS_PLANS, live: false };

    return { plans: rows.map((row, i) => toPlan(row, i, rows.length)), live: true };
  } catch {
    return { plans: PASS_PLANS, live: false };
  }
}
