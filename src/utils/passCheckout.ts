// Buying a pass, from the client's side.
//
// A pass is paid for DIRECTLY at Razorpay — never from the wallet, so a
// recharge offer's bonus can never fund part of one:
//
//     POST /passes/orders          → a Razorpay order for exactly the pass price
//     [checkout.js — the player pays]
//     POST /passes/orders/verify   → the pass is issued
//
// The server re-runs every check when the money lands. If the pass can no
// longer be issued (sold out, taken off sale, already bought in another tab),
// the payment goes to the player's wallet instead and the verify says so —
// `credited` below. The webhook does the same work if the verify never arrives.

import { buildApiUrl, getSession } from "@/utils/api";
import { loadRazorpay, openRazorpayCheckout } from "@/utils/walletTopup";

export type PassPaymentOutcome =
  | { status: "issued"; message: string }
  | { status: "credited"; message: string }   // paid, but the money went to the wallet
  | { status: "pending"; message: string }    // paid; the pass is still being issued
  | { status: "cancelled" }                   // closed the Razorpay window
  | { status: "error"; message: string; refresh?: boolean };

export async function payForPass(
  productCode: string,
  prefill?: { name?: string; contact?: string; email?: string },
): Promise<PassPaymentOutcome> {
  const { token } = getSession();
  if (!token) return { status: "error", message: "Please sign in again." };

  const ready = await loadRazorpay();
  if (!ready) {
    return { status: "error", message: "Could not open the payment window. Check your connection and try again." };
  }

  let order: { orderId: string; amount: number; currency: string; keyId: string; passName: string };
  try {
    const res = await fetch(buildApiUrl("/passes/orders"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ productCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.success) {
      // Refused before any money moved — sold out, off sale, already held. The
      // shelf is stale, so the caller re-reads it.
      return { status: "error", message: data?.message || "Could not start the payment. Please try again.", refresh: res.status === 409 };
    }
    order = data.data;
  } catch {
    return { status: "error", message: "Could not reach the payment service. Please try again." };
  }

  const payment = await openRazorpayCheckout(order, order.passName || "Pass", prefill);
  if (!payment) return { status: "cancelled" };

  try {
    const res = await fetch(buildApiUrl("/passes/orders/verify"), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        razorpayOrderId: payment.razorpay_order_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpaySignature: payment.razorpay_signature,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (data?.success) return { status: "issued", message: data.message || "Your pass is active." };
    if (data?.code === "PASS_PAYMENT_CREDITED") return { status: "credited", message: data.message };
    // The money was taken; the webhook finishes the job either way. What we must
    // not do is invite them to pay a second time.
    return {
      status: "pending",
      message: data?.message || "Payment received — your pass will appear shortly. Please don't pay again.",
    };
  } catch {
    return { status: "pending", message: "Payment received — your pass will appear shortly. Please don't pay again." };
  }
}
