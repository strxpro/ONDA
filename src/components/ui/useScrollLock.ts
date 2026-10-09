"use client";

import type Lenis from "lenis";
import { useEffect } from "react";

let locks = 0;

/**
 * While a pop-up is open the page behind must not scroll: stops Lenis (smooth scroll) and the native scroll,
 * and keeps the scrollbar's width so nothing jumps. Scrolling inside the pop-up still works (data-lenis-prevent).
 */
export function useScrollLock(active = true) {
  useEffect(() => {
    if (!active) return;
    const lenis = (window as unknown as { __lenis?: Lenis }).__lenis;
    const html = document.documentElement;
    if (locks++ === 0) {
      const gap = window.innerWidth - html.clientWidth;
      html.style.overflow = "hidden";
      if (gap > 0) html.style.paddingRight = `${gap}px`;
      lenis?.stop();
    }
    return () => {
      if (--locks === 0) {
        html.style.overflow = "";
        html.style.paddingRight = "";
        lenis?.start();
      }
    };
  }, [active]);
}
