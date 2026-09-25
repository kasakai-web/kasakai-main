// How a booking total gets funded, as the booking sheet shows it.
//
// The backend owns the rule (`kasakai-backend/src/utils/walletFunding.js`); this
// is a read-only mirror so the breakdown moves as the customer adds and removes
// guests, without a round trip per tap. It must stay in step on three things:
//
//   • a seat is paid for from the WALLET, so a short balance is a recharge to do
//     first and never a card payment for the seat itself;
//   • the amount asked for always covers the whole shortfall;
//   • a shortfall below ₹10 cannot be collected as a recharge, so the ask is
//     raised to the floor rather than rounded away.
//
// Nothing here is trusted. The server re-derives the funding when the booking is
// attempted, and its numbers are the ones actually debited — these exist so the
// price beside the button matches the price on it.

/** Razorpay/`createOrder` will not take a recharge under ₹10. */
export const MIN_TOPUP_PAISE = 1000;

/** What `createOrder` accepts at the top end. */
export const MAX_TOPUP_PAISE = 10_000_000;

/** The round numbers offered above the amount this booking actually needs. */
const TOPUP_LADDER_PAISE = [20000, 50000, 100000, 200000];

export type FundingMode = "free" | "wallet" | "topup";

export type Funding = {
  totalPaise: number;
  /** What the wallet pays once it can — the whole total, or nothing. */
  walletPaise: number;
  shortfallPaise: number;
  /** What the player has to add: the shortfall, raised to the ₹10 floor. */
  topUpPaise: number;
  mode: FundingMode;
};

export function fundingFor(totalPaise: number, availablePaise: number): Funding {
  const total = Math.max(0, Math.round(Number(totalPaise) || 0));
  // NOT floored at zero. A wallet can be in debt — a cancellation fee on a
  // pass-covered seat is debited against a refund that does not exist — and the
  // top-up has to clear that before it can pay for a seat, or the player adds
  // the fee, is refused for the same reason, and is asked for the same amount
  // again. Mirrors the server (utils/walletFunding.js) exactly.
  const available = Math.round(Number(availablePaise) || 0);

  if (total === 0) {
    return { totalPaise: 0, walletPaise: 0, shortfallPaise: 0, topUpPaise: 0, mode: "free" };
  }

  const shortfall = Math.max(0, total - available);
  if (shortfall === 0) {
    return { totalPaise: total, walletPaise: total, shortfallPaise: 0, topUpPaise: 0, mode: "wallet" };
  }

  return {
    totalPaise: total,
    walletPaise: total,
    shortfallPaise: shortfall,
    topUpPaise: Math.max(shortfall, MIN_TOPUP_PAISE),
    mode: "topup",
  };
}

const rupees = (paise: number) => Math.round(paise / 100);

/** ₹ with Indian digit grouping, for the amounts in the breakdown. */
export const formatRupees = (paise: number) =>
  `₹${rupees(paise).toLocaleString("en-IN")}`;

/**
 * The amounts the top-up sheet offers: exactly what is needed, then the round
 * numbers above it. Never an amount below what is needed — an option that cannot
 * complete the booking in front of the player is not an option.
 */
export function topUpSuggestions(topUpPaise: number): number[] {
  const need = Math.max(MIN_TOPUP_PAISE, Math.round(Number(topUpPaise) || 0));
  const out = [need];
  for (const rung of TOPUP_LADDER_PAISE) {
    if (rung > need && out.length < 4) out.push(rung);
  }
  return out;
}

/** Clamp a typed amount to something the gateway takes and the booking can use. */
export function normaliseTopUp(
  requestedPaise: number,
  needPaise: number = MIN_TOPUP_PAISE,
): { ok: boolean; amountPaise: number; error: string | null } {
  const amount = Math.round(Number(requestedPaise) || 0);
  const need = Math.max(MIN_TOPUP_PAISE, Math.round(Number(needPaise) || 0));

  if (!Number.isInteger(amount) || amount <= 0) {
    return { ok: false, amountPaise: 0, error: "Enter an amount to add." };
  }
  if (amount < need) {
    return { ok: false, amountPaise: amount, error: `Add at least ${formatRupees(need)} to book this game.` };
  }
  if (amount > MAX_TOPUP_PAISE) {
    return { ok: false, amountPaise: amount, error: "Maximum recharge is ₹1,00,000." };
  }
  return { ok: true, amountPaise: amount, error: null };
}

export type FundingView = Funding & {
  availablePaise: number;
  minTopUpPaise: number;
  maxTopUpPaise: number;
  suggestions: number[];
  /** The label on the one button that starts the booking. */
  actionLabel: string;
  /** True when money has to be added before this booking can happen. */
  needsTopUp: boolean;
};

/**
 * The funding plus the words for it. The action label always names what the
 * button will actually do — add the difference, spend the wallet, or neither.
 */
export function describeFunding(totalPaise: number, availablePaise: number): FundingView {
  const funding = fundingFor(totalPaise, availablePaise);

  const actionLabel =
    funding.mode === "free"
      ? "Book now — free"
      : funding.mode === "wallet"
        ? `Book now using wallet • ${formatRupees(funding.totalPaise)}`
        : `Add ${formatRupees(funding.topUpPaise)} to wallet & book`;

  return {
    ...funding,
    availablePaise: Math.round(Number(availablePaise) || 0),
    minTopUpPaise: MIN_TOPUP_PAISE,
    maxTopUpPaise: MAX_TOPUP_PAISE,
    suggestions: funding.mode === "topup" ? topUpSuggestions(funding.topUpPaise) : [],
    actionLabel,
    needsTopUp: funding.mode === "topup",
  };
}

/**
 * Said before the recharge starts, never after. A top-up takes a minute and the
 * last spot does not wait — but the money is wallet credit the player keeps
 * whatever happens, which is the half that makes this bearable to read.
 */
export const SPOT_NOT_HELD_NOTE =
  "Spots aren't held while you add money. If the game fills up before your booking goes through, the amount stays in your wallet and you can join the waitlist.";

/** Why a funded wallet is worth keeping funded. */
export const KEEP_WALLET_FUNDED_NOTE =
  "Keep your wallet topped up to book in one tap next time.";
