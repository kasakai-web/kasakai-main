"use client";

import { STATS } from "@/config/stats";

export function StatsStrip() {
  return (
    <div className="strip reveal">
      {STATS.map((stat, index) => (
        <div
          className="strip-item"
          key={index}
          style={{
            flex: 1,
            padding: "32px 28px",
            borderRight: "1px solid var(--border)",
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            position: "relative",
            overflow: "hidden",
            transition: "background .22s",
          }}
        >
          <div
            className={`strip-num reveal d${index + 1}`}
            style={{
              fontFamily: "var(--cond)",
              fontSize: "48px",
              fontWeight: 900,
              letterSpacing: "-.02em",
              color: "var(--white)",
              lineHeight: 1,
            }}
          >
            {stat.number}
          </div>
          <div
            className={`strip-label reveal d${index + 2}`}
            style={{
              fontFamily: "var(--mono)",
              fontSize: "10px",
              letterSpacing: ".2em",
              textTransform: "uppercase",
              color: "var(--muted)",
            }}
          >
            {stat.label}
          </div>
        </div>
      ))}
    </div>
  );
}
