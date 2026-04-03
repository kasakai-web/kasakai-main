"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
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
import { useScript } from "@/hooks/useScript";
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

  const pageScript = `
    if (!window.__kasaKaiInitialized) {
      window.__kasaKaiInitialized = true;

      /* ── scroll reveal ── */
      const obs=new IntersectionObserver(entries=>{
        entries.forEach(e=>{if(e.isIntersecting)e.target.classList.add('in')});
      },{threshold:.12});
      document.querySelectorAll('.reveal,.reveal-left,.reveal-right').forEach(el=>obs.observe(el));

      /* ── FAQ accordion ── */
      document.querySelectorAll('.faq-q').forEach(btn=>{
        btn.addEventListener('click',()=>{
          const item=btn.closest('.faq-item');
          const wasOpen=item.classList.contains('open');
          document.querySelectorAll('.faq-item.open').forEach(i=>i.classList.remove('open'));
          if(!wasOpen)item.classList.add('open');
        });
      });
    }
  `;

  useScript(pageScript);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <StatsStrip />
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
