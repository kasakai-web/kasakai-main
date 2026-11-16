import type { MetadataRoute } from "next";

/**
 * /sitemap.xml: the public pages of the player site, and only those.
 *
 * The signed-in dashboard, invite links and login are left out on purpose
 * (robots.ts disallows them). No `lastModified` is given: a build-time
 * `new Date()` would tell crawlers every page changed on every deploy, which
 * invites them to re-crawl everything, and that is the traffic this file
 * exists to reduce.
 *
 * Add a page here when a new public route ships.
 */
const SITE = "https://www.kasakai.in";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/passes`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE}/install`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/refund-policy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
