"use client";

import { useEffect } from "react";

export function useRevealAnimation() {
  useEffect(() => {
    const selectors = ".reveal, .reveal-left, .reveal-right";

    const attachObserver = () => {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("in");
            }
          });
        },
        { threshold: 0.12 }
      );

      document.querySelectorAll(selectors).forEach((el) => {
        const rect = el.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) {
          el.classList.add("in");
        }

        observer.observe(el);
      });

      return observer;
    };

    let observer = attachObserver();

    const handlePageShow = () => {
      observer.disconnect();
      observer = attachObserver();
    };

    window.addEventListener("pageshow", handlePageShow);

    return () => {
      window.removeEventListener("pageshow", handlePageShow);
      observer.disconnect();
    };
  }, []);
}

export function useActiveNavLink() {
  useEffect(() => {
    const navLinks = document.querySelectorAll(".nav-link");
    const handleScroll = () => {
      const y = window.scrollY;
      ["home", "features", "pricing", "support"].forEach((id) => {
        const sec = document.getElementById(id);
        if (sec && y >= sec.offsetTop - 80) {
          navLinks.forEach((l) => l.classList.remove("active"));
          const a = document.querySelector(`.nav-link[href="#${id}"]`);
          if (a) a.classList.add("active");
        }
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);
}
