"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Dashboard pop-up for the confirmation algorithm (spec 3.1/3.2):
//  - shows when a game has a pending decision the organiser must resolve
//    (first check below-min, second check without automation, post-switch low count)
//  - shows the 30-minute "check-in coming up" reminder
// Action buttons reuse the dashboard's existing handlers.

interface Props {
  games: any[];
  onConfirm: (gameId: string) => void;
  onSwitch: (game: any) => void;
  onSos: (game: any) => void;
  onCancel: (game: any) => void;
}

const activeCount = (g: any) =>
  (g.registrations || []).filter(
    (r: any) => !["refunded", "forfeited"].includes(r.paymentStatus) && !r.optedOut
  ).length + (g.organiserIsPlaying ? 1 : 0);

function pickAlert(games: any[], dismissed: Set<string>) {
  for (const g of games || []) {
    if (!g?._id || dismissed.has(g._id)) continue;
    if (!["open", "tentative"].includes(g.status)) continue;
    const lc = g.lifecycle || {};
    if (lc.pendingDecision?.options?.length) return { game: g, kind: "decision" as const };
    if (lc.reminderSentAt && !lc.secondCheckDoneAt) {
      const age = Date.now() - new Date(lc.reminderSentAt).getTime();
      if (age >= 0 && age < 45 * 60 * 1000) return { game: g, kind: "reminder" as const };
    }
  }
  return null;
}

const RECO_MSG: Record<string, string> = {
  confirm_main: "Enough players have signed up — confirm the main format, or wait.",
  confirm_alternate: "Below your main format but above the alternate — switch formats, or cancel.",
  choose: "Below your main format. Switch to the alternate, send an SOS, or cancel.",
  cancel: "Below the minimum. Cancel the game, or keep waiting for more players.",
};

const accent = "#c8ff3e";

export function LifecycleAlertModal({ games, onConfirm, onSwitch, onSos, onCancel }: Props) {
  const [mounted, setMounted] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const alert = pickAlert(games, dismissed);
  if (!alert) return null;

  const { game, kind } = alert;
  const lc = game.lifecycle || {};
  const decision = lc.pendingDecision;
  const n = decision?.playerCount ?? activeCount(game);
  const venue = game.turf?.name || "";
  const close = () => setDismissed((prev) => new Set(prev).add(game._id));

  const btn = (label: string, primary: boolean, onClick: () => void) => (
    <button
      key={label}
      onClick={() => { onClick(); close(); }}
      style={{
        flex: "1 1 auto", minWidth: 120, padding: "11px 14px", borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: "pointer",
        border: primary ? "none" : "1px solid #333",
        background: primary ? accent : "transparent",
        color: primary ? "#000" : "#ccc",
      }}
    >{label}</button>
  );

  const buttons = [];
  if (kind === "reminder") {
    buttons.push(btn("Got it", true, () => {}));
  } else {
    const opts: string[] = decision?.options || [];
    if (opts.includes("confirm")) buttons.push(btn("Confirm now", true, () => onConfirm(game._id)));
    if (opts.includes("switch_alternate")) buttons.push(btn("Switch format", decision?.recommendation === "confirm_alternate", () => onSwitch(game)));
    if (opts.includes("sos")) buttons.push(btn("Send SOS", false, () => onSos(game)));
    if (opts.includes("cancel")) buttons.push(btn("Cancel game", false, () => onCancel(game)));
    if (opts.includes("keep_waiting") || opts.includes("wait")) buttons.push(btn("Keep waiting", false, () => {}));
  }

  return createPortal(
    <div
      onClick={close}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        role="dialog" aria-modal="true"
        style={{ width: "100%", maxWidth: 440, background: "#101010", border: "1px solid #2a2a2a", borderRadius: 16, padding: 22, color: "#fff" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 18 }}>{kind === "reminder" ? "⏰" : "⚠️"}</span>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>
            {kind === "reminder" ? "Check-in coming up" : "Game needs your decision"}
          </h3>
        </div>

        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 8 }}>{game.title}{venue ? <span style={{ color: "#888", fontWeight: 500 }}> · {venue}</span> : null}</div>

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, margin: "12px 0" }}>
          <span style={{ fontSize: 30, fontWeight: 800, color: accent, lineHeight: 1 }}>{n}</span>
          <span style={{ fontSize: 13, color: "#999" }}>player{n === 1 ? "" : "s"} signed up{game.format ? ` · ${game.format}` : ""}</span>
        </div>

        <p style={{ fontSize: 13, color: "#bbb", lineHeight: 1.5, margin: "0 0 16px" }}>
          {kind === "reminder"
            ? "Your second check-in is in about 30 minutes. Be ready to confirm, switch, or cancel."
            : (RECO_MSG[decision?.recommendation] || "This game needs your attention.")}
        </p>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>{buttons}</div>

        <button onClick={close} style={{ marginTop: 12, width: "100%", background: "none", border: "none", color: "#666", fontSize: 12, cursor: "pointer" }}>
          Dismiss for now
        </button>
      </div>
    </div>,
    document.body
  );
}
