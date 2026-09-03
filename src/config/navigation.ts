import type { NavLink, LoginOption } from "@/types";

// Dedicated /events and /support pages are still to be built. Until they exist
// these point at the landing-page sections that answer the same question, and
// are absolute so the links also work from /about, /login and the policy pages.
//
// "About us" sits second because it is the only one of the four that is a page
// of its own — Home is where you are, and the two hash links are shortcuts into
// it. A link with a real path is what Header highlights as the current page.
export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "About us", href: "/about" },
  { label: "Events", href: "/#events" },
  { label: "Support", href: "/#support" },
];

export const LOGIN_OPTIONS: LoginOption[] = [
  {
    role: "player",
    label: "Login as Player",
    desc: "Access your games & profile",
    icon: "👤",
  },
  {
    href: "/screening/login",
    label: "Login for Screening",
    desc: "Book tickets & manage screenings",
    icon: "🎬",
  },
];
