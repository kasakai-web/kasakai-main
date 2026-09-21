// Booking with a wallet that cannot cover it, from the client's side.
//
// The backend charges a seat to the WALLET and nothing else. A booking request
// it cannot afford answers 402 WALLET_TOPUP_REQUIRED and says what to add; the
// player recharges their wallet — an ordinary top-up, recharge offers and all —
// and the SAME request goes again, re-running every check before the money is
// spent:
//
//     POST /games/:id/register          → 402 + what to add
//     [top-up: order → gateway → verify → wallet credited]
//     POST /games/:id/register          → 200, seated  (or 400 NO_CAPACITY)
//
// The second POST is the first POST. That is what makes "re-check availability
// once the money has landed" true by construction, and it is why losing the race
// is survivable: the money is in the player's wallet either way, so the worst
// case is a waitlist place and a balance they can spend on the next game — not a
// card payment for a seat that no longer exists.
//
// `postWithTopUp` is that whole loop behind one call. Every booking action in the
// app goes through it, so adding a guest, claiming a waitlist spot and accepting
// an invite all behave the same way without knowing any of this.

import { buildApiUrl, getSession } from "@/utils/api";
import type { FundingView } from "@/utils/walletFunding";

// Razorpay's checkout.js, loaded on demand rather than on every page.
declare global {
  interface Window {
    Razorpay: new (options: RazorpayCheckoutOptions) => RazorpayCheckoutInstance;
  }
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill?: { name?: string; contact?: string; email?: string };
  theme: { color: string };
  modal: { ondismiss: () => void; escape?: boolean };
  handler: (response: RazorpayCheckoutResponse) => void;
}

interface RazorpayCheckoutResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutInstance {
  open: () => void;
  close?: () => void;
  on?: (event: string, handler: (payload: unknown) => void) => void;
}

const CHECKOUT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<boolean> | null = null;

/** Load checkout.js once per page, and remember the result. */
export function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${CHECKOUT_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(!!window.Razorpay));
      existing.addEventListener("error", () => resolve(false));
      // Already finished loading before we attached the listeners.
      if (window.Razorpay) resolve(true);
      return;
    }
    const tag = document.createElement("script");
    tag.src = CHECKOUT_SRC;
    tag.async = true;
    tag.onload = () => resolve(!!window.Razorpay);
    tag.onerror = () => {
      scriptPromise = null; // let a later attempt retry
      resolve(false);
    };
    document.body.appendChild(tag);
  });
  return scriptPromise;
}

/** What the server sends with a 402 WALLET_TOPUP_REQUIRED. */
export type TopUpNeed = FundingView & {
  /** The server's own wording for why money is needed. */
  message?: string;
};

export type TopUpOutcome = {
  /** True when money actually landed in the wallet. */
  credited: boolean;
  /** What was charged, and what the offer added on top. */
  amountPaise?: number;
  bonusPaise?: number;
  /** New spendable balance, when the server told us. */
  availablePaise?: number;
  /** Set when the recharge failed rather than being called off. */
  error?: string;
};

/**
 * Put the top-up sheet in front of the player and resolve once it closes.
 * Supplied by whichever screen is booking — see `hooks/useWalletTopUp.ts`.
 */
export type RequestTopUp = (need: TopUpNeed) => Promise<TopUpOutcome>;

export type TopUpPhase =
  | "topping-up" // the sheet is open; we are waiting on a human
  | "booking"    // money is in — completing the booking
  | "done";

export type PostResult<T = Record<string, unknown>> = {
  res: Response | null;
  data: T & { success?: boolean; code?: string; message?: string; funding?: FundingView };
  /** True when the player closed the top-up sheet without recharging. */
  cancelled?: boolean;
  /** True when money was added to the wallet during this call. */
  toppedUp?: boolean;
  /** What the recharge credited, for the "…and your ₹180 is in your wallet" line. */
  toppedUpPaise?: number;
};

/** Create a wallet recharge order, pay it, and confirm it. Used by the sheet. */
export async function payTopUp(
  amountPaise: number,
  prefill?: { name?: string; contact?: string; email?: string },
): Promise<TopUpOutcome> {
  const { token } = getSession();
  if (!token) return { credited: false, error: "Please sign in again." };

  const ready = await loadRazorpay();
  if (!ready) {
    return { credited: false, error: "Could not open the payment window. Check your connection and try again." };
  }

  let order: { orderId: string; amount: number; currency: string; keyId: string };
  try {
    const res = await fetch(buildApiUrl("/players/me/wallet/orders"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amountPaise }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      return { credited: false, error: data?.message || "Could not start the recharge. Please try again." };
    }
    order = data.data;
  } catch {
    return { credited: false, error: "Could not reach the payment service. Please try again." };
  }

  const payment = await new Promise<RazorpayCheckoutResponse | null>((resolve) => {
    let settled = false;
    const finish = (value: RazorpayCheckoutResponse | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const rzp = new window.Razorpay({
      key: order.keyId,
      amount: order.amount, // authoritative — the server created the order
      currency: order.currency || "INR",
      name: "Kasa Kai",
      description: "Wallet recharge",
      order_id: order.orderId,
      prefill,
      theme: { color: "#c8ff3e" },
      modal: { ondismiss: () => finish(null) },
      handler: (response) => finish(response),
    });

    // A failed card is not the end of the recharge — the customer can try
    // another method in the same sheet against the same order. Only a dismiss
    // ends it, which is why nothing is resolved here.
    rzp.on?.("payment.failed", () => {});

    rzp.open();
  });

  // Closed without paying. Nothing was earmarked and nothing is owed — a wallet
  // recharge that did not happen leaves no trace to clean up.
  if (!payment) return { credited: false };

  try {
    const res = await fetch(buildApiUrl("/players/me/wallet/verify"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!data?.success) {
      // The webhook credits it either way; what we cannot do is claim the money
      // is spendable right now, because the booking that follows would fail.
      return {
        credited: false,
        error: data?.message || "We haven't confirmed that payment yet. Your wallet will update shortly — don't pay again.",
      };
    }
    const wallet = data.data?.wallet;
    return {
      credited: true,
      amountPaise,
      bonusPaise: Number(data.data?.bonusPaise) || 0,
      availablePaise: wallet ? (wallet.balancePaise || 0) - (wallet.lockedPaise || 0) : undefined,
    };
  } catch {
    return {
      credited: false,
      error: "We couldn't confirm that payment. Your wallet will update shortly — don't pay again.",
    };
  }
}

/**
 * POST a booking action, topping the wallet up first if it cannot cover it.
 *
 * Returns the FINAL response — the one from the retry when a recharge happened,
 * the original otherwise — so callers handle success and failure in one place
 * and mostly do not have to know a recharge occurred at all.
 */
export async function postWithTopUp<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  opts: {
    requestTopUp?: RequestTopUp;
    onPhase?: (phase: TopUpPhase) => void;
  } = {},
): Promise<PostResult<T>> {
  const { token } = getSession();
  const { onPhase, requestTopUp } = opts;

  const send = async (payload: Record<string, unknown>) => {
    const res = await fetch(buildApiUrl(path), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    return { res, data };
  };

  const first = await send(body);

  // The wallet covered it, or the request was refused for some other reason.
  if (first.res.status !== 402 || first.data?.code !== "WALLET_TOPUP_REQUIRED") {
    return { res: first.res, data: first.data };
  }

  // No sheet to show (a screen that has not wired one up) — hand the 402 back
  // and let it render its own "recharge your wallet" message.
  if (!requestTopUp) return { res: first.res, data: first.data };

  const need: TopUpNeed = { ...(first.data.funding as FundingView), message: first.data.message };

  onPhase?.("topping-up");
  const outcome = await requestTopUp(need);

  if (!outcome.credited) {
    onPhase?.("done");
    return {
      res: null,
      cancelled: !outcome.error,
      data: {
        success: false,
        code: outcome.error ? "TOPUP_FAILED" : "TOPUP_CANCELLED",
        message: outcome.error || "Recharge cancelled.",
      } as PostResult<T>["data"],
    };
  }

  // The money is in the wallet. Whatever happens to the booking from here, it
  // stays there — so this retry is free to be refused.
  onPhase?.("booking");
  const retry = await send(body);
  onPhase?.("done");

  return {
    res: retry.res,
    data: retry.data,
    toppedUp: true,
    toppedUpPaise: outcome.amountPaise,
  };
}

/** True when the request failed because the spots went, not for some other reason. */
export function isCapacityRefusal(data: { code?: string; message?: string }): boolean {
  return (
    data?.code === "NO_CAPACITY" ||
    data?.code === "LINK_FULL" ||
    data?.code === "PAYMENT_NO_CAPACITY" ||
    /last spot was just taken|no longer available|spots? remaining/i.test(data?.message || "")
  );
}

/**
 * The one place a booking response becomes words.
 *
 * Money is only ever in the player's own wallet here, so none of these need to
 * apologise for a payment — they need to say what happened to the SEAT, and
 * where the money is if they had just added some.
 */
export function bookingErrorMessage(
  data: { code?: string; message?: string },
  opts: { toppedUpPaise?: number } = {},
): string {
  const inWallet = opts.toppedUpPaise
    ? ` ${formatPaise(opts.toppedUpPaise)} is in your wallet — use it on this game's waitlist or any other game.`
    : "";

  switch (data?.code) {
    case "TOPUP_CANCELLED":
      return "Recharge cancelled — nothing was charged and your booking wasn't made.";
    case "TOPUP_FAILED":
      return data?.message || "That recharge didn't go through. Nothing was booked.";
    case "WALLET_TOPUP_REQUIRED":
      return data?.message || "Add money to your wallet to book this spot.";
    case "NO_CAPACITY":
    case "LINK_FULL":
      return `Those spots have just gone.${inWallet}`;
    case "REGISTRATION_LOCKED":
      return `${data?.message || "Registration for this game is closed."}${inWallet}`;
    default:
      if (isCapacityRefusal(data)) return `${data?.message || "Those spots have just gone."}${inWallet}`;
      return `${data?.message || "Something went wrong. Please try again."}${inWallet}`;
  }
}

const formatPaise = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
