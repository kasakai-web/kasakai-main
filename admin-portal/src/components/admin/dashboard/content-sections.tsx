"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./dashboard.module.css";
import type { DashboardSection } from "./constants";
import { getAdminToken } from "@/lib/admin-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000/api/v1";

// ── Types ─────────────────────────────────────────────────────────────────────

type AdminUserRow = {
  id: string; name: string; phone: string; email?: string | null;
  role: "player" | "organiser"; isVerified?: boolean;
  gamesPlayed?: number; gamesHosted?: number;
  noShowCount?: number; backoutCount?: number;
  rating?: number;
  // player-specific wallet fields
  totalSpentPaise?: number; walletBalancePaise?: number;
  // organiser-specific
  earningsPaise?: number; pendingPayoutPaise?: number;
  cancellationRate?: number;
  joinedAt?: string | null; status: string; location?: string | null;
};

type AdminOrganiserRow = {
  id: string; name: string; phone: string; email?: string | null;
  whatsappNumber?: string | null; isVerified?: boolean; isActive?: boolean;
  approvalStatus?: string; status: string;
  gamesHosted?: number; totalPlayersManaged?: number;
  rating?: number; totalRatingsReceived?: number; cancellationRate?: number;
  earningsPaise?: number; pendingPayoutPaise?: number;
  joinedAt?: string | null; location?: string | null; suspendReason?: string | null;
};

type AdminGameRow = {
  id: string; title: string; venue?: string | null; scheduledAt?: string | null;
  format?: string | null; players: { registered: number; totalSlots: number };
  feeInPaise?: number; organiserName?: string; status: string;
};

type AdminPaymentRow = {
  id: string; playerName: string; playerPhone?: string | null;
  type: string; amountPaise: number; balanceAfterPaise?: number;
  gameTitle?: string | null;
  organiserName?: string | null; organiserPhone?: string | null;
  description?: string | null;
  razorpayOrderId?: string | null; razorpayPaymentId?: string | null;
  paidAt?: string | null; status: string;
};

type AdminPaymentSummary = {
  totalTopUpPaise?: number; totalDebitPaise?: number;
  totalRefundedPaise?: number; pendingCount?: number;
};

type AdminPaymentListResponse = {
  success: boolean; count?: number; summary?: AdminPaymentSummary;
  data: AdminPaymentRow[]; message?: string;
};

type AdminNotifRow = {
  _id: string; type: string; title: string; body: string;
  isRead: boolean; createdAt: string; recipientRole: string;
  recipientName?: string | null; recipientPhone?: string | null;
};

// Game detail
type GameRegistration = {
  _id: string;
  player?: { _id?: string; name?: string; phone?: string; email?: string } | null;
  plusOneName?: string | null; preferredPosition?: string; teamPreference?: string;
  paymentStatus?: string; amountPaidPaise?: number; attended?: string;
  signedUpAt?: string; assignedTeam?: string;
};

type GameWaitlistEntry = {
  _id: string;
  player?: { _id?: string; name?: string; phone?: string } | null;
  joinedAt?: string; status?: string; preferredPosition?: string;
};

type GameDetail = {
  _id: string; title?: string; format?: string; status?: string;
  scheduledAt?: string; durationMins?: number; feeInPaise?: number;
  totalSlots?: number; minPlayers?: number; organiserIsPlaying?: boolean;
  cancelReason?: string | null; cancelledAt?: string | null;
  completedAt?: string | null; attendanceMarked?: boolean;
  organiser?: { name?: string; phone?: string; email?: string } | null;
  turf?: { name?: string; address?: { area?: string; city?: string; state?: string } } | null;
  registrations: GameRegistration[];
  waitlist: GameWaitlistEntry[];
};

// Finance
type WalletRow = {
  _id: string;
  user?: { name?: string; phone?: string; email?: string } | null;
  balancePaise: number; totalTopUpPaise: number;
  totalSpentPaise: number; totalRefundedPaise: number; updatedAt?: string;
};

type WalletApiResponse = {
  success: boolean; count?: number;
  summary?: { totalBalancePaise: number; totalTopUpPaise: number; totalSpentPaise: number; totalRefundedPaise: number };
  data: WalletRow[]; message?: string;
};

type OrganiserEarningRow = {
  id: string; name: string; phone?: string; email?: string | null;
  totalGames: number; completedGames: number; cancelledGames: number;
  totalRevenuePaise: number; totalGuestSlots: number; totalPaidRegistrations: number;
};

// Feedback
type FeedbackRow = {
  _id: string;
  game?: {
    title?: string; format?: string; scheduledAt?: string;
    organiser?: { name?: string; phone?: string } | null;
    turf?: { name?: string; address?: { area?: string; city?: string } } | null;
  } | null;
  submittedBy?: { name?: string; phone?: string } | null;
  gameRating: number; organiserRating?: number | null; venueRating?: number | null;
  tags?: string[]; comment?: string | null; createdAt: string;
};

type FeedbackApiResponse = {
  success: boolean; count?: number;
  summary?: { avgGame?: number | null; tagCounts?: Record<string, number> };
  data: FeedbackRow[]; message?: string;
};

// Platform stats
type PlatformStats = {
  users: { players: number; organisers: number; total: number };
  games: { total: number; active: number; completed: number; cancelled: number };
  finance: { totalRevenuePaise: number; totalRefundedPaise: number; netRevenuePaise: number; totalWalletBalancePaise: number };
};

// Turf
type TurfAddress = { line1: string; line2?: string; area: string; city: string; state: string; pincode: string; country?: string };
type Turf = {
  _id: string; name: string; shortName?: string; address: TurfAddress;
  surfaceType: string; numberOfPitches: number; pitchSizes: string[];
  hasFloodlights: boolean; hasChangingRooms: boolean; hasParking: boolean; hasRefreshments: boolean;
  contactPhone?: string; contactName?: string; googleMapsUrl?: string; parkingNotes?: string;
  isVerified: boolean; isActive: boolean; totalGamesHosted: number; averageRating: number; createdAt: string;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
}

function formatCurrency(paise?: number) {
  if (typeof paise !== "number") return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function formatStatusLabel(status?: string) {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function badgeClassForStatus(status?: string) {
  const v = (status || "").toLowerCase();
  if (["active", "approved", "verified", "present", "paid", "success"].includes(v)) return styles.badgeGreen;
  if (["pending", "in review", "review", "draft", "waiting", "notified"].includes(v)) return styles.badgeAmber;
  if (["suspended", "rejected", "inactive", "banned", "cancelled", "forfeited", "no_show", "failed"].includes(v)) return styles.badgeRed;
  if (["confirmed", "open"].includes(v)) return styles.badgeBlue;
  if (["completed"].includes(v)) return styles.badgeViolet;
  return styles.badgeGray;
}

function starRating(rating?: number | null) {
  if (rating == null) return "—";
  const full = Math.min(Math.round(rating), 5);
  return "★".repeat(full) + "☆".repeat(5 - full) + ` ${rating.toFixed(1)}`;
}

function notifTimeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function surfaceLabel(s: string) {
  return ({ natural_grass: "Natural", artificial_turf: "Artificial", concrete: "Concrete", indoor: "Indoor" } as Record<string, string>)[s] ?? s;
}

// ── Shared component props ────────────────────────────────────────────────────

type ContentSectionsProps = {
  activeSection: DashboardSection;
  onOpenDetail: (title: string) => void;
  onNavigate: (section: DashboardSection) => void;
};

function Head({ title, sub, action }: { title: string; sub: string; action?: React.ReactNode }) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <div className={styles.sectionTitle}>{title}</div>
        <div className={styles.sectionSub}>{sub}</div>
      </div>
      {action}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

function Dashboard({ onNavigate }: { onNavigate: (s: DashboardSection) => void }) {
  const [stats, setStats] = useState<PlatformStats | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) return;
    fetch(`${API_BASE}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setStats(d.data); })
      .catch(() => {});
  }, []);

  const u  = stats?.users;
  const g  = stats?.games;
  const f  = stats?.finance;

  return (
    <>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Total Users</div>
          <div className={styles.statValue}>{u ? u.total : "—"}</div>
          <div className={`${styles.statDelta} ${styles.neutral}`}>{u ? `${u.players} players · ${u.organisers} organisers` : "Loading…"}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Active Games</div>
          <div className={styles.statValue}>{g ? g.active : "—"}</div>
          <div className={`${styles.statDelta} ${styles.neutral}`}>{g ? `${g.total} total · ${g.completed} completed` : "Loading…"}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Net Revenue</div>
          <div className={styles.statValue}>{f ? formatCurrency(f.netRevenuePaise) : "—"}</div>
          <div className={`${styles.statDelta} ${styles.neutral}`}>After refunds</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Platform Wallet</div>
          <div className={styles.statValue}>{f ? formatCurrency(f.totalWalletBalancePaise) : "—"}</div>
          <div className={`${styles.statDelta} ${styles.neutral}`}>All player balances</div>
        </div>
      </div>

      <div className={styles.twoCol}>
        <div className={`${styles.panel} ${styles.panelWarn}`}>
          <div className={styles.statLabel}>Action Required</div>
          <div className={styles.panelTitle}>Review Pending Organisers</div>
          <div className={styles.panelSub}>Check the Organisers section to approve or reject pending applications.</div>
          <button className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`} type="button" onClick={() => onNavigate("organisers")}>
            Review Now
          </button>
        </div>
        <div className={styles.panel}>
          <div className={styles.statLabel}>Quick Links</div>
          <div className={styles.feed}>
            <div className={styles.feedRow}><div><div className={styles.feedTitle}>Finance Overview</div><div className={styles.feedSub}>Player wallets &amp; organiser earnings</div></div><button className={styles.actionBtn} onClick={() => onNavigate("finance")} type="button">Go</button></div>
            <div className={styles.feedRow}><div><div className={styles.feedTitle}>Games &amp; Events</div><div className={styles.feedSub}>View registrations &amp; details</div></div><button className={styles.actionBtn} onClick={() => onNavigate("games")} type="button">Go</button></div>
            <div className={styles.feedRow}><div><div className={styles.feedTitle}>Notifications</div><div className={styles.feedSub}>Platform-wide notification log</div></div><button className={styles.actionBtn} onClick={() => onNavigate("notifications")} type="button">Go</button></div>
            <div className={styles.feedRow}><div><div className={styles.feedTitle}>Player Feedback</div><div className={styles.feedSub}>Post-game ratings &amp; comments</div></div><button className={styles.actionBtn} onClick={() => onNavigate("feedback")} type="button">Go</button></div>
          </div>
        </div>
      </div>

      <div className={styles.quickStats}>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Total Players</div><div className={styles.summaryValue}>{u?.players ?? "—"}</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Total Organisers</div><div className={styles.summaryValue}>{u?.organisers ?? "—"}</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Games Completed</div><div className={styles.summaryValue}>{g?.completed ?? "—"}</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Games Cancelled</div><div className={styles.summaryValue}>{g ? <span style={{ color: "var(--red)" }}>{g.cancelled}</span> : "—"}</div></div>
      </div>
    </>
  );
}

// ── Users ─────────────────────────────────────────────────────────────────────

function Users({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  const [users, setUsers]           = useState<AdminUserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminUserRow["role"]>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchUsers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = getAdminToken();
      if (!token) { setError("Admin session missing."); return; }
      const res  = await fetch(`${API_BASE}/admin/users`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to load users."); return; }
      setUsers(data.data || []);
    } catch { setError("Cannot reach the server."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase();
    return (
      [u.name, u.phone, u.email || "", u.location || ""].join(" ").toLowerCase().includes(q) &&
      (roleFilter === "all" || u.role === roleFilter) &&
      (statusFilter === "all" || u.status.toLowerCase() === statusFilter)
    );
  });

  return (
    <>
      <Head title="All Users" sub={loading ? "Loading…" : `${users.length} registered users`} />
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search by name, phone, email, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "all" | AdminUserRow["role"])}>
          <option value="all">All roles</option>
          <option value="player">Players</option>
          <option value="organiser">Organisers</option>
        </select>
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {error && <div className={styles.formError}>{error}</div>}
      {loading && <div className={styles.loadingState}>Loading users…</div>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Role</th><th>Email</th><th>Location</th><th>Games</th><th>Rating</th><th>Earnings / Spent</th><th>Joined</th><th>Status</th></tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && <tr><td colSpan={10} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No users match the current filters.</td></tr>}
            {filtered.map((u) => (
              <tr key={u.id} onClick={() => onOpenDetail(u.name)} style={{ cursor: "pointer" }}>
                <td>{u.name}</td>
                <td>{u.phone}</td>
                <td><span className={`${styles.badge} ${u.role === "organiser" ? styles.badgeBlue : styles.badgeGray}`}>{u.role === "organiser" ? "Organiser" : "Player"}</span></td>
                <td>{u.email || "—"}</td>
                <td>{u.location || "—"}</td>
                <td>
                  {u.role === "organiser" ? (u.gamesHosted ?? 0) : (u.gamesPlayed ?? 0)}
                  {u.role === "player" && (u.noShowCount ?? 0) > 0 && (
                    <div style={{ fontSize: "11px", color: "var(--red)" }}>{u.noShowCount} no-show{(u.noShowCount ?? 0) > 1 ? "s" : ""}</div>
                  )}
                </td>
                <td>
                  {u.rating != null && u.rating > 0
                    ? <span style={{ color: "var(--amber)", fontWeight: 600 }}>★ {(u.rating as number).toFixed(1)}</span>
                    : <span style={{ color: "var(--muted)", fontSize: "12px" }}>No ratings</span>
                  }
                </td>
                <td>
                  {u.role === "organiser"
                    ? <span style={{ color: "var(--green)", fontWeight: 600 }}>{formatCurrency(u.earningsPaise)}</span>
                    : <span style={{ color: "var(--red)" }}>{formatCurrency(u.totalSpentPaise)}</span>
                  }
                  {u.role === "player" && (u.walletBalancePaise ?? 0) > 0 && (
                    <div style={{ fontSize: "11px", color: "var(--green)" }}>Bal: {formatCurrency(u.walletBalancePaise)}</div>
                  )}
                </td>
                <td>{formatDate(u.joinedAt)}</td>
                <td><span className={`${styles.badge} ${badgeClassForStatus(u.status)}`}>{formatStatusLabel(u.status)}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Organisers ────────────────────────────────────────────────────────────────

function Organisers({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  const [organisers, setOrganisers]     = useState<AdminOrganiserRow[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [search, setSearch]             = useState("");
  const [actionBusy, setActionBusy]     = useState<string | null>(null);
  const [actionError, setActionError]   = useState("");
  const [suspendTarget, setSuspendTarget] = useState<AdminOrganiserRow | null>(null);
  const [suspendReason, setSuspendReason] = useState("");

  const fetchOrganisers = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = getAdminToken();
      if (!token) { setError("Admin session missing."); return; }
      const res  = await fetch(`${API_BASE}/admin/organisers`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to load organisers."); return; }
      setOrganisers(data.data || []);
    } catch { setError("Cannot reach the server."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrganisers(); }, [fetchOrganisers]);

  async function doAction(id: string, action: "approve" | "reject" | "reactivate", body?: object) {
    setActionBusy(id + action); setActionError("");
    try {
      const token = getAdminToken();
      const res   = await fetch(`${API_BASE}/admin/organisers/${id}/${action}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.message || "Action failed."); return; }
      await fetchOrganisers();
    } catch { setActionError("Cannot reach the server."); }
    finally { setActionBusy(null); }
  }

  async function doSuspend() {
    if (!suspendTarget) return;
    setActionBusy(suspendTarget.id + "suspend"); setActionError("");
    try {
      const token = getAdminToken();
      const res   = await fetch(`${API_BASE}/admin/organisers/${suspendTarget.id}/suspend`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reason: suspendReason.trim() || "Suspended by admin." }),
      });
      const data = await res.json();
      if (!res.ok) { setActionError(data.message || "Suspend failed."); return; }
      setSuspendTarget(null); setSuspendReason("");
      await fetchOrganisers();
    } catch { setActionError("Cannot reach the server."); }
    finally { setActionBusy(null); }
  }

  // Fix: approved-but-suspended organisers were falling through all three filters
  const pending  = organisers.filter((o) => o.approvalStatus === "pending");
  const approved = organisers.filter((o) => o.approvalStatus === "approved" && o.isActive !== false);
  const other    = organisers.filter((o) => !pending.includes(o) && !approved.includes(o));

  const q = search.trim().toLowerCase();
  const applySearch = (list: AdminOrganiserRow[]) =>
    q ? list.filter((o) => [o.name, o.phone, o.email || "", o.whatsappNumber || "", o.location || ""].join(" ").toLowerCase().includes(q)) : list;

  const ORow = ({ o }: { o: AdminOrganiserRow }) => {
    const busy = actionBusy !== null;
    return (
    <tr>
      <td>
        <div style={{ fontWeight: 500 }}>{o.name}</div>
        {o.suspendReason && <div style={{ fontSize: "11px", color: "var(--red)" }}>{o.suspendReason}</div>}
      </td>
      <td>
        <div>{o.phone}</div>
        {o.whatsappNumber && o.whatsappNumber !== o.phone && (
          <div style={{ fontSize: "11px", color: "var(--muted)" }}>WA: {o.whatsappNumber}</div>
        )}
      </td>
      <td>{o.email || "—"}</td>
      <td>{o.location || "—"}</td>
      <td>{formatDate(o.joinedAt)}</td>
      <td>
        <div>{o.gamesHosted ?? 0} hosted</div>
        <div style={{ fontSize: "11px", color: "var(--muted)" }}>{o.totalPlayersManaged ?? 0} players</div>
      </td>
      <td>
        {o.rating != null && o.rating > 0
          ? <div style={{ color: "var(--amber)", fontWeight: 600 }}>★ {o.rating.toFixed(1)}<span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 400, marginLeft: "4px" }}>({o.totalRatingsReceived ?? 0})</span></div>
          : <div style={{ color: "var(--muted)", fontSize: "12px" }}>No ratings yet</div>
        }
      </td>
      <td>
        {o.cancellationRate != null && o.cancellationRate > 0
          ? <span style={{ color: o.cancellationRate > 20 ? "var(--red)" : "var(--amber)" }}>{o.cancellationRate.toFixed(1)}%</span>
          : <span style={{ color: "var(--muted)" }}>0%</span>
        }
      </td>
      <td>
        <div style={{ color: "var(--green)", fontWeight: 600 }}>{formatCurrency(o.earningsPaise)}</div>
        {(o.pendingPayoutPaise ?? 0) > 0 && (
          <div style={{ fontSize: "11px", color: "var(--amber)" }}>Pending: {formatCurrency(o.pendingPayoutPaise)}</div>
        )}
      </td>
      <td>
        <span className={`${styles.badge} ${badgeClassForStatus(o.status)}`}>{formatStatusLabel(o.status)}</span>
      </td>
      <td>
        <div className={styles.actions}>
          {o.approvalStatus === "pending" && (
            <>
              <button
                className={styles.actionBtn}
                style={{ color: "var(--green)", borderColor: "rgba(34,197,94,0.4)" }}
                disabled={busy}
                onClick={() => doAction(o.id, "approve")}
              >
                {actionBusy === o.id + "approve" ? "…" : "Approve"}
              </button>
              <button
                className={styles.actionBtn}
                style={{ color: "var(--red)", borderColor: "rgba(239,68,68,0.4)" }}
                disabled={busy}
                onClick={() => doAction(o.id, "reject")}
              >
                {actionBusy === o.id + "reject" ? "…" : "Reject"}
              </button>
            </>
          )}
          {o.approvalStatus === "approved" && o.isActive && (
            <button
              className={styles.actionBtn}
              style={{ color: "var(--amber)", borderColor: "rgba(245,158,11,0.4)" }}
              disabled={busy}
              onClick={() => { setSuspendTarget(o); setSuspendReason(""); }}
            >
              Suspend
            </button>
          )}
          {!o.isActive && o.approvalStatus !== "pending" && o.approvalStatus !== "rejected" && (
            <button
              className={styles.actionBtn}
              style={{ color: "var(--green)", borderColor: "rgba(34,197,94,0.4)" }}
              disabled={busy}
              onClick={() => doAction(o.id, "reactivate")}
            >
              {actionBusy === o.id + "reactivate" ? "…" : "Reactivate"}
            </button>
          )}
        </div>
      </td>
    </tr>
    );
  };

  const OTable = ({ rows, emptyMsg }: { rows: AdminOrganiserRow[]; emptyMsg: string }) => (
    <div className={styles.tableWrap} style={{ marginBottom: "20px" }}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Name</th><th>Phone / WhatsApp</th><th>Email</th><th>Location</th>
            <th>Joined</th><th>Games</th><th>Rating</th><th>Cancel Rate</th>
            <th>Earnings</th><th>Status</th><th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={11} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>{emptyMsg}</td></tr>
          )}
          {rows.map((o) => <ORow key={o.id} o={o} />)}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Head title="Organisers" sub={loading ? "Loading…" : `${organisers.length} total organisers`} />
      {error && <div className={styles.formError}>{error}</div>}
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search by name, phone, WhatsApp, email, location…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className={styles.actionBtn} type="button" onClick={fetchOrganisers}>Refresh</button>
      </div>
      {loading && <div className={styles.loadingState}>Loading organisers…</div>}
      <div className={styles.blockTitle}>Pending Verification ({applySearch(pending).length})</div>
      <OTable rows={applySearch(pending)} emptyMsg="No pending organisers." />
      <div className={styles.blockTitleSuccess}>Approved &amp; Active ({applySearch(approved).length})</div>
      <OTable rows={applySearch(approved)} emptyMsg="No approved organisers." />
      <div className={styles.blockTitle}>Rejected / Suspended ({applySearch(other).length})</div>
      <OTable rows={applySearch(other)} emptyMsg="None." />

      {/* Suspend reason modal */}
      {suspendTarget && (
        <div className={styles.modalOverlay} onClick={() => setSuspendTarget(null)}>
          <div className={styles.modal} style={{ maxWidth: "440px" }} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHead}>
              <div className={styles.sectionTitle}>Suspend Organiser</div>
              <button className={styles.modalClose} type="button" onClick={() => setSuspendTarget(null)}>✕</button>
            </div>
            <div style={{ marginBottom: "14px", color: "var(--text)", fontSize: "14px" }}>
              Suspending <strong>{suspendTarget.name}</strong>. They will not be able to create or manage games.
            </div>
            <label className={styles.formLabel}>
              Reason (shown to admin log)
              <input
                className={styles.searchInput}
                style={{ width: "100%", marginTop: "6px" }}
                placeholder="e.g. Multiple complaints from players"
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
              />
            </label>
            {actionError && <div className={styles.formError} style={{ marginTop: "10px" }}>{actionError}</div>}
            <div className={styles.modalActions} style={{ marginTop: "18px" }}>
              <button className={styles.actionBtn} type="button" onClick={() => setSuspendTarget(null)}>Cancel</button>
              <button
                className={styles.actionBtn}
                style={{ color: "var(--red)", borderColor: "rgba(239,68,68,0.5)", background: "var(--red-bg)" }}
                type="button"
                disabled={actionBusy !== null}
                onClick={doSuspend}
              >
                {actionBusy !== null ? "Suspending…" : "Confirm Suspend"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Game Detail Modal ──────────────────────────────────────────────────────────

function GameDetailModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [game, setGame] = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) {
      setError("Admin session missing.");
      setLoading(false);
      return;
    }
    
    setLoading(true);
    fetch(`${API_BASE}/admin/games/${gameId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) {
          setGame(d.data);
        } else {
          setError(d.message || "Failed to load game.");
        }
      })
      .catch(() => setError("Cannot reach the server."))
      .finally(() => setLoading(false));
  }, [gameId]);

  if (loading) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHead}>
            <div className={styles.sectionTitle}>Loading…</div>
            <button className={styles.modalClose} onClick={onClose} type="button">✕</button>
          </div>
          <div className={styles.loadingState}>Loading game data…</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
          <div className={styles.modalHead}>
            <div className={styles.sectionTitle}>Error</div>
            <button className={styles.modalClose} onClick={onClose} type="button">✕</button>
          </div>
          <div className={styles.formError}>{error}</div>
        </div>
      </div>
    );
  }

  if (!game) return null;

  const regs = game.registrations || [];
  const paidCount = regs.filter((r) => r.paymentStatus === "paid").length;
  const guestCount = regs.filter((r) => r.plusOneName).length;
  const totalRevPaise = regs.filter((r) => r.paymentStatus === "paid").reduce((s, r) => s + (r.amountPaidPaise || 0), 0);
  const presentCount = regs.filter((r) => r.attended === "present").length;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={`${styles.modal} ${styles.modalLarge}`} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.sectionTitle}>{loading ? "Loading…" : (game?.title || "Game Detail")}</div>
            {game && (
              <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" }}>
                <span className={`${styles.badge} ${styles.badgeGray}`}>{game.format}</span>
                <span style={{ color: "var(--muted)", fontSize: "13px" }}>{formatDateTime(game.scheduledAt)}</span>
                <span className={`${styles.badge} ${badgeClassForStatus(game.status)}`}>{formatStatusLabel(game.status)}</span>
              </div>
            )}
          </div>
          <button className={styles.modalClose} onClick={onClose} type="button">✕</button>
        </div>

        {loading && <div className={styles.loadingState}>Loading game data…</div>}
        {error   && <div className={styles.formError}>{error}</div>}

        {game && (
          <div style={{ overflowY: "auto", maxHeight: "calc(85vh - 110px)" }}>

            {/* Info grid */}
            <div className={styles.gameInfoGrid}>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Venue</div><div>{game.turf?.name || "—"}{game.turf?.address?.city ? `, ${game.turf.address.city}` : ""}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Organiser</div><div>{game.organiser?.name || "—"}<br /><span style={{ fontSize: "11px", color: "var(--muted)" }}>{game.organiser?.phone || ""}</span></div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Fee / Player</div><div>{formatCurrency(game.feeInPaise)}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Slots Filled</div><div>{regs.length} / {game.totalSlots ?? "—"}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Min Players</div><div>{game.minPlayers ?? "—"}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Duration</div><div>{game.durationMins ? `${game.durationMins} min` : "—"}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Paid Registrations</div><div style={{ color: "var(--green)" }}>{paidCount}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Guest Slots</div><div>{guestCount}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Total Revenue</div><div style={{ color: "var(--green)", fontWeight: 600 }}>{formatCurrency(totalRevPaise)}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Attended (Present)</div><div>{game.attendanceMarked ? presentCount : "Not marked"}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Organiser Playing</div><div>{game.organiserIsPlaying ? "Yes" : "No"}</div></div>
              <div className={styles.gameInfoCell}><div className={styles.statLabel}>Attendance Marked</div><div>{game.attendanceMarked ? "Yes" : "No"}</div></div>
              {game.cancelReason && (
                <div className={styles.gameInfoCell} style={{ gridColumn: "1 / -1" }}>
                  <div className={styles.statLabel}>Cancellation Reason</div>
                  <div style={{ color: "var(--red)" }}>{game.cancelReason} {game.cancelledAt ? `· ${formatDate(game.cancelledAt)}` : ""}</div>
                </div>
              )}
            </div>

            {/* Registrations */}
            <div className={styles.blockTitleSuccess}>Registrations ({regs.length})</div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr><th>#</th><th>Player / Guest</th><th>Type</th><th>Position</th><th>Team Pref</th><th>Payment</th><th>Amount Paid</th><th>Attended</th><th>Signed Up</th></tr>
                </thead>
                <tbody>
                  {regs.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No registrations.</td></tr>}
                  {regs.map((r, i) => (
                    <tr key={r._id}>
                      <td>{i + 1}</td>
                      <td>
                        {r.plusOneName
                          ? <span>{r.plusOneName} <span className={`${styles.badge} ${styles.badgeGray}`}>Guest</span></span>
                          : r.player?.name || "Unknown"
                        }
                        {!r.plusOneName && r.player?.phone && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{r.player.phone}</div>}
                      </td>
                      <td>{r.plusOneName ? <span className={`${styles.badge} ${styles.badgeGray}`}>Guest</span> : <span className={`${styles.badge} ${styles.badgeBlue}`}>Player</span>}</td>
                      <td>{formatStatusLabel(r.preferredPosition)}</td>
                      <td>{formatStatusLabel(r.teamPreference)}</td>
                      <td><span className={`${styles.badge} ${badgeClassForStatus(r.paymentStatus)}`}>{formatStatusLabel(r.paymentStatus)}</span></td>
                      <td>{formatCurrency(r.amountPaidPaise)}</td>
                      <td><span className={`${styles.badge} ${badgeClassForStatus(r.attended)}`}>{formatStatusLabel(r.attended)}</span></td>
                      <td>{formatDate(r.signedUpAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Waitlist */}
            {(game.waitlist?.length ?? 0) > 0 && (
              <>
                <div className={styles.blockTitle} style={{ marginTop: "20px" }}>Waitlist ({game.waitlist.length})</div>
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead><tr><th>#</th><th>Player</th><th>Phone</th><th>Position</th><th>Status</th><th>Joined</th></tr></thead>
                    <tbody>
                      {game.waitlist.map((w, i) => (
                        <tr key={w._id}>
                          <td>{i + 1}</td>
                          <td>{w.player?.name || "Unknown"}</td>
                          <td>{w.player?.phone || "—"}</td>
                          <td>{formatStatusLabel(w.preferredPosition)}</td>
                          <td><span className={`${styles.badge} ${badgeClassForStatus(w.status)}`}>{formatStatusLabel(w.status)}</span></td>
                          <td>{formatDate(w.joinedAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Games ─────────────────────────────────────────────────────────────────────

function Games() {
  const [games, setGames]           = useState<AdminGameRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [search, setSearch]         = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [detailGameId, setDetailGameId] = useState<string | null>(null);

  const fetchGames = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = getAdminToken();
      if (!token) { setError("Admin session missing."); return; }
      const res  = await fetch(`${API_BASE}/admin/games`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to load games."); return; }
      setGames(data.data || []);
    } catch { setError("Cannot reach the server."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchGames(); }, [fetchGames]);

  const filtered = games.filter((g) => {
    const q = search.trim().toLowerCase();
    return (
      [g.title, g.venue || "", g.organiserName || ""].join(" ").toLowerCase().includes(q) &&
      (statusFilter === "all" || g.status.toLowerCase() === statusFilter)
    );
  });

  return (
    <>
      <Head title="Games & Events" sub={loading ? "Loading…" : `${games.length} games across all organisers`} />
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search games, venue, organiser…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="open">Open</option>
          <option value="confirmed">Confirmed</option>
          <option value="tentative">Tentative</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button className={styles.actionBtn} type="button" onClick={fetchGames}>Refresh</button>
      </div>
      {error && <div className={styles.formError}>{error}</div>}
      {loading && <div className={styles.loadingState}>Loading games…</div>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Game</th><th>Venue</th><th>Date</th><th>Format</th><th>Players</th><th>Fee</th><th>Organiser</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No games found.</td></tr>}
            {filtered.map((g) => (
              <tr key={g.id}>
                <td>{g.title}</td>
                <td>{g.venue || "—"}</td>
                <td>{formatDateTime(g.scheduledAt)}</td>
                <td><span className={`${styles.badge} ${styles.badgeGray}`}>{g.format || "—"}</span></td>
                <td>{`${g.players?.registered || 0} / ${g.players?.totalSlots || 0}`}</td>
                <td>{formatCurrency(g.feeInPaise)}</td>
                <td>{g.organiserName || "—"}</td>
                <td><span className={`${styles.badge} ${badgeClassForStatus(g.status)}`}>{formatStatusLabel(g.status)}</span></td>
                <td>
                  <button className={styles.actionBtn} type="button" onClick={() => setDetailGameId(g.id)}>
                    View Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detailGameId && (
        <GameDetailModal gameId={detailGameId} onClose={() => setDetailGameId(null)} />
      )}
    </>
  );
}

// ── Payments ──────────────────────────────────────────────────────────────────

const TXN_TYPE_LABEL: Record<string, { label: string; cls: string }> = {
  topup:       { label: "Top-up",      cls: "badgeGreen"  },
  lock:        { label: "Lock",        cls: "badgeAmber"  },
  unlock:      { label: "Unlock",      cls: "badgeGray"   },
  debit:       { label: "Debit",       cls: "badgeBlue"   },
  refund:      { label: "Refund",      cls: "badgeViolet" },
  backout_fee: { label: "Backout Fee", cls: "badgeRed"    },
  bonus:       { label: "Bonus",       cls: "badgeGreen"  },
  withdrawal:  { label: "Withdrawal",  cls: "badgeRed"    },
};

function Payments() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [summary, setSummary]   = useState<AdminPaymentSummary>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
  const [typeFilter, setTypeFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchPayments = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const token = getAdminToken();
      if (!token) { setError("Admin session missing."); return; }
      const res  = await fetch(`${API_BASE}/admin/payments`, { headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json()) as AdminPaymentListResponse;
      if (!res.ok) { setError(data.message || "Failed to load payments."); return; }
      setPayments(data.data || []);
      setSummary(data.summary || {});
    } catch { setError("Cannot reach the server."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  const filtered = payments.filter((p) => {
    const q = search.trim().toLowerCase();
    return (
      [p.playerName, p.playerPhone || "", p.gameTitle || "", p.organiserName || "", p.description || "", p.razorpayPaymentId || ""].join(" ").toLowerCase().includes(q) &&
      (typeFilter   === "all" || p.type === typeFilter) &&
      (statusFilter === "all" || p.status === statusFilter)
    );
  });

  return (
    <>
      <Head title="Payments" sub={loading ? "Loading…" : `${payments.length} wallet transactions`} />

      {/* Summary cards */}
      <div className={styles.summaryFour}>
        <div className={styles.summaryItem}>
          <div className={styles.statLabel}>Total Top-ups</div>
          <div className={styles.summaryValue} style={{ color: "var(--green)" }}>{formatCurrency(summary.totalTopUpPaise)}</div>
          <div className={styles.paySub}>Razorpay recharges</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.statLabel}>Total Debits</div>
          <div className={styles.summaryValue}>{formatCurrency(summary.totalDebitPaise)}</div>
          <div className={styles.paySub}>Game fees &amp; backout charges</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.statLabel}>Total Refunded</div>
          <div className={styles.summaryValue} style={{ color: "var(--violet)" }}>{formatCurrency(summary.totalRefundedPaise)}</div>
          <div className={styles.paySub}>Cancellations &amp; refunds</div>
        </div>
        <div className={styles.summaryItem}>
          <div className={styles.statLabel}>Pending</div>
          <div className={styles.summaryValue} style={{ color: "var(--amber)" }}>{summary.pendingCount ?? 0}</div>
          <div className={styles.paySub}>Unconfirmed transactions</div>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search player, phone, game, Razorpay ID…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="all">All Types</option>
          <option value="topup">Top-up</option>
          <option value="lock">Lock</option>
          <option value="unlock">Unlock</option>
          <option value="debit">Debit</option>
          <option value="refund">Refund</option>
          <option value="backout_fee">Backout Fee</option>
          <option value="bonus">Bonus</option>
          <option value="withdrawal">Withdrawal</option>
        </select>
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <button className={styles.actionBtn} type="button" onClick={fetchPayments}>Refresh</button>
      </div>

      {error   && <div className={styles.formError}>{error}</div>}
      {loading && <div className={styles.loadingState}>Loading transactions…</div>}

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Txn ID</th><th>Player</th><th>Type</th><th>Amount</th>
              <th>Balance After</th><th>Game</th><th>Organiser</th>
              <th>Description / Razorpay</th><th>Date</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No transactions found.</td></tr>
            )}
            {filtered.map((p) => {
              const txnMeta = TXN_TYPE_LABEL[p.type] || { label: p.type, cls: "badgeGray" };
              return (
                <tr key={String(p.id)}>
                  <td style={{ fontFamily: "monospace", fontSize: "11px", color: "var(--muted)" }}>
                    {String(p.id).slice(-8).toUpperCase()}
                  </td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{p.playerName}</div>
                    {p.playerPhone && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{p.playerPhone}</div>}
                  </td>
                  <td>
                    <span className={`${styles.badge} ${styles[txnMeta.cls as keyof typeof styles]}`}>
                      {txnMeta.label}
                    </span>
                  </td>
                  <td style={{ fontWeight: 600, color: ["refund", "unlock", "bonus"].includes(p.type) ? "var(--green)" : ["debit", "lock", "backout_fee", "withdrawal"].includes(p.type) ? "var(--red)" : "var(--text)" }}>
                    {["debit", "lock", "backout_fee", "withdrawal"].includes(p.type) ? "−" : "+"}{formatCurrency(p.amountPaise)}
                  </td>
                  <td style={{ fontSize: "12px", color: "var(--muted)" }}>{formatCurrency(p.balanceAfterPaise)}</td>
                  <td>{p.gameTitle || <span style={{ color: "var(--muted)" }}>—</span>}</td>
                  <td>
                    {p.organiserName
                      ? <>
                          <div style={{ fontWeight: 500 }}>{p.organiserName}</div>
                          {p.organiserPhone && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{p.organiserPhone}</div>}
                        </>
                      : <span style={{ color: "var(--muted)" }}>—</span>
                    }
                  </td>
                  <td style={{ maxWidth: "180px" }}>
                    {p.description && <div style={{ fontSize: "12px" }}>{p.description}</div>}
                    {p.razorpayPaymentId && (
                      <div style={{ fontFamily: "monospace", fontSize: "10px", color: "var(--muted)", marginTop: "2px" }}>
                        {p.razorpayPaymentId}
                      </div>
                    )}
                    {!p.description && !p.razorpayPaymentId && <span style={{ color: "var(--muted)" }}>—</span>}
                  </td>
                  <td>{formatDateTime(p.paidAt)}</td>
                  <td><span className={`${styles.badge} ${badgeClassForStatus(p.status)}`}>{formatStatusLabel(p.status)}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Notifications ─────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<string, string> = {
  game_created: "Game Created", game_registered: "Registered",
  game_cancelled: "Cancelled", game_backout_player: "Player Backed Out",
  game_backout_organiser: "Organiser Backout", waitlist_joined: "Waitlist Join",
  waitlist_spot: "Spot Available", waitlist_approved: "Waitlist Approved",
  player_removed: "Removed", wallet_topup: "Top-up",
  wallet_debit: "Debit", refund_credited: "Refund", system: "System",
};

function Notifications() {
  const [notifs, setNotifs]   = useState<AdminNotifRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal]     = useState(0);
  const [search, setSearch]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setLoading(false); return; }
    fetch(`${API_BASE}/admin/notifications?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success) {
          const list: AdminNotifRow[] = d.data?.notifications ?? [];
          setNotifs(list);
          setTotal(d.data?.total ?? list.length);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filtered = notifs.filter((n) => {
    const q = search.trim().toLowerCase();
    return (
      [n.title, n.body, n.recipientRole, n.type, n.recipientName || "", n.recipientPhone || ""].join(" ").toLowerCase().includes(q) &&
      (roleFilter === "all" || n.recipientRole === roleFilter)
    );
  });

  const unread = notifs.filter((n) => !n.isRead).length;

  return (
    <>
      <Head title="Platform Notifications" sub="In-app notifications across all users" />
      <div className={styles.summaryThree}>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Total (DB)</div><div className={styles.summaryValue}>{loading ? "—" : total}</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Unread</div><div className={styles.summaryValue} style={{ color: "var(--amber)" }}>{loading ? "—" : unread}</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Read</div><div className={styles.summaryValue} style={{ color: "var(--green)" }}>{loading ? "—" : notifs.length - unread}</div></div>
      </div>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search notifications…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
          <option value="all">All recipients</option>
          <option value="player">Players only</option>
          <option value="organiser">Organisers only</option>
        </select>
      </div>
      {loading ? (
        <div className={styles.loadingState}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: "32px 0", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>No notifications found.</div>
      ) : (
        <div className={styles.notifFeed}>
          {filtered.map((n) => (
            <div key={n._id} className={styles.notifItem}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap", marginBottom: "4px" }}>
                  <span className={`${styles.badge} ${styles.badgeGray}`}>{TYPE_LABEL[n.type] || n.type}</span>
                  <span className={`${styles.badge} ${n.recipientRole === "organiser" ? styles.badgeBlue : styles.badgeGray}`}>{n.recipientRole}</span>
                  {n.recipientName && (
                    <span style={{ fontSize: "13px", color: "var(--white)", fontWeight: 600 }}>
                      {n.recipientName}
                      {n.recipientPhone && (
                        <span style={{ fontWeight: 400, color: "var(--muted)", marginLeft: "6px", fontSize: "11px" }}>
                          {n.recipientPhone}
                        </span>
                      )}
                    </span>
                  )}
                </div>
                <div className={styles.notifMsg}><strong>{n.title}</strong> — {n.body}</div>
                <div className={styles.notifTime}>{notifTimeAgo(n.createdAt)}</div>
              </div>
              <span className={`${styles.badge} ${n.isRead ? styles.badgeGreen : styles.badgeAmber}`}>{n.isRead ? "Read" : "Unread"}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

// ── Feedback (live) ───────────────────────────────────────────────────────────

type FbSortKey = "date" | "gameRating" | "organiserRating" | "venueRating";
type PrSortKey = "date" | "conduct" | "gameplay" | "avg";

type CommentModalData = { comment: string; player: string; game: string };

type PlayerRatingRow = {
  id: string;
  playerName: string; playerPhone?: string | null;
  organiserName: string; organiserPhone?: string | null;
  gameTitle?: string | null; gameFormat?: string | null; gameDate?: string | null;
  conductRating: number; gameplayRating: number; avgRating: number;
  preferredPosition?: string | null; gkAffinity?: number | null;
  notes?: string | null; ratedAt?: string | null;
};

function Feedback() {
  const [tab, setTab] = useState<"player" | "organiser">("player");

  // ── Tab 1: Player → Platform (GameFeedback) ────────────────────────────────
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [summary, setSummary]   = useState<{ avgGame?: number | null; tagCounts?: Record<string, number> }>({});
  const [fbLoading, setFbLoading] = useState(true);
  const [fbError, setFbError]     = useState("");
  const [fbSearch, setFbSearch]   = useState("");
  const [sortKey, setSortKey]   = useState<FbSortKey>("date");
  const [sortDir, setSortDir]   = useState<"asc" | "desc">("desc");
  const [commentModal, setCommentModal] = useState<CommentModalData | null>(null);

  // ── Tab 2: Organiser → Player (PlayerRating) ───────────────────────────────
  const [prRows, setPrRows]       = useState<PlayerRatingRow[]>([]);
  const [prTotal, setPrTotal]     = useState(0);
  const [prLoading, setPrLoading] = useState(true);
  const [prError, setPrError]     = useState("");
  const [prSearch, setPrSearch]   = useState("");
  const [prSortKey, setPrSortKey] = useState<PrSortKey>("date");
  const [prSortDir, setPrSortDir] = useState<"asc" | "desc">("desc");
  const [notesModal, setNotesModal] = useState<{ notes: string; player: string; organiser: string } | null>(null);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setFbLoading(false); setFbError("Admin session missing."); return; }
    fetch(`${API_BASE}/admin/feedback?limit=200`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d: FeedbackApiResponse) => {
        if (d.success) { setFeedback(d.data || []); setSummary(d.summary || {}); }
        else setFbError(d.message || "Failed to load feedback.");
      })
      .catch(() => setFbError("Cannot reach the server."))
      .finally(() => setFbLoading(false));
  }, []);

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setPrLoading(false); setPrError("Admin session missing."); return; }
    fetch(`${API_BASE}/admin/player-ratings?limit=200`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.success) { setPrRows(d.data || []); setPrTotal(d.count ?? 0); }
        else setPrError(d.message || "Failed to load player ratings.");
      })
      .catch(() => setPrError("Cannot reach the server."))
      .finally(() => setPrLoading(false));
  }, []);

  // ── Tab 1 helpers ──────────────────────────────────────────────────────────
  function toggleSort(key: FbSortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  function sortIcon(key: FbSortKey) {
    if (sortKey !== key) return <span style={{ color: "var(--muted2)", marginLeft: "4px" }}>↕</span>;
    return <span style={{ marginLeft: "4px" }}>{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  // ── Tab 2 helpers ──────────────────────────────────────────────────────────
  function togglePrSort(key: PrSortKey) {
    if (prSortKey === key) setPrSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setPrSortKey(key); setPrSortDir("desc"); }
  }
  function prSortIcon(key: PrSortKey) {
    if (prSortKey !== key) return <span style={{ color: "var(--muted2)", marginLeft: "4px" }}>↕</span>;
    return <span style={{ marginLeft: "4px" }}>{prSortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const thSort: React.CSSProperties = { cursor: "pointer", userSelect: "none" };

  const fbFiltered = feedback.filter((f) => {
    const q = fbSearch.trim().toLowerCase();
    return [
      f.submittedBy?.name || "", f.submittedBy?.phone || "",
      f.game?.title || "", f.game?.organiser?.name || "",
      f.game?.turf?.name || "", f.comment || "",
    ].join(" ").toLowerCase().includes(q);
  });

  const fbSorted = [...fbFiltered].sort((a, b) => {
    let av = 0, bv = 0;
    if (sortKey === "date")           { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
    if (sortKey === "gameRating")     { av = a.gameRating ?? 0;       bv = b.gameRating ?? 0; }
    if (sortKey === "organiserRating"){ av = a.organiserRating ?? 0;  bv = b.organiserRating ?? 0; }
    if (sortKey === "venueRating")    { av = a.venueRating ?? 0;      bv = b.venueRating ?? 0; }
    return sortDir === "asc" ? av - bv : bv - av;
  });

  const prFiltered = prRows.filter((r) => {
    const q = prSearch.trim().toLowerCase();
    return [r.playerName, r.playerPhone || "", r.organiserName, r.organiserPhone || "", r.gameTitle || "", r.notes || ""].join(" ").toLowerCase().includes(q);
  });

  const prSorted = [...prFiltered].sort((a, b) => {
    let av = 0, bv = 0;
    if (prSortKey === "date")     { av = a.ratedAt ? new Date(a.ratedAt).getTime() : 0; bv = b.ratedAt ? new Date(b.ratedAt).getTime() : 0; }
    if (prSortKey === "conduct")  { av = a.conductRating;  bv = b.conductRating; }
    if (prSortKey === "gameplay") { av = a.gameplayRating; bv = b.gameplayRating; }
    if (prSortKey === "avg")      { av = a.avgRating;      bv = b.avgRating; }
    return prSortDir === "asc" ? av - bv : bv - av;
  });

  const topTags = Object.entries(summary.tagCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const TRUNC = 80;

  return (
    <>
      <Head title="Feedback" sub="Player feedback to platform · Organiser ratings to players" />

      {/* Tab bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${tab === "player" ? styles.tabActive : ""}`}
          type="button"
          onClick={() => setTab("player")}
        >
          Player → Platform ({feedback.length})
        </button>
        <button
          className={`${styles.tab} ${tab === "organiser" ? styles.tabActive : ""}`}
          type="button"
          onClick={() => setTab("organiser")}
        >
          Organiser → Players ({prTotal})
        </button>
      </div>

      {/* ── Tab 1: Player feedback ─────────────────────────────────────────── */}
      {tab === "player" && (
        <>
          <div className={styles.paymentSummary}>
            <div className={styles.payCard}><div className={styles.statLabel}>Total Submissions</div><div className={styles.payValue}>{fbLoading ? "—" : feedback.length}</div><div className={styles.paySub}>Post-game feedback</div></div>
            <div className={styles.payCard}><div className={styles.statLabel}>Avg Game Rating</div><div className={styles.payValue} style={{ color: "var(--amber)" }}>{summary.avgGame != null ? `${summary.avgGame} / 5` : "—"}</div><div className={styles.paySub}>Across all submitted feedback</div></div>
            <div className={styles.payCard}>
              <div className={styles.statLabel}>Top Tags</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "6px" }}>
                {topTags.length === 0 ? <span style={{ color: "var(--muted)", fontSize: "13px" }}>—</span> : topTags.map(([tag, count]) => (
                  <span key={tag} className={`${styles.badge} ${styles.badgeGray}`}>{tag} ({count})</span>
                ))}
              </div>
            </div>
          </div>

          <div className={styles.toolbar}>
            <input className={styles.searchInput} placeholder="Search by player, organiser, turf, game or comment…" value={fbSearch} onChange={(e) => setFbSearch(e.target.value)} />
          </div>

          {fbError   && <div className={styles.formError}>{fbError}</div>}
          {fbLoading && <div className={styles.loadingState}>Loading feedback…</div>}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Game</th>
                  <th>Organiser</th>
                  <th>Turf / Venue</th>
                  <th style={thSort} onClick={() => toggleSort("date")}>Date{sortIcon("date")}</th>
                  <th style={thSort} onClick={() => toggleSort("gameRating")}>Game ★{sortIcon("gameRating")}</th>
                  <th style={thSort} onClick={() => toggleSort("organiserRating")}>Organiser ★{sortIcon("organiserRating")}</th>
                  <th style={thSort} onClick={() => toggleSort("venueRating")}>Venue ★{sortIcon("venueRating")}</th>
                  <th>Tags</th>
                  <th>Comment</th>
                </tr>
              </thead>
              <tbody>
                {!fbLoading && fbSorted.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No feedback submitted yet.</td></tr>
                )}
                {fbSorted.map((f) => (
                  <tr key={f._id}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{f.submittedBy?.name || "—"}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>{f.submittedBy?.phone || ""}</div>
                    </td>
                    <td>
                      {f.game?.title || "—"}
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>{f.game?.format || ""}</div>
                    </td>
                    <td>
                      <div>{f.game?.organiser?.name || "—"}</div>
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>{f.game?.organiser?.phone || ""}</div>
                    </td>
                    <td>
                      <div>{f.game?.turf?.name || "—"}</div>
                      {(f.game?.turf?.address?.area || f.game?.turf?.address?.city) && (
                        <div style={{ fontSize: "11px", color: "var(--muted)" }}>
                          {[f.game?.turf?.address?.area, f.game?.turf?.address?.city].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </td>
                    <td>{formatDate(f.createdAt)}</td>
                    <td style={{ color: "var(--amber)" }}>{starRating(f.gameRating)}</td>
                    <td style={{ color: "var(--amber)" }}>{starRating(f.organiserRating)}</td>
                    <td style={{ color: "var(--amber)" }}>{starRating(f.venueRating)}</td>
                    <td>
                      {(f.tags || []).map((tag) => (
                        <span key={tag} className={`${styles.badge} ${styles.badgeGray}`} style={{ marginRight: "3px" }}>{tag}</span>
                      ))}
                    </td>
                    <td style={{ maxWidth: "200px" }}>
                      {!f.comment ? (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      ) : f.comment.length <= TRUNC ? (
                        <span style={{ fontSize: "13px" }}>{f.comment}</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "150px", display: "inline-block" }}>
                            {f.comment}
                          </span>
                          <button
                            type="button"
                            title="View full comment"
                            onClick={() => setCommentModal({ comment: f.comment!, player: f.submittedBy?.name || "Unknown", game: f.game?.title || "Unknown game" })}
                            style={{ flexShrink: 0, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--white)", width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                          >
                            →
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Full-comment modal */}
          {commentModal && (
            <div className={styles.modalOverlay} onClick={() => setCommentModal(null)}>
              <div className={styles.modal} style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}>
                  <div>
                    <div className={styles.sectionTitle}>Full Comment</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "5px" }}>
                      {commentModal.player} &nbsp;·&nbsp; {commentModal.game}
                    </div>
                  </div>
                  <button className={styles.modalClose} type="button" onClick={() => setCommentModal(null)}>✕</button>
                </div>
                <p style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {commentModal.comment}
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Tab 2: Organiser → Player ratings ──────────────────────────────── */}
      {tab === "organiser" && (
        <>
          <div className={styles.summaryThree}>
            <div className={styles.summaryItem}><div className={styles.statLabel}>Total Ratings</div><div className={styles.summaryValue}>{prLoading ? "—" : prTotal}</div></div>
            <div className={styles.summaryItem}>
              <div className={styles.statLabel}>Avg Conduct</div>
              <div className={styles.summaryValue} style={{ color: "var(--amber)" }}>
                {prRows.length > 0
                  ? (prRows.reduce((s, r) => s + r.conductRating, 0) / prRows.length).toFixed(1)
                  : "—"}
              </div>
            </div>
            <div className={styles.summaryItem}>
              <div className={styles.statLabel}>Avg Gameplay</div>
              <div className={styles.summaryValue} style={{ color: "var(--amber)" }}>
                {prRows.length > 0
                  ? (prRows.reduce((s, r) => s + r.gameplayRating, 0) / prRows.length).toFixed(1)
                  : "—"}
              </div>
            </div>
          </div>

          <div className={styles.toolbar}>
            <input className={styles.searchInput} placeholder="Search by player, organiser, game or notes…" value={prSearch} onChange={(e) => setPrSearch(e.target.value)} />
          </div>

          {prError   && <div className={styles.formError}>{prError}</div>}
          {prLoading && <div className={styles.loadingState}>Loading player ratings…</div>}

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Player</th>
                  <th>Organiser</th>
                  <th>Game</th>
                  <th>Position</th>
                  <th style={thSort} onClick={() => togglePrSort("conduct")}>Conduct ★{prSortIcon("conduct")}</th>
                  <th style={thSort} onClick={() => togglePrSort("gameplay")}>Gameplay ★{prSortIcon("gameplay")}</th>
                  <th style={thSort} onClick={() => togglePrSort("avg")}>Avg ★{prSortIcon("avg")}</th>
                  <th style={thSort} onClick={() => togglePrSort("date")}>Date{prSortIcon("date")}</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {!prLoading && prSorted.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No organiser ratings submitted yet.</td></tr>
                )}
                {prSorted.map((r) => (
                  <tr key={String(r.id)}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{r.playerName}</div>
                      {r.playerPhone && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{r.playerPhone}</div>}
                    </td>
                    <td>
                      <div>{r.organiserName}</div>
                      {r.organiserPhone && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{r.organiserPhone}</div>}
                    </td>
                    <td>
                      <div>{r.gameTitle || "—"}</div>
                      {r.gameFormat && <div style={{ fontSize: "11px", color: "var(--muted)" }}>{r.gameFormat}</div>}
                    </td>
                    <td>
                      {r.preferredPosition
                        ? <span className={`${styles.badge} ${styles.badgeGray}`}>{formatStatusLabel(r.preferredPosition)}</span>
                        : <span style={{ color: "var(--muted)" }}>—</span>
                      }
                      {r.gkAffinity != null && (
                        <div style={{ fontSize: "11px", color: "var(--muted)", marginTop: "2px" }}>GK: {r.gkAffinity}/5</div>
                      )}
                    </td>
                    <td style={{ color: "var(--amber)", fontWeight: 600 }}>★ {r.conductRating.toFixed(1)}</td>
                    <td style={{ color: "var(--amber)", fontWeight: 600 }}>★ {r.gameplayRating.toFixed(1)}</td>
                    <td style={{ fontWeight: 700 }}>
                      <span style={{ color: r.avgRating >= 4 ? "var(--green)" : r.avgRating >= 3 ? "var(--amber)" : "var(--red)" }}>
                        ★ {r.avgRating.toFixed(1)}
                      </span>
                    </td>
                    <td>{formatDate(r.ratedAt)}</td>
                    <td style={{ maxWidth: "180px" }}>
                      {!r.notes ? (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      ) : r.notes.length <= TRUNC ? (
                        <span style={{ fontSize: "13px" }}>{r.notes}</span>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span style={{ fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "130px", display: "inline-block" }}>
                            {r.notes}
                          </span>
                          <button
                            type="button"
                            title="View full notes"
                            onClick={() => setNotesModal({ notes: r.notes!, player: r.playerName, organiser: r.organiserName })}
                            style={{ flexShrink: 0, background: "var(--surface2)", border: "1px solid var(--border2)", color: "var(--white)", width: "24px", height: "24px", borderRadius: "50%", cursor: "pointer", fontSize: "13px", display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1 }}
                          >
                            →
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Full-notes modal */}
          {notesModal && (
            <div className={styles.modalOverlay} onClick={() => setNotesModal(null)}>
              <div className={styles.modal} style={{ maxWidth: "540px" }} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHead}>
                  <div>
                    <div className={styles.sectionTitle}>Organiser Notes</div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "5px" }}>
                      {notesModal.organiser} &nbsp;→&nbsp; {notesModal.player}
                    </div>
                  </div>
                  <button className={styles.modalClose} type="button" onClick={() => setNotesModal(null)}>✕</button>
                </div>
                <p style={{ fontSize: "15px", lineHeight: "1.75", color: "var(--text)", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                  {notesModal.notes}
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}

// ── Disputes ──────────────────────────────────────────────────────────────────

function Disputes({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  return (
    <>
      <Head title="Disputes & Refunds" sub="Open disputes requiring admin resolution" />
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Raised By</th><th>Type</th><th>Game</th><th>Description</th><th>Raised</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td>Arjun Mehta</td><td><span className={`${styles.badge} ${styles.badgeRed}`}>Refund request</span></td><td>Monday 6v6</td><td>Says refund not received after cancellation</td><td>14 min ago</td><td><span className={`${styles.badge} ${styles.badgeRed}`}>Open</span></td><td><button className={styles.actionBtn} onClick={() => onOpenDetail("Refund Request — Arjun Mehta")}>Resolve</button></td></tr>
            <tr><td>Rohit Sinha</td><td><span className={`${styles.badge} ${styles.badgeAmber}`}>Backout fee</span></td><td>Saturday 7v7</td><td>Claims family emergency, requesting fee waiver</td><td>3 hr ago</td><td><span className={`${styles.badge} ${styles.badgeRed}`}>Open</span></td><td><button className={styles.actionBtn} onClick={() => onOpenDetail("Backout Fee — Rohit Sinha")}>Resolve</button></td></tr>
            <tr><td>Priya Nair</td><td><span className={`${styles.badge} ${styles.badgeBlue}`}>Team fairness</span></td><td>Friday 5v5</td><td>Teams were unbalanced — all high rated on one side</td><td>1 day ago</td><td><span className={`${styles.badge} ${styles.badgeAmber}`}>In review</span></td><td><button className={styles.actionBtn} onClick={() => onOpenDetail("Team Fairness — Priya Nair")}>Resolve</button></td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Communities ───────────────────────────────────────────────────────────────

function Communities({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Communities</div>
          <div className={styles.sectionSub}>Active communities across India</div>
        </div>
        <button className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`} type="button">+ Add Community</button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Community</th><th>City</th><th>Organiser</th><th>Members</th><th>Games (MTD)</th><th>WhatsApp</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td>FC Bengaluru Sundays</td><td>Bengaluru</td><td>Vikram Rao</td><td>84</td><td>18</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Linked</span></td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Active</span></td><td><button className={styles.actionBtn} onClick={() => onOpenDetail("FC Bengaluru Sundays")}>View</button></td></tr>
            <tr><td>Weekend Warriors Mumbai</td><td>Mumbai</td><td>Neha Kapoor</td><td>62</td><td>12</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Linked</span></td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Active</span></td><td><button className={styles.actionBtn} onClick={() => onOpenDetail("Weekend Warriors Mumbai")}>View</button></td></tr>
            <tr><td>Delhi Football Club</td><td>Delhi</td><td>Pending</td><td>0</td><td>0</td><td><span className={`${styles.badge} ${styles.badgeAmber}`}>Pending</span></td><td><span className={`${styles.badge} ${styles.badgeAmber}`}>Setup</span></td><td><button className={styles.actionBtn}>Activate</button></td></tr>
          </tbody>
        </table>
      </div>
    </>
  );
}

// ── Venue / Turf types & modal ────────────────────────────────────────────────

const EMPTY_TURF_FORM = {
  name: "", shortName: "", surfaceType: "artificial_turf",
  numberOfPitches: 1, pitchSizes: ["medium"],
  hasFloodlights: true, hasChangingRooms: false, hasParking: false, hasRefreshments: false,
  contactPhone: "", contactName: "", googleMapsUrl: "", parkingNotes: "",
  "address.line1": "", "address.line2": "", "address.area": "",
  "address.city": "", "address.state": "", "address.pincode": "",
};

type TurfForm = typeof EMPTY_TURF_FORM;

function TurfModal({ initial, onClose, onSaved }: { initial?: Turf | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<TurfForm>(
    initial
      ? {
          name: initial.name, shortName: initial.shortName ?? "", surfaceType: initial.surfaceType,
          numberOfPitches: initial.numberOfPitches, pitchSizes: initial.pitchSizes,
          hasFloodlights: initial.hasFloodlights, hasChangingRooms: initial.hasChangingRooms,
          hasParking: initial.hasParking, hasRefreshments: initial.hasRefreshments,
          contactPhone: initial.contactPhone ?? "", contactName: initial.contactName ?? "",
          googleMapsUrl: initial.googleMapsUrl ?? "", parkingNotes: initial.parkingNotes ?? "",
          "address.line1": initial.address.line1, "address.line2": initial.address.line2 ?? "",
          "address.area": initial.address.area, "address.city": initial.address.city,
          "address.state": initial.address.state, "address.pincode": initial.address.pincode,
        }
      : { ...EMPTY_TURF_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  const set = (k: keyof TurfForm, v: string | number | boolean | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); setError(""); setSaving(true);
    const body = {
      name: form.name, shortName: form.shortName || undefined,
      surfaceType: form.surfaceType, numberOfPitches: Number(form.numberOfPitches),
      pitchSizes: form.pitchSizes, hasFloodlights: form.hasFloodlights,
      hasChangingRooms: form.hasChangingRooms, hasParking: form.hasParking,
      hasRefreshments: form.hasRefreshments, contactPhone: form.contactPhone || undefined,
      contactName: form.contactName || undefined, googleMapsUrl: form.googleMapsUrl || undefined,
      parkingNotes: form.parkingNotes || undefined,
      address: {
        line1: form["address.line1"], line2: form["address.line2"] || "",
        area: form["address.area"], city: form["address.city"],
        state: form["address.state"], pincode: form["address.pincode"],
      },
    };
    try {
      const url    = initial ? `${API_BASE}/turfs/${initial._id}` : `${API_BASE}/turfs`;
      const method = initial ? "PATCH" : "POST";
      const res    = await fetch(url, { method, headers: { "Content-Type": "application/json", Authorization: `Bearer ${getAdminToken()}` }, body: JSON.stringify(body) });
      const data   = await res.json();
      if (!res.ok) { setError(data.message || "Failed to save."); return; }
      onSaved();
    } catch { setError("Cannot reach the server."); }
    finally { setSaving(false); }
  };

  const inp = styles.searchInput;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.sectionTitle}>{initial ? "Edit Venue" : "Add Venue"}</div>
          <button className={styles.modalClose} onClick={onClose} type="button">✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGrid}>
            <label className={styles.formLabel}>Name *<input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} required /></label>
            <label className={styles.formLabel}>Short Name<input className={inp} value={form.shortName} onChange={(e) => set("shortName", e.target.value)} /></label>
            <label className={styles.formLabel}>Address Line 1 *<input className={inp} value={form["address.line1"]} onChange={(e) => set("address.line1", e.target.value)} required /></label>
            <label className={styles.formLabel}>Address Line 2<input className={inp} value={form["address.line2"]} onChange={(e) => set("address.line2", e.target.value)} /></label>
            <label className={styles.formLabel}>Area *<input className={inp} value={form["address.area"]} onChange={(e) => set("address.area", e.target.value)} required /></label>
            <label className={styles.formLabel}>City *<input className={inp} value={form["address.city"]} onChange={(e) => set("address.city", e.target.value)} required /></label>
            <label className={styles.formLabel}>State *<input className={inp} value={form["address.state"]} onChange={(e) => set("address.state", e.target.value)} required /></label>
            <label className={styles.formLabel}>Pincode *<input className={inp} value={form["address.pincode"]} onChange={(e) => set("address.pincode", e.target.value)} required /></label>
            <label className={styles.formLabel}>
              Surface Type
              <select className={styles.filterSelect} value={form.surfaceType} onChange={(e) => set("surfaceType", e.target.value)}>
                <option value="artificial_turf">Artificial Turf</option>
                <option value="natural_grass">Natural Grass</option>
                <option value="concrete">Concrete</option>
                <option value="indoor">Indoor</option>
              </select>
            </label>
            <label className={styles.formLabel}>Pitches<input className={inp} type="number" min={1} value={form.numberOfPitches} onChange={(e) => set("numberOfPitches", Number(e.target.value))} /></label>
            <label className={styles.formLabel}>Contact Name<input className={inp} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} /></label>
            <label className={styles.formLabel}>Contact Phone<input className={inp} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} /></label>
            <label className={styles.formLabel}>Google Maps URL<input className={inp} value={form.googleMapsUrl} onChange={(e) => set("googleMapsUrl", e.target.value)} /></label>
            <label className={styles.formLabel}>Parking Notes<input className={inp} value={form.parkingNotes} onChange={(e) => set("parkingNotes", e.target.value)} /></label>
          </div>
          <div className={styles.checkboxRow}>
            {(["hasFloodlights", "hasChangingRooms", "hasParking", "hasRefreshments"] as const).map((k) => (
              <label key={k} className={styles.checkLabel}>
                <input type="checkbox" checked={form[k] as boolean} onChange={(e) => set(k, e.target.checked)} />
                {k.replace("has", "")}
              </label>
            ))}
          </div>
          {error && <div className={styles.formError}>{error}</div>}
          <div className={styles.modalActions}>
            <button className={styles.actionBtn} type="button" onClick={onClose} disabled={saving}>Cancel</button>
            <button className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`} type="submit" disabled={saving}>
              {saving ? "Saving…" : initial ? "Save Changes" : "Add Venue"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Venues({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  const [turfs, setTurfs]           = useState<Turf[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [modalTurf, setModalTurf]   = useState<Turf | null | "new">(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTurfs = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_BASE}/turfs/admin/all`, { headers: { Authorization: `Bearer ${getAdminToken()}` } });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to load turfs."); return; }
      setTurfs(data.data);
    } catch { setError("Cannot reach the server."); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);

  const adminAction = async (url: string, method = "PATCH") => {
    setActionLoading(url);
    try { await fetch(`${API_BASE}${url}`, { method, headers: { Authorization: `Bearer ${getAdminToken()}` } }); await fetchTurfs(); }
    finally { setActionLoading(null); }
  };

  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Venues &amp; Turfs</div>
          <div className={styles.sectionSub}>{loading ? "Loading…" : `${turfs.length} registered venues`}</div>
        </div>
        <button className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`} type="button" onClick={() => setModalTurf("new")}>+ Add Venue</button>
      </div>
      {error && <div className={styles.formError}>{error}</div>}
      {loading ? (
        <div className={styles.loadingState}>Loading venues…</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Venue</th><th>Area</th><th>City</th><th>State</th><th>Surface</th><th>Pitches</th><th>Floodlights</th><th>Verified</th><th>Status</th><th>Games</th><th>Actions</th></tr></thead>
            <tbody>
              {turfs.length === 0 && <tr><td colSpan={11} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No venues yet.</td></tr>}
              {turfs.map((t) => {
                const busy = actionLoading !== null;
                return (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td>{t.address.area}</td>
                    <td>{t.address.city}</td>
                    <td>{t.address.state}</td>
                    <td><span className={`${styles.badge} ${styles.badgeGray}`}>{surfaceLabel(t.surfaceType)}</span></td>
                    <td>{t.numberOfPitches}</td>
                    <td><span className={`${styles.badge} ${t.hasFloodlights ? styles.badgeGreen : styles.badgeGray}`}>{t.hasFloodlights ? "Yes" : "No"}</span></td>
                    <td><span className={`${styles.badge} ${t.isVerified ? styles.badgeGreen : styles.badgeAmber}`}>{t.isVerified ? "Verified" : "Pending"}</span></td>
                    <td><span className={`${styles.badge} ${t.isActive ? styles.badgeGreen : styles.badgeRed}`}>{t.isActive ? "Active" : "Discontinued"}</span></td>
                    <td>{t.totalGamesHosted}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} type="button" onClick={() => setModalTurf(t)}>Edit</button>
                        {!t.isVerified && <button className={styles.actionBtn} type="button" disabled={busy} onClick={() => adminAction(`/turfs/${t._id}/verify`)}>Verify</button>}
                        {t.isActive
                          ? <button className={styles.actionBtn} type="button" disabled={busy} onClick={() => adminAction(`/turfs/${t._id}/discontinue`)}>Discontinue</button>
                          : <button className={styles.actionBtn} type="button" disabled={busy} onClick={() => adminAction(`/turfs/${t._id}/reactivate`)}>Reactivate</button>
                        }
                        <button className={styles.actionBtn} type="button" onClick={() => onOpenDetail(t.name)}>View</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {modalTurf !== null && (
        <TurfModal initial={modalTurf === "new" ? null : modalTurf} onClose={() => setModalTurf(null)} onSaved={() => { setModalTurf(null); fetchTurfs(); }} />
      )}
    </>
  );
}

// ── Finance ───────────────────────────────────────────────────────────────────

type FinanceTab = "wallets" | "earnings";

function Finance() {
  const [tab, setTab] = useState<FinanceTab>("wallets");

  // Wallet state
  const [wallets, setWallets]       = useState<WalletRow[]>([]);
  const [walletSum, setWalletSum]   = useState<{ totalBalancePaise?: number; totalTopUpPaise?: number; totalSpentPaise?: number; totalRefundedPaise?: number }>({});
  const [walletsLoading, setWalletsLoading] = useState(false);
  const [walletsError, setWalletsError]     = useState("");
  const [walletSearch, setWalletSearch]     = useState("");

  // Earnings state
  const [earnings, setEarnings]             = useState<OrganiserEarningRow[]>([]);
  const [earningsLoading, setEarningsLoading] = useState(false);
  const [earningsError, setEarningsError]     = useState("");
  const [earningsSearch, setEarningsSearch]   = useState("");

  const fetchWallets = useCallback(async () => {
    setWalletsLoading(true); setWalletsError("");
    try {
      const token = getAdminToken();
      if (!token) { setWalletsError("Admin session missing."); return; }
      const res  = await fetch(`${API_BASE}/admin/wallets`, { headers: { Authorization: `Bearer ${token}` } });
      const data = (await res.json()) as WalletApiResponse;
      if (!res.ok) { setWalletsError(data.message || "Failed to load wallets."); return; }
      setWallets(data.data || []);
      setWalletSum(data.summary || {});
    } catch { setWalletsError("Cannot reach the server."); }
    finally { setWalletsLoading(false); }
  }, []);

  const fetchEarnings = useCallback(async () => {
    setEarningsLoading(true); setEarningsError("");
    try {
      const token = getAdminToken();
      if (!token) { setEarningsError("Admin session missing."); return; }
      const res  = await fetch(`${API_BASE}/admin/organiser-earnings`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      if (!res.ok) { setEarningsError(data.message || "Failed to load earnings."); return; }
      setEarnings(data.data || []);
    } catch { setEarningsError("Cannot reach the server."); }
    finally { setEarningsLoading(false); }
  }, []);

  useEffect(() => { fetchWallets(); fetchEarnings(); }, [fetchWallets, fetchEarnings]);

  const filteredWallets  = wallets.filter((w) => {
    const q = walletSearch.trim().toLowerCase();
    return [w.user?.name || "", w.user?.phone || "", w.user?.email || ""].join(" ").toLowerCase().includes(q);
  });

  const filteredEarnings = earnings.filter((e) => {
    const q = earningsSearch.trim().toLowerCase();
    return [e.name, e.phone || "", e.email || ""].join(" ").toLowerCase().includes(q);
  });

  return (
    <>
      <Head title="Finance" sub="Player wallets, organiser earnings & platform revenue" />

      {/* Summary */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}><div className={styles.statLabel}>Platform Balance</div><div className={styles.statValue}>{formatCurrency(walletSum.totalBalancePaise)}</div><div className={`${styles.statDelta} ${styles.neutral}`}>All player wallets combined</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Total Top-ups</div><div className={styles.statValue}>{formatCurrency(walletSum.totalTopUpPaise)}</div><div className={`${styles.statDelta} ${styles.up}`}>Lifetime recharges</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Total Spent</div><div className={styles.statValue}>{formatCurrency(walletSum.totalSpentPaise)}</div><div className={`${styles.statDelta} ${styles.down}`}>Game registrations</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Total Refunded</div><div className={styles.statValue}>{formatCurrency(walletSum.totalRefundedPaise)}</div><div className={`${styles.statDelta} ${styles.neutral}`}>Cancellations &amp; backouts</div></div>
      </div>

      {/* Tabs */}
      <div className={styles.tabBar}>
        <button className={`${styles.tab} ${tab === "wallets" ? styles.tabActive : ""}`} onClick={() => setTab("wallets")} type="button">
          Player Wallets ({wallets.length})
        </button>
        <button className={`${styles.tab} ${tab === "earnings" ? styles.tabActive : ""}`} onClick={() => setTab("earnings")} type="button">
          Organiser Earnings ({earnings.length})
        </button>
      </div>

      {/* Player Wallets */}
      {tab === "wallets" && (
        <>
          <div className={styles.toolbar}>
            <input className={styles.searchInput} placeholder="Search by name, phone or email…" value={walletSearch} onChange={(e) => setWalletSearch(e.target.value)} />
          </div>
          {walletsError && <div className={styles.formError}>{walletsError}</div>}
          {walletsLoading && <div className={styles.loadingState}>Loading wallets…</div>}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Player</th><th>Phone</th><th>Email</th><th>Balance</th><th>Total Top-ups</th><th>Total Spent</th><th>Total Refunded</th><th>Last Updated</th></tr>
              </thead>
              <tbody>
                {!walletsLoading && filteredWallets.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No wallets found.</td></tr>}
                {filteredWallets.map((w) => (
                  <tr key={w._id}>
                    <td>{w.user?.name || "Unknown"}</td>
                    <td>{w.user?.phone || "—"}</td>
                    <td>{w.user?.email || "—"}</td>
                    <td style={{ color: (w.balancePaise || 0) > 0 ? "var(--green)" : "var(--muted)", fontWeight: 600 }}>{formatCurrency(w.balancePaise)}</td>
                    <td>{formatCurrency(w.totalTopUpPaise)}</td>
                    <td>{formatCurrency(w.totalSpentPaise)}</td>
                    <td>{formatCurrency(w.totalRefundedPaise)}</td>
                    <td>{formatDate(w.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Organiser Earnings */}
      {tab === "earnings" && (
        <>
          <div className={styles.toolbar}>
            <input className={styles.searchInput} placeholder="Search organiser by name or phone…" value={earningsSearch} onChange={(e) => setEarningsSearch(e.target.value)} />
          </div>
          {earningsError && <div className={styles.formError}>{earningsError}</div>}
          {earningsLoading && <div className={styles.loadingState}>Loading organiser earnings…</div>}
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Organiser</th><th>Phone</th><th>Total Games</th><th>Completed</th><th>Cancelled</th><th>Paid Regs</th><th>Guest Slots</th><th>Total Revenue</th></tr>
              </thead>
              <tbody>
                {!earningsLoading && filteredEarnings.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No earnings data yet.</td></tr>}
                {filteredEarnings.map((e) => (
                  <tr key={e.id}>
                    <td>
                      {e.name}
                      <div style={{ fontSize: "11px", color: "var(--muted)" }}>{e.email || ""}</div>
                    </td>
                    <td>{e.phone || "—"}</td>
                    <td>{e.totalGames}</td>
                    <td><span style={{ color: "var(--green)" }}>{e.completedGames}</span></td>
                    <td><span style={{ color: e.cancelledGames > 0 ? "var(--red)" : "var(--muted)" }}>{e.cancelledGames}</span></td>
                    <td>{e.totalPaidRegistrations}</td>
                    <td>{e.totalGuestSlots}</td>
                    <td style={{ color: "var(--green)", fontWeight: 600 }}>{formatCurrency(e.totalRevenuePaise)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}

// ── Streaming — extracted to ./screening/index.tsx ────────────────────────────
// ScrEvents is imported at the top of this file from "./screening".


function ScrGuests() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px", textAlign: "center", padding: "40px" }}>
      <div style={{ width: 56, height: 56, borderRadius: "16px", background: "rgba(59,130,246,0.1)", border: "1.5px solid rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#3b82f6" strokeWidth="1.8" strokeLinecap="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>
      </div>
      <div>
        <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 800, color: "#3b82f6", letterSpacing: "0.18em", textTransform: "uppercase" }}>Streaming</p>
        <h2 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 800, color: "var(--white)" }}>Guest List</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", maxWidth: "360px", lineHeight: 1.7 }}>Per-event door verification table. Manage walk-in guests, verify ticket codes, and track entry in real time.</p>
      </div>
      <div style={{ marginTop: "8px", padding: "6px 16px", background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.18)", borderRadius: "999px" }}>
        <span style={{ fontSize: "10px", fontWeight: 800, color: "#3b82f6", letterSpacing: "0.16em", textTransform: "uppercase" }}>Coming Soon</span>
      </div>
    </div>
  );
}

function ScrFinance() {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", gap: "16px", textAlign: "center", padding: "40px" }}>
      <div style={{ width: 56, height: 56, borderRadius: "16px", background: "rgba(91,230,178,0.08)", border: "1.5px solid rgba(91,230,178,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="26" height="26" fill="none" viewBox="0 0 24 24" stroke="#5be6b2" strokeWidth="1.8" strokeLinecap="round"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
      </div>
      <div>
        <p style={{ margin: "0 0 6px", fontSize: "11px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.18em", textTransform: "uppercase" }}>Streaming</p>
        <h2 style={{ margin: "0 0 10px", fontSize: "22px", fontWeight: 800, color: "var(--white)" }}>Streaming Finance</h2>
        <p style={{ margin: 0, fontSize: "13px", color: "var(--muted)", maxWidth: "360px", lineHeight: 1.7 }}>Revenue analytics for screening events. Track ticket sales, payout breakdowns, and venue-level financial performance.</p>
      </div>
      <div style={{ marginTop: "8px", padding: "6px 16px", background: "rgba(91,230,178,0.08)", border: "1px solid rgba(91,230,178,0.2)", borderRadius: "999px" }}>
        <span style={{ fontSize: "10px", fontWeight: 800, color: "#5be6b2", letterSpacing: "0.16em", textTransform: "uppercase" }}>Coming Soon</span>
      </div>
    </div>
  );
}

// ── Router ────────────────────────────────────────────────────────────────────

export function ContentSections({ activeSection, onOpenDetail, onNavigate }: ContentSectionsProps) {
  if (activeSection === "dashboard")     return <Dashboard onNavigate={onNavigate} />;
  if (activeSection === "users")         return <Users onOpenDetail={onOpenDetail} />;
  if (activeSection === "organisers")    return <Organisers onOpenDetail={onOpenDetail} />;
  if (activeSection === "games")         return <Games />;
  if (activeSection === "payments")      return <Payments />;
  if (activeSection === "finance")       return <Finance />;
  if (activeSection === "notifications") return <Notifications />;
  if (activeSection === "feedback")      return <Feedback />;
  if (activeSection === "disputes")      return <Disputes onOpenDetail={onOpenDetail} />;
  if (activeSection === "communities")   return <Communities onOpenDetail={onOpenDetail} />;
  return <Venues onOpenDetail={onOpenDetail} />;
}
