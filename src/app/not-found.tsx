import Link from "next/link";

export default function NotFound() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "var(--black)",
        color: "var(--white)",
        padding: "20px",
        textAlign: "center",
      }}
    >
      <h1
        style={{
          fontFamily: "var(--cond)",
          fontSize: "96px",
          fontWeight: 900,
          letterSpacing: "0.1em",
          color: "var(--lime)",
          margin: 0,
        }}
      >
        404
      </h1>
      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: "24px",
          fontWeight: 700,
          color: "var(--white)",
          marginTop: "20px",
          marginBottom: "10px",
        }}
      >
        Page Not Found
      </p>
      <p
        style={{
          fontFamily: "var(--body)",
          fontSize: "16px",
          color: "var(--muted)",
          marginBottom: "40px",
          maxWidth: "400px",
        }}
      >
        The page you're looking for doesn't exist. Let's get you back on track.
      </p>
      <Link
        href="/"
        style={{
          fontFamily: "var(--body)",
          fontSize: "13px",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          background: "var(--white)",
          color: "#000",
          padding: "13px 32px",
          textDecoration: "none",
          display: "inline-block",
          cursor: "pointer",
          position: "relative",
          overflow: "hidden",
          transition: "color 0.2s",
        }}
        className="btn-primary"
      >
        Return Home
      </Link>
    </div>
  );
}
