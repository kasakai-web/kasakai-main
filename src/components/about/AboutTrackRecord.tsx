import { ABOUT_TRACK_RECORD } from "@/config/about";

/** The inverted band — lime ground, black type. See .ab-band in about.css. */
export function AboutTrackRecord() {
  return (
    <section className="ab-band">
      <div className="lp-wrap ab-band-inner">
        <div>
          <div className="ab-band-eyebrow">Built from real experience</div>
          <h2 className="lp-h2">
            Years of on-
            <br />
            ground
            <br />
            learning.
          </h2>
        </div>

        <div>
          {ABOUT_TRACK_RECORD.map((stat) => (
            <div key={stat.label} className="ab-band-row">
              <div className="ab-band-num">{stat.value}</div>
              <div className="ab-band-label">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
