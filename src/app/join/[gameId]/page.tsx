"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { UnregisteredGameLanding } from "@/components/UnregisteredGameLanding";

/**
 * /join/[gameId]
 *
 * Landing page for shared game links, waitlist emails, and game invites.
 * The URL segment may be:
 *  - an INVITE TOKEN                 → "inv_ab12Cd34..."  (WhatsApp invitation link)
 *  - a readable link ending in the id → "thursday-morning-game-12-jun-2026-6a2918fc9cddbe7d2051e4fa"
 *  - a bare Mongo ObjectId           → "6a2918fc9cddbe7d2051e4fa"  (old links / emails)
 *
 * Routing:
 *  - Invite token, logged-in player → dashboard with the invite confirm modal (?invite=token).
 *  - Game link, logged-in player    → dashboard with the game modal pre-opened (?openGame=id).
 *  - Not logged in                  → standalone landing page with game details.
 */
export default function JoinGamePage() {
  const router = useRouter();
  const params = useParams<{ gameId: string }>();
  const rawParam = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  
  // Invite tokens are prefixed with "inv_" so they never look like an ObjectId.
  const isInviteToken = !!rawParam && /^inv_/.test(rawParam);
  
  // Extract the trailing 24-char hex ObjectId from a readable link. Falls back to
  // the raw param so old bare-id links (already shared / in emails) keep working.
  const gameId = rawParam?.match(/[0-9a-f]{24}/gi)?.pop() || rawParam;

  // Auth can only be read on the client, so the first render never knows it yet.
  // Staying on "checking" until the effect resolves keeps logged-in players from
  // seeing a flash of the unregistered landing page before the redirect lands.
  const [authState, setAuthState] = useState<"checking" | "guest">("checking");

  useEffect(() => {
    if (!rawParam) return;

    const token  = typeof window !== "undefined" ? localStorage.getItem("authToken")  : null;
    const userId = typeof window !== "undefined" ? localStorage.getItem("userId")     : null;
    const role   = typeof window !== "undefined" ? localStorage.getItem("userRole")   : null;

    const loggedInPlayer = token && userId && role === "player";

    if (isInviteToken) {
      if (loggedInPlayer) {
        // Show the invite confirm modal on the dashboard.
        router.replace(`/dashboard/player/${userId}?invite=${rawParam}`);
      } else {
        router.replace(`/login?role=player&redirect=/join/${rawParam}`);
      }
      return;
    }

    if (loggedInPlayer) {
      // Already logged in — open their dashboard with this game's modal
      // The dashboard opens the game modal from ?openGame, fetching the game
      // directly if it is not in the browse list it just loaded.
      router.replace(`/dashboard/player/${userId}?openGame=${gameId}`);
      return;
    }

    // Not logged in — release the landing page.
    setAuthState("guest");
  }, [rawParam, gameId, isInviteToken, router]);

  const handleSignupClick = (targetGameId: string) => {
    // Route to login with the game ID preserved
    router.push(`/login?role=player&redirect=/join/${targetGameId}&mode=signup&targetGame=${targetGameId}`);
  };

  return (
    <>
      {gameId && !isInviteToken && authState === "guest" ? (
        <UnregisteredGameLanding gameId={gameId} onSignupClick={handleSignupClick} />
      ) : (
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
      )}
    </>
  );
}

