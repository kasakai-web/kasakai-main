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
//
// ── What is cached is this data, never the page ──────────────────────────────
//
// The fallback used to be able to OUTLIVE the outage that caused it. A bare
// `next: { revalidate }` made /passes a statically prerendered route, so the
// catalogue was read once at BUILD time; a backend that was cold or a product
// activated an hour later left the page serving "Example" cards with no Buy
// button, and stale-while-revalidate meant the first visitor after every expiry
// got that same stale HTML and merely triggered the refresh for the next one.
// On a quiet site that is every visitor.
//
// So the CACHE LIVES HERE, on the fetch, and the page itself is rendered per
// request (`connection()` in page.tsx). The API is still asked at most once per
// `REVALIDATE_SECONDS` however many people are reading, and a failure now costs
// one render rather than being frozen into HTML until someone visits twice.

import { PASS_PLANS, type PassPlan } from "@/config/passes";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ||
  process.env.NEXT_PUBLIC_API_URL?.trim() ||
  "http://localhost:5000/api/v1";

/**
 * The tag the cached catalogue is filed under.
 *
 * `POST /api/revalidate/passes` expires it, and the backend calls that whenever
 * a pass product is created, edited or has its status changed — the same three
 * places `passService.bustCatalogue()` drops the backend's own copy. Without it
 * a new price is up to REVALIDATE_SECONDS late; with it, seconds.
 */
export const PASS_CATALOGUE_TAG = "pass-catalogue";

/**
 * How long a price list may be stale for.
 *
 * An admin edits a product rarely, and the tag above covers the case where they
 * just did, so this only bounds how long a MISSED revalidation can last.
 */
const REVALIDATE_SECONDS = 600;

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
 * `force-cache` is explicit rather than inherited: the page reads the request
 * before getting here (see page.tsx), and under the default `fetchCache` a
 * fetch discovered after that is not cached at all — which would put the
 * catalogue on the backend for every single page view. The page pairs this with
 * `fetchCache = "default-cache"` to keep it cached anyway.
 */
export async function getPassPlans(): Promise<{ plans: PassPlan[]; live: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/passes/catalogue`, {
      cache: "force-cache",
      next: { revalidate: REVALIDATE_SECONDS, tags: [PASS_CATALOGUE_TAG] },
    });
    if (!res.ok) {
      // Loud on purpose. This is the line that was missing when the page spent a
      // morning advertising example prices: the fallback is a deliberate answer
      // to an outage, so the outage has to show up in the logs as one.
      console.error(`[PASSES] catalogue ${res.status} — rendering fallback copy`);
      return { plans: PASS_PLANS, live: false };
    }

    const body = await res.json();
    const rows: CataloguePass[] = body?.data || [];
    // Nothing on sale is not an error — it means every pass is grant-only
    // today, and the config's copy is still the honest thing to show.
    if (!Array.isArray(rows) || rows.length === 0) return { plans: PASS_PLANS, live: false };

    return { plans: rows.map((row, i) => toPlan(row, i, rows.length)), live: true };
  } catch (err) {
    console.error("[PASSES] catalogue unreachable — rendering fallback copy:", err);
    return { plans: PASS_PLANS, live: false };
  }
}
