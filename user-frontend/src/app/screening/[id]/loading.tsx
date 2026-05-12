export default function ScreeningDetailLoading() {
  return (
    <div style={{ background: "#050505", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ height: 66, borderBottom: "1px solid #1a1a1a", background: "rgba(8,8,8,0.97)" }} />

      {/* Hero skeleton */}
      <div style={{ height: "clamp(240px,46vw,500px)", background: "#111", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, #141414 25%, #1a1a1a 50%, #141414 75%)", backgroundSize: "200% 200%", animation: "shimmer 1.5s ease-in-out infinite" }} />
        <div style={{ position: "absolute", bottom: 32, left: "clamp(16px,4vw,52px)", right: "clamp(16px,4vw,52px)" }}>
          <div style={{ width: 80, height: 20, background: "#1e1e1e", borderRadius: 2, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: "50%", height: 36, background: "#1e1e1e", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      </div>

      {/* Info strip */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "16px clamp(16px,4vw,52px)", display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[100, 80, 140, 90].map((w, i) => (
          <div key={i} style={{ width: w, height: 34, background: "#111", borderRadius: 6, animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>

      {/* Two-col body */}
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "40px clamp(16px,4vw,52px)", display: "grid", gridTemplateColumns: "1fr 340px", gap: 40, alignItems: "start" }}>
        {/* Left */}
        <div style={{ display: "flex", flexDirection: "column", gap: 32 }}>
          {[120, 80, 160].map((h, i) => (
            <div key={i}>
              <div style={{ width: 140, height: 14, background: "#111", borderRadius: 2, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ height: h, background: "#0e0e0e", borderRadius: 4, animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
        {/* Right widget */}
        <div style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 12, height: 360, animation: "pulse 1.5s ease-in-out infinite" }} />
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.35} }
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
      `}</style>
    </div>
  );
}
