import { ImageResponse } from "next/og";

// The link-preview picture for every page (WhatsApp, Facebook, X, LinkedIn).
// It replaced /kasa-kai-logo.svg, which those apps do not render, so shared
// links showed no picture at all. Same KASA / KAI mark as icon.tsx, at 1200×630.
export const alt = "Kasa Kai — football games across India";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const half = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 64,
  fontWeight: 900,
  letterSpacing: "0.08em",
  lineHeight: 1,
} as const;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 72,
          width: "100%",
          height: "100%",
          padding: "0 96px",
          background: "#090909",
          color: "#ffffff",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 280,
            height: 280,
            border: "8px solid #ffffff",
            flexShrink: 0,
          }}
        >
          <div style={{ ...half, background: "#ffffff", color: "#000000" }}>KASA</div>
          <div style={{ ...half, background: "#000000", color: "#ffffff" }}>KAI</div>
        </div>
        {/* Fixed width (1200 − padding − mark − gap) or the headline does not wrap. */}
        <div style={{ display: "flex", flexDirection: "column", gap: 24, width: 656 }}>
          <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1.05 }}>
            Football games across India
          </div>
          <div style={{ fontSize: 32, color: "#b5b5b5" }}>
            Join a game · Book your spot · Come solo
          </div>
          <div style={{ fontSize: 32, color: "#8a8a8a" }}>www.kasakai.in</div>
        </div>
      </div>
    ),
    size,
  );
}
