import type { MetadataRoute } from "next";
import { buildApiUrl } from "@/utils/api";

/**
 * /sitemap.xml: the public pages of the player site, plus the upcoming public
 * games (/join/<gameId>) so they can be found in search.
 *
 * The signed-in dashboard, invite tokens and login are left out on purpose
 * (robots.ts disallows them). No `lastModified` on the fixed pages: a
 * build-time `new Date()` would tell crawlers every page changed on every
 * deploy, which invites them to re-crawl everything.
 *
 * Add a page here when a new public route ships.
 */
const SITE = "https://www.kasakai.in";

// Rebuilt at most once an hour, so a crawler re-reading the sitemap never
// costs an API call each time. Games come and go by the day, so an hour is fresh enough.
export const revalidate = 3600;

// The same feed the landing page shows: upcoming, non-private games only
// (private games are invite-only and the backend never lists them).
async function upcomingGames(): Promise<MetadataRoute.Sitemap> {
  try {
    const res = await fetch(buildApiUrl("/games/public"), { signal: AbortSignal.timeout(10_000) });
    const body = await res.json();
    if (!body?.success) return [];
    return (body.data || []).map((g: { _id: string }) => ({
      url: `${SITE}/join/${g._id}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    }));
  } catch {
    // An API outage must not take the whole sitemap down: serve the fixed pages.
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/passes`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/install`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/refund-policy`, changeFrequency: "yearly", priority: 0.3 },
    ...(await upcomingGames()),
  ];
}
