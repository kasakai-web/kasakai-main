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
  "scr-events",
  "scr-guests",
  "scr-finance",
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
  "scr-events":  "Screening Events",
  "scr-guests":  "Guest List",
  "scr-finance": "Streaming Finance",
};

export const sectionPaths: Record<DashboardSection, string> = {
  dashboard:     "Overview",
  users:         "People / Users",
  organisers:    "People / Organisers",
  games:         "Football / Games",
  payments:      "Football / Payments",
  finance:       "Football / Finance",
  notifications: "Football / Notifications",
  feedback:      "Football / Feedback",
  disputes:      "Football / Disputes",
  communities:   "Config / Communities",
  venues:        "Config / Venues",
  "scr-events":  "Streaming / Events",
  "scr-guests":  "Streaming / Guest List",
  "scr-finance": "Streaming / Finance",
};

export type SidebarItem = {
  section: DashboardSection;
  label: string;
  badge?: string;
  badgeTone?: "default" | "red";
  accent?: "teal" | "blue" | "amber";
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
    label: "Football",
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
    label: "Streaming",
    items: [
      { section: "scr-events",  label: "Events",     accent: "teal"  },
      { section: "scr-guests",  label: "Guest List", accent: "blue"  },
      { section: "scr-finance", label: "Finance",    accent: "amber" },
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
