import "../landing.css";
import "./passes.css";

import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { PassesHero } from "@/components/passes/PassesHero";
import { PassValue } from "@/components/passes/PassValue";
import { PassPricing } from "@/components/passes/PassPricing";
import { PassComparison } from "@/components/passes/PassComparison";
import { PassSavings } from "@/components/passes/PassSavings";
import { PassHowItWorks } from "@/components/passes/PassHowItWorks";
import { PassAudience } from "@/components/passes/PassAudience";
import { PassCommunity } from "@/components/passes/PassCommunity";
import { PassCta } from "@/components/passes/PassCta";

export const metadata = {
  title: "Monthly & 15-Day Passes — Kasa Kai",
  description:
    "Play football all month on one payment. The Kasa Kai 15-Day and Monthly passes cover entry to pass-eligible community games — come solo, we arrange the rest.",
};

/**
 * The public Passes page — where "Explore monthly pass" on the landing page
 * lands, and the one place the pass is priced for a player.
 *
 * A server component, like /about and for the same reason: nothing here depends
 * on whether there is a session, so the whole page ships as HTML and carries
 * real metadata. Only PassCta is a client component, for the one CTA that has
 * to know whether the reader is signed in.
 *
 * `main.lp` is what puts the marketing palette in scope — landing.css defines
 * every --lp-* token on that class, and passes.css builds on them.
 */
export default function PassesPage() {
  return (
    <>
      <Header />
      <main className="lp">
        <PassesHero />
        <PassValue />
        <PassPricing />
        <PassComparison />
        <PassSavings />
        <PassHowItWorks />
        <PassAudience />
        <PassCommunity />
        <PassCta />
      </main>
      <Footer />
    </>
  );
}
