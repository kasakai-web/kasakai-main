"use client";

import { useEffect, useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import { postWithTopUp, bookingErrorMessage, isCapacityRefusal } from "@/utils/walletTopup";
import { describeFunding, formatRupees, SPOT_NOT_HELD_NOTE } from "@/utils/walletFunding";
import { useWalletTopUp } from "@/hooks/useWalletTopUp";
import { useWaitlistOffer } from "@/hooks/useWaitlistOffer";
import { PreferenceDisclaimer, QuickPositionTeam } from "@/components/PlayPreferences";

type ShowToast = (type: "success" | "error", title: string, message?: string) => void;

interface InviteData {
  gameId: string;
  title: string;
  scheduledAt: string;
  format: string;
  venue: string;
  fee: number;
  payableFee?: number;      // what this player actually pays (pass-adjusted)
  passCovered?: boolean;
  passLabel?: string | null;
  walletAvailable?: number | null; // spendable wallet balance (₹); null = not logged in
  canAfford?: boolean | null;      // can this player cover payableFee now? null = unknown
  status: string;
  spotsRemaining: number;
  organiserName: string;
  requiresApproval?: boolean;               // shared link → "charged on approval"
  needsApproval?: boolean;                  // does THIS invite need the organiser's nod?
  // Does this game charge for giving up a slot near kick-off? The fact only — the
  // scale is a table and lives in the game's rules.
  backoutInfo?: { active?: boolean } | null;
  linkType?: "personal" | "shared";
  invite: {
    token: string;
    status: string;
    invitedByRole: "organiser" | "player";
    invitedByName: string | null;
    inviteeName: string | null;
    mine?: boolean | null; // true = yours · false = someone else's · null = can't tell
  } | null;                                 // null for a shared invite link
  link?: {
    enabled: boolean;
    full: boolean;
    myStatus: "seated" | "pending" | null;  // this player's current standing
  } | null;
}

interface Props {
  token: string;
  onClose: () => void;
  onConfirmed: () => void; // refresh dashboard data in the background
  onRecharge: () => void;  // navigate to the wallet page
  showToast: ShowToast;
}

/**
 * Standalone confirm-spot experience for a game invitation. Triggered by
 * a `?invite=<token>` param on the player dashboard (the /join/[token] link routes
 * here after login). Resolves the invite, lets the player confirm their spot, and
 * — once they are in — lets them invite friends (which needs organiser approval).
 */
export function InviteConfirmModal({ token, onClose, onConfirmed, onRecharge, showToast }: Props) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<InviteData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // True while the gateway sheet is open or the payment is being settled, so the
  // button says what is happening instead of just spinning.
  const [paying, setPaying] = useState(false);
  // A seat costs what a seat costs, so this screen can need a recharge too —
  // and can lose the race that follows one.
  const { requestTopUp, topUpSheet } = useWalletTopUp();
  const { offerWaitlist, waitlistPrompt } = useWaitlistOffer();
  // Local status so the UI updates immediately after an action, without a re-fetch.
  const [status, setStatus] = useState<string | null>(null);

  // Invite-friends (shown once the player is in the game)
  const [friends, setFriends] = useState<{ name: string; phone: string }[]>([]);
  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [fSending, setFSending] = useState(false);

  // Somebody arriving through an invite link used to be seated as "any position,
  // no preference" without ever being asked. They get the same say as anyone
  // registering the normal way now.
  const [position, setPosition] = useState("Any");
  const [teamPreference, setTeamPreference] = useState("No Preference");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    // Send the player's token so the backend can reflect pass coverage in payableFee.
    const { token: auth } = getSession();
    fetch(buildApiUrl(`/api/v1/games/invite/${token}`), auth ? { headers: { Authorization: `Bearer ${auth}` } } : undefined)
      .then((r) => r.json())
      .then((d) => {
        if (!active) return;
        if (!d.success) { setError(d.message || "Invitation not found or expired."); return; }
        setData(d.data);
        // For a shared link the player's standing comes from link.myStatus; for a
        // personal invite it's the invitation's own status.
        const initialStatus = d.data?.linkType === "shared"
          ? (d.data?.link?.myStatus === "seated" ? "accepted" : d.data?.link?.myStatus === "pending" ? "pending" : null)
          : (d.data?.invite?.status || null);
        setStatus(initialStatus);
      })
      .catch(() => { if (active) setError("Couldn't load this invitation."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [token]);

  const confirm = async () => {
    const { token: auth } = getSession();
    if (!auth) return;
    const isShared = data?.linkType === "shared";
    setSubmitting(true);
    try {
      const endpoint = isShared
        ? `/api/v1/games/invite-link/${token}/join`
        : `/api/v1/games/invite/${token}/confirm`;
      // Accepting an invite takes a seat, so it costs what any other seat costs
      // and is paid for the same way: from the wallet, topped up first if short.
      const { res, data: d, cancelled, toppedUpPaise } = await postWithTopUp<any>(
        endpoint,
        { position, teamPreference },
        {
          requestTopUp,
          onPhase: (phase) => setPaying(phase !== "done"),
        },
      );
      if (cancelled) {
        showToast("error", "Recharge cancelled", "Your spot isn't confirmed and nothing was charged.");
        return;
      }
      if (d.code === "TOPUP_FAILED") {
        showToast("error", "Recharge didn't go through", bookingErrorMessage(d));
        return;
      }
      if (res?.status === 402 && (d.code === "INSUFFICIENT_BALANCE" || d.code === "WALLET_TOPUP_REQUIRED")) {
        // No sheet could be shown — fall back to the wallet page.
        showToast("error", "Wallet is short", bookingErrorMessage(d));
        onRecharge();
        return;
      }
      if (res?.status === 403 && d.code === "LINK_DISABLED") {
        showToast("error", "Link turned off", "The organiser has disabled this invite link.");
        return;
      }
      if (res?.status === 409 && d.code === "LINK_FULL") {
        showToast("error", "Link full", "This invite link has reached its join limit.");
        return;
      }
      if (!res || !res.ok || !d.success) {
        // The commonest failure after a recharge is the spots going while it was
        // in flight. Their money is in their wallet, so the waitlist is an offer
        // rather than an apology.
        const moneyNote = toppedUpPaise ? `${formatRupees(toppedUpPaise)} is in your wallet.` : undefined;
        if (isCapacityRefusal(d) && data?.gameId) {
          const outcome = await offerWaitlist({
            gameId: data.gameId,
            reason: "Those spots have just gone.",
            moneyNote,
            body: { positions: position ? [position] : [], teamPreference },
          });
          if (outcome.joined) {
            showToast("success", "You're on the waitlist", `We'll tell you the moment a spot frees up.${moneyNote ? ` ${moneyNote}` : ""}`);
          } else if (outcome.error) {
            showToast("error", "Couldn't join the waitlist", outcome.error);
          }
          return;
        }
        showToast("error", "Couldn't join", bookingErrorMessage(d, { toppedUpPaise }));
        return;
      }
      const newStatus = d.data?.status || "accepted";
      setStatus(newStatus);
      if (newStatus === "accepted") {
        showToast("success", "Spot confirmed!", "You're in the game.");
        onConfirmed();
      } else if (newStatus === "pending") {
        showToast("success", "Request sent", "Awaiting organiser approval.");
      }
    } catch {
      showToast("error", "Couldn't join", "Please try again.");
    } finally {
      setSubmitting(false);
      setPaying(false);
    }
  };

  const addFriend = () => {
    const name = fName.trim();
    const phone = fPhone.replace(/\D/g, "");
    if (!name || phone.length < 10) { showToast("error", "Enter a name and a valid phone number"); return; }
    if (friends.some((f) => f.phone === phone)) { showToast("error", "That number is already in the list"); return; }
    setFriends((x) => [...x, { name, phone }]);
    setFName(""); setFPhone("");
  };

  const sendFriends = async () => {
    if (!data?.gameId || friends.length === 0) return;
    const { token: auth } = getSession();
    if (!auth) return;
    setFSending(true);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${data.gameId}/invite`), {
        method: "POST",
        headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
        body: JSON.stringify({ invitees: friends }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) { showToast("error", "Couldn't send", d.message); return; }
      if (d.whatsapp && d.whatsapp.failed > 0) {
        showToast("error", "Saved, WhatsApp failed", `${d.whatsapp.sent} sent, ${d.whatsapp.failed} not delivered.`);
      } else {
        showToast("success", "Invites sent", d.message);
      }
      setFriends([]);
    } catch {
      showToast("error", "Couldn't send invites", "Please try again.");
    } finally {
      setFSending(false);
    }
  };

  const isShared = data?.linkType === "shared";
  // Whether joining here needs organiser approval (→ charged only on approval).
  // The SERVER decides this — it used to be re-derived here from invitedByRole
  // alone, which stopped being true once an openly joinable public game began
  // seating a player-invited person directly. Two copies of a rule this one
  // drifts, and the half that lies is the one the invitee reads.
  const needsApproval = !!data?.needsApproval;

  const invitedBy = isShared
    ? `${data?.organiserName || "The organiser"} invited you to join`
    : data?.invite?.invitedByRole === "player"
      ? `${data?.invite?.invitedByName || "A player"} invited you`
      : `${data?.organiserName || "The organiser"} invited you`;

  const payable = data ? (typeof data.payableFee === "number" ? data.payableFee : data.fee) : 0;
  const feeLabel = `₹${payable}`;

  // How this seat gets paid for. A short wallet used to be a dead end here — the
  // whole panel became a "Recharge wallet" button and the invite could not be
  // accepted at all. The recharge now happens inside this action, the same as
  // any other booking.
  const walletRupees = typeof data?.walletAvailable === "number" ? data.walletAvailable : 0;
  const funding = describeFunding(payable * 100, walletRupees * 100);
  const topUpNow = funding.topUpPaise / 100;

  const ctaLabel = !data
    ? "Confirm"
    : needsApproval
      ? "Request to join"
      : payable <= 0
        ? (isShared ? "Join game" : "Confirm spot")
        : funding.mode === "wallet"
          ? (isShared ? `Join using wallet • ${feeLabel}` : `Confirm using wallet • ${feeLabel}`)
          : `Add ₹${topUpNow} & ${isShared ? "join" : "confirm"}`;

  const dateText = data
    ? new Date(data.scheduledAt).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata", weekday: "short", day: "2-digit", month: "short",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <>
    {/* Both sit above this modal: a recharge to do first, and the question that
        follows one that lost the race. */}
    {topUpSheet}
    {waitlistPrompt}
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 460, background: "#111214", border: "1px solid #2a2a2a", borderRadius: 16, padding: 22, color: "#fff", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>⚽ Game invitation</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>

        {loading ? (
          <div style={{ padding: 24, textAlign: "center", color: "#888", fontSize: 13 }}>Loading invitation…</div>
        ) : error ? (
          <div style={{ padding: 14, color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>
        ) : data && !isShared && data.invite?.mine === false ? (
          // The link was forwarded to someone it wasn't sent to — never show the
          // game details or a way to register. The backend refuses confirm too.
          <div style={{ padding: "20px 8px", textAlign: "center" }}>
            <div style={{ fontSize: 34, marginBottom: 10 }}>🔒</div>
            <div style={{ fontSize: 15.5, fontWeight: 800, marginBottom: 8 }}>This invitation isn&apos;t for you</div>
            <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.6, marginBottom: 18 }}>
              This invite was sent to a different number. Personal invite links can&apos;t be shared —
              ask the organiser to send an invite to your registered number if you&apos;d like to play.
            </div>
            <button
              onClick={onClose}
              style={{ width: "100%", padding: 12, borderRadius: 10, border: "1px solid #2a2a2a", background: "#1a1a1a", color: "#eee", fontWeight: 700, fontSize: 13.5, cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        ) : data ? (
          <>
            <div style={{ fontSize: 12.5, color: "#c8ff3e", fontWeight: 700, marginBottom: 10 }}>{invitedBy}</div>

            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid #242424", borderRadius: 12, padding: 14, marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 6 }}>{data.title || "Football game"}</div>
              <div style={{ fontSize: 13, color: "#bbb", lineHeight: 1.7 }}>
                <div>📍 {data.venue}</div>
                <div>📅 {dateText}</div>
                <div>🏟️ {data.format} · 💰 {data.passCovered ? `Free — covered by ${data.passLabel || "your"} pass` : `${feeLabel} per player`}</div>
              </div>
            </div>

            {status === "accepted" ? (
              <div style={{ padding: 12, borderRadius: 10, background: "rgba(200,255,62,0.1)", border: "1px solid rgba(200,255,62,0.25)", color: "#c8ff3e", fontWeight: 700, fontSize: 13.5, textAlign: "center", marginBottom: 16 }}>
                ✅ You're in! See you on the pitch.
              </div>
            ) : status === "pending" ? (
              <div style={{ padding: 12, borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.3)", color: "#f59e0b", fontWeight: 700, fontSize: 13.5, textAlign: "center", marginBottom: 4 }}>
                ⏳ Request sent — awaiting organiser approval.
              </div>
            ) : status === "rejected" ? (
              <div style={{ padding: 12, borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontWeight: 700, fontSize: 13.5, textAlign: "center", marginBottom: 4 }}>
                This invitation was declined.
              </div>
            ) : isShared && data.link?.enabled === false ? (
              <div style={{ padding: 12, borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontWeight: 700, fontSize: 13.5, textAlign: "center", marginBottom: 4 }}>
                This invite link has been turned off by the organiser.
              </div>
            ) : isShared && data.link?.full ? (
              <div style={{ padding: 12, borderRadius: 10, background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#f87171", fontWeight: 700, fontSize: 13.5, textAlign: "center", marginBottom: 4 }}>
                This invite link has reached its join limit.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid #242424" }}>
                  <QuickPositionTeam
                    position={position}
                    onPosition={setPosition}
                    teamPreference={teamPreference}
                    onTeamPreference={setTeamPreference}
                  />
                  <PreferenceDisclaimer compact />
                </div>

                {needsApproval && (
                  <div style={{ fontSize: 11.5, color: "#888", marginBottom: 8, textAlign: "center" }}>
                    Your spot needs organiser approval. You&apos;ll pay {feeLabel} only once approved — from your
                    wallet, or by card if it doesn&apos;t cover it.
                  </div>
                )}

                {/* The funding breakdown, for the same reason the booking sheet
                    carries one: this is the other place a player commits money,
                    and the amount beside the button has to be the amount on it. */}
                {!needsApproval && payable > 0 && (
                  <div style={{
                    marginBottom: 10, padding: "10px 12px", borderRadius: 10,
                    border: "1px solid rgba(200,255,62,0.15)", background: "rgba(200,255,62,0.05)",
                    fontSize: 12, lineHeight: 1.8, color: "#9a9a9a",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Total</span><span style={{ color: "#cfcfcf", fontWeight: 700 }}>{feeLabel}</span>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Wallet balance</span>
                      <span style={{ color: "#c8ff3e", fontWeight: 700 }}>₹{walletRupees}</span>
                    </div>
                    <div style={{
                      display: "flex", justifyContent: "space-between", marginTop: 4, paddingTop: 6,
                      borderTop: "1px solid rgba(200,255,62,0.14)", color: "#e6e6e6", fontWeight: 700,
                    }}>
                      <span>{topUpNow > 0 ? "Add to wallet" : "Paid from wallet"}</span>
                      <span style={{ color: "#c8ff3e" }}>₹{topUpNow > 0 ? topUpNow : payable}</span>
                    </div>
                  </div>
                )}

                {/* Said before the recharge starts, never after. */}
                {!needsApproval && funding.needsTopUp && (
                  <div style={{
                    marginBottom: 10, padding: "9px 12px", borderRadius: 9,
                    border: "1px solid rgba(245,158,11,0.22)", background: "rgba(245,158,11,0.06)",
                    fontSize: 11.5, lineHeight: 1.55, color: "#d0a55a", textAlign: "center",
                  }}>
                    {SPOT_NOT_HELD_NOTE}
                  </div>
                )}
                {/* Same notice the booking modal carries, for the same reason: an
                    invited player commits money here and nowhere else, so the terms
                    have to be in front of them at this button, not only on the card
                    they never went through. */}
                {data.backoutInfo?.active && (
                  <div style={{
                    marginBottom: 10, padding: "9px 12px", borderRadius: 9,
                    border: "1px solid rgba(255,255,255,0.09)", background: "rgba(255,255,255,0.035)",
                    fontSize: 11.5, fontWeight: 600, lineHeight: 1.5, color: "#9a9a9a", textAlign: "center",
                  }}>
                    Cancellation charges apply to this game. See{" "}
                    <strong style={{ color: "#c8ff3e", fontWeight: 700 }}>Game Rules</strong> in
                    View More Details before you confirm.
                  </div>
                )}
                <button
                  disabled={submitting}
                  onClick={confirm}
                  style={{ width: "100%", padding: 13, borderRadius: 10, border: "none", fontWeight: 800, fontSize: 14, background: "#c8ff3e", color: "#000", cursor: submitting ? "not-allowed" : "pointer", opacity: submitting ? 0.7 : 1, marginBottom: 6 }}
                >
                  {paying
                    ? "Waiting for payment…"
                    : submitting
                      ? "Please wait…"
                      : status === "approved_unpaid"
                        ? (topUpNow > 0 ? `Add ₹${topUpNow} & lock spot` : `Confirm using wallet • ${feeLabel}`)
                        : ctaLabel}
                </button>
                <div style={{ fontSize: 11, color: "#666", textAlign: "center" }}>Slots are allotted in booking order.</div>
                {/* Secondary. The recharge happens inside the button above; this
                    is for topping up more than this seat needs. */}
                {topUpNow > 0 && (
                  <button
                    type="button"
                    onClick={onRecharge}
                    style={{ width: "100%", marginTop: 8, padding: 0, background: "none", border: "none", color: "#c8ff3e", fontSize: 11.5, fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}
                  >
                    Add more to my wallet
                  </button>
                )}
              </>
            )}

            {/* Invite friends — available once the player is in the game */}
            {status === "accepted" && (
              <div style={{ marginTop: 18, borderTop: "1px solid #242424", paddingTop: 16 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#c8ff3e", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 4 }}>Invite friends</div>
                <div style={{ fontSize: 11.5, color: "#888", marginBottom: 10 }}>
                  They&apos;ll get a WhatsApp link.{" "}
                  {needsApproval ? "The organiser approves each request." : "They can join straight away, while spots last."}
                </div>

                <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                  <input
                    value={fName}
                    onChange={(e) => setFName(e.target.value)}
                    placeholder="Name"
                    style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 9, border: "1px solid #2a2a2a", background: "#141414", color: "#fff", fontSize: 13 }}
                  />
                  <input
                    value={fPhone}
                    onChange={(e) => setFPhone(e.target.value)}
                    placeholder="Phone"
                    inputMode="tel"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFriend(); } }}
                    style={{ width: 120, padding: "10px 12px", borderRadius: 9, border: "1px solid #2a2a2a", background: "#141414", color: "#fff", fontSize: 13 }}
                  />
                  <button type="button" onClick={addFriend} style={{ flexShrink: 0, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(200,255,62,0.3)", background: "rgba(200,255,62,0.08)", color: "#c8ff3e", fontWeight: 700, cursor: "pointer" }}>Add</button>
                </div>

                {friends.length > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                    {friends.map((f, i) => (
                      <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#eee", background: "#1c1c1c", border: "1px solid #333", borderRadius: 20, padding: "4px 6px 4px 11px" }}>
                        {f.name} · {f.phone}
                        <button onClick={() => setFriends((x) => x.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}

                <button
                  disabled={friends.length === 0 || fSending}
                  onClick={sendFriends}
                  style={{ width: "100%", padding: 11, borderRadius: 9, border: "none", fontWeight: 800,
                    background: friends.length === 0 ? "#2a2a2a" : "#c8ff3e",
                    color: friends.length === 0 ? "#888" : "#000",
                    cursor: friends.length === 0 || fSending ? "not-allowed" : "pointer", opacity: fSending ? 0.7 : 1 }}
                >
                  {fSending ? "Sending…" : friends.length === 0 ? "Add a friend to invite" : `Send ${friends.length} invite${friends.length !== 1 ? "s" : ""}`}
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
    </>
  );
}
