// Hosting, for the player app: the types the backend sends, and the calls.
//
// A HOST is a player an organiser recommended and KasaKai approved to run that
// organiser's games on the ground. A host can book a game's host spots at the
// organiser's discount, or be asked to FACILITATE a game without playing in it.
// Either way, for the games they run they get the host tools: the roster,
// attendance, teams and wrap-up — the organiser's own actions, reached through
// /games/:id/staff, where the server checks every request that they are still
// running that game.
//
// Nothing here decides anything. Whether a player may book a host spot, and at
// what price, comes from the server's `hostInfo` on each game (the same gate the
// booking itself runs); what the host tools may do right now comes from the
// console's `capabilities`. The screens only draw those answers.

import { buildApiUrl, getSession } from "@/utils/api";

/** The block every game read carries. Price and the gate only for approved hosts. */
export interface HostInfo {
  enabled: boolean;
  total: number;
  filled: number;
  open: number;
  held: number;
  releaseAt: string | null;
  released: boolean;
  runBy: { name: string; role: "host" | "facilitator" }[];
  viewerIsApprovedHost: boolean;
  viewerStaffRole: "host" | "facilitator" | null;
  viewerHoldsHostSeat: boolean;
  pricePaise?: number;
  discountPaise?: number;
  viewerCanBook?: boolean;
  viewerBlockedCode?: string | null;
  viewerBlockedReason?: string | null;
}

export interface HostingGameCard {
  _id: string;
  title?: string;
  scheduledAt: string;
  status: string;
  format?: string;
  feeInPaise?: number;
  visibility?: "public" | "private";
  organiser: { _id: string; name: string } | null;
  turf: { _id: string; name: string; address?: { city?: string; area?: string } } | null;
  // invites
  facilitatorId?: string | null;
  invitedByName?: string | null;
  note?: string | null;
  // running
  staffRole?: "host" | "facilitator";
  // open spots
  hostSpotsOpen?: number;
  pricePaise?: number;
  discountPaise?: number;
}

export interface HostingSummary {
  isHost: boolean;
  hostFor: { _id: string; organiser: { _id: string; name: string; profileImage?: string | null } | null; since?: string | null }[];
  invites: HostingGameCard[];
  running: HostingGameCard[];
  openSpots: HostingGameCard[];
  counts: { invites: number; running: number; openSpots: number };
}

export interface StaffRosterRow {
  memberId: string;
  name: string;
  isGuest: boolean;
  isOrganiser?: boolean;
  broughtBy: string | null;
  seatType: "standard" | "host";
  position: string;
  attended: "present" | "absent" | "no_show" | "not_marked" | null;
  assignedTeam: "A" | "B" | "unassigned";
  assignedColour: "red" | "blue" | null;
  phone: string | null;
  profileImage: string | null;
  isYou: boolean;
}

export interface StaffConsole {
  role: "host" | "facilitator";
  game: {
    _id: string;
    title?: string;
    scheduledAt: string;
    endsAt?: string | null;
    durationMins?: number;
    reportingMinsBeforeGame?: number;
    status: string;
    format?: string;
    totalSlots?: number;
    turf: { name?: string; address?: { city?: string; area?: string } } | null;
    organiser: { name?: string } | null;
    matchRecording: string | null;
    attendanceMarked: boolean;
    attendanceMarkedAt: string | null;
  };
  runBy: { name: string; role: "host" | "facilitator" }[];
  roster: StaffRosterRow[];
  teams: {
    sides: { A: { name?: string; colour?: string }; B: { name?: string; colour?: string } };
    distributed: boolean;
    published: boolean;
    publishedAt: string | null;
  };
  counts: { players: number; guests: number; present: number; absent: number; noShow: number; notMarked: number };
  capabilities: {
    canDistribute: boolean;
    canMove: boolean;
    canPublish: boolean;
    canComplete: boolean;
    canRecord: boolean;
    canMarkAttendance: boolean;
  };
}

export type StaffAction =
  | "complete"
  | "recording"
  | "attendance"
  | "teams/distribute"
  | "teams/move"
  | "teams/publish";

const authFetch = async <T = unknown>(path: string, init: RequestInit = {}): Promise<{ data: T; message?: string }> => {
  const { token } = getSession();
  const res = await fetch(buildApiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body?.success === false) throw new Error(body?.message || `HTTP ${res.status}`);
  return body;
};

/** What booking a host spot costs THIS player, from `?asHost=1` on the checkout
 *  quote: the organiser's discount, then any pass applied to the host price —
 *  the same arithmetic the booking charges. Refused for anyone who is not this
 *  organiser's approved host. */
export interface HostQuote {
  feePerSlotPaise: number;
  hostPricePaise: number;
  hostDiscountPaise: number;
  playerFeePaise: number;
  passEligible: boolean;
  passLabel: string | null;
}

export const fetchHosting = async (): Promise<HostingSummary> =>
  (await authFetch<HostingSummary>("/hosting/me")).data;

export const fetchHostQuote = async (gameId: string): Promise<HostQuote> =>
  (await authFetch<HostQuote>(`/games/${gameId}/checkout/quote?asHost=1`)).data;

export const respondToFacilitation = async (gameId: string, accept: boolean) =>
  authFetch(`/games/${gameId}/facilitation/${accept ? "accept" : "decline"}`, { method: "POST" });

export const stepDownAsHost = async (approvalId: string) =>
  authFetch(`/hosting/approvals/${approvalId}/step-down`, { method: "POST" });

export const fetchStaffConsole = async (gameId: string): Promise<StaffConsole> =>
  (await authFetch<StaffConsole>(`/games/${gameId}/staff`)).data;

export const staffAction = async <T = unknown>(gameId: string, action: StaffAction, body: Record<string, unknown> = {}) =>
  authFetch<T>(`/games/${gameId}/staff/${action}`, { method: "POST", body: JSON.stringify(body) });

// ── Small display helpers ────────────────────────────────────────────────────

export const rupees = (paise?: number | null) => `₹${Math.round((paise || 0) / 100).toLocaleString("en-IN")}`;

export const whenText = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        weekday: "short", day: "numeric", month: "short",
        hour: "numeric", minute: "2-digit", hour12: true,
      })
    : "";

/** "Run by Rahul (host) and Asha (facilitator)" — or null when nobody is. */
export const runByText = (runBy?: HostInfo["runBy"] | null) => {
  if (!runBy || runBy.length === 0) return null;
  const names = runBy.map((r) => `${r.name}${r.role === "facilitator" ? " (facilitator)" : " (host)"}`);
  return `Run by ${names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : names[0]}`;
};
