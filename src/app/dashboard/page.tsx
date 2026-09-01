"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import PlayerGamesView from "@/components/dashboard/PlayerGamesView";

// Where each of the old tabs now lives. My Games, Cancelled and Completed used
// to be tabs on this page; they are routes of their own now, so a bookmark, a
// notification link or a browser-history entry naming one still has to land in
// the right place.
const LEGACY_TAB_ROUTES: Record<string, string> = {
  "my-games":  "my-games",
  "mygames":   "my-games",
  "cancelled": "cancelled",
  "canceled":  "cancelled",
  "completed": "completed",
};

function PlayerDashboard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab");
  const legacyRoute = tab ? LEGACY_TAB_ROUTES[tab] : undefined;
  // Render nothing while a redirect is pending, so the browse list is never
  // fetched for a visit that is on its way somewhere else.
  const [redirecting, setRedirecting] = useState(Boolean(legacyRoute));

  useEffect(() => {
    if (!legacyRoute) {
      // A bare ?tab=all is just this page under its old name — drop the param
      // and keep whatever filters came with the link.
      if (tab) {
        const rest = new URLSearchParams(searchParams.toString());
        rest.delete("tab");
        const qs = rest.toString();
        router.replace(`/dashboard${qs ? `?${qs}` : ""}`, { scroll: false });
      }
      setRedirecting(false);
      return;
    }

    // Carry everything else across — an ?openGame link has to still open its
    // game once it gets to the page that lists it.
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete("tab");
    const qs = rest.toString();
    router.replace(`/dashboard/${legacyRoute}${qs ? `?${qs}` : ""}`);
  }, [legacyRoute, tab, searchParams, router]);

  if (redirecting) return null;

  return <PlayerGamesView section="all" />;
}

export default function PlayerDashboardPage() {
  return (
    <Suspense fallback={null}>
      <PlayerDashboard />
    </Suspense>
  );
}
