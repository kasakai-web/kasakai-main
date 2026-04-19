import type { Metadata } from "next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

export const metadata: Metadata = {
  title: "About Us | Kasa Kai",
  description: "Learn how Kasa Kai helps players and organisers run better football games.",
};

const values = [
  {
    title: "Built for real match-day logistics",
    description: "We focus on registrations, payments, waitlists, refunds, and team distribution so game hosts can spend less time coordinating and more time playing.",
  },
  {
    title: "Designed for both sides of the game",
    description: "Players get a clear path to join, track payments, and manage feedback. Organisers get a control room for games, players, revenue, and communication.",
  },
  {
    title: "Reliable by default",
    description: "Automatic refresh, validated flows, and consistent dashboard UX keep the platform responsive and easier to trust during busy game days.",
  },
];

const platformCards = [
  {
    title: "Player Frontend",
    description: "Discover games, join quickly, manage your wallet, follow ratings, and stay updated with notifications.",
    accent: "#c4d56c",
  },
  {
    title: "Organiser Portal",
    description: "Create games, manage registration flow, track finance, run feedback loops, and keep events moving.",
    accent: "#6fc8da",
  },
  {
    title: "Admin Portal",
    description: "Keep an eye on approvals, platform health, users, organiser activity, and global notifications.",
    accent: "#d98b6a",
  },
  {
    title: "Backend Services",
    description: "JWT auth, payments, notifications, refunds, email flows, and real-time-ready APIs hold the system together.",
    accent: "#8a7bc7",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main style={{ paddingTop: 66, background: "linear-gradient(180deg, #090909 0%, #111 100%)" }}>
        <section style={{ padding: "96px 0 72px", borderBottom: "1px solid var(--border)" }}>
          <div className="container">
            <div style={{ maxWidth: 840 }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: 12, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 16 }}>
                About Kasa Kai
              </p>
              <h1 style={{ fontFamily: "var(--cond)", fontSize: "clamp(48px, 8vw, 92px)", lineHeight: 0.92, letterSpacing: "-.03em", marginBottom: 20 }}>
                Organised football,
                <br />
                made simple.
              </h1>
              <p style={{ maxWidth: 720, fontSize: 18, lineHeight: 1.8, color: "var(--muted)" }}>
                Kasa Kai helps local football communities run games with less friction. From discovery to registration, payments, refunds, and feedback, we keep the full match-day flow in one place.
              </p>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 28 }}>
                <a className="btn-primary" href="/">
                  <span>Go to Homepage</span>
                </a>
                <a className="btn-ghost" href="#mission">
                  Read our mission
                </a>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: "72px 0 0" }}>
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 16 }}>
              {platformCards.map((card) => (
                <article key={card.title} style={{ border: "1px solid var(--border)", background: "#0d0d0d", padding: 24, minHeight: 210 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, background: `${card.accent}18`, border: `1px solid ${card.accent}40`, marginBottom: 18 }} />
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: card.accent, marginBottom: 12 }}>
                    Platform Layer
                  </p>
                  <h2 style={{ fontFamily: "var(--cond)", fontSize: 30, lineHeight: 0.95, marginBottom: 12 }}>{card.title}</h2>
                  <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>{card.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="mission" style={{ padding: "72px 0" }}>
          <div className="container">
            <div style={{ marginBottom: 18 }}>
              <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 10 }}>
                Mission
              </p>
              <h2 style={{ fontFamily: "var(--cond)", fontSize: "clamp(34px, 5vw, 56px)", lineHeight: 0.95 }}>
                One platform that connects everyone involved in a game.
              </h2>
            </div>

            <div className="strip" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 0 }}>
              {values.map((item) => (
                <article key={item.title} style={{ padding: 28, borderRight: "1px solid var(--border)" }}>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--lime)", marginBottom: 12 }}>
                    Why Kasa Kai
                  </p>
                  <h2 style={{ fontFamily: "var(--cond)", fontSize: 32, lineHeight: 1, marginBottom: 12 }}>{item.title}</h2>
                  <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>{item.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section style={{ padding: "0 0 84px" }}>
          <div className="container">
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 24, alignItems: "stretch" }}>
              <div style={{ border: "1px solid var(--border)", background: "#0d0d0d", padding: 28 }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 12 }}>
                  What we do
                </p>
                <ul style={{ listStyle: "none", display: "grid", gap: 14, color: "var(--white)" }}>
                  <li>• Game listings with clear availability and pricing</li>
                  <li>• Player registration, waitlists, and wallet flows</li>
                  <li>• Organiser dashboards for event management and finance</li>
                  <li>• Feedback and performance tracking for both sides</li>
                </ul>
              </div>
              <div style={{ border: "1px solid var(--border)", background: "rgba(196,213,108,0.06)", padding: 28 }}>
                <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".2em", textTransform: "uppercase", color: "var(--lime)", marginBottom: 12 }}>
                  Built for local football
                </p>
                <p style={{ fontSize: 16, lineHeight: 1.85, color: "var(--muted)" }}>
                  The goal is simple: make every game easier to organise, easier to join, and easier to trust.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section style={{ padding: "0 0 48px" }}>
          <div className="container">
            <div style={{ border: "1px solid var(--border)", background: "rgba(196,213,108,0.04)", padding: 28 }}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-end", justifyContent: "space-between", marginBottom: 22 }}>
                <div>
                  <p style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: "var(--lime)", marginBottom: 10 }}>
                    Why people stay
                  </p>
                  <h2 style={{ fontFamily: "var(--cond)", fontSize: "clamp(30px, 4vw, 46px)", lineHeight: 0.96 }}>
                    Simple enough for players, powerful enough for organisers.
                  </h2>
                </div>
                <a className="btn-ghost" href="/#home">
                  Explore the product flow
                </a>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
                <div style={{ padding: 18, background: "#0d0d0d", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>For Players</div>
                  <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>Join a match, pay from wallet, receive updates, and revisit feedback without losing track of what you signed up for.</p>
                </div>
                <div style={{ padding: 18, background: "#0d0d0d", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>For Organisers</div>
                  <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>Create, confirm, cancel, refund, and review performance from one dashboard instead of juggling messages and spreadsheets.</p>
                </div>
                <div style={{ padding: 18, background: "#0d0d0d", border: "1px solid var(--border)" }}>
                  <div style={{ fontFamily: "var(--mono)", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 8 }}>For Admins</div>
                  <p style={{ color: "var(--muted)", lineHeight: 1.8 }}>Monitor approvals, system activity, and platform-wide usage to keep the ecosystem trustworthy and healthy.</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}