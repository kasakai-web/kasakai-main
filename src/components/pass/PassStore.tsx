"use client";

/* The pass store.
 *
 * Buying a pass is the same shape as buying a seat, and reuses the same
 * machinery: the wallet pays, a short balance comes back as a 402 saying what
 * to add, `postWithTopUp` runs the recharge and re-POSTs the SAME request. That
 * retry re-runs every check on the server — the run may have sold out while the
 * player was in their UPI app — which is why there is no "confirm purchase"
 * endpoint for it to get out of step with.
 *
 * Passes the player CANNOT buy are shown with the reason rather than hidden.
 * "You already hold this" and "on sale from 1 October" are both better answers
 * than an empty shelf, and a pass nobody can see is a pass nobody can ask about. */

import React, { useCallback, useEffect, useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";
import { postWithTopUp, type RequestTopUp } from "@/utils/walletTopup";

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

export function PassStore({
  requestTopUp,
  onPurchased,
}: {
  requestTopUp: RequestTopUp;
  onPurchased: () => void;
}) {
  const [rows, setRows] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
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

  const buy = async (row: StoreRow) => {
    setBuying(row.code);
    setError("");
    setDone("");
    try {
      const { data, cancelled } = await postWithTopUp(
        "/passes/purchase",
        { productCode: row.code },
        { requestTopUp },
      );
      if (cancelled) return;
      if (!data?.success) {
        setError(data?.message || "Could not complete that purchase.");
        // Sold out or gone off sale while they were paying — the shelf is stale,
        // so re-read it rather than leaving a button that cannot work.
        load();
        return;
      }
      setDone(`${row.name} is yours.`);
      load();
      onPurchased();
    } finally {
      setBuying(null);
    }
  };

  if (loading) return <div className="mp-store-loading">Loading passes…</div>;
  if (!rows.length) return null;

  return (
    <>
      <div className="mp-section-head">
        <span className="mp-section-title">Passes you can buy</span>
        <span className="mp-section-count">{rows.filter((r) => r.purchasable).length} available</span>
      </div>

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
                {buying === row.code ? "Buying…" : `Buy for ${rupees(row.pricePaise)}`}
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
