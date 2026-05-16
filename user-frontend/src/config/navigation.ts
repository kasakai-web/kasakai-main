import type { NavLink, LoginOption } from "@/types";

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "/" },
  { label: "Events", href: "#events" },
  { label: "Support", href: "#support" },
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
