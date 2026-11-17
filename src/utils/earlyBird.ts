// What the player app says about a game's early-bird price ladder.
//
// The server prices every seat (`pricingInfo` on every game read and on the
// checkout quote, from kasakai-backend/src/utils/seatPricing.js — the same
// engine the booking charges with), so the card, the sheet and the charge can
// never disagree. Nothing is re-derived here; this file only words it.

export interface LadderTier {
  index: number;
  label: string;
  pricePaise: number;
  seats: number;
  sold: number;
  held: number;
  /** Sellable now: stock left, not closed, not below a price already paid. */
  left: number;
  closesAt: string | null;
}

export interface PricingInfo {
  listPricePaise: number;
  currentPricePaise: number;
  savingPaise: number;
  /** The tier the next seat is sold from; null once the ladder is spent. */
  tier: number | null;
  label: string | null;
  seatsLeftAtPrice: number;
  /** What the seat after this tier's last one costs. */
  nextPricePaise: number | null;
  closesAt: string | null;
  ladder: LadderTier[];
}

/** One seat of a quote: "You ₹250 · Guest 1 ₹350". */
export interface SeatPrice {
  kind: "player" | "guest";
  pricePaise: number;
  tier: number | null;
  label: string | null;
}

export const rupees = (paise: number) => `₹${Math.round((paise || 0) / 100).toLocaleString("en-IN")}`;

const istDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const istTime = (d: Date) =>
  d.toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true })
    .replace(":00", "").toLowerCase();

/** True while the next seat is sold below list. */
export const isEarlyPrice = (info: PricingInfo | null | undefined): info is PricingInfo =>
  !!info && info.tier != null && info.currentPricePaise < info.listPricePaise;

/**
 * "3 left at this price, then ₹300" — a real stock count, never a countdown.
 * Null when the next seat is at list.
 */
export function stockLine(info: PricingInfo | null | undefined): string | null {
  if (!isEarlyPrice(info)) return null;
  const left = `${info.seatsLeftAtPrice} left at this price`;
  return info.nextPricePaise != null && info.nextPricePaise > info.currentPricePaise
    ? `${left}, then ${rupees(info.nextPricePaise)}`
    : left;
}

/**
 * "Early price ends tonight 8 pm" — only when the tier really closes within a
 * day, so the card never shows a deadline that is not tied to one.
 */
export function closesLine(info: PricingInfo | null | undefined, now: Date = new Date()): string | null {
  if (!isEarlyPrice(info) || !info.closesAt) return null;
  const at = new Date(info.closesAt);
  const ms = at.getTime() - now.getTime();
  if (isNaN(ms) || ms <= 0 || ms > 24 * 60 * 60 * 1000) return null;
  const hour = Number(at.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour: "2-digit", hour12: false }));
  const day = istDay(at) === istDay(now) ? (hour >= 17 ? "tonight" : "today") : "tomorrow";
  return `Early price ends ${day} ${istTime(at)}`;
}

/** "Book now — price rises to ₹300 after 3 more seats." Null when nothing rises. */
export function urgencyLine(info: PricingInfo | null | undefined): string | null {
  if (!isEarlyPrice(info) || info.nextPricePaise == null || info.nextPricePaise <= info.currentPricePaise) return null;
  const n = info.seatsLeftAtPrice;
  return `Book now — price rises to ${rupees(info.nextPricePaise)} after ${n} more seat${n === 1 ? "" : "s"}.`;
}

/** "You ₹250 · Guest 1 ₹350 · Guest 2 ₹350". */
export function seatBreakdown(seats: SeatPrice[]): string {
  let guest = 0;
  return seats
    .map((s) => `${s.kind === "guest" ? `Guest ${++guest}` : "You"} ${rupees(s.pricePaise)}`)
    .join(" · ");
}

/** Worth a per-seat line only when the party's seats are not all one price. */
export const seatsDiffer = (seats: SeatPrice[] | null | undefined) =>
  !!seats && seats.length > 1 && new Set(seats.map((s) => s.pricePaise)).size > 1;
