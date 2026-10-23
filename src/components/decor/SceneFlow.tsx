"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Children, isValidElement, useEffect, useRef, useState, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

/** The page's colors per section: three soft blobs each. The backdrop cross-fades between them while scrolling. */
const PALETTES: Record<string, [string, string, string]> = {
  hero: ["#7FD3F0", "#A8EEF0", "#5FB4E8"],
  flavors: ["#8FD8F5", "#B9F0EC", "#6CC3E6"],
  lab: ["#6FD6D9", "#A6E3F7", "#4FA9E0"],
  configurator: ["#86C6F2", "#B5E9F5", "#5D9FE0"],
  signature: ["#9BE3EE", "#7FC8EC", "#C3F1EE"],
  prices: ["#79CDEB", "#ADE9F3", "#5AAEE3"],
  reviews: ["#95DDF2", "#BDEFF0", "#6DB9E8"],
  visit: ["#6CCFE0", "#9FD6F6", "#4E9EDB"],
};

/** How each section arrives — varied, all transform/opacity (GPU only), all scrubbed with smoothing. */
const ENTER = [
  { y: 110, opacity: 0.55 }, // rise
  { scale: 0.93, opacity: 0.6 }, // zoom
  { y: 80, rotate: -2, opacity: 0.6 }, // tilt
  { xPercent: -6, opacity: 0.55 }, // slide from the left
  { y: 60, scale: 0.96, opacity: 0.55 }, // rise + zoom
  { xPercent: 6, opacity: 0.55 }, // slide from the right
];

/**
 * The page as one continuous scene: a fixed, slowly animated gradient backdrop whose palette follows the
 * section on screen, and sections that glide in (each with its own entrance) instead of hard edges or waves.
 */
export function SceneFlow({ children, keys }: { children: ReactNode; keys: string[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(keys[0] ?? "hero");
  const items = Children.toArray(children).filter(isValidElement);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const scenes = [...el.querySelectorAll<HTMLElement>(":scope > .scene")];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      scenes.forEach((scene, i) => {
        // backdrop palette: whichever section crosses the middle of the screen
        ScrollTrigger.create({ trigger: scene, start: "top 55%", end: "bottom 55%", onToggle: (st) => st.isActive && setActive(scene.dataset.key ?? "") });
        if (reduced || i === 0) return;
        const inner = scene.firstElementChild as HTMLElement;
        gsap.fromTo(inner, ENTER[(i - 1) % ENTER.length], {
          y: 0,
          xPercent: 0,
          scale: 1,
          rotate: 0,
          opacity: 1,
          ease: "power2.out",
          scrollTrigger: { trigger: scene, start: "top 98%", end: "top 55%", scrub: 1 },
        });
      });
    }, el);
    return () => ctx.revert();
  }, [items.length]);

  return (
    <>
      <Backdrop active={active} />
      <div ref={root} className="relative">
        {items.map((child, i) => (
          <div key={i} className="scene" data-key={keys[i]}>
            <div className="scene-inner">{child}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function Backdrop({ active }: { active: string }) {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#E6F6FB]" aria-hidden>
      {Object.entries(PALETTES).map(([key, [a, b, c]]) => (
        <div
          key={key}
          className="backdrop-layer absolute inset-0 transition-opacity duration-[1400ms] ease-out"
          style={{
            opacity: key === active || (!PALETTES[active] && key === "hero") ? 1 : 0,
            background: `radial-gradient(70% 60% at 10% 15%, ${a}, transparent 72%), radial-gradient(60% 65% at 90% 25%, ${b}, transparent 72%), radial-gradient(80% 70% at 50% 100%, ${c}, transparent 75%)`,
          }}
        />
      ))}
      {/* slow drifting light: the "animated" part of the gradient. Fixed colors → rasterized once, then only moved on the GPU */}
      <div className="backdrop-blob absolute top-[-20%] left-[-10%] size-[60vmax] rounded-full opacity-70" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.85), transparent 62%)" }} />
      <div className="backdrop-blob backdrop-blob-2 absolute right-[-15%] bottom-[-25%] size-[65vmax] rounded-full opacity-70" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.7), transparent 62%)" }} />
      {/* fine grain so the gradient never bands */}
      <div className="grain absolute inset-0 opacity-[0.05]" />
    </div>
  );
}
