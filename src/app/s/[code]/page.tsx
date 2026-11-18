"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { buildApiUrl, clearSession, getSession } from "@/utils/api";

/**
 * /s/[code]
 *
 * The "Book my spot" link in an SOS — the WhatsApp button and the in-app
 * notification both open it. The code names one SOS sent to one player; the
 * backend records the tap and says which game it is for, and the dashboard
 * opens that game's detail (?openGame=), where the Book button is.
 *
 * A player who was sent the SOS can book the game straight away even when it is
 * private or needs approval — the game read says so (`sosAccess`), so nothing
 * about that has to travel in this URL. A forwarded link opens the game for
 * the friend, but books them nothing they could not book anyway.
 */
export default function SosLinkPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!code) return;
    const { token, role } = getSession();
    const toLogin = () => router.replace(`/login?role=player&redirect=${encodeURIComponent(`/s/${code}`)}`);
    if (!token || role !== "player") {
      toLogin();
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(buildApiUrl(`/games/sos/${encodeURIComponent(code)}`), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (cancelled) return;
        if (res.status === 401) {
          clearSession();
          toLogin();
          return;
        }
        const data = await res.json().catch(() => null);
        const gameId = data?.success ? data.data?.gameId : null;
        if (!gameId) {
          setFailed(true);
          return;
        }
        router.replace(`/dashboard?openGame=${gameId}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [code, router]);

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
        padding: "0 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 40 }}>⚽</div>
      {failed ? (
        <>
          <p style={{ color: "#ddd", fontSize: 15, margin: 0 }}>This link isn&apos;t valid any more.</p>
          <button
            type="button"
            onClick={() => router.replace("/dashboard")}
            style={{
              background: "#fff", color: "#000", border: 0, borderRadius: 8,
              padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}
          >
            Browse games
          </button>
        </>
      ) : (
        <p style={{ color: "#aaa", fontSize: 14 }}>Opening the game…</p>
      )}
    </div>
  );
}
