"use client";

// A screen's way of saying "ask them to add money, and tell me what happened".
//
// `postWithTopUp` needs a promise it can await in the middle of a booking, and
// React needs a component tree. This is the join: call `requestTopUp(need)` and
// the sheet appears; when the player recharges or backs out, the promise
// resolves and the booking carries on (or does not).
//
// One sheet per screen, shared by every booking action on it, so adding a guest
// and claiming a waitlist spot cannot put two on screen at once.

import React, { useCallback, useRef, useState } from "react";
import { TopUpSheet } from "@/components/wallet/TopUpSheet";
import type { RequestTopUp, TopUpNeed, TopUpOutcome } from "@/utils/walletTopup";

export function useWalletTopUp(): { requestTopUp: RequestTopUp; topUpSheet: React.ReactNode } {
  const [need, setNeed] = useState<TopUpNeed | null>(null);
  const resolverRef = useRef<((outcome: TopUpOutcome) => void) | null>(null);

  const requestTopUp = useCallback<RequestTopUp>((nextNeed) => {
    return new Promise<TopUpOutcome>((resolve) => {
      // A second request while one is open would strand the first caller's
      // promise for ever. Resolve it as cancelled and take over the sheet.
      resolverRef.current?.({ credited: false });
      resolverRef.current = resolve;
      setNeed(nextNeed);
    });
  }, []);

  const finish = useCallback((outcome: TopUpOutcome) => {
    setNeed(null);
    const resolve = resolverRef.current;
    resolverRef.current = null;
    resolve?.(outcome);
  }, []);

  return {
    requestTopUp,
    topUpSheet: need ? <TopUpSheet need={need} onDone={finish} /> : null,
  };
}
