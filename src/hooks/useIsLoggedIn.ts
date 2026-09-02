"use client";

import { useEffect, useState } from "react";
import { getSession } from "@/utils/api";

/**
 * "Is someone signed in, right now?" — for public pages that render one thing
 * to a visitor and another to a player (the navbar's Login/Dashboard button,
 * the landing page's Book links).
 *
 * Always starts `false` and reads the session in an effect: localStorage does
 * not exist during the server render, so seeding from it would hydrate a
 * signed-in navbar over signed-out markup. One frame of "Login" is the cost.
 *
 * Re-reads on every signal that the answer may have changed since:
 *
 *   kk-auth-changed   login / logout / sign-up, in THIS document
 *   storage           the same, in another tab
 *   pageshow          the browser handed this page back — see below
 *   visibilitychange  the tab was in the background while it happened
 *
 * The pageshow case is the one that bites. The landing page links out with
 * plain <a href>, so /login is a separate document; sign in there and press
 * Back and the browser may restore the landing page from its back/forward
 * cache — the whole JS heap thawed exactly as it was left. No effect re-runs,
 * and neither event above ever fired in that document, so without this the
 * navbar would still be offering "Login" to someone who just signed in.
 */
export function useIsLoggedIn() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => setIsLoggedIn(Boolean(getSession().token));
    sync();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "authToken") sync();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") sync();
    };

    window.addEventListener("kk-auth-changed", sync);
    window.addEventListener("storage", onStorage);
    window.addEventListener("pageshow", sync);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("kk-auth-changed", sync);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("pageshow", sync);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return isLoggedIn;
}
