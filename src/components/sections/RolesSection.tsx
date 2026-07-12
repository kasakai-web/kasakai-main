"use client";

export function RolesSection() {
  return (
    <section id="roles" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", minHeight: "600px" }}>
      <div
        className="role-panel player reveal-left"
        style={{
          padding: "80px 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          background: "#0a0a0a",
          borderRight: "1px solid var(--border)",
        }}
      >
        <div
          className="role-large-num"
          style={{
            position: "absolute",
            top: "32px",
            right: "32px",
            fontFamily: "var(--cond)",
            fontSize: "96px",
            fontWeight: 900,
            opacity: 0.04,
            lineHeight: 1,
            color: "var(--white)",
            pointerEvents: "none",
          }}
        >
          01
        </div>
        <div
          className="role-tag"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "9.5px",
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "12px",
          }}
        >
          For players
        </div>
        <div
          className="role-title"
          style={{
            fontFamily: "var(--cond)",
            fontSize: "clamp(48px, 5vw, 72px)",
            fontWeight: 900,
            letterSpacing: ".02em",
            lineHeight: 0.9,
            marginBottom: "18px",
            color: "var(--lime)",
          }}
        >
          PLAYER
        </div>
        <div
          className="role-desc"
          style={{
            fontSize: "14px",
            color: "var(--muted)",
            lineHeight: 1.7,
            maxWidth: "320px",
            marginBottom: "32px",
          }}
        >
          Find games near you, secure your spot with one payment, get your team assignment, and show up.
        </div>
        <div
          className="role-perks"
          style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "36px" }}
        >
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Browse open games in your community
          </div>
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Pay securely via in-app wallet
          </div>
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Get team, colour & venue details automatically
          </div>
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Join waitlist — get in when spots open
          </div>
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Rate games and build your reputation
          </div>
        </div>
        <a
          className="role-btn"
          href="/login?role=player"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            fontFamily: "var(--body)",
            fontSize: "12.5px",
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            textDecoration: "none",
            padding: "12px 28px",
            border: "1.5px solid",
            position: "relative",
            overflow: "hidden",
            transition: "color .22s",
            width: "fit-content",
            color: "var(--lime)",
            borderColor: "var(--lime)",
          }}
        >
          <span>Join as Player</span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            style={{
              position: "relative",
              zIndex: 1,
              width: "14px",
              height: "14px",
              flexShrink: 0,
              transition: "transform .22s cubic-bezier(.34,1.4,.64,1)",
            }}
          >
            <path
              d="M3 8H13M9 4L13 8L9 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
      <div
        className="role-panel organiser reveal-right"
        style={{
          padding: "80px 64px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          overflow: "hidden",
          cursor: "pointer",
          background: "#0e0e0e",
        }}
      >
        <div
          className="role-large-num"
          style={{
            position: "absolute",
            top: "32px",
            right: "32px",
            fontFamily: "var(--cond)",
            fontSize: "96px",
            fontWeight: 900,
            opacity: 0.04,
            lineHeight: 1,
            color: "var(--white)",
            pointerEvents: "none",
          }}
        >
          02
        </div>
        <div
          className="role-tag"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "9.5px",
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "12px",
          }}
        >
          For organisers
        </div>
        <div
          className="role-title"
          style={{
            fontFamily: "var(--cond)",
            fontSize: "clamp(48px, 5vw, 72px)",
            fontWeight: 900,
            letterSpacing: ".02em",
            lineHeight: 0.9,
            marginBottom: "18px",
            color: "var(--electric)",
          }}
        >
          ORGANISER
        </div>
        <div
          className="role-desc"
          style={{
            fontSize: "14px",
            color: "var(--muted)",
            lineHeight: 1.7,
            maxWidth: "320px",
            marginBottom: "32px",
          }}
        >
          Run community games without the admin overhead. List, manage, and wrap up in under 15 minutes.
        </div>
        <div
          className="role-perks"
          style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "36px" }}
        >
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Create games in 2 minutes flat
          </div>
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Payments collected automatically
          </div>
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Auto team distribution with edit window
          </div>
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Real-time player list and waitlist control
          </div>
          <div
            className="role-perk"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              fontFamily: "var(--mono)",
              fontSize: "11px",
              letterSpacing: ".04em",
              color: "var(--muted)",
            }}
          >
            Dashboard tracking earnings and game health
          </div>
        </div>
        <a
          className="role-btn"
          href="/login?role=player"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "10px",
            fontFamily: "var(--body)",
            fontSize: "12.5px",
            fontWeight: 700,
            letterSpacing: ".1em",
            textTransform: "uppercase",
            textDecoration: "none",
            padding: "12px 28px",
            border: "1.5px solid",
            position: "relative",
            overflow: "hidden",
            transition: "color .22s",
            width: "fit-content",
            color: "var(--electric)",
            borderColor: "var(--electric)",
          }}
        >
          <span>Join as Player</span>
          <svg
            viewBox="0 0 16 16"
            fill="none"
            style={{
              position: "relative",
              zIndex: 1,
              width: "14px",
              height: "14px",
              flexShrink: 0,
              transition: "transform .22s cubic-bezier(.34,1.4,.64,1)",
            }}
          >
            <path
              d="M3 8H13M9 4L13 8L9 12"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
    </section>
  );
}
