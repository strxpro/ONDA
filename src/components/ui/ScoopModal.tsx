"use client";

import { X } from "@phosphor-icons/react";
import gsap from "gsap";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sound";
import { SCOOP_BODY } from "../ice/Scoop";
import { useScrollLock } from "./useScrollLock";

const MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 190' preserveAspectRatio='none'><path d='${SCOOP_BODY}'/></svg>`)}")`;

/**
 * A pop-up that is born from the thing you tapped: a scoop-shaped mask flies from it to the middle of the screen
 * and grows past its own edges until the whole card shows; ✕ (or Esc, or the backdrop) closes it back into the scoop.
 * The card scrolls on its own, the page behind is locked.
 */
export function ScoopModal({ from, onClosed, label, children, width = 920 }: { from: DOMRect | null; onClosed: () => void; label: string; children: ReactNode; width?: number }) {
  useScrollLock();
  const frame = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);
  const closing = useRef(false);
  useEffect(() => setMounted(true), []);

  const target = () => {
    const phone = window.innerWidth < 640;
    const w = Math.min(window.innerWidth - (phone ? 16 : 24), width);
    const h = Math.min(window.innerHeight - (phone ? 16 : 32), 860);
    return { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, width: w, height: h };
  };
  const origin = () => {
    const t = target();
    return from ?? new DOMRect(t.left + t.width / 2 - 60, t.top + t.height / 2 - 57, 120, 114);
  };

  const close = () => {
    if (closing.current) return;
    closing.current = true;
    const f = frame.current!;
    const o = origin();
    sfx.whoosh();
    gsap
      .timeline({ defaults: { ease: "expo.inOut" }, onComplete: onClosed })
      .to([closeBtn.current, body.current], { autoAlpha: 0, duration: 0.2 }, 0)
      .set(f, { WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskSize: "330% 330%", maskSize: "330% 330%", borderRadius: 0 }, 0.15)
      .to(f, { WebkitMaskSize: "100% 100%", maskSize: "100% 100%", duration: 0.6, ease: "expo.out" }, 0.18)
      .to(f, { left: o.left, top: o.top, width: o.width, height: o.height, duration: 0.75 }, 0.18)
      .to(f, { autoAlpha: 0, duration: 0.2 }, 0.8)
      .to(bg.current, { opacity: 0, duration: 0.45 }, 0.45);
  };

  useEffect(() => {
    if (!mounted) return;
    const f = frame.current!;
    const o = origin();
    sfx.whoosh();
    gsap.set(f, { left: o.left, top: o.top, width: o.width, height: o.height, WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" });
    gsap.set([body.current, closeBtn.current], { autoAlpha: 0 });
    const tl = gsap.timeline({ defaults: { ease: "expo.inOut" } });
    tl.to(bg.current, { opacity: 1, duration: 0.45, ease: "power2.out" }, 0)
      .to(f, { ...target(), duration: 0.85 }, 0)
      // the scoop grows past the card's edges: the mask "opens" into the whole card
      .to(f, { WebkitMaskSize: "330% 330%", maskSize: "330% 330%", duration: 0.85, ease: "expo.in" }, 0.12)
      .set(f, { WebkitMaskImage: "none", maskImage: "none", borderRadius: window.innerWidth < 640 ? 24 : 36 })
      .fromTo(body.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "expo.out" }, 0.75)
      .fromTo(closeBtn.current, { autoAlpha: 1, scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2)" }, 0.8);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    const fit = () => !closing.current && gsap.set(f, target());
    window.addEventListener("keydown", esc);
    window.addEventListener("resize", fit);
    return () => {
      window.removeEventListener("keydown", esc);
      window.removeEventListener("resize", fit);
      tl.kill();
    };
  }, [mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!mounted) return null;
  return createPortal(
    <div className="fixed inset-0 z-[95]" role="dialog" aria-modal="true" aria-label={label}>
      <div ref={bg} className="absolute inset-0 bg-chocolate/55 opacity-0 backdrop-blur-md" onClick={close} />
      <div ref={frame} className="fixed overflow-hidden bg-cream shadow-[0_40px_120px_-30px_rgba(0,0,0,0.6)]" style={{ WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "50% 45%", maskPosition: "50% 45%" }}>
        <div ref={body} data-lenis-prevent className="h-full overflow-y-auto overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch]">
          {children}
        </div>
        <button ref={closeBtn} type="button" onClick={close} aria-label="✕" className="absolute top-4 right-4 z-20 grid size-11 place-items-center rounded-full bg-white text-chocolate shadow-soft transition-transform hover:rotate-90">
          <X weight="bold" className="size-5" />
        </button>
      </div>
    </div>,
    document.body,
  );
}
