"use client";

import { useEffect } from "react";

export function useRevealAnimation() {
  useEffect(() => {
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

    document.querySelectorAll(".reveal, .reveal-left, .reveal-right").forEach((el) => {
      observer.observe(el);
    });

    return () => {
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
