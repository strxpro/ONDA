"use client";

/* eslint-disable @next/next/no-img-element */
import type Lenis from "lenis";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { PHOTO, photoGeometry, ScoopImg } from "./ice/PhotoStack";

const DURATION = 3; // seconds, as asked: long enough to enjoy, short enough not to wait
const SCOOPS = [PHOTO.scoops.pistacchio, PHOTO.scoops.fragola, PHOTO.scoops["yellow-submarine"]];
const SKIP = new Set(["#build", "#main", "#top"]); // the builder opens its own pop-out; skip-link and logo stay instant

/**
 * Jumping to another part of the page (e.g. "I gusti di oggi") plays a little interlude: on a breathing pastel
 * backdrop a waffle cone gets three scoops, one per beat, while a progress line fills — its marker is a scoop.
 * Behind the curtain the page moves to the target; then the curtain lifts.
 */
export function JumpLoader() {
  const [run, setRun] = useState(0);
  const [progress, setProgress] = useState(0);
  const target = useRef<HTMLElement | null>(null);

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
      setRun((r) => r + 1);
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
    const t0 = performance.now();
    let raf = 0;
    let jumped = false;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / (DURATION * 1000));
      setProgress(p);
      if (p > 0.6 && !jumped && target.current) {
        jumped = true;
        // move behind the curtain
        lenis?.start();
        if (lenis) lenis.scrollTo(target.current, { immediate: true, force: true, offset: -8 });
        else target.current.scrollIntoView();
        lenis?.stop();
      }
      if (p < 1) raf = requestAnimationFrame(tick);
      else {
        html.style.overflow = "";
        lenis?.start();
        setRun(0);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      html.style.overflow = "";
      lenis?.start();
    };
  }, [run]);

  const geo = photoGeometry(3);
  return (
    <AnimatePresence>
      {run > 0 && (
        <motion.div
          key={run}
          className="fixed inset-0 z-[150] grid place-items-center overflow-hidden"
          initial={{ clipPath: "circle(0% at 50% 50%)" }}
          animate={{ clipPath: "circle(150% at 50% 50%)" }}
          exit={{ clipPath: "circle(0% at 50% 120%)", transition: { duration: 0.7, ease: [0.7, 0, 0.2, 1] } }}
          transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1] }}
          aria-hidden
        >
          {/* breathing pastel backdrop */}
          <motion.div
            className="absolute inset-[-20%] bg-[radial-gradient(40%_40%_at_25%_30%,#FFD3E2,transparent_70%),radial-gradient(40%_40%_at_75%_35%,#FFF0B0,transparent_70%),radial-gradient(50%_45%_at_50%_85%,#CFF3E6,transparent_70%)] bg-cream"
            animate={{ scale: [1, 1.08, 1], rotate: [0, 4, 0] }}
            transition={{ duration: DURATION, ease: "easeInOut" }}
          />
          <div className="relative flex flex-col items-center">
            {/* the cone fills up, one scoop per beat */}
            <motion.div className="relative w-[min(30vw,170px)]" style={{ aspectRatio: geo.aspect }} animate={{ y: [0, -6, 0] }} transition={{ duration: 1.2, repeat: 2, ease: "easeInOut" }}>
              <motion.div className="absolute" style={geo.cone} initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.15 }}>
                <img src={PHOTO.cone} alt="" className="block w-full drop-shadow-[0_16px_18px_rgba(75,42,32,0.3)]" />
              </motion.div>
              {SCOOPS.map((src, i) => (
                <motion.div
                  key={src}
                  className="absolute"
                  style={{ ...geo.scoop(i), transformOrigin: "50% 92%" }}
                  initial={{ y: "-260%", opacity: 0 }}
                  animate={{ y: 0, opacity: 1, scaleY: [1.12, 0.78, 1.05, 1], scaleX: [0.92, 1.15, 0.98, 1] }}
                  transition={{ y: { duration: 0.42, ease: [0.55, 0, 0.9, 0.5], delay: 0.55 + i * 0.6 }, opacity: { duration: 0.1, delay: 0.55 + i * 0.6 }, scaleY: { duration: 0.7, delay: 0.95 + i * 0.6 }, scaleX: { duration: 0.7, delay: 0.95 + i * 0.6 } }}
                >
                  <ScoopImg src={src} className="drop-shadow-[0_10px_12px_rgba(75,42,32,0.28)]" />
                </motion.div>
              ))}
            </motion.div>
            {/* progress: a soft line, the marker is a scoop */}
            <div className="relative mt-10 h-3 w-[min(70vw,360px)] rounded-full bg-white/70 shadow-[inset_0_1px_3px_rgba(75,42,32,0.15)]">
              <div className="absolute inset-y-0 left-0 rounded-full bg-[linear-gradient(90deg,#FF8FB8,#FFAA5C,#FFE066,#6FE0C4)]" style={{ width: `${progress * 100}%` }} />
              <img src="/img/ice/sm/fragola.webp" alt="" className="absolute top-1/2 w-9 -translate-x-1/2 -translate-y-[60%] drop-shadow-[0_4px_5px_rgba(75,42,32,0.35)]" style={{ left: `${progress * 100}%`, rotate: `${progress * 360}deg` }} />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
