import type { MetadataRoute } from "next";

/**
 * /robots.txt for the player site.
 *
 * Without this file, /robots.txt rendered the full 404 page, so every crawler
 * that asked for it spent a Vercel request plus a page render, then got no
 * rules telling it what to skip.
 *
 * Disallowed are the pages a search result has no use for:
 *   /dashboard/          signed-in app; a crawler only ever sees the redirect
 *   /join/               per-game invite links, private to whoever was sent one
 *   /login               no content of its own
 *   /api/                route handlers (the revalidation hook)
 *   /disabled-screening/ a retired feature still in the tree
 *
 * WhatsApp's link preview fetches the page itself and does not read
 * robots.txt, so disallowing /join/ does not break shared-game previews.
 *
 * The SEO-tool and bulk-scrape crawlers below send no visitors, and each of
 * their visits costs about 30 requests against the Vercel quota. Search
 * engines and AI assistants' search crawlers are still allowed.
 */
const SITE = "https://www.kasakai.in";

const PRIVATE_PATHS = [
  "/dashboard/",
  "/join/",
  "/login",
  "/api/",
  "/disabled-screening",
];

const BLOCKED_BOTS = [
  "AhrefsBot",
  "SemrushBot",
  "MJ12bot",
  "DotBot",
  "PetalBot",
  "BLEXBot",
  "DataForSeoBot",
  "Bytespider",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: BLOCKED_BOTS, disallow: "/" },
    ],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
