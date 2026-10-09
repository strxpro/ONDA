"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

gsap.registerPlugin(ScrollTrigger);

const LenisContext = createContext<Lenis | null>(null);

/** Access the Lenis instance (null when reduced motion is on, or before mount). */
export const useLenis = () => useContext(LenisContext);

/**
 * Lenis smooth scroll driven by GSAP's ticker, so ScrollTrigger and Lenis share one RAF loop.
 * Mouse/trackpad only: disabled for touch devices and prefers-reduced-motion (native scroll; ScrollTrigger still works).
 */
export function SmoothScroll({ children, enabled = true }: { children: ReactNode; enabled?: boolean }) {
  const [lenis, setLenis] = useState<Lenis | null>(null);

  useEffect(() => {
    // phones and tablets keep native touch scrolling: it is already smooth and costs nothing
    if (!enabled || window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(pointer: fine)").matches) return;

    const instance = new Lenis({ lerp: 0.1, smoothWheel: true, syncTouch: false });
    instance.on("scroll", ScrollTrigger.update);
    const tick = (time: number) => instance.raf(time * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    setLenis(instance);
    (window as unknown as { __lenis?: Lenis }).__lenis = instance;

    return () => {
      gsap.ticker.remove(tick);
      instance.destroy();
      setLenis(null);
    };
  }, [enabled]);

  return <LenisContext.Provider value={lenis}>{children}</LenisContext.Provider>;
}
