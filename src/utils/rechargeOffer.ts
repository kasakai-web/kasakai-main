// Recharge-offer maths for the top-up screen.
//
// The backend decides what a recharge actually earns (utils/rechargeOffers.js);
// this is a read-only mirror so the amount field can show the bonus as the
// player types, without a round trip per keystroke. It must stay in step with
// the server on two things: percentages round to the nearest whole rupee, and a
// tier's range is min-inclusive / max-exclusive.
//
// Audiences need no logic here: the server has already narrowed `tiers` to the
// ones THIS player can earn, so whatever arrives is theirs to match against.
//
// Nothing here is trusted — the credited bonus is whatever the server computes.

export type Audience = "all" | "first" | "repeat";

export type OfferTier = {
  key: string;
  /** Who the tier is for. 'first' rates are gone once they have topped up once. */
  audience: Audience;
  minPaise: number;
  maxPaise: number | null;
  mode: "flat" | "percent";
  bonusPaise: number;
  percent: number;
  maxBonusPaise: number;
  rangeLabel: string;
  rewardLabel: string;
};

export type RechargeOffer =
  | { active: false }
  | {
      active: true;
      endsAt: string | null;
      /** True only when every tier shown is a one-time first-recharge rate. */
      firstRechargeOnly: boolean;
      remainingUses: number | null;
      tiers: OfferTier[];
    };

export const INACTIVE_OFFER: RechargeOffer = { active: false };

export function activeTiers(offer: RechargeOffer | null): OfferTier[] {
  return offer && offer.active ? offer.tiers : [];
}

export function tierForPaise(amountPaise: number, tiers: OfferTier[]): OfferTier | null {
  return (
    tiers.find((t) => amountPaise >= t.minPaise && (t.maxPaise == null || amountPaise < t.maxPaise)) ??
    null
  );
}

export function computeTierBonus(amountPaise: number, tier: OfferTier | null): number {
  if (!tier) return 0;

  if (tier.mode === "percent") {
    if (!(tier.percent > 0)) return 0;
    const bonus = Math.round((amountPaise * tier.percent) / 100 / 100) * 100;
    return tier.maxBonusPaise > 0 ? Math.min(bonus, tier.maxBonusPaise) : bonus;
  }
  return tier.bonusPaise > 0 ? tier.bonusPaise : 0;
}

/** What this exact amount earns right now. */
export function bonusForAmount(amountPaise: number, offer: RechargeOffer | null): number {
  const tiers = activeTiers(offer);
  if (!tiers.length || !(amountPaise > 0)) return 0;
  return computeTierBonus(amountPaise, tierForPaise(amountPaise, tiers));
}

export type Upsell = {
  atPaise: number;
  addPaise: number;
  bonusPaise: number;
  extraPaise: number;
};

/**
 * The cheapest top-up that would earn more than this one does — the
 * "add ₹150 more and get ₹100" nudge. Null once the player is at the best tier.
 */
export function nextTierUpsell(amountPaise: number, offer: RechargeOffer | null): Upsell | null {
  const tiers = activeTiers(offer);
  if (!tiers.length || !(amountPaise > 0)) return null;

  const currentBonus = bonusForAmount(amountPaise, offer);
  const better = tiers
    .filter((t) => t.minPaise > amountPaise)
    .sort((a, b) => a.minPaise - b.minPaise)
    .find((t) => computeTierBonus(t.minPaise, t) > currentBonus);

  if (!better) return null;

  const bonusPaise = computeTierBonus(better.minPaise, better);
  return {
    atPaise: better.minPaise,
    addPaise: better.minPaise - amountPaise,
    bonusPaise,
    extraPaise: bonusPaise - currentBonus,
  };
}
