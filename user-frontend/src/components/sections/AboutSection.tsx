export function AboutSection() {
  return (
    <section id="about" style={{ background: "#0c0c0c", borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "68px 24px" }}>
      <div className="container">
        <p
          className="reveal"
          style={{
            fontFamily: "var(--mono)",
            fontSize: "11px",
            letterSpacing: ".22em",
            textTransform: "uppercase",
            color: "var(--muted)",
            marginBottom: "12px",
          }}
        >
          About Kasa Kai
        </p>
        <h2
          className="reveal d1"
          style={{
            fontFamily: "var(--cond)",
            fontSize: "clamp(40px, 6.5vw, 72px)",
            lineHeight: 0.94,
            marginBottom: "14px",
          }}
        >
          One place to discover,
          <br />
          join, and run football games.
        </h2>
        <p className="reveal d2" style={{ maxWidth: 760, color: "var(--muted)", fontSize: "15px", lineHeight: 1.9, marginBottom: "24px" }}>
          Kasa Kai keeps players and organisers on the same flow: game discovery, registration, payments, and match-day updates.
        </p>

        <div className="reveal d3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1px", border: "1px solid var(--border)", background: "var(--border)" }}>
          <div style={{ background: "#101010", padding: "18px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--lime)", marginBottom: "8px" }}>
              For players
            </div>
            <p style={{ color: "#d1d1d1", fontSize: "14px", lineHeight: 1.7 }}>Find a game, pay quickly, and stay updated.</p>
          </div>
          <div style={{ background: "#101010", padding: "18px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--electric)", marginBottom: "8px" }}>
              For organisers
            </div>
            <p style={{ color: "#d1d1d1", fontSize: "14px", lineHeight: 1.7 }}>Create events, manage slots, and track collections.</p>
          </div>
          <div style={{ background: "#101010", padding: "18px" }}>
            <div style={{ fontFamily: "var(--mono)", fontSize: "10px", letterSpacing: ".16em", textTransform: "uppercase", color: "var(--coral)", marginBottom: "8px" }}>
              Built for local football
            </div>
            <p style={{ color: "#d1d1d1", fontSize: "14px", lineHeight: 1.7 }}>Simple flows, faster coordination, better game days.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
