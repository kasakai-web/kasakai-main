import type { Step } from "@/types";

export const STEPS: Step[] = [
  {
    id: "list-game",
    number: "01",
    title: "Organiser lists the game",
    description:
      "Sets venue, size (5v5 → 10v10), fee, cut-off time. Game goes live instantly with a WhatsApp notification to the community group.",
    color: "lime",
  },
  {
    id: "sign-up",
    number: "02",
    title: "Players sign up and pay",
    description:
      "One tap. Wallet commits the fee. Players set their position and team preference. A waitlist fills automatically if the roster is full.",
    color: "electric",
  },
  {
    id: "auto-confirm",
    number: "03",
    title: "Game auto-confirms",
    description:
      "Platform checks registration threshold. If enough players — game confirmed, everyone notified. If not — SOS blast sent to the community.",
    color: "coral",
  },
  {
    id: "teams-distributed",
    number: "04",
    title: "Teams distributed",
    description:
      "Algorithm builds balanced sides using ratings, positions, and preferences. Organiser has an edit window before teams are published to all players.",
    color: "violet",
  },
  {
    id: "post-game",
    number: "05",
    title: "Post-game wrap-up",
    description:
      "Organiser marks attendance and rates players. Wallets settle. Feedback is collected — required before the next sign-up.",
    color: "amber",
  },
];
