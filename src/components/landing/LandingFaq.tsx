"use client";

import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { CONTACT_EMAIL, LANDING_FAQS } from "@/config/landing";

export function LandingFaq() {
  const [openId, setOpenId] = useState<string | null>(null);

  // The header's "Support" link points at #support; until the support page is
  // built, this section is where it lands.
  return (
    <section id="support" className="lp-section" style={{ borderBottom: "none" }}>
      <div className="lp-wrap lp-faq-grid">
        <div>
          <div className="lp-eyebrow">Questions, answered</div>
          <h2 className="lp-h2">
            Before your
            <br />
            first game.
          </h2>
          <p className="lp-lead">
            Still unsure? Reach us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="lp-link lp-link-muted">
              {CONTACT_EMAIL}
            </a>
          </p>
        </div>

        <div className="lp-faq-list">
          {LANDING_FAQS.map((faq) => {
            const open = openId === faq.id;
            return (
              <div key={faq.id} className="lp-faq-item">
                <button
                  type="button"
                  className="lp-faq-q"
                  aria-expanded={open}
                  aria-controls={`faq-${faq.id}`}
                  onClick={() => setOpenId(open ? null : faq.id)}
                >
                  <span className="lp-faq-q-text">{faq.question}</span>
                  <span className="lp-faq-toggle" aria-hidden="true">
                    {open ? <Minus size={18} /> : <Plus size={18} />}
                  </span>
                </button>
                {open && (
                  <div id={`faq-${faq.id}`} className="lp-faq-a">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
