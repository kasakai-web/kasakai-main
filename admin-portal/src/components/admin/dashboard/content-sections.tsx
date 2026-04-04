import styles from "./dashboard.module.css";
import type { DashboardSection } from "./constants";

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
  const data = [
    ["Riya Patel", "+91 98765 00001", "player", "12", "4.2", "₹480", "Nov 2025", "active"],
    ["Arjun Mehta", "+91 98765 00002", "organiser", "48", "4.7", "₹1,200", "Sep 2025", "active"],
    ["Priya Nair", "+91 98765 00003", "player", "24", "4.5", "₹200", "Oct 2025", "active"],
    ["Rohit Sinha", "+91 98765 00004", "player", "8", "3.8", "₹0", "Dec 2025", "active"],
    ["Kavya M", "+91 98765 00005", "player", "16", "4.1", "₹900", "Oct 2025", "active"],
    ["Vikram Rao", "+91 98765 00006", "organiser", "62", "4.8", "₹3,400", "Aug 2025", "active"],
    ["Neha Kapoor", "+91 98765 00007", "organiser", "31", "4.5", "₹2,100", "Sep 2025", "active"],
    ["Dev Sharma", "+91 98765 00008", "player", "3", "3.5", "₹150", "Dec 2025", "banned"],
  ];

  return (
    <>
      <Head title="All Users" sub="1,240 total registered users" />
      <div className={styles.toolbar}>
        <input className={styles.searchInput} placeholder="Search by name, phone..." />
        <select className={styles.filterSelect}><option>All roles</option><option>Players</option><option>Organisers</option></select>
        <select className={styles.filterSelect}><option>All status</option><option>Active</option><option>Banned</option></select>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>User</th><th>Phone</th><th>Role</th><th>Games</th><th>Rating</th><th>Wallet</th><th>Joined</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {data.map((u) => (
              <tr key={u[0]}>
                <td>{u[0]}</td><td>{u[1]}</td><td>{u[2]}</td><td>{u[3]}</td><td>{u[4]}</td><td>{u[5]}</td><td>{u[6]}</td>
                <td><span className={`${styles.badge} ${u[7] === "active" ? styles.badgeGreen : styles.badgeRed}`}>{u[7]}</span></td>
                <td><div className={styles.actions}><button className={styles.actionBtn} onClick={() => onOpenDetail(u[0])} type="button">View</button><button className={styles.actionBtn} type="button">{u[7] === "active" ? "Ban" : "Unban"}</button></div></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

function Organisers({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  return (
    <>
      <Head title="Organisers" sub="Manage and verify organiser accounts" />
      <div className={styles.blockTitle}>Pending Verification</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Organiser</th><th>Community</th><th>Applied</th><th>WhatsApp Group</th><th>Default Format</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td>Arjun Mehta</td><td>FC Bengaluru Sundays</td><td>2 days ago</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Linked</span></td><td><span className={`${styles.badge} ${styles.badgeGray}`}>7v7</span></td><td><div className={styles.actions}><button className={styles.actionBtn}>Approve</button><button className={styles.actionBtn}>Reject</button><button className={styles.actionBtn} onClick={() => onOpenDetail("Arjun Mehta")}>View</button></div></td></tr>
            <tr><td>Priya Sharma</td><td>Weekend Warriors Mumbai</td><td>5 days ago</td><td><span className={`${styles.badge} ${styles.badgeAmber}`}>Pending</span></td><td><span className={`${styles.badge} ${styles.badgeGray}`}>6v6</span></td><td><div className={styles.actions}><button className={styles.actionBtn}>Approve</button><button className={styles.actionBtn}>Reject</button><button className={styles.actionBtn} onClick={() => onOpenDetail("Priya Sharma")}>View</button></div></td></tr>
            <tr><td>Rahul Singh</td><td>Delhi Football Club</td><td>1 week ago</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Linked</span></td><td><span className={`${styles.badge} ${styles.badgeGray}`}>5v5</span></td><td><div className={styles.actions}><button className={styles.actionBtn}>Approve</button><button className={styles.actionBtn}>Reject</button><button className={styles.actionBtn} onClick={() => onOpenDetail("Rahul Singh")}>View</button></div></td></tr>
          </tbody>
        </table>
      </div>

      <div className={styles.blockTitleSuccess}>Approved Organisers</div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Organiser</th><th>Community</th><th>Games Hosted</th><th>Avg Rating</th><th>Earnings</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td>Vikram Rao</td><td>FC Bengaluru Sundays</td><td>48</td><td>4.7</td><td>₹28,400</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Active</span></td><td><div className={styles.actions}><button className={styles.actionBtn} onClick={() => onOpenDetail("Vikram Rao")}>View</button><button className={styles.actionBtn}>Suspend</button></div></td></tr>
            <tr><td>Neha Kapoor</td><td>Pune Sunday Kickabout</td><td>31</td><td>4.5</td><td>₹18,200</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Active</span></td><td><div className={styles.actions}><button className={styles.actionBtn} onClick={() => onOpenDetail("Neha Kapoor")}>View</button><button className={styles.actionBtn}>Suspend</button></div></td></tr>
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

function Venues({ onOpenDetail }: { onOpenDetail: (t: string) => void }) {
  return (
    <>
      <div className={styles.sectionHead}>
        <div>
          <div className={styles.sectionTitle}>Venues & Turfs</div>
          <div className={styles.sectionSub}>All registered playing venues</div>
        </div>
        <button className={`${styles.topbarBtn} ${styles.topbarBtnPrimary}`} type="button">+ Add Venue</button>
      </div>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead><tr><th>Venue</th><th>Area</th><th>City</th><th>Surface</th><th>Pitches</th><th>Floodlights</th><th>Verified</th><th>Games</th><th>Actions</th></tr></thead>
          <tbody>
            <tr><td>Champions Turf</td><td>Koramangala</td><td>Bengaluru</td><td><span className={`${styles.badge} ${styles.badgeGray}`}>Artificial</span></td><td>2</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Yes</span></td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Verified</span></td><td>48</td><td><button className={styles.actionBtn} onClick={() => onOpenDetail("Champions Turf Koramangala")}>View</button></td></tr>
            <tr><td>Andheri Sports Complex</td><td>Andheri West</td><td>Mumbai</td><td><span className={`${styles.badge} ${styles.badgeGray}`}>Natural</span></td><td>3</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Yes</span></td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Verified</span></td><td>31</td><td><button className={styles.actionBtn} onClick={() => onOpenDetail("Andheri Sports Complex")}>View</button></td></tr>
            <tr><td>Vasant Kunj Turf</td><td>Vasant Kunj</td><td>Delhi</td><td><span className={`${styles.badge} ${styles.badgeGray}`}>Artificial</span></td><td>1</td><td><span className={`${styles.badge} ${styles.badgeGreen}`}>Yes</span></td><td><span className={`${styles.badge} ${styles.badgeAmber}`}>Pending</span></td><td>12</td><td><div className={styles.actions}><button className={styles.actionBtn}>Verify</button><button className={styles.actionBtn}>View</button></div></td></tr>
          </tbody>
        </table>
      </div>
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
