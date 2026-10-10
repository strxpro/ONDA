"use client";

import gsap from "gsap";
import { useEffect, useRef } from "react";

const SPRINKLE_COLORS = ["#FF6F91", "#FFE066", "#6FE0C4", "#9B8CFF", "#FFAA5C", "#A8DB7A"];

/** Desktop only: the cursor becomes a real waffle cone (native, no lag) that drops a tiny sprinkles trail. */
export function CursorBlob() {
  const trail = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("cone-cursor");
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return () => document.documentElement.classList.remove("cone-cursor");
    let lastX = 0;
    let lastY = 0;
    const onMove = (e: PointerEvent) => {
      // a tiny sprinkles trail falling from the cone
      if (Math.hypot(e.clientX - lastX, e.clientY - lastY) < 46) return;
      lastX = e.clientX;
      lastY = e.clientY;
      const s = document.createElement("span");
      s.className = "absolute block h-1.5 w-3.5 rounded-full";
      s.style.background = SPRINKLE_COLORS[Math.floor(Math.random() * SPRINKLE_COLORS.length)];
      trail.current!.appendChild(s);
      gsap.fromTo(
        s,
        { x: e.clientX + 14, y: e.clientY + 16, rotate: Math.random() * 180, opacity: 1 },
        { y: e.clientY + 60 + Math.random() * 30, x: e.clientX + 14 + (Math.random() - 0.5) * 30, rotate: "+=120", opacity: 0, duration: 0.9, ease: "power1.in", onComplete: () => s.remove() },
      );
    };
    window.addEventListener("pointermove", onMove);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.documentElement.classList.remove("cone-cursor");
    };
  }, []);

  return <div ref={trail} className="pointer-events-none fixed inset-0 z-[80]" aria-hidden />;
}
