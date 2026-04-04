import type { PricingPlan } from "@/types";

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: "player",
    tag: "For players",
    amount: "Free",
    period: "to join & use",
    name: "Player",
    items: [
      "Browse all open games",
      "Secure wallet payments",
      "Waitlist access",
      "Team & venue notifications",
      "Game history & ratings",
    ],
    buttonText: "Get started free",
    buttonHref: "/signup?role=player",
  },
  {
    id: "organiser",
    tag: "Most popular",
    amount: "₹499",
    period: "per month / community",
    name: "Organiser",
    featured: true,
    items: [
      "Unlimited game listings",
      "Automated payments & refunds",
      "Team distribution algorithm",
      "WhatsApp integration",
      "Organiser dashboard + analytics",
    ],
    buttonText: "Start organising",
    buttonHref: "/signup?role=player",
  },
  {
    id: "enterprise",
    tag: "For clubs & leagues",
    amount: "Custom",
    period: "talk to us",
    name: "Enterprise",
    items: [
      "Multiple communities",
      "Dedicated support",
      "Custom notification templates",
      "Advanced analytics",
      "Priority feature access",
    ],
    buttonText: "Contact us",
    buttonHref: "mailto:hello@kasakai.com",
  },
];
