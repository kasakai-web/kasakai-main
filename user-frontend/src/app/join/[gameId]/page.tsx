"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

/**
 * /join/[gameId]
 *
 * Landing page for waitlist notification emails.
 * - Logged-in player  → redirect to their dashboard with the game modal pre-opened.
 * - Not logged in     → redirect to login with a return URL so they come back here.
 */
export default function JoinGamePage() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;

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
