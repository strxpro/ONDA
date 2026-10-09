"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useEffect, useRef } from "react";
import { PHOTO, ScoopImg } from "../ice/PhotoStack";
import { useMotionSettings } from "../providers/SiteData";

const SCOOPS = Object.values(PHOTO.scoops);

/**
 * One row of huge italic type with real scoops between the words. It drifts on its own and
 * speeds up / leans with scroll velocity: the page's typographic signature.
 */
export function Marquee({ text }: { text: string }) {
  const root = useRef<HTMLDivElement>(null);
  const { intensity } = useMotionSettings();
  const parts = text.split("·").map((s) => s.trim()).filter(Boolean);

  useEffect(() => {
    const el = root.current!;
    if (intensity === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const tracks = gsap.utils.toArray<HTMLElement>(".mq-track", el);
    const tweens = tracks.map((t, i) => gsap.fromTo(t, { xPercent: i % 2 ? -50 : 0 }, { xPercent: i % 2 ? 0 : -50, duration: 38, ease: "none", repeat: -1 }));
    const skewTo = gsap.quickTo(tracks, "skewX", { duration: 0.5, ease: "power3.out" });
    const st = ScrollTrigger.create({
      trigger: el,
      start: "top bottom",
      end: "bottom top",
      onUpdate: (self) => {
        const v = self.getVelocity();
        const boost = gsap.utils.clamp(1, 6, 1 + Math.abs(v) / 400) * intensity;
        tweens.forEach((tw) => gsap.to(tw, { timeScale: boost * (v < 0 ? -1 : 1), duration: 0.3, overwrite: true }));
        skewTo(gsap.utils.clamp(-10, 10, (-v / 300) * intensity));
      },
    });
    const settle = () => tweens.forEach((tw) => gsap.to(tw, { timeScale: tw.timeScale() < 0 ? -1 : 1, duration: 1.2 }));
    ScrollTrigger.addEventListener("scrollEnd", settle);
    return () => {
      st.kill();
      tweens.forEach((t) => t.kill());
      ScrollTrigger.removeEventListener("scrollEnd", settle);
    };
  }, [intensity]);

  return (
    <div ref={root} className="relative overflow-hidden py-[clamp(2rem,6vw,5rem)]" aria-label={text}>
      <div className="mq-track flex w-max will-change-transform" aria-hidden>
        {[0, 1].map((copy) => (
          <div key={copy} className="flex shrink-0 items-center">
            {parts.map((p, i) => (
              <span key={i} className="flex items-center">
                <span className="px-[0.4em] font-display text-[clamp(3.5rem,11vw,10rem)] leading-none whitespace-nowrap text-chocolate italic [font-variation-settings:'SOFT'_100,'WONK'_1,'opsz'_144]">{p}</span>
                <span className="block h-[clamp(2.4rem,6vw,5rem)] w-[clamp(2.8rem,7vw,6rem)] shrink-0">
                  <ScoopImg src={SCOOPS[(i + copy) % SCOOPS.length]} />
                </span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
