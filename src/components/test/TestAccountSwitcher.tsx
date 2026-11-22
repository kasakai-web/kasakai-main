"use client";

// Test server only: sign in as any "D" test account in one tap. It renders
// nothing unless GET /test-tools/players answers, which it does only when the
// backend runs TEST_TOOLS=true against a non-live database (Test_Speedups_Plan.md).
// Signs in through the real /auth/otp/verify with the fixed test code.

import { useEffect, useState } from "react";
import { buildApiUrl, clearSession, getSession, resolveImageUrl } from "@/utils/api";

type TestPlayer = { _id: string; name: string; phone: string; profileImage?: string };

const TEST_CODE = "000000";

export default function TestAccountSwitcher() {
  const [players, setPlayers] = useState<TestPlayer[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(buildApiUrl("/test-tools/players"))
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPlayers(d?.data?.length ? d.data : null))
      .catch(() => setPlayers(null));
  }, []);

  if (!players) return null;
  const me = getSession().userId;

  const switchTo = async (p: TestPlayer) => {
    setBusy(p._id);
    setError("");
    try {
      const res = await fetch(buildApiUrl("/auth/otp/verify"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: p.phone, otp: TEST_CODE, role: "player" }),
      });
      const data = await res.json();
      if (!res.ok || !data.token) throw new Error(data.message || "Could not sign in.");
      // Same keys the login page writes (app/login/page.tsx#finishLogin).
      clearSession();
      localStorage.setItem("authToken", data.token);
      localStorage.setItem("userRole", "player");
      localStorage.setItem("userId", data.user.id);
      localStorage.setItem("userName", data.user.name || "User");
      if (data.user.profileImage) localStorage.setItem("userProfileImage", resolveImageUrl(data.user.profileImage));
      // Full reload so every page, hook and the socket start as the new player.
      window.location.href = "/dashboard";
    } catch (err) {
      setError((err as Error).message);
      setBusy("");
    }
  };

  return (
    <div style={{ position: "fixed", left: 12, bottom: 12, zIndex: 10000, fontSize: 13 }}>
      {open && (
        <div
          style={{
            marginBottom: 8, width: 240, maxHeight: "60vh", overflowY: "auto",
            background: "var(--dark-navy, #111)", border: "1px solid #444", borderRadius: 8, padding: 6,
          }}
        >
          <div style={{ color: "#aaa", padding: "4px 6px" }}>Sign in as a test player</div>
          {error && <div style={{ color: "#ff6b6b", padding: "4px 6px" }}>{error}</div>}
          {players.map((p) => (
            <button
              key={p._id}
              type="button"
              disabled={!!busy || p._id === me}
              onClick={() => switchTo(p)}
              style={{
                display: "block", width: "100%", textAlign: "left", padding: "6px 8px",
                background: p._id === me ? "rgba(196,213,108,0.15)" : "transparent",
                color: "var(--white, #fff)", border: "none", borderRadius: 4,
                cursor: busy || p._id === me ? "default" : "pointer",
              }}
            >
              {p.name} <span style={{ color: "#888" }}>··{p.phone.slice(-2)}</span>
              {p._id === me && " (you)"}
              {busy === p._id && " …"}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        style={{
          background: "var(--yellow, #c4d56c)", color: "#000", border: "none", borderRadius: 999,
          padding: "8px 14px", fontWeight: 700, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
        }}
      >
        {open ? "Close" : "Switch test player"}
      </button>
    </div>
  );
}
