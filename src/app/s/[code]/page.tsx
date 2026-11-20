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
 *
 * If the game has filled since the SOS went out, this page says so instead of
 * opening a sheet that can only say "full": the waitlist one tap away, and up
 * to three games like it (same venue first, then the same city, near the same
 * time) — never a dead end.
 */

type Similar = { _id: string; title: string; scheduledAt: string; venue: string | null; format: string | null; feeInPaise: number; sameVenue: boolean };
type Opened = { gameId: string; title: string; open: boolean; waitlist: boolean; similar: Similar[] };

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata", weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit",
  });

const BUTTON: React.CSSProperties = {
  background: "#c8ff3e", color: "#000", border: 0, borderRadius: 8,
  padding: "10px 18px", fontSize: 14, fontWeight: 600, cursor: "pointer",
};
const QUIET_BUTTON: React.CSSProperties = { ...BUTTON, background: "transparent", color: "#ddd", border: "1px solid #333" };

export default function SosLinkPage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = Array.isArray(params?.code) ? params.code[0] : params?.code;
  const [failed, setFailed] = useState(false);
  const [filled, setFilled] = useState<Opened | null>(null);

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
        const opened: Opened | null = data?.success ? data.data : null;
        if (!opened?.gameId) {
          setFailed(true);
          return;
        }
        if (opened.open === false) {
          setFilled(opened);
          return;
        }
        router.replace(`/dashboard?openGame=${opened.gameId}`);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => { cancelled = true; };
  }, [code, router]);

  const openGame = (id: string) => router.replace(`/dashboard?openGame=${id}`);

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
        padding: "24px 16px",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 40 }}>⚽</div>
      {filled ? (
        <div style={{ width: "100%", maxWidth: 420, display: "flex", flexDirection: "column", gap: 14 }}>
          <p style={{ color: "#ddd", fontSize: 15, margin: 0 }}>
            {filled.waitlist
              ? <>&ldquo;{filled.title}&rdquo; filled up before you got there.</>
              : <>&ldquo;{filled.title}&rdquo; can&apos;t take bookings any more.</>}
          </p>
          {filled.waitlist && (
            <button type="button" style={BUTTON} onClick={() => openGame(filled.gameId)}>
              Join the waitlist
            </button>
          )}
          {filled.similar.length > 0 && (
            <>
              <p style={{ color: "#aaa", fontSize: 13, margin: "8px 0 0" }}>Games like it with a spot open:</p>
              {filled.similar.map((g) => (
                <button
                  key={g._id}
                  type="button"
                  onClick={() => openGame(g._id)}
                  style={{
                    textAlign: "left", background: "#111", color: "#fff", border: "1px solid #2a2a2a",
                    borderRadius: 10, padding: "12px 14px", cursor: "pointer",
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                    {[when(g.scheduledAt), g.venue, g.format, g.feeInPaise > 0 ? `₹${Math.round(g.feeInPaise / 100)}` : "Free"]
                      .filter(Boolean).join(" · ")}
                  </div>
                </button>
              ))}
            </>
          )}
          <button type="button" style={QUIET_BUTTON} onClick={() => router.replace("/dashboard")}>
            Browse all games
          </button>
        </div>
      ) : failed ? (
        <>
          <p style={{ color: "#ddd", fontSize: 15, margin: 0 }}>This link isn&apos;t valid any more.</p>
          <button type="button" style={BUTTON} onClick={() => router.replace("/dashboard")}>
            Browse games
          </button>
        </>
      ) : (
        <p style={{ color: "#aaa", fontSize: 14 }}>Opening the game…</p>
      )}
    </div>
  );
}
