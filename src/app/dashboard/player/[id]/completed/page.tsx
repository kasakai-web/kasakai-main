"use client";

import { Suspense } from "react";
import PlayerGamesView from "@/components/dashboard/PlayerGamesView";

export default function CompletedGamesPage() {
  return (
    <Suspense fallback={null}>
      <PlayerGamesView section="completed" />
    </Suspense>
  );
}
