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
 * Stays in sync with both ways a session can change under a mounted page:
 * `kk-auth-changed` for this tab (login, logout, OTP sign-up) and `storage`
 * for the others.
 */
export function useIsLoggedIn() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const sync = () => setIsLoggedIn(Boolean(getSession().token));
    sync();

    const onStorage = (e: StorageEvent) => {
      if (e.key === "authToken") sync();
    };

    window.addEventListener("kk-auth-changed", sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("kk-auth-changed", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return isLoggedIn;
}
