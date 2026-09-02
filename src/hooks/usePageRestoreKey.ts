"use client";

import { useEffect, useState } from "react";

/**
 * A counter that increments each time the browser hands this page back after
 * FREEZING it rather than unloading it — its back/forward cache ("bfcache").
 *
 * Why this exists. The site links between documents with plain <a href>, so
 * leaving the landing page for /login or /dashboard is a real navigation. The
 * browser does not throw the old page away: it freezes the whole JS heap and
 * puts it aside, and Back thaws it exactly as it was left. Nothing remounts,
 * no effect re-runs, no fetch resumes. What you get back is a photograph —
 * a navbar still saying "Login" to someone who has since signed in, a games
 * grid still on the skeleton because its request died mid-flight, sections
 * still at opacity 0 waiting for an observer that already disconnected.
 *
 * Patching that hook by hook does not converge: every new effect on the page
 * is a new way to be stale, and each one has to remember to listen for
 * `pageshow` itself (useRevealAnimation already had to). So instead, spend
 * this counter as a `key` on the page's whole subtree. React tears the tree
 * down and builds it again, and EVERY effect in it runs from scratch — the
 * same thing that would have happened on a fresh load, which is what the
 * visitor believes they are looking at.
 *
 * Call it OUTSIDE the subtree it keys, or it resets itself on every restore.
 */
export function usePageRestoreKey() {
  const [restoreKey, setRestoreKey] = useState(0);

  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      // persisted === false is an ordinary load: everything already ran.
      if (e.persisted) setRestoreKey((k) => k + 1);
    };

    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  return restoreKey;
}
