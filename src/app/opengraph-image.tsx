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
  fontSize: 96,
  fontWeight: 900,
  letterSpacing: "0.08em",
  lineHeight: 1,
} as const;

// Mark only, dead centre: WhatsApp's small preview is a square cut from the
// middle of this image, so a left-aligned mark got sliced off. Title and
// description already print beside the picture in every app.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#090909",
          fontFamily: "Arial, Helvetica, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 420,
            height: 420,
            border: "10px solid #ffffff",
            flexShrink: 0,
          }}
        >
          <div style={{ ...half, background: "#ffffff", color: "#000000" }}>KASA</div>
          <div style={{ ...half, background: "#000000", color: "#ffffff" }}>KAI</div>
        </div>
      </div>
    ),
    size,
  );
}
