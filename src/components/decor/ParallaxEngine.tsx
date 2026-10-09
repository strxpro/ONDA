"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect } from "react";
import { useMotionSettings } from "../providers/SiteData";

/**
 * One place for scroll-linked decoration:
 *  - [data-speed]  → vertical parallax (speed < 1 lags behind, > 1 runs ahead)
 */
export function ParallaxEngine() {
  const { intensity: k } = useMotionSettings();
  useEffect(() => {
    if (k === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>("[data-speed]").forEach((el) => {
        const speed = parseFloat(el.dataset.speed || "1");
        gsap.fromTo(
          el,
          { y: () => (1 - speed) * -180 * k },
          {
            y: () => (1 - speed) * 180 * k,
            ease: "none",
            scrollTrigger: { trigger: el.parentElement, start: "top bottom", end: "bottom top", scrub: true, invalidateOnRefresh: true },
          },
        );
      });
    });
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("onda:revealed", refresh);
    return () => {
      ctx.revert();
      window.removeEventListener("onda:revealed", refresh);
    };
  }, [k]);
  return null;
}
