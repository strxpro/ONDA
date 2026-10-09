"use client";

/* eslint-disable @next/next/no-img-element */
import { X } from "@phosphor-icons/react";
import gsap from "gsap";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { sfx } from "@/lib/sound";
import { t, type GalleryImage } from "@/lib/shared";
import { PHOTO } from "../ice/PhotoStack";
import { SCOOP_BODY } from "../ice/Scoop";
import { useSite } from "../providers/SiteData";
import { Title } from "../ui/Title";

/*
 * Geometry in units of D (the big scoop's width). Stage: 2.4 D × 1.95 D.
 * The big photo-scoop sits on a waffle cone in the middle; the other photo-scoops ride an elliptical arc
 * around it (the sketch). Every item is laid out at full scoop size and scaled down on the arc (GPU only).
 */
const W = 2.4;
const H = 1.95;
const SH = 0.95; // scoop height / width (SCOOP_BODY viewBox 200×190)
const CENTER = { x: W / 2 - 0.5, y: 0.375, s: 1 };
/** size of the photos on the arc (in D): a bit bigger on wide screens, set on every layout */
let SMALL = 0.34;
const CY = 0.85;
const RX = 1.05;
const RY = 0.72;
const SLOTS = 8;
const slot = (k: number) => {
  const a = ((195 - 30 * k) * Math.PI) / 180;
  return { x: W / 2 + RX * Math.cos(a) - SMALL / 2, y: CY - RY * Math.sin(a) - (SMALL * SH) / 2, s: SMALL };
};
const DOTS = ["#6FE0C4", "#FFE066", "#FF8FB8"];
const MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 190' preserveAspectRatio='none'><path d='${SCOOP_BODY}'/></svg>`)}")`;

/**
 * "Il Laboratorio" — the shop's photos as scoops of gelato. One sits on the cone; every few seconds another
 * one hops in. Tap a photo: a real gelato spatula scoops it up and drops it into the cone. Tap the scoop on
 * the cone: the scoop-shaped mask opens up into the full photo.
 */
export function Lab() {
  const { data, locale, motion: m } = useSite();
  const s = data.settings;
  const root = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const spat = useRef<HTMLImageElement>(null);
  const items = useRef<(HTMLDivElement | null)[]>([]);
  const order = useRef<number[]>([]); // order[0] = photo on the cone, order[1..] = photos on the arc
  const busy = useRef(false);
  const idleUntil = useRef(0);
  const [lightbox, setLightbox] = useState<{ g: GalleryImage; from: DOMRect } | null>(null);
  const photos = data.gallery.slice(0, SLOTS + 1);
  const points = [1, 2, 3].map((i) => t(s.texts[`lab_point_${i}`], locale)).filter(Boolean);
  const reduced = () => m.intensity === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const D = () => (stage.current?.offsetWidth ?? 0) / W;
  const posOf = (place: number) => (place === 0 ? CENTER : slot(place - 1));
  const px = (p: { x: number; y: number; s: number }) => ({ x: p.x * D(), y: p.y * D(), scale: p.s });

  /** put every photo where `order` says, instantly */
  const layout = () => {
    SMALL = (stage.current?.offsetWidth ?? 0) > 820 ? 0.4 : 0.34;
    order.current.forEach((photo, place) => {
      const el = items.current[photo];
      if (el) gsap.set(el, { ...px(posOf(place)), zIndex: place === 0 ? 20 : 10, transformOrigin: "0 0" });
    });
  };

  useEffect(() => {
    order.current = photos.map((_, i) => i);
    layout();
    const ro = new ResizeObserver(layout);
    if (stage.current) ro.observe(stage.current);
    return () => ro.disconnect();
  }, [photos.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /** swap the photo at arc place `place` with the one on the cone; with the spatula when the visitor asked */
  const bringToCone = (place: number, withSpatula: boolean) => {
    if (busy.current || place === 0) return;
    busy.current = true;
    const a = order.current[place];
    const b = order.current[0];
    const A = items.current[a]!;
    const B = items.current[b]!;
    const from = posOf(place);
    const d = D();
    const tl = gsap.timeline({
      defaults: { ease: "power3.inOut" },
      onComplete: () => {
        order.current[0] = a;
        order.current[place] = b;
        gsap.set(A, { zIndex: 20 });
        gsap.set(B, { zIndex: 10 });
        busy.current = false;
      },
    });
    gsap.set(A, { zIndex: 30 });
    const squash = A.querySelector(".squash");
    const landing = () => {
      sfx.plop();
      gsap.fromTo(squash, { scaleY: 0.82, scaleX: 1.12 }, { scaleY: 1, scaleX: 1, duration: 0.8, ease: "elastic.out(1.1, 0.35)", transformOrigin: "50% 100%" });
    };

    if (withSpatula && spat.current && !reduced()) {
      const S = spat.current;
      const sw = 0.95; // spatula width in D
      const under = (p: { x: number; y: number; s: number }) => ({ x: (p.x - sw * 0.12) * d, y: (p.y + p.s * SH * 0.86) * d });
      sfx.whoosh();
      tl.set(S, { ...under(from), x: under(from).x - 0.5 * d, rotate: -10, opacity: 0, width: sw * d })
        // slide in under the scoop
        .to(S, { x: under(from).x, opacity: 1, duration: 0.45, ease: "power3.out" })
        // lift it
        .to([S, A], { y: `-=${0.14 * d}`, duration: 0.3, ease: "power2.out" })
        // carry it over the cone, growing to full size
        .addLabel("carry")
        .to(A, { x: CENTER.x * d, y: (CENTER.y - 0.42) * d, scale: 1, duration: 0.75 }, "carry")
        .to(S, { x: (CENTER.x - sw * 0.12) * d, y: (CENTER.y - 0.42 + SH * 0.86) * d, rotate: -4, duration: 0.75 }, "carry")
        .to(B, { ...px(from), duration: 0.85 }, "carry+=0.05")
        // tip it in
        .addLabel("drop")
        .to(S, { rotate: 26, duration: 0.25, ease: "power2.in" }, "drop")
        .to(A, { y: CENTER.y * d, duration: 0.32, ease: "power2.in", onComplete: landing }, "drop+=0.08")
        // spatula leaves
        .to(S, { x: `+=${0.9 * d}`, y: `-=${0.35 * d}`, rotate: 40, opacity: 0, duration: 0.5, ease: "power2.in" }, "drop+=0.35");
    } else {
      // on its own: a little hop along an arc into the cone
      tl.to(A, { x: CENTER.x * d, scale: 1, duration: 1.1 }, 0)
        .to(A, { keyframes: { y: [(from.y - 0.25) * d, CENTER.y * d], easeEach: "sine.inOut" }, duration: 1.1, onComplete: landing }, 0)
        .to(B, { ...px(from), duration: 1.15 }, 0.05);
    }
  };

  // every few seconds (while visible and nobody is playing with it) another photo hops onto the cone
  useEffect(() => {
    const el = root.current;
    if (!el || photos.length < 2) return;
    let visible = false;
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));
    io.observe(el);
    const timer = window.setInterval(() => {
      if (!visible || document.hidden || reduced() || Date.now() < idleUntil.current || lightbox) return;
      bringToCone(1 + Math.floor(Math.random() * Math.min(SLOTS, photos.length - 1)), false);
    }, Math.max(6000, (m.galleryInterval ?? 7) * 1000));
    return () => {
      io.disconnect();
      window.clearInterval(timer);
    };
  }, [photos.length, m.galleryInterval, m.intensity, lightbox]); // eslint-disable-line react-hooks/exhaustive-deps

  const onItem = (photo: number) => {
    idleUntil.current = Date.now() + 9000;
    const place = order.current.indexOf(photo);
    if (place === 0) {
      const el = items.current[photo];
      if (el && !busy.current) setLightbox({ g: photos[photo], from: el.getBoundingClientRect() });
    } else bringToCone(place, true);
  };

  const pct = (v: number, of: number) => `${(v / of) * 100}%`;

  return (
    <section ref={root} id="lab" className="relative flex min-h-svh flex-col items-center justify-center overflow-x-clip py-16">
      <div className="relative z-10 px-(--gutter) text-center">
        <Title color="#6FE0C4" align="center">
          {t(s.texts.lab_title, locale)}
        </Title>
      </div>

      <div ref={stage} className="relative mt-6 w-[min(100%,calc(2.4*50svh),1240px)] select-none" style={{ aspectRatio: `${W} / ${H}` }}>
        {/* the waffle cone */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" style={{ WebkitMaskImage: "linear-gradient(to bottom, #000 85%, transparent)", maskImage: "linear-gradient(to bottom, #000 85%, transparent)" }}>
          <img src={PHOTO.cone} alt="" draggable={false} className="absolute drop-shadow-[0_24px_24px_rgba(184,110,46,0.25)]" style={{ left: pct(W / 2 - 0.25, W), top: pct(CENTER.y + SH - 0.3, H), width: pct(0.5, W) }} />
        </div>

        {/* the photo-scoops (all the same size; the arc ones are scaled down) */}
        {photos.map((g, i) => (
          <div
            key={g.id}
            ref={(el) => {
              items.current[i] = el;
            }}
            className="absolute top-0 left-0 will-change-transform"
            style={{ width: pct(1, W), aspectRatio: "200 / 190" }}
          >
            <button type="button" onClick={() => onItem(i)} aria-label={t(g.alt, locale)} className="squash group relative block h-full w-full cursor-pointer">
              {/* the scoop's colored lip */}
              <span className="absolute inset-0 translate-y-[6%] transition-transform duration-500 ease-(--ease-gelato) group-hover:translate-y-[9%]" style={{ background: g.color, WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }} aria-hidden />
              <span className="absolute inset-0 overflow-hidden transition-transform duration-500 ease-(--ease-gelato) group-hover:-translate-y-[3%]" style={{ WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" }}>
                <Image src={g.image_url} alt="" fill sizes="(max-width: 640px) 60vw, 480px" className="object-cover" />
                <span className="absolute inset-0 bg-[radial-gradient(55%_40%_at_35%_18%,rgba(255,255,255,0.35),transparent_70%)]" />
              </span>
            </button>
          </div>
        ))}

        {/* the spatula (generated for Onda) */}
        <img ref={spat} src="/img/spatula.webp" alt="" draggable={false} className="pointer-events-none absolute top-0 left-0 z-40 opacity-0 drop-shadow-[0_14px_14px_rgba(75,42,32,0.3)]" style={{ transformOrigin: "20% 50%" }} />
      </div>

      {points.length > 0 && (
        <ul className="relative z-10 mt-2 flex flex-wrap justify-center gap-x-8 gap-y-2 px-(--gutter)">
          {points.map((p, i) => (
            <li key={i} className="flex items-center gap-2.5 font-display text-lg sm:text-xl">
              <span className="size-2 rounded-full" style={{ background: DOTS[i % DOTS.length] }} />
              {p}
            </li>
          ))}
        </ul>
      )}

      {lightbox && <ScoopLightbox photo={lightbox.g} from={lightbox.from} locale={locale} onClosed={() => setLightbox(null)} />}
    </section>
  );
}

/** The scoop on the cone opens up: its scoop-shaped mask grows until the whole photo shows. ✕ closes it back. */
function ScoopLightbox({ photo, from, locale, onClosed }: { photo: GalleryImage; from: DOMRect; locale: Parameters<typeof t>[1]; onClosed: () => void }) {
  const frame = useRef<HTMLDivElement>(null);
  const bg = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const target = () => {
    const w = Math.min(window.innerWidth * 0.92, 1100);
    const h = Math.min(window.innerHeight * 0.82, w * 0.72);
    return { left: (window.innerWidth - w) / 2, top: (window.innerHeight - h) / 2, width: w, height: h };
  };

  const close = () => {
    const f = frame.current!;
    sfx.whoosh();
    gsap
      .timeline({ defaults: { ease: "expo.inOut" }, onComplete: onClosed })
      .to(closeBtn.current, { scale: 0, duration: 0.2 }, 0)
      .set(f, { WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskSize: "330% 330%", maskSize: "330% 330%", borderRadius: 0 }, 0)
      .to(f, { WebkitMaskSize: "100% 100%", maskSize: "100% 100%", duration: 0.7, ease: "expo.out" }, 0.05)
      .to(f, { left: from.left, top: from.top, width: from.width, height: from.height, duration: 0.8 }, 0.05)
      .to(bg.current, { opacity: 0, duration: 0.5 }, 0.35);
  };

  useEffect(() => {
    const f = frame.current!;
    const html = document.documentElement;
    html.style.overflow = "hidden";
    sfx.whoosh();
    gsap.set(f, { left: from.left, top: from.top, width: from.width, height: from.height, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" });
    const tl = gsap.timeline({ defaults: { ease: "expo.inOut" } });
    tl.to(bg.current, { opacity: 1, duration: 0.5, ease: "power2.out" }, 0)
      .to(f, { ...target(), duration: 0.9 }, 0)
      // the scoop grows past the frame's edges: the mask "opens" into the full photo
      .to(f, { WebkitMaskSize: "330% 330%", maskSize: "330% 330%", duration: 0.9, ease: "expo.in" }, 0.15)
      .set(f, { WebkitMaskImage: "none", maskImage: "none", borderRadius: 24 })
      .fromTo(closeBtn.current, { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(2)" }, 0.8);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", esc);
    return () => {
      html.style.overflow = "";
      window.removeEventListener("keydown", esc);
      tl.kill();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return createPortal(
    <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={t(photo.alt, locale)}>
      <div ref={bg} className="absolute inset-0 bg-chocolate/55 opacity-0 backdrop-blur-md" onClick={close} />
      <div
        ref={frame}
        className="fixed overflow-hidden shadow-[0_40px_120px_-30px_rgba(0,0,0,0.6)]"
        style={{ WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskRepeat: "no-repeat", maskRepeat: "no-repeat", WebkitMaskPosition: "50% 45%", maskPosition: "50% 45%" }}
      >
        <Image src={photo.image_url} alt={t(photo.alt, locale)} fill sizes="92vw" className="object-cover" priority />
        <button ref={closeBtn} type="button" onClick={close} aria-label="✕" className="absolute top-4 right-4 grid size-12 scale-0 place-items-center rounded-full bg-white/95 text-chocolate shadow-soft transition-colors hover:bg-white">
          <X weight="bold" className="size-5" />
        </button>
        {t(photo.alt, locale) && <p className="absolute bottom-4 left-5 rounded-full bg-white/90 px-4 py-1.5 font-display text-lg">{t(photo.alt, locale)}</p>}
      </div>
    </div>,
    document.body,
  );
}
