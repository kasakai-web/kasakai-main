"use client";

import React, { useState } from "react";
import Image from "next/image";
import { ImageLightbox } from "@/components/ui/ImageLightbox";
import { resolveImageUrl } from "@/utils/api";

/**
 * The teams, as announced.
 *
 * Reads the published team sheet rather than the live game: the organiser may
 * have reshuffled since, and showing a player a split nobody has told them
 * about would be worse than showing them nothing. The tab that holds this is
 * hidden entirely until the organiser publishes.
 */

export type PublishedTeamPlayer = {
  name: string;
  isGuest?: boolean;
  isOrganiser?: boolean;
  hostName?: string | null;
  /** Sent by the API, deliberately not rendered — see the row below. */
  isGoalkeeper?: boolean;
  isYou?: boolean;
};

export type PublishedTeams = {
  publishedAt?: string;
  revision?: number;
  teams: {
    A: { name?: string | null; colour: "red" | "blue"; players: PublishedTeamPlayer[] };
    B: { name?: string | null; colour: "red" | "blue"; players: PublishedTeamPlayer[] };
  };
  yourTeam?: "A" | "B" | null;
  yourColour?: "red" | "blue" | null;
  /** Why this shirt — the sentence the announcement carried. */
  yourReason?: string | null;
};

const SIDE = {
  red:  { accent: "#ff6b6b", soft: "rgba(255,107,107,0.09)", line: "rgba(255,107,107,0.28)", label: "Red / White", dot: "🔴" },
  blue: { accent: "#74b9ff", soft: "rgba(116,185,255,0.09)", line: "rgba(116,185,255,0.28)", label: "Blue / Black", dot: "🔵" },
} as const;

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]).join("").toUpperCase() || "?";

export function PublishedTeamsView({
  data,
  profileImages = {},
}: {
  data: PublishedTeams;
  profileImages?: Record<string, string>;
}) {
  const sides = (["A", "B"] as const).map((key) => ({
    key,
    ...data.teams[key],
    players: data.teams[key].players.map((player) => ({
      ...player,
      profileImage: profileImages[player.name?.trim().toLowerCase() || "Player"]|| null,
    })),
  }));
  const [lightboxImage, setLightboxImage] = useState<string | null>(null); 
    
  return (
    <div className="pd-teams">
      {data.yourColour && (
        <div
          className="pd-teams-you"
          style={{
            background: SIDE[data.yourColour].soft,
            borderColor: SIDE[data.yourColour].line,
          }}
        >
          <span className="pd-teams-you-dot" style={{ background: SIDE[data.yourColour].accent }} />
          <span className="pd-teams-you-text">
            You&apos;re on <strong style={{ color: SIDE[data.yourColour].accent }}>
              {SIDE[data.yourColour].label}
            </strong>
          </span>
          <span className="pd-teams-you-hint">Wear your team colour</span>
          {data.yourReason && (
            <span className="pd-teams-you-reason">{data.yourReason}</span>
          )}
        </div>
      )}

      <div className="pd-teams-grid">
        {sides.map((side) => {
          const tone = SIDE[side.colour] || SIDE.red;
          const isMine = data.yourTeam === side.key;

          return (
            <div
              key={side.key}
              className={`pd-teams-card${isMine ? " mine" : ""}`}
              style={{ borderColor: isMine ? tone.line : undefined }}
            >
              <div className="pd-teams-card-head" style={{ background: tone.soft }}>
                <span className="pd-teams-card-title" style={{ color: tone.accent }}>
                  {tone.dot} {tone.label}
                </span>
                <span className="pd-teams-card-count">{side.players.length}</span>
              </div>

              <div className="pd-teams-list">
                {side.players.length === 0 && (
                  <div className="pd-teams-empty">Nobody on this side</div>
                )}
                {side.players.map((p, i) => {
                  const imageUrl = resolveImageUrl(p.profileImage);
                  return (
                  <div key={i} className={`pd-teams-row${p.isYou ? " you" : ""}`}>
                    <span
                      className="pd-teams-avatar"
                      style={{
                        background: p.isYou ? tone.accent : "rgba(255,255,255,0.07)",
                        color: p.isYou ? "#0f1012" : "#9aa0a6",
                        cursor: imageUrl ? "zoom-in" : "default",
                        overflow: "hidden",
                      }}
                      onClick={() => { if (imageUrl) setLightboxImage(imageUrl); }}
                      role={imageUrl ? "button" : undefined}
                      tabIndex={imageUrl ? 0 : undefined}
                      onKeyDown={(event) => {
                        if (imageUrl && (event.key === "Enter" || event.key === " ")) {
                          event.preventDefault();
                          setLightboxImage(imageUrl);
                        }
                      }}
                      aria-label={imageUrl ? `View ${p.name}'s profile photo` : undefined}
                    >
                      {imageUrl ? (
                        <Image src={imageUrl} alt={p.name} width={36} height={36} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      ) : initials(p.name)}
                    </span>
                    <span className="pd-teams-name">
                      {p.name}
                      {p.isYou && <span className="pd-teams-chip you">You</span>}
                      {/* No keeper chip: the distributor balances the sides on who can
                          go in goal, but that stays between the algorithm and the
                          organiser — a player reads only names and shirt colours. */}
                      {p.isOrganiser && <span className="pd-teams-chip">Organiser</span>}
                      {p.isGuest && (
                        <span className="pd-teams-chip">
                          {p.hostName ? `Guest of ${p.hostName}` : "Guest"}
                        </span>
                      )}
                    </span>
                  </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="pd-teams-foot">
        Teams set by the organiser
        {data.publishedAt
          ? ` · announced ${new Date(data.publishedAt).toLocaleString("en-IN", {
            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: true,
          })}`
          : ""}
        {/* Revision 1 is the only announcement, so saying "updated" would be a lie. */}
        {(data.revision || 1) > 1 ? ` · updated ${data.revision! - 1}×` : ""}
      </div>
      {lightboxImage && (
        <ImageLightbox
          lightboxImage={lightboxImage}
          setLightboxImage={setLightboxImage}
          alt="Player profile photo"
        />
      )}
    </div>
  );
}
