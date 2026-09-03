// Copy for the public About page (src/app/about/page.tsx).
//
// Same reason the other config/ files exist: this wording is edited far more
// often than the layout, and a copy change should never mean touching JSX.
//
// The counts here and in config/landing.ts describe the SAME business — a
// visitor can reach both pages in one click, so move them together or the site
// contradicts itself.

import type { LandingStat } from "./landing";

export const ABOUT_HERO_STATS: LandingStat[] = [
  { value: "2017",     label: "Year we started creating experiences" },
  { value: "10,000+",  label: "Experiences organised across cities" },
  { value: "2",        label: "Cities currently active — Gurgaon & Mumbai" },
];

/** The lime band. Same numbers, worded as a track record rather than a profile. */
export const ABOUT_TRACK_RECORD: LandingStat[] = [
  { value: "2017",    label: "When we started" },
  { value: "10,000+", label: "Experiences organised" },
  { value: "1000+",   label: "Participants across cities" },
  { value: "2",       label: "Active cities today" },
];

/** The friction a player hits today, each with the emoji that stands in for it. */
export const ABOUT_FRICTIONS: { icon: string; text: string }[] = [
  { icon: "👥", text: "Find enough players or an existing team" },
  { icon: "📅", text: "Coordinate schedules across multiple people" },
  { icon: "💸", text: "Collect payments and follow up with non-payers" },
  { icon: "🚨", text: "Handle last-minute cancellations and replacements" },
  { icon: "📱", text: "Send repeated updates and manage everything yourself" },
];

export type AboutStep = { number: string; title: string; description: string };

// Deliberately NOT the same list as LANDING_STEPS: the landing page tells a
// visitor what to do next in three steps, this one explains how the whole
// journey is put together. Keeping them separate is what lets each be honest.
export const ABOUT_STEPS: AboutStep[] = [
  { number: "01", title: "Discover",  description: "Find a relevant game by location, date and format." },
  { number: "02", title: "Book",      description: "Reserve your spot solo, with friends or as a team." },
  { number: "03", title: "Get Ready", description: "Receive confirmation, team details and timely updates." },
  { number: "04", title: "Play",      description: "Show up to a properly organised game. Nothing left to manage." },
];

export const ABOUT_TECHNOLOGY: string[] = [
  "Helps players discover suitable games",
  "Simplifies spot booking and payments",
  "Keeps game information in one place",
  "Creates the foundation for scale",
];

export const ABOUT_ORGANISERS: string[] = [
  "Coordinates the game before it begins",
  "Confirms players and communicates updates",
  "Manages check-in and on-ground readiness",
  "Creates the confidence to show up",
];

export type AboutMilestone = { phase: string; title: string; description: string };

export const ABOUT_ROADMAP: AboutMilestone[] = [
  {
    phase: "Now",
    title: "Turf Meets",
    description: "Solving one complex participation journey deeply.",
  },
  {
    phase: "Next",
    title: "More Sports",
    description: "Extending the proven system into adjacent playing experiences.",
  },
  {
    phase: "Future",
    title: "Every Interest",
    description:
      "A platform where anyone can discover, book and show up — without managing the complexity behind it.",
  },
];
