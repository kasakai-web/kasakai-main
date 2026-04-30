"use client";

import { useEffect } from "react";
import { FAQSection } from "@/components/sections/FAQSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { useRevealAnimation } from "@/hooks/useRevealAnimation";

export default function Home() {
  useRevealAnimation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <>
      <Header />
      <main>
        <HeroSection />
        <FAQSection />
      </main>
      <Footer />
    </>
  );
}
