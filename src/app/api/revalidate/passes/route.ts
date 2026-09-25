// "The pass catalogue changed — stop serving the old one."
//
// The public /passes page reads the catalogue through a ten-minute cache, which
// is the right trade for a price list nobody is editing. It is the wrong trade
// for the ten minutes right after an admin edits one: they save a price, open
// the page to check it, and see the old number. So the backend tells us, from
// the same three places it drops its own copy of the catalogue
// (`passService.bustCatalogue()` — create, edit, status change).
//
// Only the tag is expired, not the path. There is no cached render of /passes to
// bust any more — the page is rendered per request on purpose (see its
// `connection()`), and the cache this invalidates is the one on the fetch inside
// `getPassPlans`.

import { revalidateTag } from "next/cache";
import { timingSafeEqual } from "node:crypto";

import { PASS_CATALOGUE_TAG } from "@/utils/passCatalogue";

/**
 * Compare without leaking the answer in the timing.
 *
 * `timingSafeEqual` throws on a length mismatch, which would leak the length, so
 * the lengths are checked first and a mismatch is reported as a plain failure.
 */
function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: Request): Promise<Response> {
  const expected = process.env.REVALIDATE_SECRET?.trim();

  // Fails CLOSED. An unset secret means this deployment was not configured for
  // this, not that anybody may call it — an open revalidation endpoint is a free
  // way to make us re-fetch the catalogue as fast as it can be requested.
  if (!expected) {
    console.error("[REVALIDATE] REVALIDATE_SECRET is not set — refusing");
    return Response.json(
      { revalidated: false, error: "not_configured" },
      { status: 503 },
    );
  }

  const given = request.headers.get("x-revalidate-secret") || "";
  if (!secretMatches(given, expected)) {
    return Response.json(
      { revalidated: false, error: "unauthorized" },
      { status: 401 },
    );
  }

  // `{ expire: 0 }` rather than the "max" profile: max marks the tag stale and
  // serves the stale copy to whoever asks next, which is exactly the behaviour
  // that hid the problem this endpoint exists to fix. An external system asking
  // for immediate expiration is the documented case for expire: 0 — the next
  // reader waits for the real catalogue and gets the new price.
  revalidateTag(PASS_CATALOGUE_TAG, { expire: 0 });

  return Response.json({ revalidated: true, tag: PASS_CATALOGUE_TAG });
}
