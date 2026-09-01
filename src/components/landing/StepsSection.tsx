"use client";

import { Calendar, MapPin, Users } from "lucide-react";
import { LANDING_STEPS } from "@/config/landing";

const ICONS = {
  pin: MapPin,
  calendar: Calendar,
  users: Users,
} as const;

export function StepsSection() {
  return (
    <section id="how-it-works" className="lp-section">
      <div className="lp-wrap">
        <div className="lp-steps-head">
          <h2 className="lp-h2">From &ldquo;maybe&rdquo; to playing in three steps.</h2>
        </div>

        <div className="lp-steps">
          {LANDING_STEPS.map((step) => {
            const Icon = ICONS[step.icon];
            return (
              <div key={step.number} className="lp-step">
                <div className="lp-step-num">{step.number}</div>
                <div className="lp-step-icon">
                  <Icon size={22} />
                </div>
                <h3 className="lp-h3">{step.title}</h3>
                <p className="lp-lead">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
