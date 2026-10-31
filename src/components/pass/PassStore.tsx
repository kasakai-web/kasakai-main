"use client";

/* The pass store.
 *
 * A pass is paid for DIRECTLY at Razorpay, never from the wallet: Buy opens
 * `PassCheckoutSheet` (Terms, then the gateway), and the server re-runs every
 * check when the money lands — the run may have sold out while the player was
 * in their UPI app, in which case the payment goes to their wallet instead.
 *
 * Passes the player CANNOT buy are shown with the reason rather than hidden.
 * "You already hold this" and "on sale from 1 October" are both better answers
 * than an empty shelf, and a pass nobody can see is a pass nobody can ask about. */

import React, { useCallback, useEffect, useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import { PassCheckoutSheet } from "@/components/pass/PassCheckoutSheet";
import type { PassPaymentOutcome } from "@/utils/passCheckout";
import { offerPhoneVerify } from "@/utils/phoneVerify";

export type StoreRow = {
  _id: string;
  code: string;
  name: string;
  subtitle?: string;
  description?: string;
  pricePaise: number;
  listPricePaise?: number;
  described: { summary: string; benefitText: string; scopeText: string };
  purchasable: boolean;
  reason: string;
  reasonText: string | null;
  alreadyHeld: boolean;
};

const rupees = (paise: number) => `₹${Math.round((paise || 0) / 100).toLocaleString("en-IN")}`;

export function PassStore({ onPurchased }: { onPurchased: () => void }) {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<StoreRow | null>(null);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const load = useCallback(async () => {
    const { token } = getSession();
    if (!token) { setLoading(false); return; }
    try {
      const res = await fetch(buildApiUrl("/passes/store"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (d?.success) setRows(d.data || []);
    } catch {
      setError("Could not load the store.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const buy = (row: StoreRow) => {
    setError("");
    setDone("");
    setBuying(row);
  };

  const finish = (outcome: PassPaymentOutcome) => {
    const row = buying;
    setBuying(null);
    if (outcome.status === "cancelled") return;
    if (outcome.status === "issued") {
      setDone(`${row?.name || "Your pass"} is yours.`);
      onPurchased();
      // A pass needs no proven number, so the check is only offered here.
      offerPhoneVerify();
    } else if (outcome.status === "pending") {
      setDone(outcome.message);
      onPurchased();
    } else {
      // Credited to the wallet, or refused before paying because it sold out or
      // went off sale — either way the shelf is stale, so re-read it.
      setError(outcome.message);
    }
    load();
  };

  if (loading) return <div className="mp-store-loading">Loading passes…</div>;
  if (!rows.length) return null;

  return (
    <>
      <div className="mp-section-head">
        <span className="mp-section-title">Passes you can buy</span>
        <span className="mp-section-count">{rows.filter((r) => r.purchasable).length} available</span>
      </div>

      {buying && (
        <PassCheckoutSheet
          item={{
            code: buying.code,
            name: buying.name,
            subtitle: buying.subtitle,
            pricePaise: buying.pricePaise,
            listPricePaise: buying.listPricePaise,
            summary: buying.described.summary,
          }}
          onDone={finish}
        />
      )}

      {error && <div className="mp-store-error">{error}</div>}
      {done && <div className="mp-store-done">{done}</div>}

      <div className="mp-cards">
        {rows.map((row) => (
          <div key={row._id} className={`mp-card ${row.purchasable ? "" : "mp-spent"}`}>
            <div className="mp-card-top">
              <div>
                <div className="mp-card-name">{row.name}</div>
                {row.subtitle && <div className="mp-store-subtitle">{row.subtitle}</div>}
              </div>
              <div className="mp-store-price">
                {row.listPricePaise && row.listPricePaise > row.pricePaise ? (
                  <s className="mp-store-was">{rupees(row.listPricePaise)}</s>
                ) : null}
                <span>{rupees(row.pricePaise)}</span>
              </div>
            </div>

            <div className="mp-scope">{row.described.summary}</div>
            {row.description && <div className="mp-store-desc">{row.description}</div>}

            {row.purchasable ? (
              <button
                type="button"
                className="mp-buy"
                disabled={buying !== null}
                onClick={() => buy(row)}
              >
                {buying?.code === row.code ? "Buying…" : `Buy for ${rupees(row.pricePaise)}`}
              </button>
            ) : (
              <div className="mp-store-blocked">{row.reasonText || "Not available"}</div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
