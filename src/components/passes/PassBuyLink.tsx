"use client";

import { ArrowRight } from "lucide-react";
import { useIsLoggedIn } from "@/hooks/useIsLoggedIn";

/**
 * The buy button on a pricing card.
 *
 * A client component for one reason: where it goes depends on whether there is
 * a session. Signed in, it is the store on /dashboard/passes; signed out, it is
 * the login that leads there. Sending a stranger straight to a dashboard route
 * would bounce them through the auth guard and lose the intent on the way.
 *
 * Plain <a> rather than <Link>, like every other CTA on this page: it crosses
 * into a document that changes the session, and `useIsLoggedIn` is written
 * around that being a real navigation.
 */
export function PassBuyLink({ planName }: { planName: string }) {
  const isLoggedIn = useIsLoggedIn();

  return (
    <a
      href={isLoggedIn ? "/dashboard/passes" : "/login?role=player"}
      className="lp-btn lp-btn-solid pa-plan-buy"
      aria-label={`Buy the ${planName}`}
    >
      {isLoggedIn ? "Buy this pass" : "Sign in to buy"} <ArrowRight size={16} />
    </a>
  );
}
