import type { FAQItem } from "@/types";

export const FAQ_ITEMS: FAQItem[] = [
  {
    id: "wallet",
    question: "How does the wallet work?",
    answer:
      "Your Kasa Kai wallet holds your balance. When you sign up for a game, the fee is locked — not charged until the game is confirmed. You can top up via Razorpay (UPI, card, netbanking). Refunds go back to your wallet instantly if a game is cancelled.",
  },
  {
    id: "backout",
    question: "What happens if I back out of a game?",
    answer:
      "Back out before the cut-off time set by the organiser — no penalty. Back out after cut-off — you'll receive a warning for your first two offences. After that, a fee is automatically deducted from your wallet. This keeps the community fair for everyone.",
  },
  {
    id: "teams",
    question: "How is team distribution done?",
    answer:
      "Our algorithm considers each player's skill rating, preferred position (goalkeeper, defender, midfielder, forward), and team preference (same or opposite side as a friend). The organiser gets a review window to adjust before teams are published.",
  },
  {
    id: "plus-one",
    question: "Can I bring a +1?",
    answer:
      "Yes! When signing up you can add a +1. If your guest is already on Kasa Kai you can tag them — their rating gets included in team balancing. If they're new, they join as an unrated player.",
  },
  {
    id: "organiser",
    question: "How do I become an organiser?",
    answer:
      "Sign up and select Organiser as your role. Your profile goes through a quick approval — usually within 24 hours. Once approved, you can create your first community and list games immediately.",
  },
];
