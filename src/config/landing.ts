// Copy for the signed-out marketing page (src/app/page.tsx).
//
// Kept out of the components for the same reason the other config/ files exist:
// the wording changes far more often than the layout does, and a copy edit
// should never mean touching JSX.

export type LandingStat = { value: string; label: string };

export const HERO_STATS: LandingStat[] = [
  { value: "10,000+",  label: "Events organised" },
  { value: "9+ years", label: "Building community" },
  { value: "Come solo", label: "We handle the rest" },
];

export const COMMUNITY_STATS: LandingStat[] = [
  // Same count as the hero's "Events organised", worded for this section — move
  // the two together or the page contradicts itself on one scroll.
  { value: "10,000+", label: "Experiences" },
  { value: "20–25",  label: "Games weekly" },
  { value: "2",      label: "Active cities" },
];

export type LandingStep = { number: string; icon: "pin" | "calendar" | "users"; title: string; description: string };

export const LANDING_STEPS: LandingStep[] = [
  {
    number: "01",
    icon: "pin",
    title: "Pick your city",
    description: "See upcoming games and experiences close to where you live or work.",
  },
  {
    number: "02",
    icon: "calendar",
    title: "Book your spot",
    description: "Check the venue, timing, format and remaining places before you pay.",
  },
  {
    number: "03",
    icon: "users",
    title: "Just show up",
    description: "Our organiser welcomes you, balances teams and gets the game started.",
  },
];

export const PASS_BENEFITS: string[] = [
  "Multiple games included every month",
  "Priority access before public release",
  "One community across your city",
];

export type LandingFAQ = { id: string; question: string; answer: string };

// Player-facing questions only — the organiser-side FAQ lives in config/faq.ts
// and is answered inside the dashboard, where the reader is already signed in.
export const LANDING_FAQS: LandingFAQ[] = [
  {
    id: "solo",
    question: "Can I join if I am coming alone?",
    answer:
      "Absolutely. Most first-time players come alone. The organiser checks you in, introduces you to the group and assigns balanced teams before kick-off.",
  },
  {
    id: "beginners",
    question: "Are beginners welcome?",
    answer:
      "Yes. Every game card lists its format and level. Beginner-friendly and all-level games are run so that a new player is comfortable from the first whistle.",
  },
  {
    id: "cancelled",
    question: "What happens if a game is cancelled?",
    answer:
      "You are notified on your registered number, and the amount returns to your Kasa Kai wallet — ready for the next game or withdrawable, as per the event policy.",
  },
  {
    id: "waitlist",
    question: "How does the waitlist work?",
    answer:
      "If a game is full, join the waitlist. The moment a spot opens, waitlisted players are notified and the first completed payment confirms it.",
  },
  {
    id: "teams",
    question: "How are teams created?",
    answer:
      "Teams are balanced from player ratings, the position each player signed up for and the organiser's read of the group, then published to everyone before the game.",
  },
];

export const LANDING_TESTIMONIAL = {
  quote:
    "I came for one game because my friends cancelled. Three months later, I play thrice a week with Kasa Kai.",
  initials: "AK",
  name: "Aditya K.",
  role: "Kasa Kai player · Mumbai",
};

// The two clips shown in the experiences bento.
export const LANDING_VIDEOS = [
  { id: "DrXNKIvgM9Q", title: "Kasa Kai turf meet" },
  { id: "p6WK0CSjQFM", title: "Kasa Kai community" },
];

export const CONTACT_EMAIL = "contact@kasakai.in";
