import React from "react";

export type ScrEvent = {
  id: string;
  title: string;
  venue: string;
  date: string;
  status: "published" | "cancelled" | "draft";
  image: string;
  capacity?: number;
  sold?: number;
  pricePaise?: number;
  contacts: { name: string; email: string; phone: string }[];
};

export const MOCK_SCR_EVENTS: ScrEvent[] = [
  { id: "ucl-final-real-madrid-vs-dortmund-at-the-local-cafe-jun1-2026-buy-tickets",       title: "UCL Final: Real Madrid vs. Dortmund",        venue: "The Local Cafe, Gurgaon",                       date: "Jun 1 | 12:30 AM",  status: "published",  capacity: 120, sold: 87,  pricePaise: 49900, contacts: [], image: "https://images.unsplash.com/photo-1543007630-9710e4a00a20?auto=format&fit=crop&q=80&w=800" },
  { id: "epl-arsenal-vs-man-city-at-brew-and-ball-may12-2026-buy-tickets",                 title: "EPL: Arsenal vs. Man City",                  venue: "Brew & Ball, Sector 29, Gurgaon",               date: "May 12 | 9:00 PM",  status: "published",  capacity: 80,  sold: 45,  pricePaise: 39900, contacts: [], image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=800" },
  { id: "copa-del-rey-barca-vs-atletico-at-corner-flag-may25-2026-buy-tickets",            title: "Copa del Rey: Barca vs. Atletico",            venue: "Corner Flag Sports Bar, Koramangala, Bangalore", date: "May 25 | 10:30 PM", status: "draft",      capacity: 60,  sold: 0,   pricePaise: 29900, contacts: [], image: "https://images.unsplash.com/photo-1589487391730-58f20eb2c308?auto=format&fit=crop&q=80&w=800" },
  { id: "europa-league-sf-man-utd-vs-sevilla-at-goal-post-may29-2026-buy-tickets",         title: "Europa League SF: Man Utd vs. Sevilla",      venue: "Goal Post Sports Bar, Bandra, Mumbai",          date: "May 29 | 12:30 AM", status: "published",  capacity: 100, sold: 100, pricePaise: 55000, contacts: [], image: "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&q=80&w=800" },
  { id: "laliga-real-madrid-vs-atletico-at-ultras-sports-lounge-jun7-2026-buy-tickets",    title: "La Liga: Real Madrid vs. Atletico",           venue: "Ultras Sports Lounge, Connaught Place, Delhi",  date: "Jun 7 | 9:00 PM",   status: "cancelled",  capacity: 90,  sold: 72,  pricePaise: 45000, contacts: [], image: "https://images.unsplash.com/photo-1553778263-73a83bab9b0c?auto=format&fit=crop&q=80&w=800" },
  { id: "afc-champions-mumbai-city-vs-al-hilal-at-the-offside-bar-jun14-2026-buy-tickets", title: "AFC Champions: Mumbai City vs. Al-Hilal",     venue: "The Offside Bar, Powai, Mumbai",                date: "Jun 14 | 8:30 PM",  status: "draft",      capacity: 75,  sold: 0,   pricePaise: 34900, contacts: [], image: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&q=80&w=800" },
];

export function scrStatusBadge(status: ScrEvent["status"]) {
  if (status === "published") return { label: "Published", color: "#22c55e", bg: "rgba(34,197,94,0.1)",   border: "rgba(34,197,94,0.25)" };
  if (status === "cancelled") return { label: "Cancelled", color: "#ef4444", bg: "rgba(239,68,68,0.1)",  border: "rgba(239,68,68,0.25)" };
  return                             { label: "Draft",     color: "#f59e0b", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" };
}

export type ScrShowTicket = { id: string; name: string; qty: number; sold: number; pricePaise: number };
export type ScrShow = {
  id: string; dateLabel: string; timeLabel: string;
  status: "active" | "expired"; expanded: boolean;
  tickets: ScrShowTicket[];
};

export function mockShowsForEvent(ev: ScrEvent): ScrShow[] {
  const parts = ev.date.split("|");
  return [{
    id: "show-1",
    dateLabel: parts[0]?.trim() ?? "TBD",
    timeLabel: parts[1]?.trim() ?? "8:00 PM",
    status: "expired", expanded: false,
    tickets: [{ id: "t1", name: "Cover Charge", qty: ev.capacity ?? 100, sold: ev.sold ?? 0, pricePaise: ev.pricePaise ?? 49900 }],
  }];
}

// shared back-button style
export const backBtnStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: "6px",
  padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--border)",
  borderRadius: "8px", color: "var(--muted)", fontSize: "12px", fontWeight: 600,
  cursor: "pointer", flexShrink: 0, marginTop: "2px",
};

export const inp: React.CSSProperties = {
  width: "100%", padding: "10px 12px", background: "var(--bg)",
  border: "1px solid var(--border)", borderRadius: "8px",
  color: "var(--white)", fontSize: "13px", outline: "none", boxSizing: "border-box" as const,
};
