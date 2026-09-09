/**
 * The smallest service worker that makes KasaKai installable — and nothing more.
 *
 * Chrome will not fire `beforeinstallprompt` (the event the install banner is
 * built on) for a site that has no service worker with a fetch handler. That is
 * the ONLY reason this file exists.
 *
 * It deliberately caches nothing. KasaKai is a live app — game rosters, wallet
 * balances, waitlists — and a cache-first worker would hand players a snapshot
 * of a game that has since filled up. The fetch listener below never calls
 * `respondWith`, so every request falls through to the network exactly as it
 * would with no worker at all. If offline support is ever wanted it belongs in
 * a considered caching strategy, not bolted on here.
 *
 * `skipWaiting` + `clients.claim` so a deploy that changes this file takes over
 * immediately rather than waiting for every tab to close.
 */
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Intentionally empty — see above. Present so the browser sees a fetch
  // handler; absent a respondWith, the network serves the request.
});
