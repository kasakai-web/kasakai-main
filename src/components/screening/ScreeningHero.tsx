"use client";

interface Props {
  eventCount: number;
}

export function ScreeningHero({ eventCount }: Props) {
  return (
    <section className="scr-hero">
      <div className="scr-hero-glow" />
      <div className="scr-hero-inner">
        {/* Tag */}
        <div className="scr-hero-tag">
          <span className="scr-hero-dot" />
          Talent identification sessions — open now
        </div>

        {/* Big title */}
        <h1 className="scr-hero-title">
          GET<br />
          <span className="scr-lime">SCOUTED</span>
          <br />
          <span className="scr-outline">SELECTED</span>
        </h1>

        {/* Subtitle */}
        <p className="scr-hero-sub">
          Open screening sessions for players of all levels.
          Get evaluated by Kasa Kai scouts, earn your spot, and compete at the highest level.
        </p>

        {/* Stats strip */}
        <div className="scr-hero-stats">
          <div className="scr-hero-stat">
            <span className="scr-stat-num">{eventCount}</span>
            <span className="scr-stat-label">Upcoming Sessions</span>
          </div>
          <div className="scr-hero-stat">
            <span className="scr-stat-num">5</span>
            <span className="scr-stat-label">Cities</span>
          </div>
          <div className="scr-hero-stat">
            <span className="scr-stat-num">180+</span>
            <span className="scr-stat-label">Players Screened</span>
          </div>
          <div className="scr-hero-stat">
            <span className="scr-stat-num">12</span>
            <span className="scr-stat-label">Scouts Watching</span>
          </div>
        </div>
      </div>
    </section>
  );
}
