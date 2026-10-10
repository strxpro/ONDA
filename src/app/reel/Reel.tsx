"use client";

/* eslint-disable @next/next/no-img-element */
import { Heart, Star } from "@phosphor-icons/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { PHOTO, photoGeometry } from "@/components/ice/PhotoStack";
import { SCOOP_BODY } from "@/components/ice/Scoop";

/**
 * "Onda in motion" — a fast motion-design reel of the website's own animations, 29.16 s on "Beyond Possible"
 * (161.5 BPM, beat 0.3715 s), 1920×1080, rendered frame by frame at 60 fps (ROUTE=/reel scripts/record-promo.mjs).
 * One paused GSAP timeline (window.__promo.seek). Every cut and hit lands on a beat.
 *  0.06 preloader: the real cone builds, rainbow counter → the curtain lifts
 *  4.40 the logo, letter by letter         6.40 the flavor menu pops in · a new flavor is born
 * 10.40 tub photos cut on every beat       12.21 the wheel of fortune spins, lands on 14.35
 * 14.35 the gelato cake builds itself      18.28 the Lab: photo-scoops, the spatula, the gallery grid
 * 22.24 the page melts into the comments   26.46 the cherry on top, the end card
 */
const DURATION = 29.16;
const B = 60 / 161.5; // one beat
const GOLD = ["#FF6F91", "#FFAA5C", "#FFE066", "#A8DB7A", "#6FE0C4", "#9B8CFF"];
const MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 190' preserveAspectRatio='none'><path d='${SCOOP_BODY}'/></svg>`)}")`;
const masked = { WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" } as const;
const G = photoGeometry(3, { cherry: true });

const MENU: [string, string, string][] = [
  ["Pistacchio", PHOTO.scoops.pistacchio, "#A8DB7A"],
  ["Fragola", PHOTO.scoops.fragola, "#FF8FB8"],
  ["Cioccolato", PHOTO.scoops.cioccolato, "#8A5A47"],
  ["Yellow Submarine", PHOTO.scoops["yellow-submarine"], "#FFE066"],
  ["Stracciatella", PHOTO.scoops.stracciatella, "#FFF3E2"],
  ["Mango", "/reel/s-mango.webp", "#FFAA5C"],
  ["Mirtillo", "/reel/s-mirtillo.webp", "#9B8CFF"],
  ["Banana Bread", PHOTO.scoops["banana-bread"], "#F3D58A"],
  ["Anguria", "/reel/s-anguria.webp", "#FF6F7D"],
  ["Nocciola", "/reel/s-nocciola.webp", "#C9935F"],
];
const NEWBORN: [string, string, string] = ["Menta", "/reel/s-menta.webp", "#A8F0D8"];
const TUBS: [string, string][] = [
  ["Fragola", "fragola"], ["Pistacchio", "pistacchio"], ["Tiramisù", "tiramisu"], ["Mango", "mango"], ["Caramello", "caramello-salato"], ["Limone", "limone"],
];
const WHEEL = ["pistacchio", "fragola", "cioccolato", "yellow-submarine", "stracciatella", "banana-bread"].map((s) => PHOTO.scoops[s]);
const WHEEL_COLORS = ["#A8DB7A", "#FF8FB8", "#C9935F", "#FFE066", "#FFF3E2", "#F3D58A"];
const CAKE_LAYERS = [
  { tex: "/img/tubs/cioccolato.webp", h: 70 },
  { tex: "/img/tubs/pistacchio.webp", h: 76 },
  { tex: "/img/tubs/fragola.webp", h: 76 },
];
const NOTES = [
  { text: "Il pistacchio più buono della Sardegna!", name: "Giulia", color: "#FFF4BD", r: -4 },
  { text: "Best gelato of our holiday 🍦", name: "Tom", color: "#FFD6E5", r: 3 },
  { text: "Najlepsze lody w Santa Teresa!", name: "Ania", color: "#D2F8EE", r: -2 },
  { text: "La torta per il compleanno: perfetta", name: "Marco", color: "#E0DBFF", r: 4 },
];
const DRIPS: [number, number, number][] = [
  [80, 180, 70], [240, 330, 56], [400, 230, 84], [580, 400, 62], [760, 260, 90], [950, 360, 58],
  [1120, 210, 76], [1300, 430, 66], [1480, 280, 88], [1660, 380, 58], [1840, 220, 72],
];
const dripPath = (() => {
  const rim = 90;
  let d = `M0 0 H1920 V${rim} `;
  for (const [x, depth, w] of [...DRIPS].reverse()) {
    const r = w / 2;
    const n = r * 0.72;
    d += `L${x + r + 30} ${rim} C${x + r + 4} ${rim} ${x + r} ${rim + 20} ${x + n} ${rim + (depth - rim) * 0.55} `;
    d += `C${x + n * 0.9} ${depth - r * 1.2} ${x + r * 1.05} ${depth - r * 0.6} ${x + r * 0.98} ${depth - r * 0.15} `;
    d += `C${x + r * 0.9} ${depth + r * 0.95} ${x - r * 0.9} ${depth + r * 0.95} ${x - r * 0.98} ${depth - r * 0.15} `;
    d += `C${x - r * 1.05} ${depth - r * 0.6} ${x - n * 0.9} ${depth - r * 1.2} ${x - n} ${rim + (depth - rim) * 0.55} `;
    d += `C${x - r} ${rim + 20} ${x - r - 4} ${rim} ${x - r - 30} ${rim} `;
  }
  return d + `L0 ${rim} Z`;
})();
const GALLERY = Array.from({ length: 9 }, (_, i) => `/reel/g${i + 1}.webp`);
const ARC = Array.from({ length: 8 }, (_, k) => {
  const a = ((195 - 30 * k) * Math.PI) / 180;
  return { x: 960 + 640 * Math.cos(a), y: 600 - 400 * Math.sin(a) };
});
const SPRINKLES = Array.from({ length: 22 }, (_, i) => ({ a: (i / 22) * Math.PI * 2 + 0.2, d: 160 + (i % 4) * 55, c: GOLD[i % GOLD.length], r: i * 37 }));

/** a real photo cone: cone + 3 scoops (+ cherry); `cls` prefixes the parts for the timeline */
function Cone({ cls, scoops, w }: { cls: string; scoops: string[]; w: number }) {
  return (
    <div className={`${cls} absolute`} style={{ width: w, aspectRatio: G.aspect }}>
      <div className={`${cls}-cone absolute`} style={G.cone}>
        <img src={PHOTO.cone} alt="" className="block w-full" />
      </div>
      {scoops.map((s, i) => (
        <div key={i} className={`${cls}-s${i} absolute`} style={G.scoop(i)}>
          <img src={s} alt="" className="h-full w-full object-contain object-bottom" />
        </div>
      ))}
      <div className={`${cls}-cherry absolute`} style={G.cherry(3)}>
        <img src={PHOTO.cherry} alt="" className="block w-full" />
      </div>
    </div>
  );
}

export function Reel() {
  const stage = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1920, window.innerHeight / 1080));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  useEffect(() => {
    const el = stage.current!;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out", duration: 0.8 } });
      gsap.set(q(".scene"), { autoAlpha: 0 });

      const show = (sel: string, t: number) => tl.set(q(sel), { autoAlpha: 1 }, t);
      const hide = (sel: string, t: number) => tl.set(q(sel), { autoAlpha: 0 }, t);
      /** a scoop drops and squashes on landing */
      const drop = (sel: string, t: number, from = -760) =>
        tl
          .fromTo(q(sel), { y: from, autoAlpha: 1 }, { y: 0, duration: 0.34, ease: "power2.in" }, t)
          .fromTo(q(sel), { scaleY: 0.76, scaleX: 1.16, transformOrigin: "50% 92%" }, { scaleY: 1, scaleX: 1, duration: 0.9, ease: "elastic.out(1.1, 0.33)", immediateRender: false }, t + 0.34);
      /** a hard "flash" cut: a colored panel wipes across */
      const wipe = (t: number, color: string, dir = 1) =>
        tl
          .fromTo(q(".wipe"), { xPercent: -110 * dir, background: color, autoAlpha: 1 }, { xPercent: 0, duration: 0.24, ease: "power3.in" }, t - 0.24)
          .to(q(".wipe"), { xPercent: 110 * dir, duration: 0.3, ease: "power3.out" }, t);
      const title = (sel: string, t: number) => tl.fromTo(q(`${sel} .ch`), { yPercent: 120, rotate: 8 }, { yPercent: 0, rotate: 0, duration: 0.7, ease: "back.out(1.8)", stagger: 0.035 }, t);

      /* ── 1 · preloader: the cone builds itself, the rainbow counter runs, the curtain lifts ── */
      show(".s1", 0);
      tl.fromTo(q(".c1"), { y: 620, rotate: -8 }, { y: 0, rotate: 0, duration: 0.9, ease: "back.out(1.5)" }, 0.06);
      tl.set(q(".c1-s0, .c1-s1, .c1-s2, .c1-cherry"), { autoAlpha: 0 }, 0);
      drop(".c1-s0", 0.8);
      drop(".c1-s1", 0.8 + 2 * B);
      drop(".c1-s2", 0.8 + 4 * B);
      drop(".c1-cherry", 0.8 + 6 * B, -500);
      const cnt = { v: 0 };
      tl.to(cnt, { v: 100, duration: 3.6, ease: "power1.inOut", onUpdate: () => void (q(".num")[0].textContent = String(Math.round(cnt.v)).padStart(2, "0")) }, 0.1);
      tl.fromTo(q(".bar"), { scaleX: 0 }, { scaleX: 1, duration: 3.6, ease: "power1.inOut" }, 0.1);
      tl.fromTo(q(".spr"), { y: -80, autoAlpha: 0 }, { y: 60, autoAlpha: 1, duration: 3, ease: "sine.inOut", stagger: 0.12 }, 0.2);
      // the curtain: three wavy layers lift on the beat
      tl.to(q(".cur-a"), { yPercent: -112, duration: 0.75, ease: "expo.inOut" }, 3.85).to(q(".cur-b"), { yPercent: -112, duration: 0.75, ease: "expo.inOut" }, 3.95).to(q(".cur-c"), { yPercent: -112, duration: 0.75, ease: "expo.inOut" }, 4.05);

      /* ── 2 · the logo, letter by letter, each with a squash ── */
      show(".s2", 3.8);
      tl.fromTo(q(".logo-l"), { yPercent: 140, scaleY: 1.3 }, { yPercent: 0, scaleY: 1, duration: 0.8, ease: "back.out(2.2)", stagger: B / 2 }, 4.4);
      tl.fromTo(q(".tag"), { autoAlpha: 0, letterSpacing: "0.6em" }, { autoAlpha: 1, letterSpacing: "0.22em", duration: 1.1 }, 5.2);
      tl.to(q(".logo"), { scale: 1.08, duration: 2, ease: "sine.inOut" }, 4.4);
      tl.to(q(".logo-l"), { yPercent: -160, duration: 0.4, ease: "power3.in", stagger: 0.04 }, 6.05).to(q(".tag"), { autoAlpha: 0, duration: 0.25 }, 6.05);
      hide(".s2", 6.45);

      /* ── 3 · the menu: the scoops pop onto their plates · a new flavor is born ── */
      show(".s3", 6.3);
      title(".t3", 6.4);
      tl.fromTo(q(".pill"), { scale: 0 }, { scale: 1, duration: 0.6, ease: "back.out(2.5)" }, 6.7);
      tl.fromTo(q(".tile .plate"), { scale: 0 }, { scale: 1, duration: 0.7, ease: "back.out(1.9)", stagger: B / 3 }, 6.6);
      tl.fromTo(q(".tile .sc"), { y: 60, scale: 0.2, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.8, ease: "back.out(2)", stagger: B / 3 }, 6.72);
      tl.fromTo(q(".tile .nm"), { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, stagger: B / 3 }, 6.9);
      // the newborn: the grid makes room, plate grows, ripples, the scoop rises and settles, sprinkles, its name
      tl.to(q(".grid3"), { x: -110, scale: 0.84, transformOrigin: "0 0", duration: 0.7, ease: "expo.inOut" }, 8.6);
      tl.fromTo(q(".nb .plate"), { scale: 0 }, { scale: 1, keyframes: { scale: [0, 1.14, 0.96, 1] }, duration: 0.75 }, 8.95);
      tl.fromTo(q(".nb .ripple"), { scale: 0.6, autoAlpha: 0.9 }, { scale: 1.7, autoAlpha: 0, duration: 1.1, stagger: 0.2 }, 9.2);
      tl.fromTo(q(".nb .sc"), { y: 80, scaleX: 0.1, scaleY: 0.1, autoAlpha: 0 }, { keyframes: { y: [80, -24, 6, 0], scaleX: [0.1, 1.12, 0.92, 1], scaleY: [0.1, 1.24, 0.88, 1], autoAlpha: [0, 1, 1, 1] }, duration: 0.95, ease: "power2.out" }, 9.3);
      tl.fromTo(q(".nb .sp"), { x: 0, y: 0, autoAlpha: 0, scale: 0.4 }, { x: (i: number) => Math.cos(SPRINKLES[i].a) * SPRINKLES[i].d, y: (i: number) => Math.sin(SPRINKLES[i].a) * SPRINKLES[i].d, rotate: (i: number) => SPRINKLES[i].r + 300, autoAlpha: 0, scale: 1, duration: 1.2, ease: "power3.out" }, 9.55);
      tl.fromTo(q(".nb .sp"), { autoAlpha: 1 }, { autoAlpha: 1, duration: 0.01, immediateRender: false }, 9.55);
      tl.fromTo(q(".nb .badge, .nb .nm"), { scale: 0, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.6, ease: "back.out(2.6)", stagger: 0.1 }, 9.85);
      wipe(10.4, "#FF8FB8");
      hide(".s3", 10.4);

      /* ── 4 · the tubs, one per beat, through the scoop-shaped window ── */
      show(".s4", 10.4);
      TUBS.forEach((_, i) => {
        const t = 10.4 + i * B * 0.75;
        tl.set(q(".tub"), { autoAlpha: 0 }, t).fromTo(q(".tub")[i], { autoAlpha: 1, scale: 1.35 }, { scale: 1.05, duration: 1.2, ease: "expo.out" }, t);
        tl.set(q(".tubname"), { autoAlpha: 0 }, t).fromTo(q(".tubname")[i], { autoAlpha: 1, yPercent: 60, skewX: -12 }, { yPercent: 0, skewX: 0, duration: 0.3, ease: "back.out(2)" }, t);
        tl.fromTo(q(".s4 .frame"), { scale: 0.94 }, { scale: 1, duration: 0.25, ease: "power2.out", immediateRender: false }, t);
      });
      tl.fromTo(q(".s4 .frame"), { scale: 0, rotate: -12 }, { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(1.8)" }, 10.4);
      tl.to(q(".s4 .frame"), { scale: 0, rotate: 18, duration: 0.35, ease: "back.in(2)" }, 12.0);
      hide(".s4", 12.4);

      /* ── 5 · the wheel of fortune ── */
      show(".s5", 12.21);
      tl.fromTo(q(".wheel"), { scale: 0, rotate: -180 }, { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(1.6)" }, 12.21);
      tl.to(q(".wheel-spin"), { rotate: 360 * 5 + 30, duration: 2.0, ease: "power4.out" }, 12.4);
      tl.fromTo(q(".pointer"), { rotate: 0 }, { keyframes: { rotate: [0, -18, 0, -14, 0, -10, 0, -6, 0] }, duration: 1.9, ease: "none" }, 12.45);
      tl.fromTo(q(".win"), { scale: 0, rotate: -10 }, { scale: 1, rotate: -4, duration: 0.6, ease: "back.out(2.6)" }, 14.35);
      tl.fromTo(q(".wheel"), { scale: 1 }, { scale: 1.06, duration: 0.15, yoyo: true, repeat: 1, ease: "power2.out", immediateRender: false }, 14.35);
      tl.fromTo(q(".conf"), { y: -40, autoAlpha: 0 }, { y: () => 700 + Math.random() * 300, x: () => (Math.random() - 0.5) * 300, rotate: () => Math.random() * 720, autoAlpha: 1, duration: 1.6, ease: "power1.in", stagger: 0.012 }, 14.35);
      wipe(15.1, "#6FE0C4", -1);
      hide(".s5", 15.1);

      /* ── 6 · the gelato cake builds itself ── */
      show(".s6", 15.1);
      title(".t6", 15.1);
      tl.fromTo(q(".stand"), { y: 300, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: "back.out(1.6)" }, 15.1);
      tl.fromTo(q(".base"), { y: -700 }, { y: 0, duration: 0.35, ease: "power2.in" }, 15.3);
      q(".layer").forEach((l, i) => drop(`.layer-${i}`, 15.3 + (i + 1) * B * 1.2, -800));
      tl.fromTo(q(".coat"), { y: -800 }, { y: 0, duration: 0.35, ease: "power2.in" }, 15.3 + 4 * B * 1.2);
      tl.fromTo(q(".deco"), { y: -500, scale: 0.4, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(2.2)", stagger: 0.07 }, 17.15);
      tl.fromTo(q(".cake"), { rotateY: -12, transformPerspective: 1600 }, { rotateY: 12, duration: 3, ease: "sine.inOut" }, 15.3);
      wipe(18.28, "#FFE066");
      hide(".s6", 18.28);

      /* ── 7 · the Lab: photo-scoops on an arc, the spatula carries one into the cone, then the whole gallery ── */
      show(".s7", 18.28);
      title(".t7", 18.28);
      tl.fromTo(q(".labcone"), { y: 400 }, { y: 0, duration: 0.7, ease: "back.out(1.4)" }, 18.28);
      tl.fromTo(q(".arcph"), { scale: 0, rotate: -30 }, { scale: 1, rotate: 0, duration: 0.6, ease: "back.out(2)", stagger: B / 3 }, 18.4);
      tl.fromTo(q(".bigph"), { scale: 0 }, { scale: 1, duration: 0.6, ease: "back.out(1.7)" }, 18.5);
      // the spatula slides under photo 2, lifts it, carries it over the cone and tips it in
      const A = ARC[2];
      tl.set(q(".spat"), { x: A.x - 260, y: A.y + 60, rotate: -10, autoAlpha: 0 }, 19.3)
        .to(q(".spat"), { x: A.x - 120, autoAlpha: 1, duration: 0.35, ease: "power3.out" }, 19.3)
        .to([q(".spat")[0], q(".arcph")[2]], { y: "-=50", duration: 0.25, ease: "power2.out" }, 19.65)
        .to(q(".arcph")[2], { x: 960 - A.x, y: 390 - A.y, scale: 2.6, duration: 0.6, ease: "power3.inOut" }, 19.9)
        .to(q(".spat"), { x: 960 - 240, y: 460, rotate: 24, duration: 0.6, ease: "power3.inOut" }, 19.9)
        .to(q(".bigph"), { scale: 0.3, autoAlpha: 0, duration: 0.4 }, 20.0)
        .to(q(".spat"), { x: "+=500", y: "-=200", rotate: 50, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, 20.55)
        .fromTo(q(".arcph")[2], { scaleY: 2.6 * 0.82 }, { scaleY: 2.6, duration: 0.6, ease: "elastic.out(1.1,0.35)", immediateRender: false }, 20.5);
      // the gallery grid: everything flies into a masonry, bouncing up from below
      tl.to(q(".s7 .lab-arc, .labcone, .t7"), { autoAlpha: 0, duration: 0.3 }, 21.2);
      tl.fromTo(q(".gcell"), { y: 500, autoAlpha: 0, scale: 0.8 }, { y: 0, autoAlpha: 1, scale: 1, duration: 0.7, ease: "back.out(1.6)", stagger: 0.05 }, 21.25);
      tl.to(q(".gcol"), { y: (i: number) => (i % 2 ? -180 : -90), duration: 1.2, ease: "sine.inOut" }, 21.4);
      hide(".s7", 22.24);

      /* ── 8 · the page melts into the comments ── */
      show(".s8", 22.0);
      tl.fromTo(q(".melt"), { yPercent: -100 }, { yPercent: 0, duration: 0.55, ease: "power3.out" }, 22.0);
      tl.fromTo(q(".melt"), { scaleY: 1 }, { scaleY: 1.12, duration: 1.4, yoyo: true, repeat: 2, ease: "sine.inOut", transformOrigin: "50% 0%" }, 22.55);
      tl.fromTo(q(".dropf"), { y: 0, autoAlpha: 0, scaleY: 0.4 }, { keyframes: { y: [0, 10, 700], autoAlpha: [0, 1, 1], scaleY: [0.4, 1.3, 1] }, duration: 1.3, ease: "power2.in", stagger: 0.45 }, 22.6);
      title(".t8", 22.4);
      tl.fromTo(q(".seal"), { scale: 0, rotate: -40 }, { scale: 1, rotate: (i: number) => (i ? 8 : -8), duration: 0.7, ease: "back.out(2.2)", stagger: 0.15 }, 22.7);
      const r46 = { v: 0 };
      tl.to(r46, { v: 4.6, duration: 0.9, ease: "power2.out", onUpdate: () => q(".rnum").forEach((n) => (n.textContent = r46.v.toFixed(1))) }, 22.8);
      tl.fromTo(q(".note"), { y: -500, rotate: (i: number) => NOTES[i].r * 4, autoAlpha: 0 }, { y: 0, rotate: (i: number) => NOTES[i].r, autoAlpha: 1, duration: 0.75, ease: "back.out(1.5)", stagger: B * 1.1 }, 23.3);
      tl.fromTo(q(".stk"), { scale: 0, rotate: -60 }, { scale: 1, rotate: 12, duration: 0.5, ease: "back.out(3)", stagger: B * 1.1 }, 23.6);
      tl.fromTo(q(".heart"), { scale: 1 }, { keyframes: { scale: [1, 0.5, 1.4, 1] }, duration: 0.5, stagger: B * 1.1 }, 24.2);
      tl.fromTo(q(".burst"), { scale: 0, autoAlpha: 1 }, { scale: 1, autoAlpha: 0, duration: 0.55, stagger: B * 1.1 / 6 }, 24.25);
      tl.to(q(".s8 .wall"), { y: -40, duration: 3, ease: "sine.inOut" }, 23.3);
      wipe(26.46, "#FF8FB8");
      hide(".s8", 26.46);

      /* ── 9 · the cherry on top ── */
      show(".s9", 26.46);
      tl.fromTo(q(".c9"), { scale: 0.6, y: 200 }, { scale: 1, y: 0, duration: 0.7, ease: "back.out(1.6)" }, 26.46);
      tl.set(q(".c9-cherry"), { autoAlpha: 0 }, 26.46);
      drop(".c9-cherry", 26.9, -600);
      tl.fromTo(q(".end-l"), { yPercent: 130 }, { yPercent: 0, duration: 0.8, ease: "back.out(2)", stagger: 0.06 }, 26.7);
      tl.fromTo(q(".end-sub"), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 27.3);
      tl.fromTo(q(".end-url"), { autoAlpha: 0, scale: 0.8 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2)" }, 27.6);
      tl.to(q(".fade"), { autoAlpha: 1, duration: 0.5, ease: "none" }, DURATION - 0.5);

      // ambient: the soft blobs drift the whole time
      tl.to(q(".blob-a"), { x: 280, y: 160, scale: 1.25, duration: DURATION, ease: "sine.inOut" }, 0).to(q(".blob-b"), { x: -300, y: -140, scale: 0.85, duration: DURATION, ease: "sine.inOut" }, 0);

      tl.seek(0, false);
      const api = window as unknown as { __promo?: { duration: number; seek: (t: number) => void; ready: boolean } };
      api.__promo = { duration: DURATION, seek: (t: number) => void tl.seek(t, false), ready: false };
      Promise.all([document.fonts.ready, ...[...el.querySelectorAll("img")].map((i) => i.decode().catch(() => {}))]).then(() => api.__promo && (api.__promo.ready = true));
      // preview in a normal browser tab: play it
      if (!navigator.webdriver) tl.play(0);
    }, el);
    return () => ctx.revert();
  }, []);

  const chars = (s: string, cls = "") =>
    [...s].map((c, i) => (
      <span key={i} className="inline-block overflow-hidden pb-[0.12em] align-bottom">
        <span className={`ch inline-block ${cls}`}>{c === " " ? " " : c}</span>
      </span>
    ));

  return (
    <div className="fixed inset-0 grid place-items-center bg-black">
      <div ref={stage} className="relative overflow-hidden bg-cream font-body text-chocolate" style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "center" }}>
        <div className="blob-a absolute -top-60 -left-60 size-[900px] rounded-full bg-[#FFD3E2] opacity-70 blur-[120px]" />
        <div className="blob-b absolute -right-60 -bottom-60 size-[900px] rounded-full bg-[#C9F4E8] opacity-70 blur-[120px]" />

        {/* 1 · preloader */}
        <div className="scene s1 absolute inset-0 z-40">
          {[
            ["cur-c", "#FF8FB8"],
            ["cur-b", "#6FE0C4"],
            ["cur-a", "#FFE08A"],
          ].map(([cls, color], i) => (
            <div key={i} className={`${cls} absolute inset-x-0 top-0 h-full`} style={{ background: color }}>
              <svg viewBox="0 0 1920 120" className="absolute inset-x-0 -bottom-px w-full" preserveAspectRatio="none" style={{ transform: "translateY(99%)" }}>
                <path d="M0 0 H1920 V40 C1700 120 1500 0 1280 60 C1060 120 860 10 640 60 C420 110 220 0 0 50 Z" fill={color} />
              </svg>
              {i === 2 && (
                <>
                  {Array.from({ length: 14 }, (_, k) => (
                    <span key={k} className="spr absolute h-3 w-8 rounded-full" style={{ left: `${(k * 137) % 100}%`, top: `${(k * 61) % 70}%`, background: GOLD[k % 6], rotate: `${k * 40}deg` }} />
                  ))}
                  <div className="c1 absolute left-1/2 top-[90px] -ml-[150px]">
                    <Cone cls="c1" w={300} scoops={[PHOTO.scoops.pistacchio, PHOTO.scoops.fragola, PHOTO.scoops["yellow-submarine"]]} />
                  </div>
                  <p className="absolute bottom-24 left-24 font-display text-6xl font-bold">
                    Onda <span className="block font-script text-3xl font-normal text-chocolate/70 italic">gelato artigianale</span>
                  </p>
                  <div className="absolute right-24 bottom-24 w-72 text-right">
                    <p className="rainbow-text font-display text-[120px] leading-none font-bold tabular-nums">
                      <span className="num">00</span>
                      <span className="text-6xl">%</span>
                    </p>
                    <div className="mt-4 h-4 overflow-hidden rounded-full bg-chocolate/10">
                      <div className="bar rainbow-bar h-full origin-left rounded-full" />
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {/* 2 · the logo */}
        <div className="scene s2 absolute inset-0 z-10">
          <div className="logo absolute inset-x-0 top-[300px] text-center">
            <p className="font-display text-[360px] leading-none font-black tracking-tight">
              {["#F2557A", "#FF8A3D", "#1FA37A", "#7B6CF0"].map((c, i) => (
                <span key={i} className="inline-block overflow-hidden pb-6 align-bottom">
                  <span className="logo-l inline-block" style={{ color: c }}>
                    {"Onda"[i]}
                  </span>
                </span>
              ))}
            </p>
            <p className="tag mt-2 text-3xl font-bold whitespace-nowrap text-chocolate/70 uppercase">La gelateria artigianale · Santa Teresa Gallura</p>
          </div>
        </div>

        {/* 3 · the menu */}
        <div className="scene s3 absolute inset-0 z-10 px-[160px] pt-[110px]">
          <h2 className="t3 flex items-center gap-6 font-display text-[110px] leading-none font-bold">
            <span>{chars("I gusti di oggi")}</span>
            <span className="pill rounded-full bg-[#FFD9A8] px-6 py-1 font-body text-5xl font-black">(24)</span>
          </h2>
          <div className="grid3 mt-14 grid grid-cols-5 gap-x-10 gap-y-12">
            {MENU.map(([n, s, c], i) => (
              <div key={i} className="tile relative grid aspect-square place-items-center">
                <span className="plate absolute inset-[6%] rounded-full" style={{ background: `radial-gradient(circle at 50% 35%, #fff, ${c}88)` }} />
                <img src={s} alt="" className="sc relative w-[92%] translate-y-[-6%]" />
                <span className="nm absolute -bottom-3 rounded-full bg-white px-5 py-1.5 font-display text-2xl whitespace-nowrap shadow-lg">{n}</span>
              </div>
            ))}
          </div>
          <div className="nb absolute top-[330px] right-[90px] grid size-[300px] place-items-center">
            {[0, 1].map((k) => (
              <span key={k} className="ripple absolute inset-[6%] rounded-full border-4" style={{ borderColor: NEWBORN[2] }} />
            ))}
            <span className="plate absolute inset-[6%] rounded-full" style={{ background: `radial-gradient(circle at 50% 35%, #fff, ${NEWBORN[2]})` }} />
            {SPRINKLES.map((p, i) => (
              <span key={i} className="sp absolute h-2.5 w-7 rounded-full" style={{ background: p.c }} />
            ))}
            <img src={NEWBORN[1]} alt="" className="sc relative w-[94%] translate-y-[-6%]" style={{ transformOrigin: "50% 100%" }} />
            <span className="badge absolute top-0 flex items-center gap-1.5 rounded-full bg-chocolate px-4 py-1.5 text-lg font-black text-cream uppercase">✦ Novità</span>
            <span className="nm absolute -bottom-3 rounded-full bg-white px-5 py-1.5 font-display text-3xl shadow-lg">{NEWBORN[0]}</span>
          </div>
        </div>

        {/* 4 · tubs, one per beat */}
        <div className="scene s4 absolute inset-0 z-10 grid place-items-center bg-[#FFE3EE]">
          <div className="frame relative h-[760px] w-[800px] drop-shadow-[0_40px_60px_rgba(75,42,32,0.35)]" style={masked}>
            {TUBS.map(([, s]) => (
              <img key={s} src={`/img/tubs/${s}.webp`} alt="" className="tub absolute inset-0 h-full w-full object-cover opacity-0" />
            ))}
          </div>
          {TUBS.map(([n]) => (
            <p key={n} className="tubname absolute bottom-16 font-display text-[150px] leading-none font-black text-white opacity-0 [text-shadow:0_10px_30px_rgba(75,42,32,0.45)]">
              {n}
            </p>
          ))}
        </div>

        {/* 5 · the wheel of fortune */}
        <div className="scene s5 absolute inset-0 z-10 grid place-items-center bg-[#E9FBF5]">
          <div className="wheel relative size-[760px]">
            <div className="wheel-spin absolute inset-0 rounded-full border-[18px] border-white shadow-[0_40px_90px_-30px_rgba(75,42,32,0.5)]" style={{ background: `conic-gradient(${WHEEL_COLORS.map((c, i) => `${c} ${(i * 360) / 6}deg ${((i + 1) * 360) / 6}deg`).join(",")})` }}>
              {WHEEL.map((s, i) => (
                <img key={i} src={s} alt="" className="absolute top-1/2 left-1/2 w-[190px]" style={{ transform: `translate(-50%,-50%) rotate(${i * 60 + 30}deg) translateY(-230px)` }} />
              ))}
              <span className="absolute top-1/2 left-1/2 grid size-32 -translate-1/2 place-items-center rounded-full bg-white font-display text-4xl font-black shadow-xl">Gira!</span>
            </div>
            <div className="pointer absolute -top-10 left-1/2 -ml-[34px] h-24 w-[68px] origin-top" style={{ clipPath: "polygon(50% 100%, 0 0, 100% 0)", background: "#F2557A" }} />
          </div>
          <p className="win absolute right-[150px] bottom-[170px] rounded-[36px] bg-[#F2557A] px-12 py-6 font-display text-8xl font-black text-white shadow-2xl">Pistacchio!</p>
          {Array.from({ length: 60 }, (_, i) => (
            <span key={i} className="conf absolute top-0 h-4 w-10 rounded-full" style={{ left: `${(i * 31) % 100}%`, background: GOLD[i % 6] }} />
          ))}
        </div>

        {/* 6 · the cake */}
        <div className="scene s6 absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_40%,#FFF4F8,#FFD9E6)]">
          <h2 className="t6 absolute top-[90px] left-[150px] font-display text-[120px] leading-[0.95] font-bold">
            {chars("La tua")}
            <br />
            {chars("torta gelato")}
          </h2>
          <div className="cake absolute right-[300px] bottom-[150px] w-[640px] origin-bottom scale-[1.22]" style={{ perspective: 1600 }}>
            <img src="/img/cake/stand.webp" alt="" className="stand absolute bottom-0 left-1/2 w-[760px] -translate-x-1/2" />
            <div className="absolute bottom-[175px] left-[70px] h-[300px] w-[500px]">
              <div className="base absolute inset-x-0 bottom-0 h-[52px] rounded-b-[50%_22px] bg-[#7A4A33]" style={{ backgroundImage: "radial-gradient(#5a3322 1.5px, transparent 2px)", backgroundSize: "9px 9px" }} />
              {CAKE_LAYERS.map((l, i) => (
                <div
                  key={i}
                  className={`layer layer-${i} absolute inset-x-0 overflow-hidden`}
                  // a cylinder: the bottom edge curves, light on the left, shade on the right
                  style={{ borderRadius: "0 0 50% 50% / 0 0 22px 22px", boxShadow: "inset -60px 0 50px -30px rgba(75,42,32,0.45), inset 50px 0 40px -30px rgba(255,255,255,0.35)", height: l.h + 22, bottom: 52 + CAKE_LAYERS.slice(0, i).reduce((a, x) => a + x.h, 0), backgroundImage: `url(${l.tex})`, backgroundSize: "150%", backgroundPosition: "center" }}
                />
              ))}
            </div>
            <div className="coat absolute bottom-[432px] left-[62px] h-[70px] w-[516px] rounded-[50%] bg-[#FFF7EE] shadow-[inset_0_-8px_14px_rgba(75,42,32,0.15)]" />
            {[
              ["strawberries", 120, 130, 410],
              ["rosette", 240, 90, 432],
              ["berries", 300, 150, 418],
              ["macarons", 140, 380, 412],
              ["rosette", 240, 470, 432],
            ].map(([n, w, x, b], i) => (
              <img key={i} src={`/img/cake/${n}.webp`} alt="" className="deco absolute" style={{ width: Number(w) * 0.8, left: Number(x), bottom: Number(b) }} />
            ))}
          </div>
        </div>

        {/* 7 · the Lab */}
        <div className="scene s7 absolute inset-0 z-10 bg-[linear-gradient(160deg,#E9FBF5,#FFF7EE)]">
          <h2 className="t7 absolute top-[60px] w-full text-center font-display text-[110px] font-bold">{chars("Il Laboratorio")}</h2>
          <img src={PHOTO.cone} alt="" className="labcone absolute top-[560px] left-1/2 w-[220px] -translate-x-1/2" />
          <div className="bigph absolute top-[300px] left-1/2 -ml-[180px] h-[342px] w-[360px]" style={masked}>
            <img src={GALLERY[0]} alt="" className="h-full w-full object-cover" />
          </div>
          <div className="lab-arc">
            {ARC.map((p, i) => (
              <div key={i} className="arcph absolute h-[133px] w-[140px] drop-shadow-xl" style={{ left: p.x - 70, top: p.y - 66, ...masked }}>
                <img src={GALLERY[(i + 1) % 9]} alt="" className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
          <img src="/img/spatula.webp" alt="" className="spat absolute top-0 left-0 z-20 w-[380px] opacity-0" style={{ transformOrigin: "20% 50%" }} />
          <div className="absolute inset-x-[120px] top-[60px] flex gap-6">
            {[0, 1, 2, 3].map((col) => (
              <div key={col} className="gcol flex flex-1 flex-col gap-6">
                {GALLERY.filter((_, i) => i % 4 === col)
                  .concat(GALLERY.filter((_, i) => (i + 2) % 4 === col))
                  .map((g, k) => (
                    <img key={k} src={g} alt="" className="gcell w-full rounded-[28px] object-cover opacity-0 shadow-xl" style={{ aspectRatio: (col + k) % 3 === 0 ? "3/4" : "4/3" }} />
                  ))}
              </div>
            ))}
          </div>
        </div>

        {/* 8 · melt → comments */}
        <div className="scene s8 absolute inset-0 z-10 bg-[linear-gradient(180deg,#FFD3E2,#FFC0D4_50%,#FFD9C2)]">
          <div className="wall absolute inset-0">
            <h2 className="t8 absolute top-[440px] left-[150px] font-display text-[120px] font-bold">{chars("Dicono di noi")}</h2>
            {[
              ["Google", "#FFE066", 170],
              ["Tripadvisor", "#6FE0C4", 470],
            ].map(([n, c, x], i) => (
              <div key={i} className="seal absolute top-[630px] grid size-[280px] place-items-center text-center" style={{ left: Number(x), background: String(c), clipPath: "polygon(50% 0,61% 8%,75% 4%,80% 18%,94% 22%,91% 37%,100% 50%,91% 63%,94% 78%,80% 82%,75% 96%,61% 92%,50% 100%,39% 92%,25% 96%,20% 82%,6% 78%,9% 63%,0 50%,9% 37%,6% 22%,20% 18%,25% 4%,39% 8%)" }}>
                <div>
                  <p className="font-display text-2xl font-bold">{n}</p>
                  <p className="rnum font-display text-8xl leading-none font-black">0.0</p>
                  <p className="mt-1 flex justify-center gap-1">
                    {[0, 1, 2, 3, 4].map((k) => (
                      <Star key={k} weight="fill" className="size-6" />
                    ))}
                  </p>
                </div>
              </div>
            ))}
            <div className="absolute top-[455px] right-[120px] grid w-[860px] grid-cols-2 gap-8">
              {NOTES.map((n, i) => (
                <div key={i} className="note relative rounded-3xl p-7 pt-8 shadow-xl" style={{ background: n.color }}>
                  <span className="absolute -top-3 left-1/2 h-6 w-24 -translate-x-1/2 -rotate-3 rounded bg-white/70" />
                  <span className="stk absolute -top-4 right-4 grid size-14 place-items-center rounded-full bg-[#E5334E] text-white shadow-lg">
                    <Heart weight="fill" className="size-7" />
                  </span>
                  <p className="flex gap-1 text-amber-400">
                    {[0, 1, 2, 3, 4].map((k) => (
                      <Star key={k} weight="fill" className="size-6" />
                    ))}
                  </p>
                  <p className="mt-2 text-3xl leading-snug font-semibold">«{n.text}»</p>
                  <div className="mt-4 flex items-center justify-between">
                    <span className="font-display text-3xl text-chocolate/75 italic">— {n.name}</span>
                    <span className="relative flex items-center gap-2 text-2xl font-bold text-[#E5334E]">
                      <span className="burst absolute -left-3 size-14 rounded-full border-4 border-[#FF8FB8]" />
                      <Heart weight="fill" className="heart size-8" /> {12 + i * 7}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <svg viewBox="0 0 1920 520" className="melt absolute inset-x-0 top-0 w-full drop-shadow-[0_20px_30px_rgba(214,64,110,0.3)]">
            <defs>
              <linearGradient id="mf" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#FF9FBE" />
                <stop offset="1" stopColor="#F46F9C" />
              </linearGradient>
            </defs>
            <path d={dripPath} fill="url(#mf)" />
            {DRIPS.map(([x, d, w], i) => (
              <g key={i}>
                <path d={`M${x - w * 0.22} 110 L${x - w * 0.24} ${d - w * 0.45}`} stroke="#fff" strokeOpacity=".5" strokeWidth={w * 0.14} strokeLinecap="round" />
                <ellipse cx={x - w * 0.18} cy={d - w * 0.08} rx={w * 0.12} ry={w * 0.16} fill="#fff" opacity=".7" />
              </g>
            ))}
          </svg>
          {[240, 760, 1300, 1660].map((x, i) => (
            <span key={i} className="dropf absolute top-[300px] h-12 w-9 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-[#F46F9C]" style={{ left: x }} />
          ))}
        </div>

        {/* 9 · the end */}
        <div className="scene s9 absolute inset-0 z-10 bg-[#FFE08A]">
          <div className="c9 absolute top-[90px] left-[300px]">
            <Cone cls="c9" w={340} scoops={[PHOTO.scoops.pistacchio, PHOTO.scoops.fragola, PHOTO.scoops["yellow-submarine"]]} />
          </div>
          <div className="absolute top-[300px] left-[820px]">
            <p className="font-display text-[230px] leading-none font-black">
              {["#F2557A", "#FF8A3D", "#1FA37A", "#7B6CF0"].map((c, i) => (
                <span key={i} className="inline-block overflow-hidden pb-5 align-bottom">
                  <span className="end-l inline-block" style={{ color: c }}>
                    {"Onda"[i]}
                  </span>
                </span>
              ))}
            </p>
            <p className="end-sub font-display text-5xl italic">gelato artigianale · Santa Teresa Gallura</p>
            <p className="end-url mt-10 inline-block rounded-full bg-chocolate px-10 py-4 text-4xl font-bold text-cream">onda-indol.vercel.app</p>
          </div>
        </div>

        <div className="wipe pointer-events-none absolute inset-0 z-50 opacity-0" />
        <div className="fade pointer-events-none absolute inset-0 z-[60] bg-[#FFE08A] opacity-0" />
      </div>
    </div>
  );
}
