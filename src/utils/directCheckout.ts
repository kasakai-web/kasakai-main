// Finishing the direct-payment checkouts that are still out there.
//
// A previous release collected the wallet's shortfall at the gateway as part of
// the booking itself. It no longer does — a short wallet is topped up first and
// the seat is charged to the wallet (`utils/walletTopup.ts`, and
// `kasakai-backend/src/utils/walletFunding.js` for why) — but a player can still
// have an attempt that was paid for and never seated: a tab closed mid-payment,
// a phone that died, a webhook that landed after the page was gone.
//
// So nothing here STARTS a payment. What is left is: find such an attempt, ask
// the endpoint to seat it (it will refuse and refund if it cannot), and turn the
// codes that mean "we have your money" into words that never invite a second
// payment. It all goes when the last attempt is settled.

import { buildApiUrl, getSession } from "@/utils/api";

/** An attempt the player paid for and can still be seated on. */
export type Checkout = {
  attemptId: string;
  orderId: string;
  keyId: string;
  currency?: string;
  description?: string;
  /** What the gateway will charge — the shortfall, not the total. */
  amountPaise: number;
  totalPaise: number;
  walletPaise: number;
  directPaise: number;
  expiresAt: string;
  endpoint: string;
  method?: string;
  payload?: Record<string, unknown>;
};

export type ResumeResult<T = Record<string, unknown>> = {
  res: Response | null;
  data: T & { success?: boolean; code?: string; message?: string };
};

/** Anything the player left half-paid, so a reloaded page can pick it back up. */
export async function fetchResumableCheckout(gameId?: string): Promise<Checkout | null> {
  const { token } = getSession();
  if (!token) return null;
  try {
    const url = buildApiUrl(`/api/v1/players/me/checkouts${gameId ? `?game=${gameId}` : ""}`);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    return data?.data?.resumable || null;
  } catch {
    return null;
  }
}

/**
 * Finish a checkout the page found already paid for — a tab that was closed
 * mid-payment, a phone that died. The money is already ours; this just asks the
 * endpoint to seat them, and it will refuse (and refund) if it cannot.
 */
export async function resumeCheckout<T = Record<string, unknown>>(
  checkout: Checkout,
): Promise<ResumeResult<T>> {
  const { token } = getSession();
  const res = await fetch(buildApiUrl(checkout.endpoint), {
    method: checkout.method || "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...(checkout.payload || {}), paymentAttemptId: checkout.attemptId }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

/**
 * The one place a booking response becomes words.
 *
 * The failure codes matter more than usual here, because three of them mean
 * "we have your money" and must never be shown as a plain error: the customer
 * needs to be told the refund is on its way, or that it is still being worked
 * on, rather than being invited to pay again.
 */
export function checkoutErrorMessage(data: { code?: string; message?: string; reason?: string }): string {
  switch (data?.code) {
    case "PAYMENT_NO_CAPACITY":
      return "Payment received, but the requested spots are no longer available. The full amount is back in your wallet.";
    case "PAYMENT_REFUNDED":
      // Refused for something other than capacity — the cutoff, an eligibility
      // change. The server keeps the endpoint's own reason in `reason`, which is
      // the part that actually tells them what to do differently.
      return data?.reason
        ? `Payment received, but your booking couldn't be completed: ${data.reason} The full amount is back in your wallet.`
        : "Payment received, but your booking couldn't be completed. The full amount is back in your wallet.";
    case "RACE_REFUND_FAILED":
      return "Payment received, but the spots are gone. Your refund to your wallet is being processed and our team has been alerted.";
    case "PAYMENT_EXPIRED":
      return "That checkout expired before it finished. Your payment is in your wallet — please book again.";
    case "PAYMENT_STALE":
      return "Your selection changed after payment started. Your payment is in your wallet — please book again.";
    case "PAYMENT_UNVERIFIED":
    case "PAYMENT_PENDING":
      return "We haven't confirmed that payment yet. Don't pay again — we'll update your booking as soon as it clears.";
    case "PAYMENT_IN_PROGRESS":
      return "This booking is already being completed. Give it a moment.";
    case "ALREADY_BOOKED":
      return "That payment has already booked your spot.";
    case "PAYMENT_SETTLE_FAILED":
      return "We couldn't complete the booking. Your payment is safe and support has been alerted.";
    default:
      return data?.message || "Something went wrong. Please try again.";
  }
}

/** True when the customer's money is involved and a retry would be wrong. */
export function isPaidButUnseated(code?: string): boolean {
  return (
    code === "PAYMENT_NO_CAPACITY" ||
    code === "PAYMENT_REFUNDED" ||
    code === "RACE_REFUND_FAILED" ||
    code === "PAYMENT_EXPIRED" ||
    code === "PAYMENT_STALE" ||
    code === "PAYMENT_SETTLE_FAILED"
  );
}
