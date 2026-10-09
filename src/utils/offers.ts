// Offers and coupon codes on a game's entry price — the player app's side.
//
// There is deliberately NO client copy of the discount rules. Whether an offer
// applies and what it takes off are the server's answers (utils/discountRules.js
// on the backend), stamped on every game read as `offerInfo` and returned by the
// checkout quote as `offer`. The card, the booking sheet and the debit are
// therefore one answer, never three — the same reason `passInfo` is read rather
// than re-derived.
//
// What the booking sheet sends back is the code the player CHOSE and the saving
// it SHOWED them. The server never trusts the second as an amount; it uses it to
// refuse a booking that would now cost more than the sheet said.

import { buildApiUrl, getSession } from "@/utils/api";

/** One offer, as the card badge and the sheet print it. */
export type OfferInfo = {
  campaignId: string | null;
  title: string;
  type: "general" | "first_game";
  source: "auto" | "code";
  feePaise: number;
  savingPaise: number;
  payablePaise: number;
  savingText: string;
  terms: string | null;
  conditions: string[];
  endsAt: string | null;
  endsLabel: string | null;
  /** On a code offer: the code, as the server stores it (FIRST50, UJJWAL3R4EW). */
  code?: string | null;
};

/** The checkout quote's `offer` block. */
export type OfferQuote = {
  /** What is applied by default — a typed code that saves at least as much as
   *  the best auto offer, otherwise that auto offer. */
  applied: OfferInfo | null;
  /** Any other offer the player may pick instead. */
  alternatives: OfferInfo[];
  /** The typed code's own answer, when one was typed. */
  code: {
    entered: string;
    ok: boolean;
    reason: string | null;
    message: string | null;
    savingPaise: number;
    campaignId: string | null;
  } | null;
};

/** What the sheet hands the booking request. */
export type OfferChoice = {
  couponCode?: string;
  expectedDiscountPaise?: number;
};

/** The two refusals that mean "the offer, not the booking, needs another look". */
export const OFFER_REFUSAL_CODES = ["COUPON_REJECTED", "OFFER_CHANGED"] as const;

export function isOfferRefusal(data: { code?: string } | null | undefined): boolean {
  return !!data?.code && (OFFER_REFUSAL_CODES as readonly string[]).includes(data.code);
}

export const emptyQuote = (applied: OfferInfo | null = null): OfferQuote => ({
  applied,
  alternatives: [],
  code: null,
});

/**
 * Ask the server what the player's own seat costs with the offers that apply —
 * and, when `code` is given, what that code does. Nothing is held: asking what
 * something costs must never take anything.
 */
export async function fetchOfferQuote(
  gameId: string,
  { code, asHost = false }: { code?: string; asHost?: boolean } = {},
): Promise<{ ok: true; offer: OfferQuote } | { ok: false; message: string }> {
  const { token } = getSession();
  if (!token) return { ok: false, message: "Sign in to check offers." };
  const params = new URLSearchParams();
  if (code) params.set("code", code);
  if (asHost) params.set("asHost", "1");
  try {
    const res = await fetch(buildApiUrl(`/api/v1/games/${gameId}/checkout/quote?${params.toString()}`), {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body?.success) return { ok: false, message: body?.message || "Couldn't check that code. Try again." };
    return { ok: true, offer: (body.data?.offer as OfferQuote) || emptyQuote() };
  } catch {
    return { ok: false, message: "Couldn't reach the server. Check your connection and try again." };
  }
}

/** Every offer the sheet can show, the default first. */
export function offerCandidates(quote: OfferQuote | null): OfferInfo[] {
  if (!quote) return [];
  const list = [quote.applied, ...(quote.alternatives || [])].filter(Boolean) as OfferInfo[];
  const seen = new Set<string>();
  return list.filter((o) => {
    const key = o.campaignId || `${o.title}:${o.savingPaise}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const offerKey = (o: OfferInfo | null | undefined) => (o ? o.campaignId || `${o.title}:${o.savingPaise}` : null);
