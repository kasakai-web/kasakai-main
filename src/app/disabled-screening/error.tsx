"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ScreeningError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Screening]", error);
  }, [error]);

  return (
    <div style={{ background: "#050505", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 20, padding: 24, textAlign: "center" }}>
      <div style={{ width: 64, height: 64, border: "1px solid #1e1e1e", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round">
          <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
        </svg>
      </div>
      <div>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: "#f0f0f0", marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ fontSize: 13, color: "#555", lineHeight: 1.6, maxWidth: 300 }}>
          We couldn&apos;t load this page. Please try again or browse other events.
        </p>
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={reset} style={{ padding: "10px 22px", background: "#c8f135", color: "#000", fontSize: 11, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", border: "none", borderRadius: 6, cursor: "pointer" }}>
          Try Again
        </button>
        <Link href="/screening" style={{ display: "inline-flex", alignItems: "center", padding: "10px 22px", border: "1px solid #2a2a2a", color: "#888", fontSize: 11, fontWeight: 900, letterSpacing: ".14em", textTransform: "uppercase", borderRadius: 6, textDecoration: "none" }}>
          All Events
        </Link>
      </div>
    </div>
  );
}
