"use client";

import { useEffect } from "react";
import "./landing.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LandingHero } from "@/components/landing/LandingHero";
import { UpcomingGames } from "@/components/landing/UpcomingGames";
import { ExperiencesSection } from "@/components/landing/ExperiencesSection";
import { StepsSection } from "@/components/landing/StepsSection";
import { MonthlyPassSection } from "@/components/landing/MonthlyPassSection";
import { CommunitySection } from "@/components/landing/CommunitySection";
import { LandingFaq } from "@/components/landing/LandingFaq";
import { HostCtaSection } from "@/components/landing/HostCtaSection";
import { RazorpayTrustSection } from "@/components/sections/RazorpayTrustSection";
import { usePageRestoreKey } from "@/hooks/usePageRestoreKey";
import { usePublicGames } from "@/hooks/usePublicGames";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";

/**
 * The page itself holds no state — it exists to remount everything below it
 * when the browser gives this page back out of its back/forward cache. See
 * usePageRestoreKey: a thawed page runs no effects on its own, so arriving
 * back here would otherwise show a snapshot of whatever was true when the
 * visitor left. Keep this component free of hooks that belong to the page.
 */
export default function Home() {
  const restoreKey = usePageRestoreKey();

  return <LandingPage key={restoreKey} isRestore={restoreKey > 0} />;
}

function LandingPage({ isRestore }: { isRestore: boolean }) {
  // Drives the .reveal classes used by RazorpayTrustSection — without it that
  // section's card stays at opacity 0.
  useRevealAnimation();

  // The games feed is fetched once here and handed down, so the hero's count and
  // the grid below it are always describing the same set of games.
  const { games, loading, error } = usePublicGames();

  // Only on a genuine arrival. A remount triggered by coming BACK here is not
  // one — the visitor was reading somewhere down the page when they left, so
  // throwing them to the top would trade one annoyance for another.
  useEffect(() => {
    if (!isRestore) window.scrollTo(0, 0);
  }, [isRestore]);

  return (
    <>
      <Header />
      <main className="lp">
        <LandingHero liveCount={loading || error ? null : games.length} />
        <UpcomingGames games={games} loading={loading} error={error} />
        <ExperiencesSection />
        <StepsSection />
        <MonthlyPassSection />
        <CommunitySection />
        <RazorpayTrustSection />
        <LandingFaq />
        <HostCtaSection />
      </main>
      <Footer />
    </>
  );
}
