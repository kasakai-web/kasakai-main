"use client";

import { ArrowRight } from "lucide-react";
import { CONTACT_EMAIL } from "@/config/landing";

export function HostCtaSection() {
  return (
    <div className="lp-hostcta-wrap">
      <div className="lp-wrap">
        <div className="lp-hostcta">
          <div className="lp-hostcta-glow" aria-hidden="true" />
          <div className="lp-hostcta-copy">
            <div className="lp-eyebrow">Build with Kasa Kai</div>
            <h2 className="lp-h2">Have a venue?</h2>
            <h2 className="lp-h2 dim">Love bringing people together?</h2>
          </div>
          <div className="lp-hostcta-actions">
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=I%20want%20to%20host%20with%20Kasa%20Kai`}
              className="lp-btn lp-btn-solid"
            >
              Become a host <ArrowRight size={18} />
            </a>
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=Partner%20my%20venue%20with%20Kasa%20Kai`}
              className="lp-btn lp-btn-ghost"
            >
              Partner your venue
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
