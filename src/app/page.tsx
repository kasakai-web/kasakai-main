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
import { usePublicGames } from "@/hooks/usePublicGames";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";

export default function Home() {
  // Drives the .reveal classes used by RazorpayTrustSection — without it that
  // section's card stays at opacity 0.
  useRevealAnimation();

  // The games feed is fetched once here and handed down, so the hero's count and
  // the grid below it are always describing the same set of games.
  const { games, loading, error } = usePublicGames();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

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
