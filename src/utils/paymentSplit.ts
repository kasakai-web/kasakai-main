// How a booking total is paid for, as the booking sheet shows it.
//
// The backend owns the rule (`kasakai-backend/src/utils/paymentSplit.js`); this
// is a read-only mirror so the breakdown moves as the customer adds and removes
// guests, without a round trip per tap. It must stay in step on three things:
//
//   • wallet funds are ALWAYS applied first and can never be skipped — there is
//     no toggle here because there is no toggle there;
//   • the two legs always add up to the total;
//   • a shortfall below ₹1 cannot be collected by the gateway, so the wallet
//     leg is reduced to bring the direct leg up to the floor.
//
// Nothing here is trusted. The server re-derives the split when the checkout is
// opened, and its numbers are the ones actually charged — these exist so the
// price beside the button matches the price on it.

/** Razorpay will not create an order below ₹1. Mirrors MIN_DIRECT_PAISE. */
export const MIN_DIRECT_PAISE = 100;

export type SplitMode = "free" | "wallet" | "mixed" | "direct";

export type PaymentSplit = {
  totalPaise: number;
  walletPaise: number;
  directPaise: number;
  mode: SplitMode;
};

export function splitPayment(totalPaise: number, availablePaise: number): PaymentSplit {
  const total = Math.max(0, Math.round(Number(totalPaise) || 0));
  const available = Math.max(0, Math.round(Number(availablePaise) || 0));

  if (total === 0) {
    return { totalPaise: 0, walletPaise: 0, directPaise: 0, mode: "free" };
  }

  let wallet = Math.min(available, total);
  let direct = total - wallet;

  if (direct > 0 && direct < MIN_DIRECT_PAISE) {
    direct = MIN_DIRECT_PAISE;
    wallet = total - direct;
  }

  const mode: SplitMode = direct === 0 ? "wallet" : wallet === 0 ? "direct" : "mixed";
  return { totalPaise: total, walletPaise: wallet, directPaise: direct, mode };
}

const rupees = (paise: number) => Math.round(paise / 100);

/** ₹ with Indian digit grouping, for the amounts in the breakdown. */
export const formatRupees = (paise: number) =>
  `₹${rupees(paise).toLocaleString("en-IN")}`;

export type SplitView = PaymentSplit & {
  availablePaise: number;
  /** The label on the one button that starts the booking. */
  actionLabel: string;
  /** True when the customer has to leave for the gateway to finish. */
  needsPayment: boolean;
};

/**
 * The split plus the words for it. The action label always names the amount the
 * button will actually charge — never the total when only the shortfall is
 * being collected, and never "recharge" when nothing needs recharging.
 */
export function describeSplit(totalPaise: number, availablePaise: number): SplitView {
  const split = splitPayment(totalPaise, availablePaise);

  const actionLabel =
    split.mode === "free"
      ? "Book now — free"
      : split.mode === "wallet"
        ? `Book now using wallet • ${formatRupees(split.totalPaise)}`
        : `Pay ${formatRupees(split.directPaise)} and book`;

  return {
    ...split,
    availablePaise: Math.max(0, Math.round(Number(availablePaise) || 0)),
    actionLabel,
    needsPayment: split.directPaise > 0,
  };
}

/**
 * Said before payment starts, never after. Opening a checkout buys time, not a
 * seat: somebody else can take the last spot while the gateway sheet is open,
 * and the customer should know that before they tap rather than after.
 */
export const SPOT_NOT_HELD_NOTE =
  "Your spot is confirmed only after payment is completed and availability is checked. Spots are not held during payment.";

/** Why a funded wallet is still worth having, once it is no longer required. */
export const KEEP_WALLET_FUNDED_NOTE =
  "Keep your wallet funded to book quickly without completing payment each time.";
