import type { NavLink, LoginOption } from "@/types";

export const NAV_LINKS: NavLink[] = [
  { label: "Home", href: "#home" },
  { label: "Features", href: "#features" },
  { label: "Pricing", href: "#pricing" },
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
    role: "organiser",
    label: "Login as Organiser",
    desc: "Manage your events & earnings",
    icon: "⚙️",
  },
];
