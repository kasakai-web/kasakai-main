"use client";

// ── Host tools ───────────────────────────────────────────────────────────────
//
// What a host or facilitator uses to run one game on the day, from their phone:
//
//   Roster    who is coming — players, guests and who brought them, positions,
//             shirts — and, once the game is completed, who actually turned up
//   Teams     split the squad, move someone across, announce the teams
//   Wrap-up   mark the game completed and add the match video
//
// Each action is the organiser's own, run by the server through /games/:id/staff
// after checking — on every request — that this player is still running this
// game. What is possible right now comes from the console's `capabilities`, so a
// button is only offered when the server will accept it. Phones arrive masked;
// skill ratings never arrive at all.
//
// Publishing here announces the teams but does not confirm the game: whether the
// game is on stays the organiser's decision.

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useAuthGuard } from "@/hooks/useAuthGuard";
import { ConfirmationModal } from "@/components/ui/ConfirmationModal";
import { Toast, useToast } from "@/components/ui/Toast";
import { resolveImageUrl } from "@/utils/api";
import {
  fetchStaffConsole,
  staffAction,
  runByText,
  whenText,
  type StaffConsole,
  type StaffRosterRow,
} from "@/utils/hosting";
import "../../player-dashboard.css";
import "../hosting.css";

type Tab = "roster" | "teams" | "wrap";
type Mark = "present" | "absent" | "no_show" | "not_marked";

const POS: Record<string, string> = {
  goalkeeper: "GK", defender: "DEF", midfielder: "MID", forward: "FWD", any: "Any",
};

const MARKS: { key: Exclude<Mark, "not_marked">; label: string }[] = [
  { key: "present", label: "In" },
  { key: "absent", label: "Absent" },
  { key: "no_show", label: "No-show" },
];

function Avatar({ row }: { row: StaffRosterRow }) {
  const [failed, setFailed] = useState(false);
  const src = row.profileImage ? resolveImageUrl(row.profileImage) : "";
  return (
    <span className="hs-avatar">
      {src && !failed
        // eslint-disable-next-line @next/next/no-img-element
        ? <img src={src} alt="" onError={() => setFailed(true)} />
        : (row.name || "?").substring(0, 2).toUpperCase()}
    </span>
  );
}

const colourOf = (row: StaffRosterRow, sides: StaffConsole["teams"]["sides"]) =>
  row.assignedColour || (row.assignedTeam === "A" ? sides.A.colour : row.assignedTeam === "B" ? sides.B.colour : null);

export default function HostToolsPage() {
  const params = useParams<{ gameId: string }>();
  const gameId = Array.isArray(params?.gameId) ? params.gameId[0] : params?.gameId;
  const { isAuthorized } = useAuthGuard({ requiredRole: "player", redirectTo: "/login?role=player" });
  const { toast, showToast, hideToast } = useToast();

  const [data, setData] = useState<StaffConsole | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("roster");
  const [busy, setBusy] = useState<string | null>(null);
  const [marks, setMarks] = useState<Record<string, Mark>>({});
  const [video, setVideo] = useState("");
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);

  const load = useCallback(async () => {
    if (!gameId) return;
    try {
      const next = await fetchStaffConsole(gameId);
      setData(next);
      setMarks(Object.fromEntries(next.roster.filter((r) => !r.isOrganiser).map((r) => [r.memberId, (r.attended || "not_marked") as Mark])));
      setVideo(next.game.matchRecording || "");
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't open the host tools.");
    }
  }, [gameId]);

  useEffect(() => { if (isAuthorized) load(); }, [isAuthorized, load]);

  const run = async (key: string, fn: () => Promise<unknown>, ok: string) => {
    setBusy(key);
    try {
      await fn();
      showToast("success", ok, undefined, 2200);
      await load();
    } catch (err) {
      showToast("error", "That didn't work", err instanceof Error ? err.message : undefined, 3500);
    } finally {
      setBusy(null);
    }
  };

  const dirtyMarks = useMemo(() => {
    if (!data) return [];
    return data.roster
      .filter((r) => !r.isOrganiser && (marks[r.memberId] || "not_marked") !== (r.attended || "not_marked"))
      .map((r) => ({ regId: r.memberId, status: marks[r.memberId] }));
  }, [data, marks]);

  if (!isAuthorized) return null;

  if (error) {
    return (
      <div className="player-dashboard-container">
        <Link href="/dashboard/hosting" className="hs-btn hs-btn--ghost">← Hosting</Link>
        <div className="hs-error" style={{ marginTop: 16 }}>{error}</div>
      </div>
    );
  }
  if (!data) {
    return (
      <div className="player-dashboard-container">
        <div className="loading-container"><div className="spinner" /><p>Opening host tools…</p></div>
      </div>
    );
  }

  const { game, roster, teams, capabilities: can, counts } = data;
  const venue = [game.turf?.name, game.turf?.address?.area || game.turf?.address?.city].filter(Boolean).join(", ");
  const sideRows = (side: "A" | "B") => roster.filter((r) => r.assignedTeam === side);
  const unassigned = roster.filter((r) => r.assignedTeam !== "A" && r.assignedTeam !== "B");
  const runBy = runByText(data.runBy);

  return (
    <div className="player-dashboard-container">
      <Link href="/dashboard/hosting" className="hs-btn hs-btn--ghost" style={{ paddingLeft: 0 }}>← Hosting</Link>

      <div className="page-header" style={{ marginTop: 8 }}>
        <div className="page-title-group">
          <div className="page-title">
            {game.title || "Game"}
            <span className="hs-badge">{data.role === "facilitator" ? "Facilitator" : "Host"}</span>
          </div>
          <p className="hs-intro">
            {whenText(game.scheduledAt)}{venue ? ` · ${venue}` : ""}{game.format ? ` · ${game.format}` : ""}
            {game.organiser?.name ? ` · ${game.organiser.name}'s game` : ""}
          </p>
        </div>
      </div>

      <div className="hs-facts">
        <span className="hs-fact">Status <b>{game.status}</b></span>
        <span className="hs-fact"><b>{counts.players}</b> players · <b>{counts.guests}</b> guests</span>
        {game.status === "completed" && (
          <span className="hs-fact"><b>{counts.present}</b> in · <b>{counts.noShow}</b> no-show · <b>{counts.notMarked}</b> unmarked</span>
        )}
        {runBy && <span className="hs-fact">{runBy}</span>}
      </div>

      <div className="hs-tabs" role="tablist">
        {(["roster", "teams", "wrap"] as const).map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            className={`hs-tab ${tab === t ? "hs-tab--active" : ""}`}
            onClick={() => setTab(t)}
          >
            {t === "roster" ? "Roster" : t === "teams" ? "Teams" : "Wrap-up"}
          </button>
        ))}
      </div>

      {/* ── Roster ── */}
      {tab === "roster" && (
        <>
          {!can.canMarkAttendance && (
            <p className="hs-hint">
              Attendance opens once the game is marked completed (Wrap-up). Until then this is who is coming.
            </p>
          )}
          <div className="hs-table">
            {roster.map((r) => (
              <div key={r.memberId} className="hs-row">
                <Avatar row={r} />
                <div className="hs-row-main">
                  <div className="hs-row-name">
                    {r.name}
                    {r.isYou && <span className="hs-badge hs-badge--muted">You</span>}
                    {r.seatType === "host" && <span className="hs-badge">Host</span>}
                    {r.isOrganiser && <span className="hs-badge hs-badge--muted">Organiser</span>}
                  </div>
                  <div className="hs-row-sub">
                    {[
                      r.isGuest && r.broughtBy ? `Guest of ${r.broughtBy}` : null,
                      POS[r.position] && r.position !== "any" ? POS[r.position] : null,
                      colourOf(r, teams.sides) ? `${colourOf(r, teams.sides) === "red" ? "Red" : "Blue"} team` : null,
                      r.phone,
                    ].filter(Boolean).join(" · ")}
                  </div>
                </div>
                {can.canMarkAttendance && !r.isOrganiser && (
                  <div className="hs-seg" role="radiogroup" aria-label={`Attendance for ${r.name}`}>
                    {MARKS.map((m) => (
                      <button
                        key={m.key}
                        type="button"
                        role="radio"
                        aria-checked={marks[r.memberId] === m.key}
                        className={marks[r.memberId] === m.key ? `on-${m.key}` : ""}
                        onClick={() => setMarks((prev) => ({
                          ...prev,
                          [r.memberId]: prev[r.memberId] === m.key ? "not_marked" : m.key,
                        }))}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {can.canMarkAttendance && (
            <div className="hs-bar">
              <button
                className="hs-btn hs-btn--primary"
                disabled={busy !== null || dirtyMarks.length === 0}
                onClick={() => run("attendance", () => staffAction(game._id, "attendance", { attendance: dirtyMarks }), "Attendance saved")}
              >
                {busy === "attendance" ? "Saving…" : `Save attendance${dirtyMarks.length ? ` (${dirtyMarks.length})` : ""}`}
              </button>
              <span className="hs-hint">A no-show is recorded against the player — mark it only when they didn&apos;t come.</span>
            </div>
          )}
        </>
      )}

      {/* ── Teams ── */}
      {tab === "teams" && (
        <>
          <div className="hs-bar">
            {can.canDistribute && (
              <button
                className="hs-btn hs-btn--primary"
                disabled={busy !== null}
                onClick={() => run(
                  "distribute",
                  () => staffAction(game._id, "teams/distribute", { reshuffleNonce: teams.distributed ? Math.floor(Math.random() * 1e6) + 1 : 0 }),
                  teams.distributed ? "Teams reshuffled" : "Teams split",
                )}
              >
                {busy === "distribute" ? "Working…" : teams.distributed ? "Reshuffle" : "Split teams"}
              </button>
            )}
            {can.canPublish && (
              <button className="hs-btn" disabled={busy !== null} onClick={() => setConfirmPublish(true)}>
                {teams.published ? "Announce again" : "Announce teams"}
              </button>
            )}
            <span className="hs-hint">
              {teams.published
                ? `Announced ${whenText(teams.publishedAt)} — players can see their shirt.`
                : teams.distributed
                  ? "Not announced yet — only you and the organiser can see these teams."
                  : "Split the squad into two balanced sides, then announce them."}
            </span>
          </div>

          {teams.distributed ? (
            <div className="hs-teams">
              {(["A", "B"] as const).map((side) => {
                const colour = teams.sides[side].colour === "blue" ? "blue" : "red";
                const rows = sideRows(side);
                return (
                  <div key={side} className="hs-team">
                    <div className={`hs-team-head hs-team-head--${colour}`}>
                      {teams.sides[side].name || (colour === "red" ? "Red / White" : "Blue / Black")} · {rows.length}
                    </div>
                    {rows.map((r) => (
                      <div key={r.memberId} className="hs-row">
                        <div className="hs-row-main">
                          <div className="hs-row-name">
                            {r.name}
                            {r.seatType === "host" && <span className="hs-badge">Host</span>}
                          </div>
                          {r.isGuest && r.broughtBy && <div className="hs-row-sub">Guest of {r.broughtBy}</div>}
                        </div>
                        {can.canMove && (
                          <button
                            className="hs-btn hs-btn--ghost"
                            disabled={busy !== null}
                            title="Move to the other side"
                            onClick={() => run(`move-${r.memberId}`, () => staffAction(game._id, "teams/move", { memberId: r.memberId }), `${r.name} moved`)}
                          >
                            ⇄
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hs-empty">No teams yet.</div>
          )}
          {teams.distributed && unassigned.length > 0 && (
            <p className="hs-hint" style={{ marginTop: 10 }}>
              Not on a side yet: {unassigned.map((r) => r.name).join(", ")} — split again to include them.
            </p>
          )}
        </>
      )}

      {/* ── Wrap-up ── */}
      {tab === "wrap" && (
        <>
          <div className="hs-section-head"><span className="hs-section-title">The game</span></div>
          {game.status === "completed" ? (
            <div className="hs-empty">Completed. Mark who turned up in the Roster tab.</div>
          ) : can.canComplete ? (
            <div className="hs-bar">
              <button className="hs-btn hs-btn--primary" disabled={busy !== null} onClick={() => setConfirmComplete(true)}>
                Mark game completed
              </button>
              <span className="hs-hint">Do this once the game has been played. It opens attendance.</span>
            </div>
          ) : (
            <div className="hs-empty">You can mark the game completed once it has kicked off.</div>
          )}

          <div className="hs-section-head"><span className="hs-section-title">Match video</span></div>
          {can.canRecord ? (
            <div className="hs-bar">
              <input
                className="hs-input"
                type="url"
                inputMode="url"
                placeholder="YouTube link of the game…"
                value={video}
                onChange={(e) => setVideo(e.target.value)}
              />
              <button
                className="hs-btn"
                disabled={busy !== null || !video.trim() || video.trim() === (game.matchRecording || "")}
                onClick={() => run("recording", () => staffAction(game._id, "recording", { matchRecording: video.trim() }), "Video saved")}
              >
                {busy === "recording" ? "Saving…" : "Save"}
              </button>
            </div>
          ) : (
            <div className="hs-empty">The video can be added once the game has started.</div>
          )}
        </>
      )}

      <ConfirmationModal
        open={confirmComplete}
        title="Mark the game completed?"
        message="This closes the game for changes and opens attendance. The organiser is told you did it."
        confirmLabel="Mark completed"
        loading={busy === "complete"}
        onConfirm={async () => {
          setConfirmComplete(false);
          await run("complete", () => staffAction(game._id, "complete"), "Game completed");
          setTab("roster");
        }}
        onCancel={() => setConfirmComplete(false)}
      />

      <ConfirmationModal
        open={confirmPublish}
        title="Announce the teams?"
        message="Every player is told their shirt colour. If you change the teams afterwards, you'll need to announce them again."
        confirmLabel="Announce"
        loading={busy === "publish"}
        onConfirm={async () => {
          setConfirmPublish(false);
          await run("publish", () => staffAction(game._id, "teams/publish"), "Teams announced");
        }}
        onCancel={() => setConfirmPublish(false)}
      />

      {toast && <Toast type={toast.type} title={toast.title} subtitle={toast.subtitle} onClose={hideToast} />}
    </div>
  );
}
