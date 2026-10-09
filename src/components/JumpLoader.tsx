"use client";

import type Lenis from "lenis";
import { animate, motion, useMotionTemplate, useMotionValue } from "motion/react";
import { useEffect, useRef, useState } from "react";

const SKIP = new Set(["#build", "#main", "#top"]); // the builder opens its own pop-out; skip-link and logo stay instant
const COLORS = ["#FF8FB8", "#FFE066", "#6FE0C4", "#9B8CFF", "#FFAA5C"];

/**
 * Jumping to another part of the page (e.g. "I gusti di oggi") — about one second:
 * 1. from the button you pressed, a wave of gelato color floods the whole screen (three colors, one after another);
 * 2. behind it the page moves to the target;
 * 3. a hole opens in the middle of the color and grows until you are "through" it, at the new place.
 */
export function JumpLoader() {
  const [run, setRun] = useState<{ n: number; x: number; y: number; c: string[] } | null>(null);
  const target = useRef<HTMLElement | null>(null);
  const cover = useMotionValue(0); // flood radius, % of the screen diagonal
  const hole = useMotionValue(0); // hole radius
  const clip = useMotionTemplate`circle(${cover}% at var(--jx) var(--jy))`;
  const mask = useMotionTemplate`radial-gradient(circle at 50% 50%, transparent ${hole}%, #000 calc(${hole}% + 1.5%))`;

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href^='#']") as HTMLAnchorElement | null;
      const hash = a?.getAttribute("href");
      if (!a || !hash || hash === "#" || SKIP.has(hash)) return;
      const el = document.querySelector<HTMLElement>(hash);
      if (!el) return;
      e.preventDefault();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        el.scrollIntoView();
        return;
      }
      target.current = el;
      const start = Math.floor(Math.random() * COLORS.length);
      setRun((r) => ({ n: (r?.n ?? 0) + 1, x: e.clientX || innerWidth / 2, y: e.clientY || innerHeight / 2, c: [0, 1, 2].map((k) => COLORS[(start + k) % COLORS.length]) }));
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!run) return;
    const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
    const html = document.documentElement;
    html.style.overflow = "hidden";
    lenis?.stop();
    cover.set(0);
    hole.set(0);
    let alive = true;
    (async () => {
      // 1 · flood from the button (fast in, a soft landing)
      await animate(cover, 150, { duration: 0.42, ease: [0.7, 0, 0.2, 1] });
      if (!alive) return;
      // 2 · move behind the curtain
      if (target.current) {
        lenis?.start();
        if (lenis) lenis.scrollTo(target.current, { immediate: true, force: true, offset: -8 });
        else target.current.scrollIntoView();
        lenis?.stop();
      }
      // 3 · open the hole and fly through it
      await animate(hole, 120, { duration: 0.55, ease: [0.65, 0, 0.15, 1], delay: 0.05 });
      if (!alive) return;
      html.style.overflow = "";
      lenis?.start();
      setRun(null);
    })();
    return () => {
      alive = false;
      html.style.overflow = "";
      lenis?.start();
    };
  }, [run, cover, hole]);

  if (!run) return null;
  return (
    <motion.div
      key={run.n}
      className="fixed inset-0 z-[150]"
      style={{ clipPath: clip, WebkitMaskImage: mask, maskImage: mask, ["--jx" as string]: `${run.x}px`, ["--jy" as string]: `${run.y}px` }}
      aria-hidden
    >
      {/* three colors flowing over each other, like a scoop of gelato smeared across the glass */}
      <div className="absolute inset-0" style={{ background: run.c[0] }} />
      <motion.div className="absolute inset-0" style={{ background: `radial-gradient(60% 60% at 30% 30%, ${run.c[1]}, transparent 70%)` }} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1.6, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut" }} />
      <motion.div className="absolute inset-0" style={{ background: `radial-gradient(55% 55% at 75% 70%, ${run.c[2]}, transparent 70%)` }} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1.7, opacity: 1 }} transition={{ duration: 0.8, ease: "easeOut", delay: 0.08 }} />
      {/* the hole's rim: a light ring that races outward as the hole opens */}
      <motion.div className="absolute top-1/2 left-1/2 size-[30vmax] -translate-x-1/2 -translate-y-1/2 rounded-full border-[10px] border-white/60" initial={{ scale: 0, opacity: 0 }} animate={{ scale: [0, 0, 6], opacity: [0, 0.9, 0] }} transition={{ duration: 1, times: [0, 0.45, 1], ease: "easeIn" }} />
    </motion.div>
  );
}
