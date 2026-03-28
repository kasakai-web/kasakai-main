export type NavItem = {
  label: string;
  href: string;
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "Support", href: "/support" },
];

export const LOGIN_OPTIONS: NavItem[] = [
  { label: "Organiser Login", href: "/login/organiser" },
  { label: "User Login", href: "/login/user" },
];
