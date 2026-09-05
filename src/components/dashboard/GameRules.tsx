
// What this game's cancellation policy costs, as the ORGANISER set it for this
// game — not a house rule. Every number comes from the server's `backoutInfo`
// (backend utils/backoutPolicy.js, the one place the rules live); nothing here is
// re-derived, so the rules tab, the confirm dialogs and the actual charge cannot
// quote different prices.
export type BackoutTier = { withinMins: number; feeInPaise: number };
export type BackoutInfo = {
  active?: boolean;
  feePerSeatPaise?: number;
  inFeeWindow?: boolean;
  freeUntil?: string | null;
  graceMins?: number;
  waiveOnCancel?: boolean;
  tiers?: BackoutTier[];
};

const GAME_RULES: string[] = [
  "Punctuality is mandatory. Report by the listed reporting time. Late arrivals may not be allowed to join.",
  "Pay before you play. Ensure your wallet is recharged before the game. No balance means no entry.",
  "Late back outs disrupt the game. Plan ahead and respect the community's time.",
  "No shows will be penalized. Signing up and not showing up without backing out will result in a penalty deducted from your wallet.",
  "Respect the agreed team/position distribution. Discuss any changes with your teammates.",
  "Keep it controlled. Dangerous tackles, excessive physicality, and verbal abuse will not be tolerated and may result in removal from future games.",
  "Respect the organiser. Their decisions on the day are final. Raise disputes after the game, not during.",
  "Guests are your responsibility. Misconduct by your +1 reflects on you.",
  "Acknowledge the pre-game message. Confirm you are on your way when you receive the morning message.",
  "Rate your experience. Honest feedback after each game helps improve the community for everyone.",
  "If you can't make it and transferring your slot to someone else, inform the organiser.",
];

const rupees = (paise: number) => `₹${Math.round(paise / 100)}`;

// "2 hours", "45 minutes", "1 day" — a window is set in minutes but almost never
// read in them, and "within 1440 minutes of kick-off" is not a sentence anybody
// can act on.
function formatMins(mins: number): string {
  if (mins % 1440 === 0 && mins >= 1440) {
    const d = mins / 1440;
    return `${d} day${d > 1 ? "s" : ""}`;
  }
  if (mins % 60 === 0 && mins >= 60) {
    const h = mins / 60;
    return `${h} hour${h > 1 ? "s" : ""}`;
  }
  return `${mins} minute${mins > 1 ? "s" : ""}`;
}

const formatFreeUntil = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    weekday: "short", day: "numeric", month: "short",
    hour: "numeric", minute: "2-digit", hour12: true,
  });

function CancellationPolicy({ info }: { info: BackoutInfo }) {
  const tiers = info?.tiers || [];
  const graceMins = info?.graceMins || 0;

  // No scale means this game never charges for leaving. Said plainly rather than
  // omitted — "there is no fee here" is exactly what a player wants confirmed
  // before they book, and silence reads as "nobody has told me".
  const lines: { label: string; value: string; free?: boolean }[] = [];
  if (!tiers.length) {
    lines.push({ label: "Any time before kick-off", value: "Free — full refund", free: true });
  } else {
    if (info.freeUntil) {
      lines.push({ label: `Until ${formatFreeUntil(info.freeUntil)}`, value: "Free — full refund", free: true });
    }
    // The engine sorts narrowest-window-first because that is the order it resolves
    // them in; a player reads the same scale forwards in time, cheapest first.
    [...tiers].reverse().forEach((t) => {
      lines.push({
        label: `Within ${formatMins(t.withinMins)} of kick-off`,
        value: `${rupees(t.feeInPaise)} per slot`,
      });
    });
  }

  const notes: string[] = [];
  if (tiers.length) {
    notes.push(
      "The fee is charged per slot you give up — cancelling with two guests is charged three times — and never exceeds what you paid.",
    );
    notes.push(
      "It applies however you give up a slot: cancelling your registration, removing a guest, or unticking “I'm attending this game”.",
    );
    if (graceMins > 0) {
      notes.push(`Changed your mind straight away? Free within ${formatMins(graceMins)} of joining (guests: of being added).`);
    }
    if (info.waiveOnCancel) {
      notes.push("No fee at all if the game is cancelled, or if the organiser moves the kick-off time or switches the format after you joined.");
    }
  }

  return (
    <div className="pd-policy-card">
      <div className="pd-policy-head">
        <span className="pd-policy-title">Cancellation policy</span>
        <span className="pd-policy-sub">Set by the organiser for this game</span>
      </div>
      <div className="pd-policy-rows">
        {lines.map((l, i) => (
          <div key={i} className="pd-policy-row">
            <span className="pd-policy-when">{l.label}</span>
            <span className={`pd-policy-cost${l.free ? " free" : ""}`}>{l.value}</span>
          </div>
        ))}
      </div>
      {notes.length > 0 && (
        <ul className="pd-policy-notes">
          {notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      )}
    </div>
  );
}

export function GameRules({ backoutInfo }: { backoutInfo?: BackoutInfo | null }) {
  return (
    <>
      {/* Above the house rules: this is the only part of the tab that is specific
          to THIS game, and the only part that costs money. */}
      {backoutInfo && <CancellationPolicy info={backoutInfo} />}
      <ol className="pd-rules-list">
        {GAME_RULES.map((rule, i) => (
          <li key={i} className="pd-rules-item">
            <span className="pd-rules-num">{i + 1}.</span>
            <span className="pd-rules-text">{rule}</span>
          </li>
        ))}
      </ol>
    </>
  );
}
