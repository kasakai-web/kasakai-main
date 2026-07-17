"use client";

// import dynamic from "next/dynamic";

// const ScreeningCarousel = dynamic(
//   () =>
//     import("./ScreeningCarousel").then((m) => ({
//       default: m.ScreeningCarousel,
//     })),
//   { ssr: false },
// );

export function HeroSection() {
  return (
    <>
      <section
        id="home"
        className="hero-section"
        style={{
          height: "100vh",
          position: "relative",
          overflow: "hidden",
          background:
            "radial-gradient(900px 500px at 20% 15%, rgba(196, 213, 108, 0.1), transparent 55%), radial-gradient(760px 420px at 85% 30%, rgba(111, 200, 218, 0.08), transparent 56%), linear-gradient(180deg, #0b0b0b 0%, #090909 50%, #070707 100%)",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 50% 52%, rgba(255,255,255,0.03) 0%, transparent 42%), linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 24%, transparent 76%, rgba(0,0,0,0.22) 100%)",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />

        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            opacity: 0.04,
          }}
        >
          <svg
            viewBox="0 0 1440 900"
            preserveAspectRatio="xMidYMid slice"
            style={{ width: "100%", height: "100%" }}
          >
            <g stroke="rgba(255,255,255,1)" strokeWidth="1" fill="none">
              <rect x="80" y="60" width="1280" height="780" />
              <line x1="720" y1="60" x2="720" y2="840" />
              <circle cx="720" cy="450" r="140" />
              <circle
                cx="720"
                cy="450"
                r="5"
                fill="rgba(255,255,255,0.8)"
                stroke="none"
              />
              <rect x="80" y="258" width="220" height="384" />
              <rect x="1140" y="258" width="220" height="384" />
              <rect x="80" y="342" width="100" height="216" />
              <rect x="1260" y="342" width="100" height="216" />
              <circle
                cx="240"
                cy="450"
                r="5"
                fill="rgba(255,255,255,0.8)"
                stroke="none"
              />
              <circle
                cx="1200"
                cy="450"
                r="5"
                fill="rgba(255,255,255,0.8)"
                stroke="none"
              />
              <path d="M80,60 a28,28 0 0,1 28,28" />
              <path d="M1360,60 a28,28 0 0,0 -28,28" />
              <path d="M80,840 a28,28 0 0,0 28,-28" />
              <path d="M1360,840 a28,28 0 0,1 -28,-28" />
            </g>
          </svg>
        </div>

        <div
          style={{
            position: "absolute",
            top: "90px",
            right: "40px",
            zIndex: 20,
            fontFamily: "var(--mono)",
            fontSize: "9.5px",
            letterSpacing: ".18em",
            color: "rgba(255,255,255,0.12)",
            writingMode: "vertical-rl",
            textTransform: "uppercase",
            pointerEvents: "none",
          }}
        >
          Kasa Kai — 2025
        </div>

        <div
          style={{
            position: "absolute",
            top: "52px",
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1,
          }}
        >
          {/* <ScreeningCarousel /> */}

          <picture>
            {/* Mobile crop below the 524px breakpoint, desktop otherwise */}
            <source
              media="(max-width: 524px)"
              srcSet="https://kasakai-backend-hta7fydfarbdf8bh.centralindia-01.azurewebsites.net/uploads/scr-1783774221022-fcnpk0pftd8.jpg"
            />
            <img
              alt="turf meets real people"
              src="https://kasakai-backend-hta7fydfarbdf8bh.centralindia-01.azurewebsites.net/uploads/scr-1783774213911-94kyh5t0fvu.jpg"
              className="hero-img"
              fetchPriority="high"
              decoding="async"
            />
          </picture>
        </div>
      </section>

      <div className="hero-strip">
        <a href="/login" className="hero-strip-btn hero-strip-football">
          ⚽ Turf Meets
        </a>
        {/* <a href="/screening" className="hero-strip-btn hero-strip-screening">
          🏟️ Screening
        </a> */}
      </div>

      <style jsx>{`
        picture {
          display: block;
          width: 100%;
          height: 100%;
        }

        .hero-img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          object-position: center;
        }

        @keyframes hero-orb-float {
          0%,
          100% {
            transform: translate3d(0, 0, 0) scale(1);
          }
          50% {
            transform: translate3d(0, -10px, 0) scale(1.04);
          }
        }

        .hero-section::before,
        .hero-section::after {
          content: "";
          position: absolute;
          border-radius: 999px;
          filter: blur(28px);
          pointer-events: none;
          z-index: 0;
          animation: hero-orb-float 12s ease-in-out infinite;
        }

        .hero-section::before {
          width: 260px;
          height: 260px;
          left: -80px;
          top: 120px;
          background: rgba(196, 213, 108, 0.12);
        }

        .hero-section::after {
          width: 320px;
          height: 320px;
          right: -90px;
          top: 18%;
          background: rgba(111, 200, 218, 0.1);
          animation-delay: -4s;
        }

        .hero-strip {
          display: flex;
          justify-content: center;
          gap: 14px;
          padding: 16px clamp(18px, 5vw, 80px);
          background: var(--black);
          border-bottom: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow: 0 -18px 42px rgba(0, 0, 0, 0.34);
          position: relative;
          z-index: 2;
          animation: strip-in 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both;
        }

        .hero-strip-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 220px;
          height: 52px;
          font-family: var(--cond);
          font-size: 15px;
          font-weight: 900;
          letter-spacing: 0.13em;
          text-transform: uppercase;
          text-decoration: none;
          border-radius: 12px;
          position: relative;
          overflow: hidden;
          transition:
            transform 0.22s cubic-bezier(0.22, 1, 0.36, 1),
            box-shadow 0.22s cubic-bezier(0.22, 1, 0.36, 1),
            background 0.22s,
            border-color 0.22s;
        }

        .hero-strip-btn:hover {
          transform: translateY(-3px);
          box-shadow:
            0 8px 28px rgba(200, 241, 53, 0.2),
            0 2px 8px rgba(0, 0, 0, 0.4);
        }

        .hero-strip-btn:active {
          transform: translateY(-1px) scale(0.97);
          box-shadow: 0 3px 10px rgba(200, 241, 53, 0.12);
        }

        .hero-strip-football,
        .hero-strip-screening {
          background: rgba(200, 241, 53, 0.07);
          border: 1.5px solid rgba(200, 241, 53, 0.38);
          color: #c8f135;
          box-shadow: inset 0 1px 0 rgba(200, 241, 53, 0.08);
        }

        .hero-strip-football:hover,
        .hero-strip-screening:hover {
          background: rgba(200, 241, 53, 0.13);
          border-color: rgba(200, 241, 53, 0.68);
        }

        .hero-strip-btn::after {
          content: "";
          position: absolute;
          top: 0;
          bottom: 0;
          width: 40%;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(200, 241, 53, 0.12),
            transparent
          );
          left: -80%;
          animation: btn-shine 2.2s cubic-bezier(0.4, 0, 0.2, 1) 1.2s 1 forwards;
          pointer-events: none;
        }

        @keyframes strip-in {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: none;
          }
        }

        @media (max-width: 524px) {
          /* 960x1280 mobile image = 133.34vw tall at full width, + the 52px header offset */
          .hero-section {
            height: calc(133.34vw + 52px) !important;
          }
          .hero-strip {
            padding: 12px 16px;
            gap: 10px;
            justify-content: stretch;
          }
          .hero-strip-btn {
            width: auto;
            flex: 1;
            height: 48px;
            font-size: 13px;
            border-radius: 10px;
          }
        }
      `}</style>
    </>
  );
}
