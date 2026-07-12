import type { Feature } from "@/types";

export const FEATURES: Feature[] = [
  {
    id: "instant-listing",
    number: "01",
    icon: "⚡",
    title: "Instant Game Listing",
    description:
      "Create a game in under 2 minutes. Set venue, format, fee, cut-off time. WhatsApp your group automatically.",
  },
  {
    id: "wallet-payments",
    number: "02",
    icon: "💳",
    title: "Wallet Payments",
    description:
      "In-app wallet commits payment at sign-up. No chasing. No cash. Automatic refunds if a game is cancelled.",
  },
  {
    id: "team-distribution",
    number: "03",
    icon: "🎯",
    title: "Smart Team Distribution",
    description:
      "Algorithm balances teams by rating, position, and preference. Organiser reviews before publish.",
  },
  {
    id: "notifications",
    number: "04",
    icon: "🔔",
    title: "Real-time Notifications",
    description:
      "WhatsApp + in-app alerts for sign-ups, team publish, game day reminders, and SOS requests.",
  },
  {
    id: "waitlist",
    number: "05",
    icon: "⏳",
    title: "Waitlist Engine",
    description:
      "Full roster? Join the waitlist. A spot opens — all waitlisted players are notified. First to respond gets in.",
  },
  {
    id: "dashboard",
    number: "06",
    icon: "📊",
    title: "Organiser Dashboard",
    description:
      "Track all games, earnings, attendance, player ratings, and community health from one screen.",
  },
];
