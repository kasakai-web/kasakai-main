"use client";

import { useEffect, useState, useCallback } from "react";
import styles from "./dashboard.module.css";
import type { DashboardSection } from "./constants";
import { getAdminToken } from "@/lib/admin-session";

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || "http://localhost:5000/api/v1";

type AdminListResponse<T> = {
  success: boolean;
  count?: number;
  summary?: {
    players?: number;
    organisers?: number;
  };
  data: T[];
  message?: string;
};

type AdminUserRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  role: "player" | "organiser";
  gamesPlayed?: number;
  gamesHosted?: number;
  rating?: number;
  joinedAt?: string | null;
  status: string;
  location?: string | null;
};

type AdminOrganiserRow = {
  id: string;
  name: string;
  phone: string;
  email?: string | null;
  gamesHosted?: number;
  rating?: number;
  earningsPaise?: number;
  joinedAt?: string | null;
  status: string;
  approvalStatus?: string;
  isActive?: boolean;
  location?: string | null;
};

function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function formatCurrency(paise?: number) {
  if (typeof paise !== "number") return "—";
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatStatusLabel(status?: string) {
  if (!status) return "—";
  return status.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function badgeClassForStatus(status?: string) {
  const value = (status || "").toLowerCase();
  if (["active", "approved", "verified"].includes(value)) return styles.badgeGreen;
  if (["pending", "in review", "review", "draft"].includes(value)) return styles.badgeAmber;
  if (["suspended", "rejected", "inactive", "banned"].includes(value)) return styles.badgeRed;
  return styles.badgeGray;
}

function roleLabel(role: AdminUserRow["role"]) {
  return role === "organiser" ? "Organiser" : "Player";
}

type ContentSectionsProps = {
  activeSection: DashboardSection;
  onOpenDetail: (title: string) => void;
  onNavigate: (section: DashboardSection) => void;
};

function Head({ title, sub }: { title: string; sub: string }) {
  return (
    <div className={styles.sectionHead}>
      <div>
        <div className={styles.sectionTitle}>{title}</div>
        <div className={styles.sectionSub}>{sub}</div>
      </div>
    </div>
  );
}

function Dashboard({ onNavigate }: { onNavigate: (s: DashboardSection) => void }) {
  return (
    <>
      <div className={styles.statsGrid}>
        <div className={styles.statCard}><div className={styles.statLabel}>Total Users</div><div className={styles.statValue}>1,240</div><div className={`${styles.statDelta} ${styles.up}`}>+48 this week</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Active Games</div><div className={styles.statValue}>38</div><div className={`${styles.statDelta} ${styles.neutral}`}>Across 6 communities</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Revenue (MTD)</div><div className={styles.statValue}>₹2.4L</div><div className={`${styles.statDelta} ${styles.up}`}>+12% vs last month</div></div>
        <div className={styles.statCard}><div className={styles.statLabel}>Open Disputes</div><div className={styles.statValue}>5</div><div className={`${styles.statDelta} ${styles.down}`}>2 high priority</div></div>
      </div>

      <div className={styles.twoCol}>
        <div className={`${styles.panel} ${styles.panelWarn}`}>
          <div className={styles.statLabel}>Action Required</div>
          <div className={styles.panelTitle}>3 Organisers Pending Approval</div>
          <div className={styles.panelSub}>Review and approve/reject organiser applications to go live.</div>
          <button className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`} type="button" onClick={() => onNavigate("organisers")}>Review Now</button>
        </div>
        <div className={styles.panel}>
          <div className={styles.statLabel}>Recent Activity</div>
          <div className={styles.feed}>
            <div className={styles.feedRow}><div><div className={styles.feedTitle}>New user registered</div><div className={styles.feedSub}>Riya Patel · 2 min ago</div></div><span className={`${styles.badge} ${styles.badgeGreen}`}>Player</span></div>
            <div className={styles.feedRow}><div><div className={styles.feedTitle}>Game confirmed</div><div className={styles.feedSub}>Saturday 7v7 · Bengaluru</div></div><span className={`${styles.badge} ${styles.badgeBlue}`}>Confirmed</span></div>
            <div className={styles.feedRow}><div><div className={styles.feedTitle}>Refund dispute raised</div><div className={styles.feedSub}>Arjun Mehta · 14 min ago</div></div><span className={`${styles.badge} ${styles.badgeRed}`}>Dispute</span></div>
            <div className={styles.feedRow}><div><div className={styles.feedTitle}>Wallet top-up</div><div className={styles.feedSub}>₹500 · Priya Nair</div></div><span className={`${styles.badge} ${styles.badgeViolet}`}>Wallet</span></div>
          </div>
        </div>
      </div>

      <div className={styles.quickStats}>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Communities</div><div className={styles.summaryValue}>8</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Approved Organisers</div><div className={styles.summaryValue}>24</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Games This Month</div><div className={styles.summaryValue}>142</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Wallet Balance (platform)</div><div className={styles.summaryValue}>₹8.2L</div></div>
      </div>
    </>
  );
}

function Users({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | AdminUserRow["role"]>("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAdminToken();
      if (!token) {
        setError("Admin session missing. Please log in again.");
        return;
      }

      const res = await fetch(`${API_BASE}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as AdminListResponse<AdminUserRow>;

      if (!res.ok) {
        setError(data.message || "Failed to load users.");
        return;
      }

      setUsers(data.data || []);
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch = [user.name, user.phone, user.email || "", user.location || ""]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status.toLowerCase() === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  return (
    <>
      <Head title="All Users" sub={loading ? "Loading users..." : `${users.length} total registered users`} />
      <div className={styles.toolbar}>
        <input
          className={styles.searchInput}
          placeholder="Search by name, phone, location..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className={styles.filterSelect}
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value as "all" | AdminUserRow["role"])}
        >
          <option value="all">All roles</option>
          <option value="player">Players</option>
          <option value="organiser">Organisers</option>
        </select>
        <select className={styles.filterSelect} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All status</option>
          <option value="active">Active</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>
      {error && <div className={styles.formError}>{error}</div>}
      {loading ? <div className={styles.loadingState}>Loading users...</div> : null}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>User</th><th>Phone</th><th>Role</th><th>Location</th><th>Games</th><th>Rating</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {!loading && filteredUsers.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No users match the current filters.</td></tr>
            ) : null}
            {filteredUsers.map((user) => {
              const games = user.role === "organiser" ? user.gamesHosted ?? 0 : user.gamesPlayed ?? 0;
              const statusTone = badgeClassForStatus(user.status);

              return (
                <tr key={user.id}>
                  <td>{user.name}</td>
                  <td>{user.phone}</td>
                  <td><span className={`${styles.badge} ${user.role === "organiser" ? styles.badgeBlue : styles.badgeGray}`}>{roleLabel(user.role)}</span></td>
                  <td>{user.location || "—"}</td>
                  <td>{games}</td>
                  <td>{typeof user.rating === "number" ? user.rating.toFixed(1) : "—"}</td>
                  <td>{formatDate(user.joinedAt)}</td>
                  <td><span className={`${styles.badge} ${statusTone}`}>{formatStatusLabel(user.status)}</span></td>
                  <td>
                    <div className={styles.actions}>
                      <button className={styles.actionBtn} onClick={() => onOpenDetail(user.name)} type="button">View</button>
                      <button className={styles.actionBtn} type="button">{user.status === "active" ? "Ban" : "Unban"}</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Organisers({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  const [organisers, setOrganisers] = useState<AdminOrganiserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrganisers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getAdminToken();
      if (!token) {
        setError("Admin session missing. Please log in again.");
        return;
      }

      const res = await fetch(`${API_BASE}/admin/organisers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = (await res.json()) as AdminListResponse<AdminOrganiserRow>;

      if (!res.ok) {
        setError(data.message || "Failed to load organisers.");
        return;
      }

      setOrganisers(data.data || []);
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganisers();
  }, [fetchOrganisers]);

  const pendingOrganisers = organisers.filter((organiser) => organiser.approvalStatus === "pending");
  const approvedOrganisers = organisers.filter((organiser) => organiser.approvalStatus === "approved" && organiser.isActive !== false);
  const otherOrganisers = organisers.filter(
    (organiser) => organiser.approvalStatus !== "pending" && organiser.approvalStatus !== "approved"
  );

  return (
    <>
      <Head title="Organisers" sub={loading ? "Loading organisers..." : `${organisers.length} total organisers`} />
      {error && <div className={styles.formError}>{error}</div>}
      {loading ? <div className={styles.loadingState}>Loading organisers...</div> : null}
      <div className={styles.blockTitle}>Pending Verification</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Organiser</th><th>Location</th><th>Applied</th><th>Games Hosted</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {!loading && pendingOrganisers.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No organisers waiting for approval.</td></tr>
            ) : null}
            {pendingOrganisers.map((organiser) => (
              <tr key={organiser.id}>
                <td>{organiser.name}</td>
                <td>{organiser.location || "—"}</td>
                <td>{formatDate(organiser.joinedAt)}</td>
                <td>{organiser.gamesHosted ?? 0}</td>
                <td>{typeof organiser.rating === "number" ? organiser.rating.toFixed(1) : "—"}</td>
                <td><span className={`${styles.badge} ${badgeClassForStatus(organiser.approvalStatus)}`}>{formatStatusLabel(organiser.approvalStatus)}</span></td>
                <td><div className={styles.actions}><button className={styles.actionBtn}>Approve</button><button className={styles.actionBtn}>Reject</button><button className={styles.actionBtn} onClick={() => onOpenDetail(organiser.name)}>View</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.blockTitleSuccess}>Approved Organisers</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Organiser</th><th>Location</th><th>Games Hosted</th><th>Avg Rating</th><th>Earnings</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {!loading && approvedOrganisers.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No approved organisers yet.</td></tr>
            ) : null}
            {approvedOrganisers.map((organiser) => (
              <tr key={organiser.id}>
                <td>{organiser.name}</td>
                <td>{organiser.location || "—"}</td>
                <td>{organiser.gamesHosted ?? 0}</td>
                <td>{typeof organiser.rating === "number" ? organiser.rating.toFixed(1) : "—"}</td>
                <td>{formatCurrency(organiser.earningsPaise)}</td>
                <td><span className={`${styles.badge} ${badgeClassForStatus(organiser.approvalStatus || organiser.status)}`}>{formatStatusLabel(organiser.approvalStatus || organiser.status)}</span></td>
                <td><div className={styles.actions}><button className={styles.actionBtn} onClick={() => onOpenDetail(organiser.name)}>View</button><button className={styles.actionBtn}>Suspend</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.blockTitle}>Other Organisers</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Organiser</th><th>Location</th><th>Games Hosted</th><th>Avg Rating</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {!loading && otherOrganisers.length === 0 ? (
              <tr><td colSpan={6} style={{ textAlign: "center", padding: "24px", color: "var(--muted)" }}>No suspended or rejected organisers.</td></tr>
            ) : null}
            {otherOrganisers.map((organiser) => (
              <tr key={organiser.id}>
                <td>{organiser.name}</td>
                <td>{organiser.location || "—"}</td>
                <td>{organiser.gamesHosted ?? 0}</td>
                <td>{typeof organiser.rating === "number" ? organiser.rating.toFixed(1) : "—"}</td>
                <td><span className={`${styles.badge} ${badgeClassForStatus(organiser.approvalStatus || organiser.status)}`}>{formatStatusLabel(organiser.approvalStatus || organiser.status)}</span></td>
                <td><div className={styles.actions}><button className={styles.actionBtn} onClick={() => onOpenDetail(organiser.name)}>View</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Games({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  const rows = [
    ["Saturday 7v7", "Champions Turf, Koramangala", "Sat 14 Dec, 7PM", "7v7", "12 / 14", "₹350", "Vikram Rao", "Confirmed"],
    ["Sunday 6v6", "Andheri Sports Complex", "Sun 15 Dec, 6PM", "6v6", "8 / 12", "₹300", "Neha Kapoor", "Open"],
    ["Friday 5v5", "Vasant Kunj Turf", "Fri 13 Dec, 8PM", "5v5", "10 / 10", "₹280", "Rahul Singh", "Tentative"],
    ["Wednesday 8v8", "Hinjewadi Futsal", "Wed 11 Dec, 7:30PM", "8v8", "16 / 16", "₹400", "Arjun Mehta", "Completed"],
    ["Monday 6v6", "HSR Layout Turf", "Mon 9 Dec, 6PM", "6v6", "4 / 12", "₹320", "Vikram Rao", "Cancelled"],
  ];

  return (
    <>
      <Head title="Games & Events" sub="All games across all communities" />
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search games, venue, organiser..." />
        <select className={styles.filterSelect}><option>All Status</option><option>Open</option><option>Confirmed</option><option>Completed</option><option>Cancelled</option></select>
        <select className={styles.filterSelect}><option>All Communities</option><option>FC Bengaluru</option><option>Mumbai Kickabout</option></select>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Game</th><th>Venue</th><th>Date</th><th>Format</th><th>Players</th><th>Fee</th><th>Organiser</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} onClick={() => onOpenDetail(r[0])}>
                <td>{r[0]}</td><td>{r[1]}</td><td>{r[2]}</td><td><span className={`${styles.badge} ${styles.badgeGray}`}>{r[3]}</span></td><td>{r[4]}</td><td>{r[5]}</td><td>{r[6]}</td>
                <td><span className={`${styles.badge} ${r[7] === "Confirmed" ? styles.badgeGreen : r[7] === "Open" ? styles.badgeBlue : r[7] === "Cancelled" ? styles.badgeRed : styles.badgeGray}`}>{r[7]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Payments() {
  const rows = [
    ["TXN-8821", "Riya Patel", "Top-up", "+₹500", "—", "Razorpay/UPI", "2 min ago", "Success"],
    ["TXN-8820", "Arjun Mehta", "Refund", "+₹350", "Monday 6v6", "Wallet", "14 min ago", "Success"],
    ["TXN-8819", "Priya Nair", "Lock", "-₹300", "Sunday 6v6", "Wallet", "1 hr ago", "Success"],
    ["TXN-8818", "Rohit Sinha", "Backout fee", "-₹100", "Saturday 7v7", "Wallet", "3 hr ago", "Success"],
    ["TXN-8817", "Kavya M", "Top-up", "+₹1000", "—", "Razorpay/Card", "5 hr ago", "Failed"],
  ];

  return (
    <>
      <Head title="Payments" sub="Wallet transactions, top-ups, refunds" />
      <div className={styles.paymentSummary}>
        <div className={styles.payCard}><div className={styles.statLabel}>Total Processed (MTD)</div><div className={styles.payValue}>₹2,40,800</div><div className={styles.paySub}>142 games · Dec 2025</div></div>
        <div className={styles.payCard}><div className={styles.statLabel}>Refunds Issued</div><div className={styles.payValue}>₹14,200</div><div className={styles.paySub}>23 transactions</div></div>
        <div className={styles.payCard}><div className={styles.statLabel}>Backout Fees Collected</div><div className={styles.payValue}>₹3,600</div><div className={styles.paySub}>36 post-cutoff backouts</div></div>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Transaction ID</th><th>User</th><th>Type</th><th>Amount</th><th>Game</th><th>Method</th><th>Date</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]}>
                <td>{r[0]}</td><td>{r[1]}</td><td><span className={`${styles.badge} ${r[2] === "Top-up" ? styles.badgeGreen : r[2] === "Refund" ? styles.badgeAmber : r[2] === "Lock" ? styles.badgeBlue : styles.badgeRed}`}>{r[2]}</span></td><td>{r[3]}</td><td>{r[4]}</td><td>{r[5]}</td><td>{r[6]}</td><td><span className={`${styles.badge} ${r[7] === "Success" ? styles.badgeGreen : styles.badgeRed}`}>{r[7]}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Notifications() {
  const feed = [
    ["Game created", "Saturday 7v7 created by Vikram Rao. Notification sent to 48 community members.", "2 min ago · 48 recipients", "Delivered"],
    ["Teams published", "Teams for Friday 5v5 published. Sent to 10 players.", "1 hr ago · 10 recipients", "Delivered"],
    ["SoS blast", "SoS triggered for Monday 6v6 — 2 spots needed. Sent to waitlist + community.", "3 hr ago · 22 recipients", "Partial"],
    ["Waitlist spot", "Priya Nair notified of open spot in Saturday 7v7. Response window: 10 min.", "4 hr ago · 1 recipient", "Delivered"],
    ["Game cancelled", "Monday 6v6 cancelled. Refunds processed for 4 players.", "6 hr ago · 4 recipients", "Delivered"],
    ["Delivery failed", "3 messages failed — rate limit hit on WhatsApp API.", "8 hr ago", "Failed"],
  ];

  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Notifications Log</div>
          <div className={styles.sectionSub}>All platform notifications sent via WhatsApp and push</div>
        </div>
        <button className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`} type="button">Send Broadcast</button>
      </div>
      <div className={styles.summaryThree}>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Sent Today</div><div className={styles.summaryValue}>284</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>WhatsApp Delivered</div><div className={styles.summaryValue}>99.2%</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Failed</div><div className={styles.summaryValue}>3</div></div>
      </div>
      <div className={styles.notifFeed}>
        {feed.map((f) => (
          <div key={f[0]} className={styles.notifItem}>
            <div>
              <div className={styles.notifType}>{f[0]}</div>
              <div className={styles.notifMsg}>{f[1]}</div>
              <div className={styles.notifTime}>{f[2]}</div>
            </div>
            <span className={`${styles.badge} ${f[3] === "Delivered" ? styles.badgeGreen : f[3] === "Partial" ? styles.badgeAmber : styles.badgeRed}`}>{f[3]}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function Feedback() {
  return (
    <>
      <Head title="Player Feedback" sub="Post-game feedback and game ratings" />
      <div className={styles.summaryFour}>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Avg Game Rating</div><div className={styles.summaryValue}>4.3 / 5</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Submission Rate</div><div className={styles.summaryValue}>91%</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Needs Follow-up</div><div className={styles.summaryValue}>4</div></div>
        <div className={styles.summaryItem}><div className={styles.statLabel}>Total Submitted</div><div className={styles.summaryValue}>1,820</div></div>
      </div>
      <div className={styles.feedbackGrid}>
        <div className={styles.fbCard}><div className={styles.fbGame}>Saturday 7v7 · Dec 14</div><div className={styles.fbQuote}>Really well organised, teams were balanced and the venue was great. Vikram handled everything perfectly.</div><div className={styles.fbMeta}>Priya Nair · 14 Dec 2025</div></div>
        <div className={styles.fbCard}><div className={styles.fbGame}>Monday 6v6 · Dec 9</div><div className={styles.fbQuote}>Game was cancelled last minute with poor communication. Refund came through but the experience was very frustrating.</div><div className={styles.fbMeta}>Arjun Mehta · 9 Dec 2025</div></div>
        <div className={styles.fbCard}><div className={styles.fbGame}>Friday 5v5 · Dec 13</div><div className={styles.fbQuote}>Great game, teams were fair. Venue had some parking issues but overall a really fun session.</div><div className={styles.fbMeta}>Rohit Sinha · 13 Dec 2025</div></div>
        <div className={styles.fbCard}><div className={styles.fbGame}>Sunday 6v6 · Dec 8</div><div className={styles.fbQuote}>Absolutely loved it. Neha runs the tightest ship — everyone showed up, game started on time, teams were perfect.</div><div className={styles.fbMeta}>Kavya M · 8 Dec 2025</div></div>
      </div>
    </>
  );
}

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

function Communities({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Communities</div>
          <div className={styles.sectionSub}>8 active communities across India</div>
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

// ─── Turf types ──────────────────────────────────────────────────────────────
type TurfAddress = {
  line1: string; line2?: string; area: string; city: string;
  state: string; pincode: string; country?: string;
};

type Turf = {
  _id: string;
  name: string;
  shortName?: string;
  address: TurfAddress;
  surfaceType: string;
  numberOfPitches: number;
  pitchSizes: string[];
  hasFloodlights: boolean;
  hasChangingRooms: boolean;
  hasParking: boolean;
  hasRefreshments: boolean;
  contactPhone?: string;
  contactName?: string;
  googleMapsUrl?: string;
  parkingNotes?: string;
  isVerified: boolean;
  isActive: boolean;
  totalGamesHosted: number;
  averageRating: number;
  createdAt: string;
};

const EMPTY_TURF_FORM = {
  name: "", shortName: "", surfaceType: "artificial_turf",
  numberOfPitches: 1, pitchSizes: ["medium"],
  hasFloodlights: true, hasChangingRooms: false,
  hasParking: false, hasRefreshments: false,
  contactPhone: "", contactName: "",
  googleMapsUrl: "", parkingNotes: "",
  "address.line1": "", "address.line2": "", "address.area": "",
  "address.city": "", "address.state": "", "address.pincode": "",
};

type TurfForm = typeof EMPTY_TURF_FORM;

function surfaceLabel(s: string) {
  return { natural_grass: "Natural", artificial_turf: "Artificial", concrete: "Concrete", indoor: "Indoor" }[s] ?? s;
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────
function TurfModal({
  initial,
  onClose,
  onSaved,
}: {
  initial?: Turf | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<TurfForm>(
    initial
      ? {
          name: initial.name,
          shortName: initial.shortName ?? "",
          surfaceType: initial.surfaceType,
          numberOfPitches: initial.numberOfPitches,
          pitchSizes: initial.pitchSizes,
          hasFloodlights: initial.hasFloodlights,
          hasChangingRooms: initial.hasChangingRooms,
          hasParking: initial.hasParking,
          hasRefreshments: initial.hasRefreshments,
          contactPhone: initial.contactPhone ?? "",
          contactName: initial.contactName ?? "",
          googleMapsUrl: initial.googleMapsUrl ?? "",
          parkingNotes: initial.parkingNotes ?? "",
          "address.line1": initial.address.line1,
          "address.line2": initial.address.line2 ?? "",
          "address.area": initial.address.area,
          "address.city": initial.address.city,
          "address.state": initial.address.state,
          "address.pincode": initial.address.pincode,
        }
      : { ...EMPTY_TURF_FORM }
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: keyof TurfForm, v: string | number | boolean | string[]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const body = {
      name: form.name,
      shortName: form.shortName || undefined,
      surfaceType: form.surfaceType,
      numberOfPitches: Number(form.numberOfPitches),
      pitchSizes: form.pitchSizes,
      hasFloodlights: form.hasFloodlights,
      hasChangingRooms: form.hasChangingRooms,
      hasParking: form.hasParking,
      hasRefreshments: form.hasRefreshments,
      contactPhone: form.contactPhone || undefined,
      contactName: form.contactName || undefined,
      googleMapsUrl: form.googleMapsUrl || undefined,
      parkingNotes: form.parkingNotes || undefined,
      address: {
        line1: form["address.line1"],
        line2: form["address.line2"] || "",
        area: form["address.area"],
        city: form["address.city"],
        state: form["address.state"],
        pincode: form["address.pincode"],
      },
    };

    try {
      const url = initial ? `${API_BASE}/turfs/${initial._id}` : `${API_BASE}/turfs`;
      const method = initial ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getAdminToken()}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to save."); return; }
      onSaved();
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const inp = `${styles.searchInput}`;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div className={styles.sectionTitle}>{initial ? "Edit Venue" : "Add Venue"}</div>
          <button className={styles.modalClose} onClick={onClose} type="button">✕</button>
        </div>
        <form onSubmit={handleSubmit} className={styles.modalForm}>
          <div className={styles.formGrid}>
            <label className={styles.formLabel}>
              Name *
              <input className={inp} value={form.name} onChange={(e) => set("name", e.target.value)} required />
            </label>
            <label className={styles.formLabel}>
              Short Name
              <input className={inp} value={form.shortName} onChange={(e) => set("shortName", e.target.value)} />
            </label>
            <label className={styles.formLabel}>
              Address Line 1 *
              <input className={inp} value={form["address.line1"]} onChange={(e) => set("address.line1", e.target.value)} required />
            </label>
            <label className={styles.formLabel}>
              Address Line 2
              <input className={inp} value={form["address.line2"]} onChange={(e) => set("address.line2", e.target.value)} />
            </label>
            <label className={styles.formLabel}>
              Area *
              <input className={inp} value={form["address.area"]} onChange={(e) => set("address.area", e.target.value)} required />
            </label>
            <label className={styles.formLabel}>
              City *
              <input className={inp} value={form["address.city"]} onChange={(e) => set("address.city", e.target.value)} required />
            </label>
            <label className={styles.formLabel}>
              State *
              <input className={inp} value={form["address.state"]} onChange={(e) => set("address.state", e.target.value)} required />
            </label>
            <label className={styles.formLabel}>
              Pincode *
              <input className={inp} value={form["address.pincode"]} onChange={(e) => set("address.pincode", e.target.value)} required />
            </label>
            <label className={styles.formLabel}>
              Surface Type
              <select className={styles.filterSelect} value={form.surfaceType} onChange={(e) => set("surfaceType", e.target.value)}>
                <option value="artificial_turf">Artificial Turf</option>
                <option value="natural_grass">Natural Grass</option>
                <option value="concrete">Concrete</option>
                <option value="indoor">Indoor</option>
              </select>
            </label>
            <label className={styles.formLabel}>
              Number of Pitches
              <input className={inp} type="number" min={1} value={form.numberOfPitches} onChange={(e) => set("numberOfPitches", Number(e.target.value))} />
            </label>
            <label className={styles.formLabel}>
              Contact Name
              <input className={inp} value={form.contactName} onChange={(e) => set("contactName", e.target.value)} />
            </label>
            <label className={styles.formLabel}>
              Contact Phone
              <input className={inp} value={form.contactPhone} onChange={(e) => set("contactPhone", e.target.value)} />
            </label>
            <label className={styles.formLabel}>
              Google Maps URL
              <input className={inp} value={form.googleMapsUrl} onChange={(e) => set("googleMapsUrl", e.target.value)} />
            </label>
            <label className={styles.formLabel}>
              Parking Notes
              <input className={inp} value={form.parkingNotes} onChange={(e) => set("parkingNotes", e.target.value)} />
            </label>
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

// ─── Venues Section ───────────────────────────────────────────────────────────
function Venues({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  const [turfs, setTurfs] = useState<Turf[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalTurf, setModalTurf] = useState<Turf | null | "new">(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchTurfs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API_BASE}/turfs/admin/all`, {
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      const data = await res.json();
      if (!res.ok) { setError(data.message || "Failed to load turfs."); return; }
      setTurfs(data.data);
    } catch {
      setError("Cannot reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTurfs(); }, [fetchTurfs]);

  const adminAction = async (url: string, method = "PATCH") => {
    setActionLoading(url);
    try {
      await fetch(`${API_BASE}${url}`, {
        method,
        headers: { Authorization: `Bearer ${getAdminToken()}` },
      });
      await fetchTurfs();
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Venues & Turfs</div>
          <div className={styles.sectionSub}>{loading ? "Loading…" : `${turfs.length} registered venues`}</div>
        </div>
        <button
          className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`}
          type="button"
          onClick={() => setModalTurf("new")}
        >
          + Add Venue
        </button>
      </div>

      {error && <div className={styles.formError}>{error}</div>}

      {loading ? (
        <div className={styles.loadingState}>Loading venues…</div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Venue</th><th>Area</th><th>City</th><th>Surface</th>
                <th>Pitches</th><th>Floodlights</th><th>Verified</th>
                <th>Status</th><th>Games</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {turfs.length === 0 && (
                <tr><td colSpan={10} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>No venues yet. Add your first venue.</td></tr>
              )}
              {turfs.map((t) => {
                const busy = actionLoading !== null;
                return (
                  <tr key={t._id}>
                    <td>{t.name}</td>
                    <td>{t.address.area}</td>
                    <td>{t.address.city}</td>
                    <td><span className={`${styles.badge} ${styles.badgeGray}`}>{surfaceLabel(t.surfaceType)}</span></td>
                    <td>{t.numberOfPitches}</td>
                    <td>
                      <span className={`${styles.badge} ${t.hasFloodlights ? styles.badgeGreen : styles.badgeGray}`}>
                        {t.hasFloodlights ? "Yes" : "No"}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${t.isVerified ? styles.badgeGreen : styles.badgeAmber}`}>
                        {t.isVerified ? "Verified" : "Pending"}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${t.isActive ? styles.badgeGreen : styles.badgeRed}`}>
                        {t.isActive ? "Active" : "Discontinued"}
                      </span>
                    </td>
                    <td>{t.totalGamesHosted}</td>
                    <td>
                      <div className={styles.actions}>
                        <button className={styles.actionBtn} type="button" onClick={() => setModalTurf(t)}>Edit</button>
                        {!t.isVerified && (
                          <button className={styles.actionBtn} type="button" disabled={busy}
                            onClick={() => adminAction(`/turfs/${t._id}/verify`)}>
                            Verify
                          </button>
                        )}
                        {t.isActive ? (
                          <button className={styles.actionBtn} type="button" disabled={busy}
                            onClick={() => adminAction(`/turfs/${t._id}/discontinue`)}>
                            Discontinue
                          </button>
                        ) : (
                          <button className={styles.actionBtn} type="button" disabled={busy}
                            onClick={() => adminAction(`/turfs/${t._id}/reactivate`)}>
                            Reactivate
                          </button>
                        )}
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
        <TurfModal
          initial={modalTurf === "new" ? null : modalTurf}
          onClose={() => setModalTurf(null)}
          onSaved={() => { setModalTurf(null); fetchTurfs(); }}
        />
      )}
    </>
  );
}

export function ContentSections({ activeSection, onOpenDetail, onNavigate }: ContentSectionsProps) {
  if (activeSection === "dashboard") return <Dashboard onNavigate={onNavigate} />;
  if (activeSection === "users") return <Users onOpenDetail={onOpenDetail} />;
  if (activeSection === "organisers") return <Organisers onOpenDetail={onOpenDetail} />;
  if (activeSection === "games") return <Games onOpenDetail={onOpenDetail} />;
  if (activeSection === "payments") return <Payments />;
  if (activeSection === "notifications") return <Notifications />;
  if (activeSection === "feedback") return <Feedback />;
  if (activeSection === "disputes") return <Disputes onOpenDetail={onOpenDetail} />;
  if (activeSection === "communities") return <Communities onOpenDetail={onOpenDetail} />;
  return <Venues onOpenDetail={onOpenDetail} />;
}
