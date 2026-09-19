// Paying for a seat the wallet cannot cover, from the client's side.
//
// The backend has no separate "confirm payment" endpoint. A booking request
// that needs money answers 402 PAYMENT_REQUIRED and carries a checkout with it;
// the client pays, then re-POSTs THE SAME REQUEST with the payment attached, and
// the endpoint re-runs every check it ran the first time before spending
// anything. So completing a payment is not a second flow — it is the first one,
// again:
//
//     POST /games/:id/register                    → 402 + checkout
//     [gateway]
//     POST /games/:id/register  + payment fields  → 200, seated
//
// `postWithCheckout` is that whole loop behind one call. Every booking action in
// the app goes through it, so adding a guest, claiming a waitlist spot and
// accepting an invite all gained direct payment without any of them learning
// what a payment attempt is.

import { buildApiUrl, getSession } from "@/utils/api";

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

/** What the server hands back with a 402 PAYMENT_REQUIRED. */
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

export type CheckoutPhase =
  | "opening"    // fetching the order, loading the gateway script
  | "paying"     // the gateway sheet is open; we are waiting on a human
  | "confirming" // paid — completing the booking. NOT safe to abandon.
  | "done";

export type PostResult<T = Record<string, unknown>> = {
  res: Response | null;
  data: T & { success?: boolean; code?: string; message?: string };
  /** True when the customer closed the payment sheet without paying. */
  cancelled?: boolean;
  /** True when money was collected during this call. */
  paid?: boolean;
};

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

/**
 * Let go of a checkout nobody is doing, so the wallet funds it earmarked come
 * straight back rather than waiting out the 15-minute window.
 *
 * Deliberately fire-and-forget and deliberately harmless: the server refuses to
 * drop an attempt money has already landed against, so a cancel racing a
 * payment can never throw away a booking.
 */
export async function abandonCheckout(attemptId: string): Promise<void> {
  const { token } = getSession();
  if (!token || !attemptId) return;
  try {
    await fetch(buildApiUrl(`/api/v1/players/me/checkouts/${attemptId}/abandon`), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    // The sweep releases it either way.
  }
}

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

type PrefillUser = { name?: string; contact?: string; email?: string };

/**
 * Open the gateway for one checkout.
 * Resolves with the payment on success, or null when the customer closed it.
 */
function payForCheckout(
  checkout: Checkout,
  prefill?: PrefillUser,
): Promise<RazorpayCheckoutResponse | null> {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: RazorpayCheckoutResponse | null) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const rzp = new window.Razorpay({
      key:         checkout.keyId,
      amount:      checkout.amountPaise,
      currency:    checkout.currency || "INR",
      name:        "Kasa Kai",
      description: checkout.description || "Booking payment",
      order_id:    checkout.orderId,
      prefill,
      theme:       { color: "#c8ff3e" },
      modal:       { ondismiss: () => finish(null) },
      handler:     (response) => finish(response),
    });

    // A failed card is not the end of the checkout — the customer can try
    // another method in the same sheet against the same order. Only a dismiss
    // ends it, which is why nothing is resolved here.
    rzp.on?.("payment.failed", () => {});

    rzp.open();
  });
}

/**
 * POST a booking action, paying for it if the wallet cannot.
 *
 * Returns the FINAL response — the one from the replay when a payment happened,
 * the original otherwise — so callers handle success and failure in one place
 * and mostly do not have to know a payment occurred at all.
 */
export async function postWithCheckout<T = Record<string, unknown>>(
  path: string,
  body: Record<string, unknown>,
  opts: {
    onPhase?: (phase: CheckoutPhase) => void;
    prefill?: PrefillUser;
    /** Override the route the replay goes to. Defaults to the server's. */
    replayPath?: string;
  } = {},
): Promise<PostResult<T>> {
  const { token } = getSession();
  const { onPhase, prefill } = opts;

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
  if (first.res.status !== 402 || first.data?.code !== "PAYMENT_REQUIRED") {
    return { res: first.res, data: first.data };
  }

  const checkout: Checkout = first.data.checkout;
  if (!checkout?.orderId || !checkout?.keyId) {
    return { res: first.res, data: first.data };
  }

  onPhase?.("opening");
  const ready = await loadRazorpay();
  if (!ready) {
    abandonCheckout(checkout.attemptId);
    return {
      res: null,
      data: {
        success: false,
        code: "CHECKOUT_UNAVAILABLE",
        message: "Could not open the payment window. Check your connection and try again.",
      } as PostResult<T>["data"],
    };
  }

  onPhase?.("paying");
  const payment = await payForCheckout(checkout, prefill);

  if (!payment) {
    // Closed without paying. Hand the earmarked wallet funds back now rather
    // than making the customer wait out the window.
    abandonCheckout(checkout.attemptId);
    onPhase?.("done");
    return {
      res: null,
      cancelled: true,
      data: { success: false, code: "PAYMENT_CANCELLED", message: "Payment cancelled." } as PostResult<T>["data"],
    };
  }

  // Money has moved. From here the booking must be completed or refunded, and
  // abandoning is no longer an option the customer gets to take.
  onPhase?.("confirming");
  const replay = await send({
    ...(checkout.payload || body),
    paymentAttemptId:  checkout.attemptId,
    razorpayPaymentId: payment.razorpay_payment_id,
    razorpaySignature: payment.razorpay_signature,
  });
  onPhase?.("done");

  return { res: replay.res, data: replay.data, paid: true };
}

/**
 * Finish a checkout the page found already paid for — a tab that was closed
 * mid-payment, a phone that died. The money is already ours; this just asks the
 * endpoint to seat them, and it will refuse (and refund) if it cannot.
 */
export async function resumeCheckout<T = Record<string, unknown>>(
  checkout: Checkout,
): Promise<PostResult<T>> {
  const { token } = getSession();
  const res = await fetch(buildApiUrl(checkout.endpoint), {
    method: checkout.method || "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...(checkout.payload || {}), paymentAttemptId: checkout.attemptId }),
  });
  const data = await res.json().catch(() => ({}));
  return { res, data, paid: true };
}

/**
 * The one place a booking response becomes words.
 *
 * The failure codes matter more than usual here, because three of them mean
 * "we have your money" and must never be shown as a plain error: the customer
 * needs to be told the refund is on its way, or that it is still being worked
 * on, rather than being invited to pay again.
 */
export function checkoutErrorMessage(data: { code?: string; message?: string }): string {
  switch (data?.code) {
    case "PAYMENT_NO_CAPACITY":
      return "Payment received, but the requested spots are no longer available. Your refund has been initiated.";
    case "RACE_REFUND_FAILED":
      return "Payment received, but the spots are gone. Your refund is being processed and our team has been alerted.";
    case "PAYMENT_EXPIRED":
      return "That checkout expired before it finished. Your payment has been refunded — please book again.";
    case "PAYMENT_STALE":
      return "Your selection changed after payment started. The payment has been refunded — please book again.";
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
    code === "RACE_REFUND_FAILED" ||
    code === "PAYMENT_EXPIRED" ||
    code === "PAYMENT_STALE" ||
    code === "PAYMENT_SETTLE_FAILED"
  );
}
