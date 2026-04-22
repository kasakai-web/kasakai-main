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
  role: "player" | "organiser"; gamesPlayed?: number; gamesHosted?: number;
  rating?: number; joinedAt?: string | null; status: string; location?: string | null;
};

type AdminOrganiserRow = {
  id: string; name: string; phone: string; email?: string | null;
  gamesHosted?: number; rating?: number; earningsPaise?: number;
  joinedAt?: string | null; status: string; approvalStatus?: string;
  isActive?: boolean; location?: string | null;
};

type AdminGameRow = {
  id: string; title: string; venue?: string | null; scheduledAt?: string | null;
  format?: string | null; players: { registered: number; totalSlots: number };
  feeInPaise?: number; organiserName?: string; status: string;
};

type AdminPaymentRow = {
  id: string; playerName: string; type: string; amountPaise: number;
  gameTitle: string; method: string; paidAt?: string | null; status: string;
};

type AdminPaymentSummary = {
  totalProcessedPaise?: number; totalRefundedPaise?: number; pendingCount?: number;
};

type AdminPaymentListResponse = {
  success: boolean; count?: number; summary?: AdminPaymentSummary;
  data: AdminPaymentRow[]; message?: string;
};

type AdminNotifRow = {
  _id: string; type: string; title: string; body: string;
  isRead: boolean; createdAt: string; recipientRole: string;
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
  turf?: { name?: string; address?: { area?: string; city?: string } } | null;
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
  game?: { title?: string; format?: string; scheduledAt?: string } | null;
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
            <tr><th>Name</th><th>Phone</th><th>Role</th><th>Email</th><th>Location</th><th>Games</th><th>Rating</th><th>Joined</th><th>Status</th></tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && <tr><td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No users match the current filters.</td></tr>}
            {filtered.map((u) => (
              <tr key={u.id} onClick={() => onOpenDetail(u.name)} style={{ cursor: "pointer" }}>
                <td>{u.name}</td>
                <td>{u.phone}</td>
                <td><span className={`${styles.badge} ${u.role === "organiser" ? styles.badgeBlue : styles.badgeGray}`}>{u.role === "organiser" ? "Organiser" : "Player"}</span></td>
                <td>{u.email || "—"}</td>
                <td>{u.location || "—"}</td>
                <td>{u.role === "organiser" ? (u.gamesHosted ?? 0) : (u.gamesPlayed ?? 0)}</td>
                <td>{typeof u.rating === "number" ? u.rating.toFixed(1) : "—"}</td>
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
  const [organisers, setOrganisers] = useState<AdminOrganiserRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");

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

  const pending  = organisers.filter((o) => o.approvalStatus === "pending");
  const approved = organisers.filter((o) => o.approvalStatus === "approved" && o.isActive !== false);
  const other    = organisers.filter((o) => !["pending", "approved"].includes(o.approvalStatus || ""));

  const ORow = ({ o }: { o: AdminOrganiserRow }) => (
    <tr key={o.id}>
      <td>{o.name}</td>
      <td>{o.phone}</td>
      <td>{o.email || "—"}</td>
      <td>{o.location || "—"}</td>
      <td>{formatDate(o.joinedAt)}</td>
      <td>{o.gamesHosted ?? 0}</td>
      <td>{typeof o.rating === "number" ? o.rating.toFixed(1) : "—"}</td>
      <td style={{ color: "var(--green)" }}>{formatCurrency(o.earningsPaise)}</td>
      <td><span className={`${styles.badge} ${badgeClassForStatus(o.approvalStatus)}`}>{formatStatusLabel(o.approvalStatus)}</span></td>
      <td><div className={styles.actions}><button className={styles.actionBtn} onClick={() => onOpenDetail(o.name)}>View</button></div></td>
    </tr>
  );

  const OTable = ({ rows, cols }: { rows: AdminOrganiserRow[]; cols: number }) => (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Location</th><th>Joined</th><th>Games</th><th>Rating</th><th>Earnings</th><th>Status</th><th>Actions</th></tr></thead>
        <tbody>
          {!loading && rows.length === 0 && <tr><td colSpan={cols} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>None.</td></tr>}
          {rows.map((o) => <ORow key={o.id} o={o} />)}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      <Head title="Organisers" sub={loading ? "Loading…" : `${organisers.length} total organisers`} />
      {error && <div className={styles.formError}>{error}</div>}
      {loading && <div className={styles.loadingState}>Loading organisers…</div>}
      <div className={styles.blockTitle}>Pending Verification ({pending.length})</div>
      <OTable rows={pending} cols={10} />
      <div className={styles.blockTitleSuccess}>Approved Organisers ({approved.length})</div>
      <OTable rows={approved} cols={10} />
      <div className={styles.blockTitle}>Rejected / Suspended ({other.length})</div>
      <OTable rows={other} cols={10} />
    </>
  );
}

// ── Game Detail Modal ──────────────────────────────────────────────────────────

function GameDetailModal({ gameId, onClose }: { gameId: string; onClose: () => void }) {
  const [game, setGame]     = useState<GameDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setError("Admin session missing."); setLoading(false); return; }
    fetch(`${API_BASE}/admin/games/${gameId}`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d) => { if (d.success) setGame(d.data); else setError(d.message || "Failed to load game."); })
      .catch(() => setError("Cannot reach the server."))
      .finally(() => setLoading(false));
  }, [gameId]);

  const regs    = game?.registrations || [];
  const paidCount  = regs.filter((r) => r.paymentStatus === "paid").length;
  const guestCount = regs.filter((r) => r.plusOneName).length;
  const totalRevPaise = regs.filter((r) => r.paymentStatus === "paid").reduce((s, r) => s + (r.amountPaidPaise || 0), 0);
  const presentCount  = regs.filter((r) => r.attended === "present").length;

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

function Payments() {
  const [payments, setPayments] = useState<AdminPaymentRow[]>([]);
  const [summary, setSummary]   = useState<AdminPaymentSummary>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");
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
      [p.playerName, p.gameTitle].join(" ").toLowerCase().includes(q) &&
      (statusFilter === "all" || p.status.toLowerCase() === statusFilter)
    );
  });

  return (
    <>
      <Head title="Payments" sub={loading ? "Loading…" : `${payments.length} payment records`} />
      <div className={styles.paymentSummary}>
        <div className={styles.payCard}><div className={styles.statLabel}>Total Processed</div><div className={styles.payValue}>{formatCurrency(summary.totalProcessedPaise)}</div><div className={styles.paySub}>Paid registrations</div></div>
        <div className={styles.payCard}><div className={styles.statLabel}>Refunds Issued</div><div className={styles.payValue}>{formatCurrency(summary.totalRefundedPaise)}</div><div className={styles.paySub}>Cancellations &amp; backouts</div></div>
        <div className={styles.payCard}><div className={styles.statLabel}>Pending</div><div className={styles.payValue}>{summary.pendingCount ?? 0}</div><div className={styles.paySub}>Awaiting payment</div></div>
      </div>
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search by player or game…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={styles.filterSelect} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="refunded">Refunded</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      {error && <div className={styles.formError}>{error}</div>}
      {loading && <div className={styles.loadingState}>Loading payments…</div>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Txn ID</th><th>Player</th><th>Type</th><th>Amount</th><th>Game</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No payment records.</td></tr>}
            {filtered.map((p) => (
              <tr key={p.id}>
                <td style={{ fontFamily: "monospace", fontSize: "12px" }}>{String(p.id).slice(-8).toUpperCase()}</td>
                <td>{p.playerName}</td>
                <td><span className={`${styles.badge} ${styles.badgeBlue}`}>{p.type}</span></td>
                <td>{formatCurrency(p.amountPaise)}</td>
                <td>{p.gameTitle}</td>
                <td>{p.method}</td>
                <td>{formatDateTime(p.paidAt)}</td>
                <td><span className={`${styles.badge} ${badgeClassForStatus(p.status)}`}>{formatStatusLabel(p.status)}</span></td>
              </tr>
            ))}
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
      [n.title, n.body, n.recipientRole, n.type].join(" ").toLowerCase().includes(q) &&
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
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "4px" }}>
                  <span className={`${styles.badge} ${styles.badgeGray}`}>{TYPE_LABEL[n.type] || n.type}</span>
                  <span className={`${styles.badge} ${n.recipientRole === "organiser" ? styles.badgeBlue : styles.badgeGray}`}>{n.recipientRole}</span>
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

function Feedback() {
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [summary, setSummary]   = useState<{ avgGame?: number | null; tagCounts?: Record<string, number> }>({});
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    const token = getAdminToken();
    if (!token) { setLoading(false); setError("Admin session missing."); return; }
    fetch(`${API_BASE}/admin/feedback?limit=100`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((d: FeedbackApiResponse) => {
        if (d.success) { setFeedback(d.data || []); setSummary(d.summary || {}); }
        else setError(d.message || "Failed to load feedback.");
      })
      .catch(() => setError("Cannot reach the server."))
      .finally(() => setLoading(false));
  }, []);

  const filtered = feedback.filter((f) => {
    const q = search.trim().toLowerCase();
    return [f.submittedBy?.name || "", f.game?.title || "", f.comment || ""].join(" ").toLowerCase().includes(q);
  });

  const topTags = Object.entries(summary.tagCounts || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);

  return (
    <>
      <Head title="Player Feedback" sub={loading ? "Loading…" : `${feedback.length} feedback submissions`} />
      <div className={styles.paymentSummary}>
        <div className={styles.payCard}><div className={styles.statLabel}>Total Submissions</div><div className={styles.payValue}>{loading ? "—" : feedback.length}</div><div className={styles.paySub}>Post-game feedback</div></div>
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
        <input className={styles.searchInput} placeholder="Search by player, game or comment…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {error && <div className={styles.formError}>{error}</div>}
      {loading && <div className={styles.loadingState}>Loading feedback…</div>}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr><th>Player</th><th>Game</th><th>Date</th><th>Game ★</th><th>Organiser ★</th><th>Venue ★</th><th>Tags</th><th>Comment</th></tr>
          </thead>
          <tbody>
            {!loading && filtered.length === 0 && <tr><td colSpan={8} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No feedback submitted yet.</td></tr>}
            {filtered.map((f) => (
              <tr key={f._id}>
                <td>
                  {f.submittedBy?.name || "—"}
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>{f.submittedBy?.phone || ""}</div>
                </td>
                <td>
                  {f.game?.title || "—"}
                  <div style={{ fontSize: "11px", color: "var(--muted)" }}>{f.game?.format || ""}</div>
                </td>
                <td>{formatDate(f.createdAt)}</td>
                <td style={{ color: "var(--amber)", letterSpacing: "0.03em" }}>{starRating(f.gameRating)}</td>
                <td style={{ color: "var(--amber)", letterSpacing: "0.03em" }}>{starRating(f.organiserRating)}</td>
                <td style={{ color: "var(--amber)", letterSpacing: "0.03em" }}>{starRating(f.venueRating)}</td>
                <td>
                  {(f.tags || []).map((tag) => (
                    <span key={tag} className={`${styles.badge} ${styles.badgeGray}`} style={{ marginRight: "3px" }}>{tag}</span>
                  ))}
                </td>
                <td style={{ maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {f.comment || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
            <thead><tr><th>Venue</th><th>Area</th><th>City</th><th>Surface</th><th>Pitches</th><th>Floodlights</th><th>Verified</th><th>Status</th><th>Games</th><th>Actions</th></tr></thead>
            <tbody>
              {turfs.length === 0 && <tr><td colSpan={10} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No venues yet.</td></tr>}
              {turfs.map((t) => {
                const busy = actionLoading !== null;
                return (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td>{t.address.area}</td>
                    <td>{t.address.city}</td>
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
