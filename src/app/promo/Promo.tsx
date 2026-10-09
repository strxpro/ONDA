"use client";

/* eslint-disable @next/next/no-img-element */
import { Check, Microphone, Play, Star } from "@phosphor-icons/react";
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { PHOTO, photoGeometry } from "@/components/ice/PhotoStack";
import rv from "../../../public/promo/review.json";
import vc from "../../../public/promo/voice.json";

/**
 * The presentation film — 29.16 s on "Beyond Possible" (161.5 BPM), 1920×1080, rendered frame by frame at
 * 60 fps (scripts/record-promo.mjs). One paused GSAP timeline drives everything (window.__promo.seek(t)).
 *
 * Art direction (OpenMontage taste profile): "a real artisan product, presented like a hardware keynote" —
 * the photographed cone is the hero, the devices are the stage; one continuous camera, no cuts:
 *  - the real cone builds itself on the beat; the camera dives into the top scoop and comes out of it as the website;
 *  - the screen shrinks into its phone with a spring (Apple-style morph), screens push on springs;
 *  - the phone taps the NFC stand → the review card → 4–5★ go to Google, 1–3★ stay private for the owner;
 *  - the owner's voice types itself on screen and the site changes live (visitors, a price, a new flavor);
 *  - the world closes back into the cone, which gets its cherry on the last hit.
 * Beats: 0.06 · 4.40 · 6.40 · 10.40 · 12.21–12.71 roll · 14.35 · 16.06 · 16.80 · 18.28 · 22.24 · 26.46.
 */
const DURATION = 29.16;
const src = (n: string) => `/promo/${n}.jpg`;
const BARS = Array.from({ length: 24 }, (_, i) => 0.25 + 0.75 * Math.abs(Math.sin(i * 1.7 + 0.3)));
type Rect = { x: number; y: number; w: number; h: number };

/* the phone: 350×726 frame, screen 324×700 at +13 · the laptop: 1140×751, screen 1108×693 at +16 */
const P = { w: 350, h: 726, pad: 13, sw: 324, sh: 700 };
const M = { w: 1140, h: 751, pad: 16, sw: 1108, sh: 693 };
const at = (box: { w: number; h: number }, cx: number, cy: number, s = 1) => ({ x: cx - (box.w / 2) * s, y: cy - (box.h / 2) * s, scale: s });
const phoneFocus = (fx: number, fy: number, s: number, cx = 960, cy = 560) => ({ x: cx - (P.pad + fx * P.sw) * s, y: cy - (P.pad + fy * P.sh) * s, scale: s });
const macFocus = (fx: number, fy: number, s: number, cx = 960, cy = 540) => ({ x: cx - (M.pad + fx * M.sw) * s, y: cy - (M.pad + fy * M.sh) * s, scale: s });
const pct = (r: Rect) => ({ left: `${r.x * 100}%`, top: `${r.y * 100}%`, width: `${r.w * 100}%`, height: `${r.h * 100}%` });
const mid = (r: Rect) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });

/* the real cone (photos from the site): scoop width W, three scoops, center x 960 */
const CONE = { W: 300, top: 120 };
const G3 = photoGeometry(3);
const coneH = (W: number, g: ReturnType<typeof photoGeometry>) => W * Number(g.aspect.split("/")[1]);
/** stage point at the visual center of the top scoop of a cone placed at (left, top) */
const topScoop = (left: number, top: number, W: number, g: ReturnType<typeof photoGeometry>, i: number) => {
  const b = g.scoopBox(i);
  const H = coneH(W, g);
  return { x: left + W / 2, y: top + (b.top + b.height * 0.62) * H };
};
const SC = topScoop(960 - CONE.W / 2, CONE.top, CONE.W, G3, 2);
const OUT_CONE = { W: 230, left: 520, top: 210 };
const G4 = photoGeometry(3, { cherry: true });
const SC_OUT = topScoop(OUT_CONE.left, OUT_CONE.top, OUT_CONE.W, G4, 2);

const SAY = ["Quante persone ci sono oggi sul sito?", "Il cono medio da oggi costa 3,80.", "Aggiungi il gusto Mirto."];
const eur = (n: number) => `${n.toFixed(2).replace(".", ",")} €`;
const GRAIN = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 .3 0 0 0 0 .2 0 0 0 0 .15 0 0 0 .55 0'/%3E%3C/filter%3E%3Crect width='220' height='220' filter='url(%23n)'/%3E%3C/svg%3E")`;

export function Promo({ qr }: { qr: string }) {
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
      const IO = "power3.inOut";
      const OUT = "expo.out";
      const SPRING = "back.out(1.25)";
      const tl = gsap.timeline({ paused: true, defaults: { ease: OUT, duration: 0.9 } });

      gsap.set(q(".hide"), { autoAlpha: 0 });
      gsap.set(q(".ln"), { yPercent: 108 });
      gsap.set(q(".phone, .mac, .tg"), { transformOrigin: "0 0", transformPerspective: 2600 });
      gsap.set(q(".layer"), { autoAlpha: 0 });
      gsap.set(q(".scr:not(.first)"), { yPercent: 100 });
      gsap.set(q(".w"), { autoAlpha: 0, y: 18, filter: "blur(10px)" });
      gsap.set(q(".sheen"), { xPercent: -130 });
      gsap.set(q(".glare"), { xPercent: -120 });

      /* ambient: palettes, soft light, the devices breathing on the beat */
      tl.to(q(".blob-a"), { x: 300, y: 160, scale: 1.25, duration: DURATION, ease: "sine.inOut" }, 0).to(q(".blob-b"), { x: -320, y: -140, scale: 0.85, duration: DURATION, ease: "sine.inOut" }, 0);
      const palette = (cls: string, t: number) => tl.to(q(".pal"), { autoAlpha: 0, duration: 1.2, ease: "sine.inOut" }, t).to(q(cls), { autoAlpha: 1, duration: 1.2, ease: "sine.inOut" }, t);
      palette(".pal-b", 4.6);
      palette(".pal-c", 10.2);
      palette(".pal-d", 15.3);
      palette(".pal-e", 17.9);
      palette(".pal-a", 24.0);
      tl.fromTo(q(".float"), { y: -7 }, { y: 7, duration: 1.486, ease: "sine.inOut", repeat: 18, yoyo: true }, 0);
      const glint = (sel: string, t: number) => tl.fromTo(q(`${sel} .glare`), { xPercent: -120 }, { xPercent: 120, duration: 1.1, ease: "power2.inOut" }, t);
      const lines = (sel: string, t: number, st = 0.08) => tl.fromTo(q(`${sel} .ln`), { yPercent: 108, rotate: 2.5 }, { yPercent: 0, rotate: 0, duration: 0.95, stagger: st }, t);
      const unlines = (sel: string, t: number) => tl.to(q(`${sel} .ln`), { yPercent: -108, duration: 0.55, ease: "power3.in", stagger: 0.04 }, t).set(q(sel), { autoAlpha: 0 }, t + 0.7);
      /** Apple-like screen push: the new screen springs up from below, the old one sinks back and dims */
      const push = (dev: string, i: number, t: number) =>
        tl
          .fromTo(q(`${dev} .scr`)[i], { yPercent: 100 }, { yPercent: 0, duration: 0.85, ease: "expo.inOut" }, t)
          .fromTo(q(`${dev} .scr`)[i - 1], { yPercent: 0, scale: 1 }, { yPercent: -18, scale: 0.94, duration: 0.85, ease: "expo.inOut", immediateRender: false }, t);
      /** a layer arrives over the current screen with a soft spring */
      const layerIn = (sel: string, t: number, from = { yPercent: 14, scale: 1.04 }) =>
        tl.fromTo(q(sel), { autoAlpha: 0, ...from }, { autoAlpha: 1, yPercent: 0, scale: 1, duration: 0.7, ease: "expo.out" }, t);
      const ring = (sel: string, t: number) => tl.fromTo(q(sel), { autoAlpha: 0, scale: 1.35 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: "back.out(2.2)" }, t);
      const tap = (sel: string, t: number) => tl.fromTo(q(sel), { autoAlpha: 0.65, scale: 0 }, { autoAlpha: 0, scale: 3, duration: 0.6, ease: "power2.out" }, t);
      const drop = (sel: string, t: number, k = 1, from = -720) =>
        tl
          .fromTo(q(sel), { y: from, autoAlpha: 1 }, { y: 0, duration: 0.36 * k, ease: "power2.in" }, t)
          .fromTo(q(sel), { scaleY: 0.78, scaleX: 1.14, transformOrigin: "50% 92%" }, { scaleY: 1, scaleX: 1, duration: 0.95, ease: "elastic.out(1.1, 0.33)", immediateRender: false }, t + 0.36 * k);

      /* ── 0 · the real cone builds itself on the beat ── */
      tl.set(q(".sA"), { autoAlpha: 1 }, 0)
        .fromTo(q(".sA .cone-img"), { y: 560, rotate: -6 }, { y: 0, rotate: 0, duration: 1.0, ease: "back.out(1.4)" }, 0.06)
        .fromTo(q(".sA .shadow"), { scale: 0.2, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 1.0 }, 0.1);
      drop(".sA .sc-0", 0.8);
      drop(".sA .sc-1", 1.54);
      drop(".sA .sc-2", 2.28);
      [1.16, 1.9, 2.64].forEach((t) => tl.fromTo(q(".sA .cone-wrap"), { scaleY: 0.975, scaleX: 1.015, transformOrigin: "50% 100%" }, { scaleY: 1, scaleX: 1, duration: 0.5, ease: "power2.out", immediateRender: false }, t));
      tl.fromTo(q(".sA .cone-wrap"), { rotate: -1.6 }, { rotate: 1.6, duration: 1.486, ease: "sine.inOut", repeat: 2, yoyo: true, transformOrigin: "50% 100%" }, 0.06)
        .to(q(".sA .cone-wrap"), { x: -330, duration: 1.1, ease: IO }, 2.75)
        .fromTo(q(".sA .ch"), { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.06, duration: 0.9 }, 2.95)
        .fromTo(q(".sA .sub"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 3.3)
        .fromTo(q(".sA .sheen"), { xPercent: -130 }, { xPercent: 130, duration: 1.2, ease: "power2.inOut" }, 2.9)
        .to(q(".sA .words"), { autoAlpha: 0, x: 60, duration: 0.45, ease: "power3.in" }, 3.8)
        .to(q(".sA .cone-wrap"), { x: 0, duration: 0.6, ease: IO }, 3.8)
        // the camera dives into the top scoop…
        .fromTo(q(".sA .cam"), { scale: 1, transformOrigin: `${SC.x}px ${SC.y}px` }, { scale: 1.5, duration: 0.6, ease: "power2.in" }, 3.8)
        .to(q(".sA .cam"), { scale: 11, duration: 0.6, ease: "power3.in" }, 4.4)
        .set(q(".sA"), { autoAlpha: 0 }, 5.0);
      // …and comes out of it as the website: the screen shrinks into its phone with a spring
      tl.set(q(".phone"), { autoAlpha: 1, ...phoneFocus(0.5, 0.13, 6.2, SC.x, SC.y) }, 4.4)
        .fromTo(q(".world"), { clipPath: `circle(0px at ${SC.x}px ${SC.y}px)` }, { clipPath: `circle(2300px at ${SC.x}px ${SC.y}px)`, duration: 0.6, ease: "power2.in" }, 4.4)
        .to(q(".phone"), { ...at(P, 1360, 560, 1.18), duration: 1.25, ease: SPRING }, 4.95)
        .set(q(".world"), { clipPath: "none" }, 5.0);
      glint(".phone", 5.4);

      /* ── 1 · per i clienti (5 → 10.4) ── */
      tl.set(q(".sB"), { autoAlpha: 1 }, 5.0);
      lines(".sB .ttl", 5.25);
      push(".phone", 1, 5.95);
      unlines(".sB .ttl", 6.05);
      tl.fromTo(q(".mac"), { ...at(M, 760, 1450, 0.92), autoAlpha: 1, rotateX: 32 }, { ...at(M, 760, 580), rotateX: 0, duration: 1.3, ease: SPRING }, 6.4)
        .to(q(".phone"), { ...at(P, 1530, 640, 1), duration: 1.2, ease: IO }, 6.35);
      glint(".mac", 7.2);
      [7.14, 7.88, 8.62].forEach((t, i) => push(".mac", i + 1, t - 0.12));
      [7.51, 8.25].forEach((t, i) => push(".phone", i + 2, t - 0.12));
      q(".sB .cap").forEach((c, i) => {
        const t = [7.1, 7.84, 8.58, 9.33][i];
        tl.fromTo(c, { autoAlpha: 0, yPercent: 60 }, { autoAlpha: 1, yPercent: 0, duration: 0.5 }, t);
        if (i < 3) tl.to(c, { autoAlpha: 0, yPercent: -60, duration: 0.35, ease: "power3.in" }, t + 0.52);
      });
      // morph → the laptop glides away, the phone heads for the counter
      tl.to(q(".mac"), { ...at(M, -760, 560, 0.8), rotateY: 28, duration: 1.1, ease: IO }, 9.85)
        .to(q(".sB .cap"), { autoAlpha: 0, duration: 0.3 }, 9.85)
        .to(q(".phone"), { ...at(P, 1420, 560, 1.05), rotateY: -16, rotateX: 6, duration: 1.0, ease: IO }, 9.95);

      /* ── 2 · NFC / QR review (10.4 → 15.4) ── */
      tl.set(q(".sC"), { autoAlpha: 1 }, 10.3);
      lines(".sC .t1", 10.42);
      tl.fromTo(q(".stand"), { y: 700, rotateY: 26, rotate: -4, autoAlpha: 1, transformPerspective: 1800 }, { y: 0, rotateY: 14, rotate: -2, duration: 1.1, ease: SPRING }, 10.4)
        // the phone comes close to the stand… tap
        .to(q(".phone"), { ...at(P, 820, 650, 0.8), rotateY: -22, rotateX: 10, rotate: -12, duration: 0.75, ease: "power3.inOut" }, 10.42)
        .fromTo(q(".phone .nfc-glow"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 11.05)
        .fromTo(q(".nfc-ring"), { scale: 0.2, autoAlpha: 0.9 }, { scale: 2.6, autoAlpha: 0, duration: 1.0, stagger: 0.14, ease: "power2.out" }, 11.15)
        .to(q(".phone"), { keyframes: { x: ["+=5", "-=9", "+=6", "-=2"] }, duration: 0.22, ease: "none" }, 11.15)
        .fromTo(q(".phone .notif"), { yPercent: -160 }, { yPercent: 0, duration: 0.6, ease: "back.out(1.7)" }, 11.25)
        .to(q(".phone .nfc-glow"), { autoAlpha: 0, duration: 0.4 }, 11.5)
        // …the phone lifts off to us, the review card opens
        .to(q(".stand"), { x: -520, rotateY: 40, autoAlpha: 0, duration: 0.8, ease: "power3.in" }, 11.5);
      unlines(".sC .t1", 11.5);
      tl.to(q(".phone"), { ...phoneFocus(0.5, 0.52, 2.0, 1200, 560), rotateY: 0, rotateX: 0, rotate: 0, duration: 1.0, ease: SPRING }, 11.55)
        .to(q(".phone"), { ...at(P, 1250, 560, 1.36), duration: 0.9, ease: SPRING }, 12.88)
        .to(q(".phone .notif"), { yPercent: -160, duration: 0.4, ease: "power3.in" }, 11.62);
      layerIn(".phone .l-rate", 11.72);
      glint(".phone", 11.9);
      lines(".sC .t2", 11.9);
      // five stars on the drum roll
      [12.21, 12.33, 12.46, 12.59, 12.71].forEach((t, i) => tl.fromTo(q(".l-rate .st")[i], { scale: 0, rotate: -50, autoAlpha: 1 }, { scale: 1, rotate: 0, duration: 0.5, ease: "back.out(3)" }, t));
      // 4–5★ → Google
      unlines(".sC .t2", 12.85);
      layerIn(".phone .l-rate5", 12.95, { yPercent: 100, scale: 1 });
      lines(".sC .t3", 13.2);
      ring(".l-rate5 .ring", 13.3);
      tap(".l-rate5 .tp", 13.6);
      tl.fromTo(q(".sC .gpill"), { autoAlpha: 0, y: 20, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(2)" }, 13.62);
      // 1–3★ → stays private, for the owner only
      unlines(".sC .t3", 13.92);
      tl.to(q(".sC .gpill"), { autoAlpha: 0, y: -20, duration: 0.35, ease: "power3.in" }, 13.92);
      layerIn(".phone .l-rateB", 13.95, { yPercent: -100, scale: 1 });
      tl.fromTo(q(".l-rateB .st"), { scale: 1 }, { scale: (i: number) => (i < 3 ? 1 : 0), duration: 0.35, ease: "back.in(2)", stagger: -0.06 }, 14.12);
      layerIn(".phone .l-rate3", 14.35, { yPercent: 100, scale: 1 });
      lines(".sC .t4", 14.35);
      ring(".l-rate3 .ring", 14.6);
      tl.fromTo(q(".l-rate3 .t-name"), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.28, ease: "steps(6)" }, 14.7)
        .fromTo(q(".l-rate3 .t-msg"), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.55, ease: "steps(16)" }, 14.95);
      tap(".l-rate3 .tp", 15.45);
      layerIn(".phone .l-thanksP", 15.55, { yPercent: 0, scale: 0.92 });
      unlines(".sC .t4", 15.75);

      /* ── 3 · the owner decides (15.8 → 18.2): the note flies into the panel ── */
      tl.set(q(".sD"), { autoAlpha: 1 }, 15.7)
        .set(q(".mac .l-admin"), { autoAlpha: 1 }, 15.7)
        .fromTo(q(".mac"), { ...at(M, 960, 1500, 0.9), rotateY: 0, rotateX: 30 }, { ...at(M, 960, 560, 1), rotateX: 0, duration: 1.0, ease: SPRING }, 15.75)
        .to(q(".phone"), { ...at(P, 960 + (mid(rv.card).x - 0.5) * M.sw, 560 + (mid(rv.card).y - 0.5) * M.sh, 0.18), autoAlpha: 0, duration: 0.55, ease: "power3.in" }, 15.8)
        .set(q(".sC"), { autoAlpha: 0 }, 15.9)
        .to(q(".mac"), { ...macFocus(mid(rv.card).x, mid(rv.card).y + 0.02, 1.75), duration: 0.8, ease: IO }, 16.06);
      lines(".sD .t5", 16.06);
      tl.fromTo(q(".mac .press"), { autoAlpha: 0 }, { autoAlpha: 0.3, duration: 0.09, yoyo: true, repeat: 1, ease: "none" }, 16.8);
      tap(".mac .ripple", 16.8);
      tl.to(q(".mac .l-admin2"), { autoAlpha: 1, duration: 0.35, ease: "sine.inOut" }, 16.98)
        .to(q(".mac"), { ...macFocus(mid(rv.cardAfter).x, mid(rv.cardAfter).y + 0.02, 1.75), duration: 0.8, ease: IO }, 16.98);
      unlines(".sD .t5", 17.75);

      /* ── 4 · voice (18 → 24.3): the words type themselves, the site changes live ── */
      tl.to(q(".mac"), { ...at(M, 960, 1500, 0.8), rotateX: -20, autoAlpha: 0, duration: 0.8, ease: "power3.in" }, 17.85)
        .set(q(".sD"), { autoAlpha: 0 }, 18.6)
        .set(q(".sE"), { autoAlpha: 1 }, 18.0)
        .set(q(".phone .l-thanksP, .phone .l-rate3, .phone .l-rateB, .phone .l-rate5, .phone .l-rate"), { autoAlpha: 0 }, 18.0)
        .set(q(".phone .l-price"), { autoAlpha: 1 }, 18.0)
        .fromTo(q(".phone"), { ...at(P, 1420, 1500, 1.1), autoAlpha: 1, rotateX: 25 }, { ...at(P, 1420, 640, 1.1), rotateX: 0, duration: 1.0, ease: SPRING }, 18.1)
        .fromTo(q(".tg"), { ...at(P, 560, 1500, 1.2), autoAlpha: 1, rotateX: 25 }, { ...at(P, 560, 650, 1.2), rotateX: 0, duration: 1.0, ease: SPRING }, 18.0)
        .fromTo(q(".mic"), { autoAlpha: 0, scale: 0.6 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(2)" }, 18.28)
        .fromTo(q(".mic .pulse"), { scale: 1, autoAlpha: 0.5 }, { scale: 1.9, autoAlpha: 0, duration: 0.743, repeat: 7, ease: "power1.out" }, 18.28);
      const BUBBLE_UP = { autoAlpha: 0, y: 30, scale: 0.85, transformOrigin: "50% 100%" };
      const say = (i: number, t: number, per: number) => {
        const ws = q(`.say-${i} .w`);
        tl.set(q(`.say-${i}`), { autoAlpha: 1 }, t)
          .to(ws, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.4, stagger: per, ease: "power3.out" }, t)
          .fromTo(q(`.ex-${i} .voice`), BUBBLE_UP, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(1.6)" }, t)
          .fromTo(q(`.ex-${i} .bar`), { scaleY: 0.2 }, { scaleY: (k: number) => BARS[k], duration: 0.186, stagger: { each: 0.018, repeat: Math.round((ws.length * per) / 0.37), yoyo: true }, ease: "sine.inOut" }, t)
          .to(q(`.ex-${i} .tw`), { autoAlpha: 1, duration: 0.01, stagger: per }, t + 0.05);
      };
      const reply = (i: number, t: number) => tl.fromTo(q(`.ex-${i} .bot`), BUBBLE_UP, { autoAlpha: 1, y: 0, scale: 1, duration: 0.55, ease: "back.out(1.6)" }, t);
      const clear = (i: number, t: number) => tl.to(q(`.ex-${i}`), { y: -140, autoAlpha: 0, duration: 0.45, ease: "power3.in" }, t).to(q(`.say-${i}`), { autoAlpha: 0, y: -30, filter: "blur(8px)", duration: 0.4, ease: "power3.in" }, t);
      // 1. how many people today?
      say(1, 18.45, 0.11);
      reply(1, 19.32);
      const counters = q(".count");
      counters.forEach((c) => {
        const to = Number(c.dataset.to);
        const o = { v: 0 };
        tl.to(o, { v: to, duration: 0.6, ease: "power2.out", onUpdate: () => void (c.textContent = String(Math.round(o.v))) }, 19.5);
      });
      tl.fromTo(q(".phone .online"), { autoAlpha: 0, y: 14, scale: 0.8 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2)" }, 19.55);
      clear(1, 19.92);
      tl.to(q(".phone .online"), { autoAlpha: 0, duration: 0.3 }, 19.92);
      // 2. a new price
      say(2, 20.0, 0.1);
      tl.to(q(".phone"), { ...phoneFocus(mid(vc.price).x, mid(vc.price).y, 1.8, 1420, 640), duration: 0.8, ease: IO }, 20.3);
      reply(2, 20.78);
      tap(".ex-2 .tp", 21.11);
      tl.to(q(".ex-2 .ok"), { backgroundColor: "#4FA845", color: "#fff", duration: 0.15 }, 21.11)
        .fromTo(q(".l-price .roll"), { yPercent: 100 }, { yPercent: 0, duration: 0.55, ease: "back.out(1.8)" }, 21.2)
        .fromTo(q(".l-price .old"), { yPercent: 0 }, { yPercent: -100, duration: 0.55, ease: "back.out(1.8)" }, 21.2);
      ring(".l-price .ring", 21.3);
      clear(2, 21.55);
      // 3. a new flavor — the climax: it lands on the live menu
      say(3, 21.6, 0.1);
      tl.to(q(".phone"), { ...at(P, 1420, 640, 1.1), duration: 0.6, ease: IO }, 21.6)
        .to(q(".phone .l-mirto"), { autoAlpha: 1, duration: 0.4, ease: "sine.inOut" }, 21.8);
      reply(3, 21.95);
      tap(".ex-3 .tp", 22.24);
      tl.to(q(".ex-3 .ok"), { backgroundColor: "#4FA845", color: "#fff", duration: 0.15 }, 22.24)
        .to(q(".l-mirto .after"), { autoAlpha: 1, duration: 0.25, ease: "none" }, 22.3);
      drop(".l-mirto .tile", 22.3, 0.9, -260);
      ring(".l-mirto .ring", 22.75);
      tl.fromTo(q(".l-mirto .badge"), { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.5, ease: "back.out(3)" }, 22.8)
        .to(q(".tg"), { ...at(P, -300, 640, 1), rotate: -8, duration: 0.9, ease: IO }, 22.9)
        .to(q(".mic, .say-3"), { autoAlpha: 0, duration: 0.4 }, 22.9)
        .to(q(".phone"), { ...phoneFocus(mid(vc.mirto).x, mid(vc.mirto).y + 0.02, 2.3, 960, 560), duration: 1.2, ease: "power2.inOut" }, 22.95);
      tl.fromTo(q(".sE .t6 p"), { autoAlpha: 0, scale: 0.7, y: 30 }, { autoAlpha: 1, scale: 1, y: 0, duration: 0.7, ease: "back.out(1.8)" }, 23.0);
      lines(".sE .t6", 23.1);

      /* ── 5 · outro: the world closes back into the cone, and the cherry lands ── */
      tl.set(q(".sF"), { autoAlpha: 1 }, 24.05)
        .fromTo(q(".world"), { clipPath: `circle(2300px at ${SC_OUT.x}px ${SC_OUT.y}px)` }, { clipPath: `circle(0px at ${SC_OUT.x}px ${SC_OUT.y}px)`, duration: 0.75, ease: "power3.in", immediateRender: false }, 24.05)
        .to(q(".sE .t6 p"), { autoAlpha: 0, scale: 0.85, duration: 0.4, ease: "power3.in" }, 24.0)
        .fromTo(q(".sF .cam"), { scale: 5, transformOrigin: `${SC_OUT.x}px ${SC_OUT.y}px` }, { scale: 1, duration: 1.3, ease: "expo.out" }, 24.3)
        .set(q(".world"), { autoAlpha: 0 }, 24.85);
      drop(".sF .cherry-d", 26.1, 1, -500);
      [24.97, 25.71, 27.2, 27.94].forEach((t) => tl.fromTo(q(".sF .cone-wrap"), { scaleY: 0.985, scaleX: 1.01, transformOrigin: "50% 100%" }, { scaleY: 1, scaleX: 1, duration: 0.4, ease: "power2.out", immediateRender: false }, t));
      tl.fromTo(q(".sF .ch"), { yPercent: 110, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.035, duration: 0.9 }, 24.9)
        .fromTo(q(".sF .sub"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.8 }, 25.5)
        .fromTo(q(".sF .feat span"), { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.186 }, 26.46)
        .fromTo(q(".sF .sheen"), { xPercent: -130 }, { xPercent: 130, duration: 1.3, ease: "power2.inOut" }, 26.5)
        .to(q(".sF"), { autoAlpha: 0, duration: 0.95, ease: "power2.in" }, 28.2)
        .set({}, {}, DURATION);

      tl.seek(0);
      const api = window as unknown as { __promo?: { duration: number; seek: (t: number) => void; ready: boolean } };
      api.__promo = { duration: DURATION, seek: (t: number) => void tl.seek(t, false), ready: false };
      Promise.all([document.fonts.ready, ...[...el.querySelectorAll("img")].map((i) => i.decode().catch(() => {}))]).then(() => api.__promo && (api.__promo.ready = true));
      if (new URLSearchParams(location.search).has("autoplay")) tl.play(0);
    }, el);
    return () => ctx.revert();
  }, []);

  const s = vc.stats as { people: number; visits: number };
  return (
    <div className="fixed inset-0 grid place-items-center overflow-hidden bg-[#FBF6F0]">
      <div ref={stage} className="relative h-[1080px] w-[1920px] shrink-0 overflow-hidden text-chocolate" style={{ transform: `scale(${scale})` }}>
        {/* atmosphere */}
        <div className="pal pal-a absolute inset-0 bg-[radial-gradient(55%_60%_at_8%_12%,#FFD3E1,transparent_70%),radial-gradient(50%_60%_at_92%_20%,#FFEDB5,transparent_70%),radial-gradient(70%_60%_at_50%_105%,#CDEFE3,transparent_72%)]" />
        <div className="pal pal-b hide absolute inset-0 bg-[radial-gradient(55%_60%_at_8%_12%,#FFCFDF,transparent_70%),radial-gradient(50%_60%_at_92%_20%,#FFDDB8,transparent_70%),radial-gradient(70%_60%_at_50%_105%,#FFF0B5,transparent_72%)]" />
        <div className="pal pal-c hide absolute inset-0 bg-[radial-gradient(55%_60%_at_10%_15%,#FFE0EA,transparent_70%),radial-gradient(50%_60%_at_90%_20%,#FFEBC0,transparent_70%),radial-gradient(70%_60%_at_50%_105%,#DDF0FF,transparent_72%)]" />
        <div className="pal pal-d hide absolute inset-0 bg-[radial-gradient(55%_60%_at_10%_15%,#E2D8FF,transparent_70%),radial-gradient(50%_60%_at_90%_20%,#D3EEFF,transparent_70%),radial-gradient(70%_60%_at_50%_105%,#FFDCE8,transparent_72%)]" />
        <div className="pal pal-e hide absolute inset-0 bg-[radial-gradient(55%_60%_at_10%_15%,#C6F0E2,transparent_70%),radial-gradient(50%_60%_at_90%_20%,#FFE6C6,transparent_70%),radial-gradient(70%_60%_at_50%_105%,#FFCFDF,transparent_72%)]" />
        <div className="blob-a absolute top-[-300px] left-[-260px] size-[1100px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.9),transparent_62%)]" />
        <div className="blob-b absolute right-[-300px] bottom-[-380px] size-[1200px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.75),transparent_62%)]" />

        {/* 0 — the real cone */}
        <section className="sA hide absolute inset-0">
          <div className="cam absolute inset-0">
            <RealCone W={CONE.W} left={960 - CONE.W / 2} top={CONE.top} scoops={[PHOTO.scoops.cioccolato, PHOTO.scoops.pistacchio, PHOTO.scoops.fragola]} />
            <div className="words absolute top-[400px] left-[900px]">
              <p className="overflow-hidden pb-2 font-display text-[200px] leading-[0.95] tracking-[-0.05em]">
                {"onda.".split("").map((c, i) => (
                  <span key={i} className={`ch inline-block ${c === "." ? "text-[#F0527F]" : ""}`}>
                    {c}
                  </span>
                ))}
              </p>
              <p className="sub hide mt-1 pl-2 text-[24px] font-semibold tracking-[0.34em] text-chocolate/60 uppercase">Gelateria artigianale · Santa Teresa</p>
            </div>
          </div>
        </section>

        {/* scene texts */}
        <section className="sB hide absolute inset-0">
          <Lines cls="ttl top-[330px] left-[150px]" lines={["Il tuo gelato,", "online."]} accent={1} />
          {["Il menu del giorno.", "Le foto, da toccare.", "Crea il tuo cono.", "Altre delizie."].map((c, i) => (
            <p key={i} className="cap hide absolute inset-x-0 top-[990px] overflow-hidden text-center font-display text-[44px] tracking-[-0.02em]">
              {c}
            </p>
          ))}
        </section>
        <section className="sC hide absolute inset-0">
          <Lines cls="t1 top-[110px] left-[150px]" lines={["Una recensione?", "Avvicina il telefono."]} accent={1} size={92} />
          <Lines cls="t2 top-[380px] left-[150px]" lines={["Quante stelle?"]} size={104} />
          <Lines cls="t3 top-[330px] left-[150px]" lines={["4–5 stelle:", "dritti su Google."]} accent={1} size={96} />
          <p className="gpill hide absolute top-[590px] left-[156px] flex items-center gap-3 rounded-full bg-white/85 px-6 py-3 text-[26px] font-bold shadow-[0_20px_40px_-20px_rgba(75,42,32,0.45)]">
            <Stars n={5} /> → Google Maps
          </p>
          <Lines cls="t4 top-[330px] left-[150px]" lines={["1–3 stelle:", "solo per te."]} accent={1} size={96} sub="Un messaggio privato. Lo pubblichi tu, se vuoi." />
          <Stand qr={qr} />
        </section>
        <section className="sD hide absolute inset-0 z-[5]">
          <Lines cls="t5 top-[900px] inset-x-0 text-center" lines={["Decidi tu cosa pubblicare."]} size={64} />
        </section>
        <section className="sE hide absolute inset-0 z-10">
          <div className="mic hide absolute top-[78px] left-1/2 flex -translate-x-1/2 items-center gap-3 rounded-full bg-chocolate px-5 py-2.5 text-[20px] font-bold tracking-[0.18em] text-cream uppercase">
            <span className="relative grid size-8 place-items-center rounded-full bg-[#F0527F]">
              <span className="pulse absolute inset-0 rounded-full bg-[#F0527F]" />
              <Microphone weight="fill" className="relative size-5" />
            </span>
            Con la tua voce
          </div>
          {SAY.map((t, i) => (
            <p key={i} className={`say-${i + 1} hide absolute inset-x-0 top-[150px] text-center font-display text-[64px] leading-tight tracking-[-0.03em]`}>
              <span className="w">«</span>
              {t.split(" ").map((w, k) => (
                <span key={k} className="w inline-block whitespace-pre">
                  {w}{" "}
                </span>
              ))}
              <span className="w">»</span>
            </p>
          ))}
          <div className="t6 absolute inset-x-0 top-[900px] text-center">
            <p className="inline-block overflow-hidden rounded-full bg-chocolate px-12 py-4 font-display text-[60px] leading-none tracking-[-0.03em] text-cream shadow-[0_30px_60px_-24px_rgba(75,42,32,0.6)]">
              <span className="ln inline-block pb-1">Detto. Fatto. Già online.</span>
            </p>
          </div>
          <TelegramPhone people={s.people} visits={s.visits} />
        </section>

        {/* 5 — outro */}
        <section className="sF hide absolute inset-0">
          <div className="cam absolute inset-0">
            <RealCone W={OUT_CONE.W} left={OUT_CONE.left} top={OUT_CONE.top} cherry scoops={[PHOTO.scoops.cioccolato, PHOTO.scoops.pistacchio, PHOTO.scoops.fragola]} />
          </div>
          <div className="absolute top-[360px] left-[860px]">
            <p className="overflow-hidden pb-2 font-display text-[128px] leading-[0.95] tracking-[-0.045em]">
              {"Gelateria Onda".split("").map((c, i) => (
                <span key={i} className="ch inline-block whitespace-pre">
                  {c}
                </span>
              ))}
            </p>
            <p className="sub hide mt-3 pl-1 text-[24px] font-semibold tracking-[0.34em] text-chocolate/60 uppercase">Via Amsicora 2 · Santa Teresa Gallura</p>
            <p className="feat mt-10 flex gap-3 text-[23px] font-semibold">
              {["Menu del giorno", "Recensioni NFC · QR", "Comandi vocali"].map((x) => (
                <span key={x} className="rounded-full bg-white/80 px-6 py-2 shadow-[0_10px_30px_-14px_rgba(75,42,32,0.4)]">
                  {x}
                </span>
              ))}
            </p>
          </div>
        </section>

        {/* the devices live in one "world" that opens out of the cone and closes back into it */}
        <div className="world absolute inset-0">
          {/* the laptop */}
          <div className="mac hide absolute top-0 left-0" style={{ width: M.w }}>
            <div className="float">
              <div className="relative rounded-[30px] bg-[linear-gradient(160deg,#cfc8c4,#5c5552_30%,#231e1c_60%,#7a726e)] p-[3px] shadow-[0_90px_140px_-50px_rgba(75,42,32,0.65)]">
                <div className="relative rounded-[27px] bg-[#0f0b0a] p-[13px]">
                  <div className="absolute top-[13px] left-1/2 z-10 h-[20px] w-[140px] -translate-x-1/2 rounded-b-[10px] bg-[#0f0b0a]" />
                  <div className="relative h-[693px] w-[1108px] overflow-hidden rounded-[14px] bg-cream">
                    {["d-hero", "d-flavors", "d-lab", "d-builder"].map((n, i) => (
                      <img key={n} src={src(n)} alt="" className={`scr absolute inset-0 h-full w-full object-cover object-top ${i ? "" : "first"}`} />
                    ))}
                    <img src={src("a-commenti")} alt="" className="layer l-admin absolute inset-0 h-full w-full object-cover object-top" />
                    <img src={src("a-commenti-after")} alt="" className="layer l-admin2 absolute inset-0 h-full w-full object-cover object-top" />
                    <span className="press absolute rounded-full bg-chocolate opacity-0" style={pct(rv.publish)} />
                    <span className="ripple absolute size-16 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4FD18B] opacity-0" style={{ left: `${mid(rv.publish).x * 100}%`, top: `${mid(rv.publish).y * 100}%` }} />
                    <Glare />
                  </div>
                </div>
              </div>
              <div className="relative -mt-[2px] h-[24px] w-[1260px] -translate-x-[60px] rounded-b-[30px] bg-gradient-to-b from-[#ece6e3] via-[#c9c1bd] to-[#8f8783] shadow-[0_30px_40px_-20px_rgba(75,42,32,0.5)]">
                <span className="absolute top-0 left-1/2 h-[9px] w-[180px] -translate-x-1/2 rounded-b-[10px] bg-[#bdb5b1]" />
              </div>
            </div>
          </div>

          {/* the phone — it travels through the whole film */}
          <div className="phone hide absolute top-0 left-0" style={{ width: P.w }}>
            <div className="float">
              <span className="nfc-glow absolute -inset-6 rounded-[80px] bg-[radial-gradient(circle_at_50%_8%,rgba(255,224,102,0.9),transparent_60%)] opacity-0 blur-md" />
              <PhoneFrame>
                {["m-hero", "m-flavors", "m-lab", "m-treats"].map((n, i) => (
                  <img key={n} src={src(n)} alt="" className={`scr absolute inset-0 h-full w-full object-cover object-top ${i ? "" : "first"}`} />
                ))}
                {/* the review card: stars → Google, or private */}
                <div className="layer l-rate absolute inset-0">
                  <img src={src("m-rate")} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  {rv.stars.map((r, i) => (
                    <StarAt key={i} r={r} />
                  ))}
                </div>
                <div className="layer l-rate5 absolute inset-0">
                  <img src={src("m-rate-5")} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <span className="ring absolute rounded-full border-[4px] border-[#4285F4] opacity-0 shadow-[0_0_0_8px_rgba(66,133,244,0.18)]" style={pct(rv.google)} />
                  <span className="tp absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4285F4] opacity-0" style={{ left: `${mid(rv.google).x * 100}%`, top: `${mid(rv.google).y * 100}%` }} />
                </div>
                <div className="layer l-rateB absolute inset-0">
                  <img src={src("m-rate")} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  {rv.stars.map((r, i) => (
                    <StarAt key={i} r={r} on />
                  ))}
                </div>
                <div className="layer l-rate3 absolute inset-0">
                  <img src={src("m-rate-3")} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <Crop cls="t-name" r={rv.name} img="m-rate-3-filled" />
                  <Crop cls="t-msg" r={rv.message} img="m-rate-3-filled" />
                  <span className="ring absolute rounded-[18px] border-[4px] border-chocolate opacity-0 shadow-[0_0_0_8px_rgba(75,42,32,0.12)]" style={pct(rv.lock)} />
                  <span className="tp absolute size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-chocolate opacity-0" style={{ left: `${mid(rv.send).x * 100}%`, top: `${mid(rv.send).y * 100}%` }} />
                </div>
                <img src={src("m-thanks-private")} alt="" className="layer l-thanksP absolute inset-0 h-full w-full object-cover" />
                {/* by voice: a price rolls over, a flavor lands */}
                <div className="layer l-price absolute inset-0">
                  <img src={src("m-price-before")} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute overflow-hidden rounded-2xl" style={pct(vc.price)}>
                    <div className="old absolute inset-0">
                      <CropImg r={vc.price} img="m-price-before" />
                    </div>
                    <div className="roll absolute inset-0">
                      <CropImg r={vc.priceAfter} img="m-price-after" />
                    </div>
                  </div>
                  <span className="ring absolute rounded-[20px] border-[4px] border-[#F0527F] opacity-0 shadow-[0_0_0_8px_rgba(240,82,127,0.18)]" style={pct({ x: vc.price.x - 0.015, y: vc.price.y - 0.008, w: vc.price.w + 0.03, h: vc.price.h + 0.016 })} />
                  <span className="online absolute top-[86px] left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-chocolate px-4 py-1.5 text-[15px] font-bold whitespace-nowrap text-cream opacity-0">
                    <span className="size-2.5 rounded-full bg-[#4FD18B]" /> {s.people} persone oggi
                  </span>
                </div>
                <div className="layer l-mirto absolute inset-0">
                  <img src={src("m-mirto-before")} alt="" className="absolute inset-0 h-full w-full object-cover" />
                  <div className="after absolute inset-0 opacity-0">
                    <img src={src("m-mirto-after")} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    <div className="absolute" style={pct({ ...vc.mirto, h: vc.mirto.h * 0.62 })}>
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,#FDC8D8,#FDE0E5)]" />
                    </div>
                    <div className="tile absolute opacity-0" style={pct({ ...vc.mirto, h: vc.mirto.h * 0.62 })}>
                      <CropImg r={{ ...vc.mirto, h: vc.mirto.h * 0.62 }} img="m-mirto-after" />
                    </div>
                  </div>
                  <span className="ring absolute rounded-[24px] border-[4px] border-[#F0527F] opacity-0 shadow-[0_0_0_8px_rgba(240,82,127,0.18)]" style={pct(vc.mirto)} />
                  <span className="badge absolute rounded-full bg-[#F0527F] px-2.5 py-1 text-[11px] font-black tracking-[0.12em] text-white uppercase opacity-0" style={{ left: `${(vc.mirto.x + vc.mirto.w * 0.62) * 100}%`, top: `${(vc.mirto.y + 0.01) * 100}%` }}>
                    Live
                  </span>
                </div>
                {/* the NFC notification */}
                <div className="notif absolute inset-x-[10px] top-[10px] z-20 flex items-center gap-3 rounded-[26px] bg-white/92 p-3 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.45)] backdrop-blur">
                  <span className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-[#FFE0EA]">
                    <img src={PHOTO.scoops.fragola} alt="" className="size-8 object-contain" />
                  </span>
                  <span className="min-w-0 text-[14px] leading-tight">
                    <b className="block text-[15px]">Gelateria Onda</b>
                    Lascia una recensione · tocca per aprire
                  </span>
                </div>
              </PhoneFrame>
            </div>
          </div>
        </div>

        {/* film grain + vignette: the "photographed" feel */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-multiply" style={{ backgroundImage: GRAIN }} />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_45%,transparent_60%,rgba(75,42,32,0.16))]" />
      </div>
    </div>
  );
}

/** The photographed cone from the site: waffle + three scoops (each one can drop on its own) and an optional cherry. */
function RealCone({ W, left, top, scoops, cherry = false }: { W: number; left: number; top: number; scoops: string[]; cherry?: boolean }) {
  const g = photoGeometry(scoops.length, { cherry });
  const H = coneH(W, g);
  return (
    <div className="absolute" style={{ left, top, width: W, height: H }}>
      <div className="shadow absolute -bottom-[26px] left-1/2 h-[46px] w-[70%] -translate-x-1/2 rounded-[50%] bg-[radial-gradient(closest-side,rgba(75,42,32,0.38),transparent)] blur-[3px]" />
      <div className="cone-wrap absolute inset-0">
        <div className="cone-img absolute" style={g.cone}>
          <img src={PHOTO.cone} alt="" className="block w-full drop-shadow-[0_18px_22px_rgba(75,42,32,0.3)]" />
        </div>
        {scoops.map((s, i) => (
          <div key={i} className={`sc-${i} absolute`} style={g.scoop(i)}>
            <img src={s} alt="" className="h-full w-full object-contain object-bottom drop-shadow-[0_14px_18px_rgba(75,42,32,0.28)]" />
          </div>
        ))}
        {cherry && (
          <div className="cherry-d absolute opacity-0" style={g.cherry(scoops.length)}>
            <img src={PHOTO.cherry} alt="" className="block w-full drop-shadow-[0_10px_12px_rgba(75,42,32,0.3)]" />
          </div>
        )}
        {/* a soft studio light sweeping across the cream */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden mix-blend-soft-light">
          <div className="sheen absolute inset-y-0 -left-1/2 w-[200%] bg-[linear-gradient(105deg,transparent_40%,rgba(255,255,255,0.9)_50%,transparent_60%)]" />
        </div>
      </div>
    </div>
  );
}

/** Masked headline lines that rise into place. */
function Lines({ cls, lines, accent = -1, size = 120, sub }: { cls: string; lines: string[]; accent?: number; size?: number; sub?: string }) {
  return (
    <div className={`absolute ${cls}`}>
      {lines.map((l, i) => (
        <p key={l} className={`overflow-hidden pb-[0.08em] font-display leading-[1] tracking-[-0.045em] whitespace-nowrap ${i === accent ? "text-[#F0527F] italic" : ""}`} style={{ fontSize: size }}>
          <span className="ln inline-block">{l}</span>
        </p>
      ))}
      {sub && (
        <p className="mt-5 overflow-hidden text-[30px] font-semibold text-chocolate/65">
          <span className="ln inline-block">{sub}</span>
        </p>
      )}
    </div>
  );
}

function Stars({ n }: { n: number }) {
  return (
    <span className="flex text-amber-400">
      {[1, 2, 3, 4, 5].map((k) => (
        <Star key={k} weight={k <= n ? "fill" : "regular"} className="size-7" />
      ))}
    </span>
  );
}

/** A filled star drawn exactly over a star of the screenshot. */
function StarAt({ r, on = false }: { r: Rect; on?: boolean }) {
  return (
    <span className={`st absolute grid place-items-center ${on ? "" : "opacity-0"}`} style={pct(r)}>
      <Star weight="fill" className="size-[78%] text-amber-400 drop-shadow-[0_4px_8px_rgba(240,170,40,0.45)]" />
    </span>
  );
}

/** A piece of another screenshot, exactly over the same spot (for "typing" reveals). */
function Crop({ cls, r, img }: { cls: string; r: Rect; img: string }) {
  return (
    <div className={`${cls} absolute overflow-hidden`} style={pct(r)}>
      <CropImg r={r} img={img} />
    </div>
  );
}
function CropImg({ r, img }: { r: Rect; img: string }) {
  return <img src={src(img)} alt="" className="absolute max-w-none" style={{ width: `${100 / r.w}%`, height: `${100 / r.h}%`, left: `${(-r.x / r.w) * 100}%`, top: `${(-r.y / r.h) * 100}%` }} />;
}

/** The table stand at the counter: tap with the phone (NFC) or scan the QR. */
function Stand({ qr }: { qr: string }) {
  return (
    <div className="stand hide absolute top-[340px] left-[300px] w-[500px]">
      <div className="relative rounded-[30px] bg-[linear-gradient(140deg,rgba(255,255,255,0.85),rgba(255,255,255,0.35))] p-[14px] shadow-[0_60px_90px_-40px_rgba(75,42,32,0.6)] ring-1 ring-white/70">
        <div className="rounded-[22px] bg-[radial-gradient(80%_70%_at_20%_10%,#FFD6E5,transparent_70%),radial-gradient(70%_70%_at_90%_100%,#FFF4BD,transparent_70%)] bg-[#FFF7EE] p-7 text-center">
          <div className="relative mx-auto grid size-[86px] place-items-center rounded-full bg-chocolate text-cream">
            {[0, 1, 2].map((i) => (
              <span key={i} className="nfc-ring absolute inset-0 rounded-full border-[3px] border-[#F0527F] opacity-0" />
            ))}
            <svg viewBox="0 0 24 24" className="size-11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M6 8.5a5 5 0 0 1 0 7M9.5 6a8.5 8.5 0 0 1 0 12M13 3.5a12 12 0 0 1 0 17" />
            </svg>
          </div>
          <p className="mt-4 font-display text-[38px] leading-tight">Com&apos;era il gelato?</p>
          <p className="mt-1 text-[17px] font-bold tracking-[0.14em] text-chocolate/60 uppercase">Avvicina il telefono · o inquadra</p>
          <div className="mx-auto mt-5 w-[52%] rounded-[1.2rem] bg-white p-[5%] [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
        </div>
      </div>
      <div className="mx-auto -mt-1 h-[34px] w-[86%] rounded-b-[18px] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(255,255,255,0.3))] shadow-[0_30px_40px_-24px_rgba(75,42,32,0.55)]" />
    </div>
  );
}

function Glare() {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden">
      <div className="glare absolute inset-y-0 -left-1/4 w-[150%] bg-[linear-gradient(110deg,transparent_42%,rgba(255,255,255,0.22)_50%,transparent_58%)]" />
    </div>
  );
}

/** A titanium-rimmed phone: rim → black bezel → screen, with side buttons and a glass glint. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-[350px] rounded-[64px] bg-[linear-gradient(150deg,#e2ddd9,#6f6864_28%,#26211f_55%,#8d8581_82%,#d6d0cc)] p-[3px] shadow-[0_80px_120px_-40px_rgba(75,42,32,0.7),0_30px_40px_-30px_rgba(75,42,32,0.5)]">
      <span className="absolute top-[150px] -left-[3px] h-[34px] w-[4px] rounded-l bg-[#8d8581]" />
      <span className="absolute top-[200px] -left-[3px] h-[58px] w-[4px] rounded-l bg-[#8d8581]" />
      <span className="absolute top-[270px] -left-[3px] h-[58px] w-[4px] rounded-l bg-[#8d8581]" />
      <span className="absolute top-[220px] -right-[3px] h-[90px] w-[4px] rounded-r bg-[#8d8581]" />
      <div className="rounded-[61px] bg-[#0b0908] p-[10px]">
        <div className="relative h-[700px] w-[324px] overflow-hidden rounded-[51px] bg-cream">
          {children}
          <span className="absolute top-[11px] left-1/2 z-40 h-[30px] w-[100px] -translate-x-1/2 rounded-full bg-black" />
          <Glare />
        </div>
      </div>
    </div>
  );
}

function TelegramPhone({ people, visits }: { people: number; visits: number }) {
  const me = "hide self-end max-w-[88%] rounded-[24px] rounded-br-[8px] bg-[#E3FFC9] px-4 py-3 shadow-[0_2px_2px_rgba(0,0,0,0.06)]";
  const bot = "bot hide self-start max-w-[90%] rounded-[24px] rounded-bl-[8px] bg-white px-5 py-3.5 text-[23px] leading-snug shadow-[0_2px_2px_rgba(0,0,0,0.06)]";
  const voice = (i: number) => (
    <div className={`voice ${me}`}>
      <span className="flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#4FA845] text-white">
          <Play weight="fill" className="size-5" />
        </span>
        <span className="flex h-8 items-center gap-[3px]">
          {BARS.map((_, k) => (
            <span key={k} className="bar h-full w-[3px] origin-center rounded-full bg-[#4FA845]" />
          ))}
        </span>
      </span>
      <span className="mt-1.5 block text-[19px] leading-snug text-[#3b5a33] italic">
        {SAY[i].split(" ").map((w, k) => (
          <span key={k} className="tw opacity-0">
            {w}{" "}
          </span>
        ))}
      </span>
    </div>
  );
  const confirm = (title: React.ReactNode) => (
    <div className={bot}>
      {title}
      <span className="mt-3 flex gap-2">
        <span className="ok relative flex flex-1 items-center justify-center gap-1.5 overflow-hidden rounded-[14px] bg-[#EAF3E6] py-2.5 text-[18px] font-bold text-[#3B7A33]">
          <span className="tp absolute size-16 rounded-full bg-white opacity-0" />
          <Check weight="bold" className="relative size-5" /> <span className="relative">Conferma</span>
        </span>
      </span>
    </div>
  );
  return (
    <div className="tg hide absolute top-0 left-0">
      <div className="float">
        <PhoneFrame>
          <div className="absolute inset-0 flex flex-col bg-[#CFE3C8]">
            <div className="flex items-center gap-3 bg-[#527DA3] px-5 pt-14 pb-4 text-white">
              <span className="grid size-12 place-items-center rounded-full bg-cream">
                <img src={PHOTO.scoops.fragola} alt="" className="size-9 object-contain" />
              </span>
              <span>
                <span className="block text-[21px] font-bold">Onda · Assistente</span>
                <span className="block text-[15px] opacity-80">bot</span>
              </span>
            </div>
            <div className="relative min-h-0 flex-1">
              <div className="ex-1 absolute inset-0 flex flex-col justify-end gap-3 p-4">
                {voice(0)}
                <div className={bot}>
                  <b className="block text-[16px] tracking-[0.12em] text-chocolate/55 uppercase">Oggi sul sito</b>
                  <span className="mt-1 flex gap-5">
                    <span>
                      <span className="count block font-display text-[44px] leading-none" data-to={people}>
                        0
                      </span>
                      persone
                    </span>
                    <span>
                      <span className="count block font-display text-[44px] leading-none" data-to={visits}>
                        0
                      </span>
                      visite
                    </span>
                  </span>
                </div>
              </div>
              <div className="ex-2 absolute inset-0 flex flex-col justify-end gap-3 p-4">
                {voice(1)}
                {confirm(
                  <>
                    <b>Cono medio</b>
                    <br />
                    {eur(vc.priceOld)} → <b>3,80 €</b>
                  </>,
                )}
              </div>
              <div className="ex-3 absolute inset-0 flex flex-col justify-end gap-3 p-4">
                {voice(2)}
                {confirm(
                  <>
                    <b>Nuovo gusto: Mirto</b>
                    <br />
                    tra gli Speciali, con il colore giusto
                  </>,
                )}
              </div>
            </div>
          </div>
        </PhoneFrame>
      </div>
    </div>
  );
}

