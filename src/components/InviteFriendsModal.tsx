"use client";

import { useEffect, useRef, useState } from "react";
import { buildApiUrl, getSession, resolveImageUrl } from "@/utils/api";

type ShowToast = (type: "success" | "error", title: string, message?: string) => void;

interface Props {
  gameId: string;
  gameTitle?: string;
  onClose: () => void;
  showToast: ShowToast;
}

/** A queued invitee — either a picked Kasa Kai account or a typed name + phone. */
type InviteRow = { name: string; phone?: string; playerId?: string; subtitle?: string };

type SearchHit = {
  _id: string;
  name: string;
  profileImage?: string | null;
  phoneMasked?: string;
  totalGamesPlayed?: number;
};

/** What the backend says this player may do on this game right now. */
type InviteConfig = {
  canInvite: boolean;
  reason: string;
  code: string;
  remaining: number | null;
  maxInvitesPerGame: number;
  allowPlayerSearch: boolean;
  whatsappEnabled: boolean;
  /** Will the people I invite need the organiser's approval, or go straight in? */
  needsApproval: boolean;
  searchMinChars: number;
};

const SEARCH_DEBOUNCE_MS = 300;

/**
 * Lets a player who is already in a game invite others.
 *
 * Two ways in, because they answer different problems: SEARCH finds someone who
 * already has an account (no typing their number, and they land in the app with
 * their history intact), while name + phone covers the friend who isn't on Kasa
 * Kai yet. Both queue into the same list and go out in one request.
 *
 * Whether any of it is available at all is the platform's call, not this
 * component's — `/invite/config` answers that per game, and the same rules are
 * re-checked when the invites are actually sent.
 */
export function InviteFriendsModal({ gameId, gameTitle, onClose, showToast }: Props) {
  const [rows, setRows] = useState<InviteRow[]>([]);
  const [fName, setFName] = useState("");
  const [fPhone, setFPhone] = useState("");
  const [sending, setSending] = useState(false);

  const [config, setConfig] = useState<InviteConfig | null>(null);
  const [configLoading, setConfigLoading] = useState(true);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchHit[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [dismissed, setDismissed] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  // Is this query long enough to send? Derived during render rather than decided
  // inside the effect, so the "type 3 more characters" hint is just a function of
  // what is in the box — no state to fall out of step with it.
  //
  // The backend only matches a WHOLE number, so a partial one is held back here
  // instead of firing a request per digit that can only come back empty.
  const trimmedQuery = query.trim();
  const queryDigits = trimmedQuery.replace(/\D/g, "");
  const queryIsNumeric = queryDigits.length > 0 && /^[+\d\s()-]+$/.test(trimmedQuery);
  const minChars = config?.searchMinChars ?? 3;
  const tooShort = queryIsNumeric
    ? queryDigits.length < 10
      ? "Enter the full 10-digit number"
      : ""
    : trimmedQuery.length < minChars
      ? `Type at least ${minChars} characters`
      : "";
  const searchReady = !!config?.allowPlayerSearch && trimmedQuery.length > 0 && !tooShort;

  // What the platform allows here. Fetched on open so an admin turning invites
  // off (or a cap already spent) shows as a reason, not as a failed send.
  useEffect(() => {
    let cancelled = false;
    const { token } = getSession();
    const done = () => { if (!cancelled) setConfigLoading(false); };
    if (!token) { done(); return; }
    fetch(buildApiUrl(`/api/v1/games/${gameId}/invite/config`), {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => { if (!cancelled && d?.success) setConfig(d.data); })
      .catch(() => {})
      .finally(done);
    return () => { cancelled = true; };
  }, [gameId]);

  // Debounced directory search, aborting the in-flight request on each keystroke
  // so only the latest query's results ever land.
  useEffect(() => {
    if (!searchReady) return;
    const ctrl = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { token } = getSession();
        const res = await fetch(
          buildApiUrl(`/api/v1/games/${gameId}/invite/search?q=${encodeURIComponent(trimmedQuery)}`),
          { headers: { Authorization: `Bearer ${token}` }, signal: ctrl.signal },
        );
        const d = await res.json();
        if (res.ok && d?.success) { setResults(d.data || []); setSearchError(""); }
        else { setResults([]); setSearchError(d?.message || "Couldn't search"); }
      } catch (e) {
        if ((e as { name?: string })?.name !== "AbortError") { setResults([]); setSearchError("Couldn't search"); }
      } finally {
        setSearching(false);
      }
    }, SEARCH_DEBOUNCE_MS);

    return () => { clearTimeout(timer); ctrl.abort(); };
  }, [searchReady, trimmedQuery, gameId]);

  // Close the results dropdown on an outside click without closing the modal.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchBoxRef.current?.contains(e.target as Node)) return;
      setDismissed(true);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  // 0 max = unlimited, in which case `remaining` is null and there is no ceiling
  // to bump into. Otherwise the queue can't outgrow what's left.
  const remaining = config?.remaining ?? null;
  const atLimit = remaining !== null && rows.length >= remaining;

  const addRow = (row: InviteRow) => {
    if (atLimit) {
      showToast("error", "No invites left", `You can invite ${remaining} more to this game.`);
      return false;
    }
    setRows((x) => [...x, row]);
    return true;
  };

  const addFromSearch = (p: SearchHit) => {
    if (rows.some((r) => r.playerId === p._id)) return;
    if (addRow({ name: p.name, playerId: p._id, subtitle: p.phoneMasked })) {
      setQuery(""); setResults([]); setSearchError("");
    }
  };

  const addManual = () => {
    const name = fName.trim();
    const phone = fPhone.replace(/\D/g, "");
    if (!name || phone.length < 10) { showToast("error", "Enter a name and a valid phone number"); return; }
    if (rows.some((r) => r.phone === phone)) { showToast("error", "That number is already in the list"); return; }
    if (addRow({ name, phone, subtitle: phone })) { setFName(""); setFPhone(""); }
  };

  const send = async () => {
    if (rows.length === 0) return;
    const { token } = getSession();
    if (!token) return;
    setSending(true);
    try {
      const res = await fetch(buildApiUrl(`/api/v1/games/${gameId}/invite`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          invitees:  rows.filter((r) => r.phone && !r.playerId).map((r) => ({ name: r.name, phone: r.phone })),
          playerIds: rows.filter((r) => r.playerId).map((r) => r.playerId),
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.success) { showToast("error", "Couldn't send", d.message); return; }
      if (d.whatsapp && d.whatsapp.failed > 0) {
        showToast("error", "Saved, WhatsApp failed", `${d.whatsapp.sent} sent, ${d.whatsapp.failed} not delivered.`);
      } else {
        showToast("success", "Invites sent", d.message);
      }
      setRows([]);
      onClose();
    } catch {
      showToast("error", "Couldn't send invites", "Please try again.");
    } finally {
      setSending(false);
    }
  };

  const blocked = !configLoading && config !== null && !config.canInvite;

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
          Invite people to <b style={{ color: "#ddd" }}>{gameTitle || "this game"}</b>.
          {" "}They get {config && !config.whatsappEnabled ? "an invite link" : "a WhatsApp link"}
          {/* Say which of the two actually happens. Promising approval on a game
              that seats them straight away is the kind of small lie that has the
              invitee waiting for a notification that is never coming. */}
          {config && !config.needsApproval
            ? " and can join straight away, while spots last."
            : ", and the organiser approves each request."}
        </p>

        {configLoading && (
          <div style={{ fontSize: 12.5, color: "#888", padding: "18px 0", textAlign: "center" }}>Checking…</div>
        )}

        {blocked && (
          <div style={{ fontSize: 12.5, color: "#f0a", background: "rgba(255,0,80,0.06)", border: "1px solid rgba(255,0,80,0.22)", borderRadius: 10, padding: "12px 14px", lineHeight: 1.5 }}>
            {config?.reason || "Invites aren't available for this game."}
          </div>
        )}

        {!configLoading && !blocked && (
          <>
            {/* Search the player directory — finds someone who already has an
                account, so there's no number to type and no duplicate profile. */}
            {config?.allowPlayerSearch && (
              <div ref={searchBoxRef} style={{ position: "relative", marginBottom: 10 }}>
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setDismissed(false); }}
                  placeholder="🔍 Search players by name or phone…"
                  style={{ width: "100%", padding: "10px 12px", borderRadius: 9, border: "1px solid #2a2a2a", background: "#141414", color: "#fff", fontSize: 13, boxSizing: "border-box" }}
                />
                {trimmedQuery.length > 0 && !dismissed && (
                  <div style={{ position: "absolute", zIndex: 5, top: "calc(100% + 4px)", left: 0, right: 0, background: "#161616", border: "1px solid #2a2a2a", borderRadius: 10, maxHeight: 232, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                    {tooShort ? (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>{tooShort}</div>
                    ) : searching && results.length === 0 ? (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>Searching…</div>
                    ) : results.length === 0 ? (
                      <div style={{ padding: "10px 12px", fontSize: 12, color: "#888" }}>{searchError || "No one found"}</div>
                    ) : results.map((p) => {
                      const added = rows.some((r) => r.playerId === p._id);
                      return (
                        <button
                          key={p._id}
                          type="button"
                          disabled={added || atLimit}
                          onClick={() => addFromSearch(p)}
                          style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "transparent", border: "none", borderBottom: "1px solid #202020", color: added ? "#666" : "#eee", cursor: added || atLimit ? "default" : "pointer", textAlign: "left" }}
                        >
                          <span style={{ flexShrink: 0, width: 28, height: 28, borderRadius: "50%", background: "#242424", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#c8ff3e", overflow: "hidden" }}>
                            {p.profileImage
                              ? <img src={resolveImageUrl(p.profileImage)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              : (p.name?.[0] || "?").toUpperCase()}
                          </span>
                          <span style={{ minWidth: 0, flex: 1 }}>
                            <span style={{ display: "block", fontSize: 13, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                            <span style={{ display: "block", fontSize: 11, color: "#777" }}>
                              {[p.phoneMasked, typeof p.totalGamesPlayed === "number" ? `${p.totalGamesPlayed}g` : null].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <span style={{ flexShrink: 0, fontSize: 12, color: added ? "#666" : "#c8ff3e", fontWeight: 700 }}>{added ? "✓ Added" : "+ Add"}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {config?.allowPlayerSearch && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "0 0 10px" }}>
                <span style={{ flex: 1, height: 1, background: "#242424" }} />
                <span style={{ fontSize: 10.5, color: "#666", textTransform: "uppercase", letterSpacing: 0.5 }}>or invite by number</span>
                <span style={{ flex: 1, height: 1, background: "#242424" }} />
              </div>
            )}

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
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addManual(); } }}
                style={{ width: 120, padding: "10px 12px", borderRadius: 9, border: "1px solid #2a2a2a", background: "#141414", color: "#fff", fontSize: 13 }}
              />
              <button type="button" onClick={addManual} disabled={atLimit} style={{ flexShrink: 0, padding: "0 14px", borderRadius: 9, border: "1px solid rgba(200,255,62,0.3)", background: "rgba(200,255,62,0.08)", color: "#c8ff3e", fontWeight: 700, cursor: atLimit ? "not-allowed" : "pointer", opacity: atLimit ? 0.5 : 1 }}>Add</button>
            </div>

            {rows.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
                {rows.map((r, i) => (
                  <span key={r.playerId || r.phone || i} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "#eee", background: "#1c1c1c", border: "1px solid #333", borderRadius: 20, padding: "4px 6px 4px 11px" }}>
                    {r.name}{r.subtitle ? ` · ${r.subtitle}` : ""}
                    <button onClick={() => setRows((x) => x.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#888", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
                  </span>
                ))}
              </div>
            )}

            {remaining !== null && (
              <p style={{ fontSize: 11.5, color: atLimit ? "#f0a" : "#777", margin: "0 0 10px" }}>
                {atLimit
                  ? `That's all ${remaining} invite${remaining === 1 ? "" : "s"} you have left for this game.`
                  : `${remaining - rows.length} of your ${config?.maxInvitesPerGame} invites left for this game.`}
              </p>
            )}

            <button
              disabled={rows.length === 0 || sending}
              onClick={send}
              style={{ width: "100%", padding: 12, borderRadius: 9, border: "none", fontWeight: 800,
                background: rows.length === 0 ? "#2a2a2a" : "#c8ff3e",
                color: rows.length === 0 ? "#888" : "#000",
                cursor: rows.length === 0 || sending ? "not-allowed" : "pointer", opacity: sending ? 0.7 : 1 }}
            >
              {sending ? "Sending…" : rows.length === 0 ? "Add a friend to invite" : `Send ${rows.length} invite${rows.length !== 1 ? "s" : ""}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
