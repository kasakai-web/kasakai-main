import "../landing.css";
import "./about.css";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AboutHero } from "@/components/about/AboutHero";
import { AboutProblem } from "@/components/about/AboutProblem";
import { AboutSteps } from "@/components/about/AboutSteps";
import { AboutSystem } from "@/components/about/AboutSystem";
import { AboutTrackRecord } from "@/components/about/AboutTrackRecord";
import { AboutRoadmap } from "@/components/about/AboutRoadmap";
import { AboutCta } from "@/components/about/AboutCta";

export const metadata = {
  title: "About Us — Kasa Kai",
  description:
    "Kasa Kai has been creating experiences since 2017. Today we build the technology and organiser network that make joining a turf game easy.",
};

/**
 * The public About page.
 *
 * A server component on purpose: nothing here depends on whether there is a
 * session, so the whole page can ship as HTML and carry real metadata. Only
 * AboutHero is a client component, for its scroll-to-section button.
 *
 * `main.lp` is what puts the marketing palette in scope — landing.css defines
 * every --lp-* token on that class, and about.css builds on them.
 */
export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="lp">
        <AboutHero />
        <AboutProblem />
        <AboutSteps />
        <AboutSystem />
        <AboutTrackRecord />
        <AboutRoadmap />
        <AboutCta />
      </main>
      <Footer />
    </>
  );
}
