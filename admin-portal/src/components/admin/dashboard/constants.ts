export const dashboardSections = [
  "dashboard",
  "users",
  "organisers",
  "games",
  "payments",
  "finance",
  "notifications",
  "feedback",
  "disputes",
  "communities",
  "venues",
] as const;

export type DashboardSection = (typeof dashboardSections)[number];

export const sectionTitles: Record<DashboardSection, string> = {
  dashboard:     "Dashboard",
  users:         "All Users",
  organisers:    "Organisers",
  games:         "Games & Events",
  payments:      "Payments",
  finance:       "Finance",
  notifications: "Notifications",
  feedback:      "Feedback",
  disputes:      "Disputes",
  communities:   "Communities",
  venues:        "Venues & Turfs",
};

export const sectionPaths: Record<DashboardSection, string> = {
  dashboard:     "Overview",
  users:         "People / Users",
  organisers:    "People / Organisers",
  games:         "Platform / Games",
  payments:      "Platform / Payments",
  finance:       "Platform / Finance",
  notifications: "Platform / Notifications",
  feedback:      "Platform / Feedback",
  disputes:      "Platform / Disputes",
  communities:   "Config / Communities",
  venues:        "Config / Venues",
};

export type SidebarItem = {
  section: DashboardSection;
  label: string;
  badge?: string;
  badgeTone?: "default" | "red";
};

export type SidebarGroup = {
  label: string;
  items: SidebarItem[];
};

export const sidebarGroups: SidebarGroup[] = [
  {
    label: "Overview",
    items: [{ section: "dashboard", label: "Dashboard" }],
  },
  {
    label: "People",
    items: [
      { section: "users",      label: "All Users" },
      { section: "organisers", label: "Organisers", badge: "pending", badgeTone: "red" },
    ],
  },
  {
    label: "Platform",
    items: [
      { section: "games",         label: "Games & Events" },
      { section: "payments",      label: "Payments" },
      { section: "finance",       label: "Finance" },
      { section: "notifications", label: "Notifications" },
      { section: "feedback",      label: "Feedback" },
      { section: "disputes",      label: "Disputes", badgeTone: "red" },
    ],
  },
  {
    label: "Config",
    items: [
      { section: "communities", label: "Communities" },
      { section: "venues",      label: "Venues / Turfs" },
    ],
  },
];
