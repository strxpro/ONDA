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
          borderColor: color || "rgba(255,255,255,0)",
          scale: color ? 1.8 : 1,
          duration: 0.45,
          ease: "elastic.out(1, 0.5)",
        });
        gsap.to(el.firstElementChild, { opacity: color ? 0 : 1, scale: color ? 0.4 : 1, duration: 0.3 });
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
      {/* the cursor: a tiny candy cone (glossy pink scoop, sprinkles, waffle); over a flavor it becomes a ring in that flavor's color */}
      <div ref={blob} className="pointer-events-none fixed top-0 left-0 z-[81] grid size-7 place-items-center rounded-full border-2 opacity-0" style={{ borderColor: "rgba(255,255,255,0)" }} aria-hidden>
        <svg viewBox="0 0 24 32" className="h-[26px] w-auto drop-shadow-[0_2px_3px_rgba(75,42,32,0.35)]">
          <path d="M6.5 13.5 L12 30 L17.5 13.5 Z" fill="#F2B56B" />
          <path d="M8 17 L16 17 M9.2 20.6 L14.8 20.6 M8.6 14.6 L13.8 27 M15.4 14.6 L10.2 27" stroke="#C47F3A" strokeWidth="1.1" strokeLinecap="round" opacity=".7" />
          <path d="M3.4 13.2 C2.6 6.4 6.8 2 12 2 C17.2 2 21.4 6.4 20.6 13.2 Q20.8 15.4 18.6 14.9 Q16.9 16.6 15.2 14.9 Q13.6 16.6 12 14.9 Q10.4 16.6 8.8 14.9 Q7.1 16.6 5.4 14.9 Q3.2 15.4 3.4 13.2 Z" fill="#FF8FB8" />
          <ellipse cx="8" cy="6.4" rx="2.4" ry="1.4" fill="#fff" opacity=".75" transform="rotate(-28 8 6.4)" />
          <rect x="13.5" y="5" width="3" height="1.1" rx=".55" fill="#FFE066" transform="rotate(35 15 5.5)" />
          <rect x="10" y="9.4" width="3" height="1.1" rx=".55" fill="#6FE0C4" transform="rotate(-20 11.5 10)" />
          <rect x="15.6" y="9.8" width="3" height="1.1" rx=".55" fill="#9B8CFF" transform="rotate(60 17 10.3)" />
          <rect x="6" y="10.4" width="3" height="1.1" rx=".55" fill="#FFF7EE" transform="rotate(15 7.5 11)" />
          <circle cx="12" cy="1.8" r="1.6" fill="#E5243F" />
        </svg>
      </div>
    </>
  );
}
