import { connection } from "next/server";

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
import { getPassPlans } from "@/utils/passCatalogue";

// Names no specific plan on purpose. "Monthly & 15-Day Passes" described two
// example products that may not be on sale — and this is the copy a search
// result shows, which is the one place on the page that cannot carry a caveat
// beside it.
export const metadata = {
  title: "Football Passes — Kasa Kai",
  description:
    "Play more football on one payment. A Kasa Kai pass covers your entry to the games it applies to — come solo, we arrange the rest.",
};

/**
 * The catalogue fetch is deliberately cached even though the `connection()` below
 * makes this route dynamic. Under the default `fetchCache` a fetch reached after
 * the request is read is never cached, which would mean one backend call per page
 * view; `default-cache` keeps the `force-cache` in `getPassPlans` honoured.
 */
export const fetchCache = "default-cache";

/**
 * The public Passes page — where "Explore monthly pass" on the landing page
 * lands, and the one place the pass is priced for a player.
 *
 * An ASYNC server component: the prices come from the live catalogue rather
 * than from hardcoded copy, so the page cannot advertise one number while the
 * store charges another.
 *
 * Rendered per request, and `connection()` is what says so. This page used to be
 * prerendered at build time, which meant the catalogue was read on the build
 * agent: if the backend was asleep then, or a product went on sale afterwards,
 * the page served the fallback "Example" cards with no Buy button and kept
 * serving them — stale-while-revalidate hands the first visitor after each expiry
 * the stale HTML and only refreshes it for the NEXT one, which on a quiet site is
 * nobody. The price list is still fetched at most once every ten minutes; what is
 * cached is that fetch, not this render (see `utils/passCatalogue.ts`).
 *
 * Still no session here. PassCta and PassBuyLink are the only client pieces,
 * for the CTAs that have to know whether the reader is signed in.
 *
 * `main.lp` is what puts the marketing palette in scope — landing.css defines
 * every --lp-* token on that class, and passes.css builds on them.
 */
export default async function PassesPage() {
  // Before the fetch, so nothing below this line is prerendered at build time.
  await connection();
  const { plans, live } = await getPassPlans();

  return (
    <>
      <Header />
      <main className="lp">
        <PassesHero />
        <PassValue />
        <PassPricing plans={plans} live={live} />
        <PassComparison plans={plans} live={live} />
        {/* Only on the fallback copy. Every figure in it is derived from the
            two hardcoded prices and a ₹300 game-fee assumption, so against live
            products it would be stating savings nobody has checked — a worse
            failure on a public page than one section fewer. */}
        {!live && <PassSavings />}
        <PassHowItWorks />
        <PassAudience />
        <PassCommunity />
        <PassCta canBuy={live} />
      </main>
      <Footer />
    </>
  );
}
