export default function ScreeningLoading() {
  return (
    <div style={{ background: "#050505", minHeight: "100vh" }}>
      {/* Header skeleton */}
      <div style={{ height: 66, borderBottom: "1px solid #1a1a1a", background: "rgba(8,8,8,0.97)", display: "flex", alignItems: "center", gap: 0 }}>
        <div style={{ width: 64, height: "100%", borderRight: "1px solid #1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: 34, height: 34, background: "#141414", animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
        <div style={{ padding: "0 20px", borderRight: "1px solid #1a1a1a", display: "flex", flexDirection: "column", gap: 6 }}>
          <div style={{ width: 48, height: 8, background: "#141414", borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
          <div style={{ width: 80, height: 10, background: "#1a1a1a", borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
        </div>
      </div>

      {/* Hero skeleton */}
      <div style={{ borderBottom: "1px solid #1a1a1a", padding: "56px 48px 0" }}>
        <div style={{ width: 90, height: 20, background: "#111", borderRadius: 2, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: "55%", height: 48, background: "#111", borderRadius: 4, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ width: "40%", height: 14, background: "#0e0e0e", borderRadius: 2, marginBottom: 32, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ display: "flex", borderTop: "1px solid #1a1a1a" }}>
          {[0, 1, 2, 3].map(i => (
            <div key={i} style={{ flex: 1, padding: "18px 16px", borderLeft: i > 0 ? "1px solid #1a1a1a" : "none", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <div style={{ width: 32, height: 24, background: "#111", borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ width: 48, height: 8, background: "#0e0e0e", borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
            </div>
          ))}
        </div>
      </div>

      {/* Grid skeleton */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "48px 48px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[0, 1, 2, 3, 4, 5].map(i => (
            <div key={i} style={{ background: "#111", border: "1px solid #1e1e1e", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ height: 200, background: "#141414", animation: "pulse 1.5s ease-in-out infinite" }} />
              <div style={{ padding: "20px" }}>
                <div style={{ width: "80%", height: 16, background: "#161616", borderRadius: 3, marginBottom: 12, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: "60%", height: 12, background: "#131313", borderRadius: 2, marginBottom: 16, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ width: 120, height: 28, background: "#131313", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                <div style={{ height: 1, background: "#1a1a1a", margin: "20px 0 16px" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ width: 80, height: 12, background: "#111", borderRadius: 2, animation: "pulse 1.5s ease-in-out infinite" }} />
                  <div style={{ width: 90, height: 32, background: "#111", borderRadius: 8, animation: "pulse 1.5s ease-in-out infinite" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
