import type { MetadataRoute } from "next";

/**
 * What turns kasakai.in into an installable app.
 *
 * There is no store build and no wrapper: "installing" KasaKai adds a home
 * screen icon that opens THIS site in its own window, chrome-less, with the
 * session already in localStorage. Nothing here changes what the site is — it
 * only tells the browser how to present it once someone asks for the icon.
 *
 * Only the player portal ships a manifest. The organiser and admin portals are
 * desk tools opened in a real browser with tabs; an install prompt there would
 * be answering a question nobody asked.
 *
 * `start_url` is the dashboard rather than the landing page: an icon on a phone
 * is an app, and an app opens where the work is. A signed-out tap still lands
 * somewhere sensible — the dashboard bounces to /login?role=player on its own.
 *
 * `id` is pinned to "/" and must never change. Browsers key an installed app on
 * it, so editing it would orphan every icon already on a home screen and offer
 * the install again as if it were a different app. It deliberately does NOT
 * track `start_url`, which is free to move.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "KasaKai",
    short_name: "KasaKai",
    description:
      "Book football games, join screenings and manage your slots — the KasaKai player app.",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#090909",
    theme_color: "#090909",
    lang: "en-IN",
    dir: "ltr",
    categories: ["sports", "social", "lifestyle"],
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // Android crops an icon to a circle. The `any` artwork is full-bleed and
      // would lose the outer letters of KASA to that crop, so the maskable
      // variant insets the whole mark into the safe zone.
      { src: "/pwa/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Browse games", short_name: "Browse", url: "/dashboard" },
      { name: "My games", short_name: "My games", url: "/dashboard/my-games" },
      { name: "Wallet", short_name: "Wallet", url: "/dashboard/wallet" },
    ],
  };
}
