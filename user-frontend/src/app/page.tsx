"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { AboutSection } from "@/components/sections/AboutSection";
import { CTASection } from "@/components/sections/CTASection";
import { FAQSection } from "@/components/sections/FAQSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { HowItWorksSection } from "@/components/sections/HowItWorksSection";
import { PricingSection } from "@/components/sections/PricingSection";
import { RolesSection } from "@/components/sections/RolesSection";
import { StatsStrip } from "@/components/sections/StatsStrip";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";

// Lazy load below-the-fold sections for faster initial load
const TestimonialsSection = dynamic(() =>
  import("@/components/sections/TestimonialsSection").then(
    (mod) => mod.TestimonialsSection
  ),
  { loading: () => null }
);

export default function Home() {
  useRevealAnimation();

  useEffect(() => {
    const faqButtons = document.querySelectorAll<HTMLElement>(".faq-question");

    const handlers: Array<() => void> = [];

    faqButtons.forEach((btn) => {
      const handler = () => {
        const item = btn.closest(".faq-item");
        if (!item) {
          return;
        }

        const wasOpen = item.classList.contains("open");
        document.querySelectorAll(".faq-item.open").forEach((node) => node.classList.remove("open"));
        if (!wasOpen) {
          item.classList.add("open");
        }
      };

      btn.addEventListener("click", handler);
      handlers.push(() => btn.removeEventListener("click", handler));
    });

    return () => {
      handlers.forEach((off) => off());
    };
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <StatsStrip />
        <AboutSection />
        <FeaturesSection />
        <HowItWorksSection />
        <RolesSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
