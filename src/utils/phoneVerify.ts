// A Google signup's number is unproven: the server won't sign anyone in with it,
// and won't seat anyone on it, until it is verified. One sheet
// (components/auth/PhoneVerifySheet, mounted once in the root layout) asks for
// the code, in two modes:
//
//  - required: a booking was refused with PHONE_VERIFY_REQUIRED. No skip; the
//    booking waits on the answer and is re-sent once the code is in
//    (utils/walletTopup#postWithTopUp).
//  - offered: after a wallet top-up or a pass purchase, which need no proven
//    number. It can be skipped, and is offered at most once a day.

// The number itself, while it is unproven. Set at login (app/login), cleared once
// verified and on logout (clearSession).
export const UNVERIFIED_PHONE_KEY = "phoneUnverified";
const OFFERED_AT_KEY = "phoneVerifyOfferedAt";
const DAY_MS = 24 * 60 * 60 * 1000;

let opener: ((phone: string, required: boolean) => void) | null = null;

// The required check in progress, if any. A second booking refused while the
// sheet is up (a double tap) waits on the same answer instead of replacing it,
// or the first booking would wait forever.
let pending: Promise<boolean> | null = null;
let settle: ((verified: boolean) => void) | null = null;

/** Called by the sheet on mount (and with null on unmount). */
export function registerPhoneVerify(fn: ((phone: string, required: boolean) => void) | null) {
  opener = fn;
}

/** After a top-up or a pass purchase: offer the check, unless already offered today. */
export function offerPhoneVerify() {
  try {
    const phone = localStorage.getItem(UNVERIFIED_PHONE_KEY);
    if (!phone || !opener || pending) return;
    if (Date.now() - (Number(localStorage.getItem(OFFERED_AT_KEY)) || 0) < DAY_MS) return;
    localStorage.setItem(OFFERED_AT_KEY, String(Date.now()));
    opener(phone, false);
  } catch {
    // Storage blocked: the offer is a convenience, never in the way.
  }
}

/** Before a booking: resolves true once the number is verified, false if the sheet is closed. */
export function requirePhoneVerify(phone: string): Promise<boolean> {
  if (pending) return pending;
  if (!opener) return Promise.resolve(false);
  pending = new Promise<boolean>((resolve) => { settle = resolve; });
  opener(phone, true);
  return pending;
}

/** Called by the sheet when a required check ends, either way. */
export function settlePhoneVerify(verified: boolean) {
  const done = settle;
  pending = null;
  settle = null;
  done?.(verified);
}

export function markPhoneVerified() {
  try {
    localStorage.removeItem(UNVERIFIED_PHONE_KEY);
  } catch {}
}
