// Copy for the public Passes page (src/app/passes/page.tsx).
//
// Same reason config/landing.ts and config/about.ts exist: this wording is
// edited far more often than the layout is, and a copy change should never mean
// touching JSX.
//
// Prices here are the ONLY place the pass is priced in the player app. A pass
// is still assigned by an admin (see the "My Pass" card on /dashboard/profile)
// — nothing on this page sells one, which is why every CTA points at the games
// rather than at a checkout.

export type PassPlan = {
  id: string;
  /** Small kicker above the name. */
  kind: string;
  name: string;
  price: string;
  validity: string;
  features: string[];
  /** The line the card signs off with. */
  closer: string;
  /** The lime card. Exactly one plan may carry it, with the badge that says why. */
  featured?: boolean;
  badge?: string;
};

export const PASS_PLANS: PassPlan[] = [
  {
    id: "fifteen",
    kind: "Flexible start",
    name: "15-Day Pass",
    price: "₹1,600",
    validity: "15 days of football",
    features: [
      "Book unlimited pass-eligible games for 15 days",
      "No separate match fee on eligible games",
      "A lower-commitment way to try the pass",
      "Ideal for a shorter stay or a busy month",
      "The same organised Kasa Kai game experience",
    ],
    closer: "Start with 15 days. Upgrade your football routine when ready.",
  },
  {
    id: "monthly",
    kind: "Full month",
    name: "Monthly Pass",
    price: "₹3,000",
    validity: "30 days of football",
    features: [
      "Book unlimited pass-eligible games for 30 days",
      "No separate match fee on eligible games",
      "Join solo or with friends",
      "Access available timings and formats in your selected city",
      "Organiser coordination, game updates and confirmations included",
      "Save ₹200 compared with buying two 15-day passes",
    ],
    closer: "That is just ₹100 per day for 30 days of access.",
    featured: true,
    badge: "Most popular · Best value",
  },
];

/** The two lines under the plans. Both are the small print that keeps the
 *  promise above honest — a pass is access, not a reserved seat. */
export const PASS_PRICING_NOTES: string[] = [
  "A pass does not automatically reserve a place in every game. Each game must be booked separately and remains subject to capacity, eligibility and fair-use rules.",
  "Contact the organisers to buy or to know more about the pass.",
];

/** Why a pass beats paying per game, one card each. */
export const PASS_VALUE_POINTS: { title: string; description: string }[] = [
  { title: "Spend less per game", description: "The more often you play, the better the value becomes." },
  { title: "Stay consistent",     description: "Make football a weekly habit instead of an occasional plan." },
  { title: "Come alone",          description: "You do not need to create or bring a complete team." },
  { title: "Meet your people",    description: "Play with a growing community of football lovers." },
  { title: "Avoid coordination",  description: "Kasa Kai manages the game setup and communication." },
];

export type PassComparisonRow = { feature: string; fifteen: string; monthly: string };

// Column order follows PASS_PLANS — 15-day first, monthly second — so the table
// and the cards above it read the same way round.
export const PASS_COMPARISON: PassComparisonRow[] = [
  { feature: "Price",                             fifteen: "₹1,600",                        monthly: "₹3,000" },
  { feature: "Validity",                          fifteen: "15 consecutive days",           monthly: "30 consecutive days" },
  { feature: "Pass-eligible games",               fifteen: "Unlimited, subject to availability", monthly: "Unlimited, subject to availability" },
  { feature: "Separate fee for eligible games",   fifteen: "No",                            monthly: "No" },
  { feature: "Solo players welcome",              fifteen: "Yes",                           monthly: "Yes" },
  { feature: "Skill level",                       fifteen: "All levels welcome",            monthly: "All levels welcome" },
  { feature: "Selected-city access",              fifteen: "Yes",                           monthly: "Yes" },
  { feature: "Best for",                          fifteen: "Trying the pass or a short stay", monthly: "Regular players and maximum value" },
];

export type PassSavingRow = {
  frequency: string;
  payPerGame: string;
  pass: string;
  saving: string;
  /** Shades the monthly-pass rows, so the table shows where the pass takes over. */
  highlight?: boolean;
};

export const PASS_SAVINGS: PassSavingRow[] = [
  { frequency: "3 games per week for 2 weeks", payPerGame: "₹1,800", pass: "15-Day Pass — ₹1,600", saving: "₹200" },
  { frequency: "4 games per week for 2 weeks", payPerGame: "₹2,400", pass: "15-Day Pass — ₹1,600", saving: "₹800" },
  { frequency: "3 games per week for 4 weeks", payPerGame: "₹3,600", pass: "Monthly Pass — ₹3,000", saving: "₹600", highlight: true },
  { frequency: "4 games per week for 4 weeks", payPerGame: "₹4,800", pass: "Monthly Pass — ₹3,000", saving: "₹1,800", highlight: true },
];

/** The single-game price every figure in PASS_SAVINGS is derived from. Change
 *  it and the table above has to be recomputed with it. */
export const PASS_SAVINGS_BASIS = "₹300";

export type PassStep = { number: string; title: string; description: string };

export const PASS_STEPS: PassStep[] = [
  {
    number: "1",
    title: "Select your city (passes available only in Gurugram as of now)",
    description: "See the passes and eligible games currently available near you.",
  },
  {
    number: "2",
    title: "Choose your pass",
    description: "Pick 15 days for flexibility or 30 days for maximum value.",
  },
  {
    number: "3",
    title: "Activate your pass",
    description: "Your validity begins from the activation date displayed and confirmed during checkout.",
  },
  {
    number: "4",
    title: "Book an eligible game",
    description: "Look for the Pass Eligible badge and reserve one available spot through your account.",
  },
  {
    number: "5",
    title: "Get confirmed and play",
    description:
      "Your place is confirmed only when the booking succeeds and your name appears on the confirmed player list. Receive the game details, arrive on time and enjoy the match.",
  },
];

export const PASS_INCLUDES: string[] = [
  "Entry to football games clearly marked Pass Eligible",
  "Turf, timing and format information before the game",
  "Player and team coordination",
  "Booking confirmation and important reminders",
  "Waitlist and replacement coordination when a game is full",
  "On-ground organiser support at applicable games",
  "Access to the Kasa Kai football community",
];

export const PASS_EXCLUDES: string[] = [
  "Games not marked Pass Eligible",
  "Premium games, tournaments or special formats unless specifically stated",
  "Screenings, parties, workshops or other non-football Kasa Kai experiences",
  "Travel, merchandise, food or beverages",
  "Guest entry for another person",
  "A guaranteed spot without a successful booking",
];

export const PASS_AUDIENCE: string[] = [
  "You want to play more than three times a week",
  "You love football but do not have a complete team",
  "Your friends are not always available when you want to play",
  "You are new to the city and want to meet people through sport",
  "You want a consistent fitness routine that feels enjoyable",
  "You are tired of coordinating venues, players and payments",
  "You want to improve by playing more regularly",
];
