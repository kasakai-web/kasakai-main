"use client";

import { Suspense } from "react";
import PlayerGamesView from "@/components/dashboard/PlayerGamesView";

export default function MyGamesPage() {
  return (
    <Suspense fallback={null}>
      <PlayerGamesView section="my-games" />
    </Suspense>
  );
}
