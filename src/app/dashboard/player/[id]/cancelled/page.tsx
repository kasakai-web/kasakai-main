"use client";

import { Suspense } from "react";
import PlayerGamesView from "@/components/dashboard/PlayerGamesView";

export default function CancelledGamesPage() {
  return (
    <Suspense fallback={null}>
      <PlayerGamesView section="cancelled" />
    </Suspense>
  );
}
