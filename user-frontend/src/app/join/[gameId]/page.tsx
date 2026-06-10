"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * /join/[gameId]
 *
 * Landing page for shared game links and waitlist emails. The URL may be:
 *  - a readable link ending in the id → "thursday-morning-game-12-jun-2026-6a2918fc9cddbe7d2051e4fa"
 *  - a bare Mongo ObjectId           → "6a2918fc9cddbe7d2051e4fa"  (old links / emails)
 *
 * Either way:
 *  - Logged-in player → dashboard with the game modal pre-opened.
 *  - Not logged in    → login with a return URL so they come back here.
 */
export default function JoinGamePage() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const rawParam = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  // Extract the trailing 24-char hex ObjectId from a readable link. Falls back to
  // the raw param so old bare-id links (already shared / in emails) keep working.
  const gameId = rawParam?.match(/[0-9a-f]{24}/gi)?.pop() || rawParam;

  useEffect(() => {
    if (!gameId) return;

    const token  = typeof window !== "undefined" ? localStorage.getItem("authToken")  : null;
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId")     : null;
    const role   = typeof window !== "undefined" ? localStorage.getItem("userRole")   : null;

    if (token && userId && role === "player") {
      // Already logged in — open their dashboard with this game's modal
      router.replace(`/dashboard/player/${userId}?tab=my-games&openGame=${gameId}`);
    } else {
      // Not logged in — go to login, passing this page as the post-login redirect
      router.replace(`/login?role=player&redirect=/join/${gameId}`);
    }
  }, [gameId, router]);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#000",
        color: "#fff",
        fontFamily: "Arial, sans-serif",
        flexDirection: "column",
        gap: 16,
      }}
    >
      <div style={{ fontSize: 40 }}>⚽</div>
      <p style={{ color: "#aaa", fontSize: 14 }}>Redirecting you to the game…</p>
    </div>
  );
}
