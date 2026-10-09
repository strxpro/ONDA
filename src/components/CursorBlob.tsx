"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

const SPRINKLE_COLORS = ["#FF6F91", "#FFE066", "#6FE0C4", "#9B8CFF", "#FFAA5C", "#A8DB7A"];

/** Desktop only: a soft blob that takes the color of the hovered flavor, with a tiny sprinkles trail. */
export function CursorBlob() {
  const blob = useRef<HTMLDivElement>(null);
  const trail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = blob.current!;
    gsap.set(el, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    const x = gsap.quickTo(el, "x", { duration: 0.35, ease: "power3.out" });
    const y = gsap.quickTo(el, "y", { duration: 0.35, ease: "power3.out" });
    let lastX = 0;
    let lastY = 0;
    let current = "";
    let shown = false;

    const onMove = (e: PointerEvent) => {
      x(e.clientX);
      y(e.clientY);
      if (!shown) {
        shown = true;
        gsap.to(el, { autoAlpha: 1, duration: 0.2, overwrite: "auto" });
      }
      const target = (e.target as Element).closest?.("[data-cursor-color]") as HTMLElement | null;
      const color = target?.dataset.cursorColor ?? "";
      if (color !== current) {
        current = color;
        // over a flavor: a ring in its color (never a dark blot over the content)
        gsap.to(el, {
          backgroundColor: color ? "rgba(255,255,255,0)" : "#FF8FB8",
          borderColor: color || "rgba(255,255,255,0)",
          scale: color ? 2.4 : 1,
          duration: 0.45,
          ease: "elastic.out(1, 0.5)",
        });
      }
      // sprinkles trail
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) > 46) {
        lastX = e.clientX;
        lastY = e.clientY;
        const s = document.createElement("span");
        s.className = "absolute block h-1.5 w-3.5 rounded-full";
        s.style.background = SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)];
        trail.current!.appendChild(s);
        gsap.fromTo(
          s,
          { x: e.clientX, y: e.clientY, rotate: Math.random() * 180, opacity: 1 },
          { y: e.clientY + 40 + Math.random() * 30, x: e.clientX + (Math.random() - 0.5) * 30, rotate: "+=120", opacity: 0, duration: 0.9, ease: "power1.in", onComplete: () => s.remove() },
        );
      }
    };
    const onLeave = () => ((shown = false), gsap.to(el, { autoAlpha: 0, duration: 0.2 }));
    window.addEventListener("pointermove", onMove);
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <>
      <div ref={trail} className="pointer-events-none fixed inset-0 z-[80]" aria-hidden />
      <div ref={blob} className="pointer-events-none fixed top-0 left-0 z-[81] size-6 rounded-full border-2 opacity-0" style={{ background: "#FF8FB8", borderColor: "rgba(255,255,255,0)" }} aria-hidden />
    </>
  );
}
