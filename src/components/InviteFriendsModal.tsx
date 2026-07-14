"use client";

import { useState } from "react";
import { buildApiUrl, getSession } from "@/utils/api";

type ShowToast = (type: "success" | "error", title: string, message?: string) => void;

interface Props {
  gameId: string;
  gameTitle?: string;
  onClose: () => void;
  showToast: ShowToast;
}

/**
 * Lets a player who is already in a PRIVATE game invite others by name + phone.
 * Each invitee gets a WhatsApp link; because the invite comes from a player (not
 * the organiser), the organiser must approve each request before they're seated.
 */
export function InviteFriendsModal({ gameId, gameTitle, onClose, showToast }: Props) {
  const [friends, setFriends] = useState<{ name: string; phone: string }[]>([]);
  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [sending, setSending] = useState(false);

  const addFriend = () => {
    const name = fName.trim();
    const phone = fPhone.replace(/\D/g, "");
    if (!name || phone.length < 10) { showToast("error", "Enter a name and a valid phone number"); return; }
    if (friends.some((f) => f.phone === phone)) { showToast("error", "That number is already in the list"); return; }
    setFriends((x) => [...x, { name, phone }]);
    setFName(""); setFPhone("");
  };

  const send = async () => {
    if (friends.length === 0) return;
    const { token } = getSession();
    if (!token) return;
    setSending(true);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${gameId}/invite`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ invitees: friends }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) { showToast("error", "Couldn't send", d.message); return; }
      if (d.whatsapp && d.whatsapp.failed > 0) {
        showToast("error", "Saved, WhatsApp failed", `${d.whatsapp.sent} sent, ${d.whatsapp.failed} not delivered.`);
      } else {
        showToast("success", "Invites sent", d.message);
      }
      setFriends([]);
      onClose();
    } catch {
      showToast("error", "Couldn't send invites", "Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 440, background: "#111214", border: "1px solid #2a2a2a", borderRadius: 16, padding: 22, color: "#fff" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>👥 Invite friends</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#888", fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
        </div>
        <p style={{ fontSize: 12.5, color: "#9aa", margin: "0 0 14px", lineHeight: 1.5 }}>
          Invite people to <b style={{ color: "#ddd" }}>{gameTitle || "this game"}</b>. They get a WhatsApp link, and the organiser approves each request.
        </p>

        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={fName}
            onChange={(e) => setFName(e.target.value)}
            placeholder="Name"
            style={{ flex: 1, minWidth: 0, padding: "10px 12px", borderRadius: 9, border: "1px solid #2a2a2a", background: "#141414", color: "#fff", fontSize: 13 }}
          />
          <input
            value={fPhone}
            onChange={(e) => setFPhone(e.target.value)}
            placeholder="Phone"
            inputMode="tel"
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addFriend(); } }}
            style={{ width: 120, padding: "10px 12px", borderRadius: 9, border: "1px solid #2a2a2a", background: "#141414", color: "#fff", fontSize: 13 }}
          />
          <button type="button" onClick={addFriend} style={{ flexShrink: 0, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(200,255,62,0.3)", background: "rgba(200,255,62,0.08)", color: "#c8ff3e", fontWeight: 700, cursor: "pointer" }}>Add</button>
        </div>

        {friends.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {friends.map((f, i) => (
              <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#eee", background: "#1c1c1c", border: "1px solid #333", borderRadius: 20, padding: "4px 6px 4px 11px" }}>
                {f.name} · {f.phone}
                <button onClick={() => setFriends((x) => x.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
              </span>
            ))}
          </div>
        )}

        <button
          disabled={friends.length === 0 || sending}
          onClick={send}
          style={{ width: "100%", padding: 12, borderRadius: 9, border: "none", fontWeight: 800,
            background: friends.length === 0 ? "#2a2a2a" : "#c8ff3e",
            color: friends.length === 0 ? "#888" : "#000",
            cursor: friends.length === 0 || sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}
        >
          {sending ? "Sending…" : friends.length === 0 ? "Add a friend to invite" : `Send ${friends.length} invite${friends.length !== 1 ? "s" : ""}`}
        </button>
      </div>
    </div>
  );
}
