"use client";

/* eslint-disable @next/next/no-img-element */
import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
import { PHOTO, photoGeometry } from "@/components/ice/PhotoStack";
import { SCOOP_BODY } from "@/components/ice/Scoop";

/**
 * "ONDA — the edit": a hype motion-design edit, 27 s, 1920×1080 @ 60 fps, cut to the song's real hits
 * (measured from media/beyond-possible.mp3: phrase hits every ~1.99 s at 4.45 · 6.44 · 10.41 · 14.35 · 18.33 ·
 * 22.29 · 24.28, kicks in between). Nothing eases in slowly: things SLAM on the kick, the camera punches,
 * whips with motion blur, irises and slices between scenes. One paused GSAP timeline (window.__promo.seek).
 */
const DURATION = 27;
const KICKS = [0.22, 0.69, 1.25, 1.93, 2.2, 2.73, 3.09, 4.45, 5.02, 5.38, 6.44, 6.81, 7.18, 7.57, 7.95, 10.41, 10.73, 11.13, 11.56, 11.9, 14.35, 15.02, 15.38, 15.8, 16.1, 18.33, 18.61, 18.92, 19.34, 19.63, 19.9, 20.16, 20.55, 22.29, 24.28, 25.03];
const C = { pink: "#FF6F91", rose: "#FF8FB8", mint: "#6FE0C4", lemon: "#FFE066", orange: "#FFAA5C", lilac: "#9B8CFF", cream: "#FFF7EE", choc: "#4B2A20" };
const RAINBOW = [C.pink, C.orange, C.lemon, "#A8DB7A", C.mint, C.lilac];
const MASK = `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 190' preserveAspectRatio='none'><path d='${SCOOP_BODY}'/></svg>`)}")`;
const masked = { WebkitMaskImage: MASK, maskImage: MASK, WebkitMaskSize: "100% 100%", maskSize: "100% 100%" } as const;
const G = photoGeometry(3, { cherry: true });
const S = PHOTO.scoops;
const MENU = [S.pistacchio, S.fragola, S.cioccolato, S["yellow-submarine"], S.stracciatella, "/reel/s-mango.webp", "/reel/s-mirtillo.webp", S["banana-bread"], "/reel/s-anguria.webp", "/reel/s-nocciola.webp", "/reel/s-lampone.webp", "/reel/s-caramello.webp"];
const MENU_C = ["#A8DB7A", "#FF8FB8", "#C9935F", "#FFE066", "#FFF3E2", "#FFAA5C", "#9B8CFF", "#F3D58A", "#FF6F7D", "#C9935F", "#F2557A", "#E3A35C"];
const TUBS: [string, string, string][] = [
  ["FRAGOLA", "fragola", C.rose], ["PISTACCHIO", "pistacchio", "#A8DB7A"], ["TIRAMISÙ", "tiramisu", "#E8D3B9"], ["MANGO", "mango", C.orange], ["CARAMELLO", "caramello-salato", "#E3A35C"],
];
const TUB_T = [10.41, 10.73, 11.13, 11.56, 11.9];
const GAL = Array.from({ length: 9 }, (_, i) => `/reel/g${i + 1}.webp`);
const LAB_T = [18.33, 18.61, 18.92, 19.34, 19.63, 19.9, 20.16];
const CAKES = [1, 2, 3, 4].map((n) => `/img/cake/torta-${n}.webp`);
const SPR = Array.from({ length: 26 }, (_, i) => ({ a: (i / 26) * Math.PI * 2, d: 260 + (i % 4) * 90, c: RAINBOW[i % 6] }));
const NOTES = [
  ["Il pistacchio più buono della Sardegna!", "Giulia", "#FFF4BD"],
  ["Best gelato of our holiday 🍦", "Tom", "#FFD6E5"],
  ["Najlepsze lody w Santa Teresa!", "Ania", "#D2F8EE"],
];
const DRIPS: [number, number, number][] = [
  [80, 220, 80], [260, 380, 60], [430, 260, 96], [620, 450, 66], [800, 300, 100], [990, 410, 62], [1160, 240, 86], [1340, 470, 70], [1520, 310, 98], [1700, 420, 62], [1870, 250, 78],
];
const dripPath = (() => {
  const rim = 110;
  let d = `M0 0 H1920 V${rim} `;
  for (const [x, depth, w] of [...DRIPS].reverse()) {
    const r = w / 2, n = r * 0.72;
    d += `L${x + r + 30} ${rim} C${x + r + 4} ${rim} ${x + r} ${rim + 20} ${x + n} ${rim + (depth - rim) * 0.55} C${x + n * 0.9} ${depth - r * 1.2} ${x + r * 1.05} ${depth - r * 0.6} ${x + r * 0.98} ${depth - r * 0.15} C${x + r * 0.9} ${depth + r * 0.95} ${x - r * 0.9} ${depth + r * 0.95} ${x - r * 0.98} ${depth - r * 0.15} C${x - r * 1.05} ${depth - r * 0.6} ${x - n * 0.9} ${depth - r * 1.2} ${x - n} ${rim + (depth - rim) * 0.55} C${x - r} ${rim + 20} ${x - r - 4} ${rim} ${x - r - 30} ${rim} `;
  }
  return d + `L0 ${rim} Z`;
})();

function Cone({ cls, w }: { cls: string; w: number }) {
  const sc = [S.pistacchio, S.fragola, S["yellow-submarine"]];
  return (
    <div className={`${cls} absolute`} style={{ width: w, aspectRatio: G.aspect }}>
      <div className={`${cls}-cone absolute`} style={G.cone}>
        <img src={PHOTO.cone} alt="" className="block w-full" />
      </div>
      {sc.map((s, i) => (
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

/** a big word, split into letters (each letter is a .L inside a mask) */
function Word({ text, cls, className = "", colors }: { text: string; cls: string; className?: string; colors?: string[] }) {
  return (
    <p className={`${cls} absolute leading-none whitespace-nowrap ${className}`}>
      {[...text].map((c, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom">
          <span className="L inline-block" style={colors ? { color: colors[i % colors.length] } : undefined}>
            {c === " " ? " " : c}
          </span>
        </span>
      ))}
    </p>
  );
}

export function Edit() {
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
      const tl = gsap.timeline({ paused: true, defaults: { ease: "expo.out", duration: 0.45 } });
      gsap.set(q(".sc"), { autoAlpha: 0 });
      gsap.set(q(".sl-a"), { xPercent: -160 });
      gsap.set(q(".cf, .dr"), { autoAlpha: 0 });
      gsap.set(q(".sl-b"), { xPercent: 160 });
      const on = (sel: string, t: number) => tl.set(q(sel), { autoAlpha: 1 }, t);
      const off = (sel: string, t: number) => tl.set(q(sel), { autoAlpha: 0 }, t);
      const bg = (color: string, t: number) => tl.set(q(".bgc"), { background: color }, t);
      /** letters slam up from their masks, fast */
      const slam = (sel: string, t: number, st = 0.03) => tl.fromTo(q(`${sel} .L`), { yPercent: 115, rotate: 10 }, { yPercent: 0, rotate: 0, duration: 0.42, ease: "back.out(2.4)", stagger: st }, t);
      const unslam = (sel: string, t: number) => tl.to(q(`${sel} .L`), { yPercent: -115, duration: 0.22, ease: "power3.in", stagger: 0.015 }, t);
      /** camera: a punch-in on every kick, a tiny twist */
      KICKS.forEach((k, i) => tl.fromTo(q(".cam"), { scale: 1.055, rotate: i % 2 ? 0.6 : -0.6 }, { scale: 1, rotate: 0, duration: 0.32, ease: "power3.out", immediateRender: false }, k));
      /** a white flash frame on the big hits */
      const flash = (t: number, a = 0.85) => tl.fromTo(q(".flash"), { autoAlpha: a }, { autoAlpha: 0, duration: 0.28, ease: "power2.out", immediateRender: false }, t);
      /** whip pan: the camera blurs sideways out and the next scene blurs in */
      const whip = (t: number, dir = 1) =>
        tl
          .to(q(".cam"), { x: -500 * dir, filter: "blur(18px)", duration: 0.14, ease: "power3.in" }, t - 0.14)
          .fromTo(q(".cam"), { x: 500 * dir, filter: "blur(18px)" }, { x: 0, filter: "blur(0px)", duration: 0.3, ease: "expo.out", immediateRender: false }, t);
      /** diagonal slice: two colored bars sweep across */
      const slice = (t: number, a: string, b: string) =>
        tl
          .fromTo(q(".sl-a"), { xPercent: -160, background: a }, { xPercent: 160, duration: 0.5, ease: "power3.inOut" }, t - 0.25)
          .fromTo(q(".sl-b"), { xPercent: 160, background: b }, { xPercent: -160, duration: 0.5, ease: "power3.inOut" }, t - 0.2);
      /** iris: a colored circle closes, then opens on the next scene */
      const iris = (t: number, color: string) =>
        tl.fromTo(q(".iris"), { scale: 0, background: color, autoAlpha: 1 }, { scale: 1, duration: 0.24, ease: "power3.in" }, t - 0.24).to(q(".iris"), { scale: 0, duration: 0.3, ease: "expo.out" }, t).set(q(".iris"), { autoAlpha: 0 }, t + 0.3);

      /* ── A 0–2.2 · scoops slam into a cone, one per kick ── */
      bg(C.lemon, 0);
      on(".A", 0);
      tl.fromTo(q(".A .ca"), { y: 700, rotate: -25 }, { y: 0, rotate: 0, duration: 0.5, ease: "back.out(1.7)" }, 0.0);
      [0.22, 0.69, 1.25].forEach((t, i) => {
        tl.fromTo(q(`.ca-s${i}`), { scale: 3.2, y: -300, autoAlpha: 0, filter: "blur(14px)" }, { scale: 1, y: 0, autoAlpha: 1, filter: "blur(0px)", duration: 0.26, ease: "power3.in" }, t - 0.2).fromTo(
          q(`.ca-s${i}`),
          { scaleY: 0.7, scaleX: 1.2, transformOrigin: "50% 90%" },
          { scaleY: 1, scaleX: 1, duration: 0.55, ease: "elastic.out(1.2,0.35)", immediateRender: false },
          t + 0.06,
        );
        bg([C.rose, C.mint, C.lemon][i], t);
      });
      tl.fromTo(q(".ca-cherry"), { y: -600, autoAlpha: 1 }, { y: 0, duration: 0.25, ease: "power2.in" }, 1.68);
      tl.fromTo(q(".A .hello .L"), { yPercent: 115 }, { yPercent: 0, duration: 0.35, ease: "back.out(2.5)", stagger: 0.025 }, 0.25);
      tl.to(q(".A .ca"), { scale: 6, y: 900, duration: 0.3, ease: "power3.in" }, 1.93);
      tl.to(q(".A .hello"), { autoAlpha: 0, duration: 0.15 }, 1.93);
      flash(2.2);
      off(".A", 2.2);

      /* ── B 2.2–4.45 · the counter: 0 → 100 in rainbow, on the beat, then GELATO ARTIGIANALE ── */
      on(".B", 2.2);
      bg(C.cream, 2.2);
      const n = { v: 0 };
      tl.to(n, { v: 100, duration: 0.9, ease: "power2.inOut", onUpdate: () => void (q(".cnt")[0].textContent = String(Math.round(n.v))) }, 2.2);
      tl.fromTo(q(".cntw"), { scale: 0.4 }, { scale: 1, duration: 0.9, ease: "power2.inOut" }, 2.2);
      tl.fromTo(q(".cntw"), { scale: 1.25 }, { scale: 1, duration: 0.35, immediateRender: false, ease: "back.out(3)" }, 2.73);
      tl.to(q(".cntw"), { scale: 9, autoAlpha: 0, duration: 0.32, ease: "power3.in" }, 3.0);
      tl.fromTo(q(".marq-a"), { xPercent: 0 }, { xPercent: -50, duration: 2.2, ease: "none" }, 2.2).fromTo(q(".marq-b"), { xPercent: -50 }, { xPercent: 0, duration: 2.2, ease: "none" }, 2.2);
      tl.fromTo(q(".marq"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, 3.09);
      slam(".w-gelato", 3.09, 0.025);
      slam(".w-arti", 3.4, 0.02);
      iris(4.45, C.pink);
      off(".B", 4.45);

      /* ── C 4.45–6.44 · ONDA, letter per hit, the background flips color ── */
      on(".C", 4.45);
      bg(C.pink, 4.45);
      const LT = [4.45, 4.7, 5.02, 5.38];
      LT.forEach((t, i) => tl.fromTo(q(".logo .L")[i], { yPercent: 130, scaleY: 1.4, rotate: -14 }, { yPercent: 0, scaleY: 1, rotate: 0, duration: 0.45, ease: "back.out(2.6)" }, t));
      bg(C.lemon, 5.02);
      bg(C.mint, 5.38);
      tl.fromTo(q(".logo"), { scale: 0.9 }, { scale: 1.15, duration: 2, ease: "none" }, 4.45);
      tl.fromTo(q(".tagline .L"), { yPercent: 115 }, { yPercent: 0, duration: 0.35, stagger: 0.012 }, 5.6);
      tl.fromTo(q(".C .ring"), { scale: 0, autoAlpha: 1 }, { scale: 3.5, autoAlpha: 0, duration: 0.7, ease: "power2.out", stagger: 0.33 }, 4.45);
      whip(6.44, 1);
      off(".C", 6.44);

      /* ── D 6.44–8.4 · the menu flies in from deep space, a scoop hops on every kick ── */
      on(".D", 6.44);
      bg(C.cream, 6.44);
      tl.fromTo(q(".tile"), { z: -2600, autoAlpha: 0, rotateX: 50 }, { z: 0, autoAlpha: 1, rotateX: 0, duration: 0.55, ease: "expo.out", stagger: { each: 0.025, from: "center" } }, 6.44);
      tl.fromTo(q(".mgrid"), { rotate: -6, scale: 1.25 }, { rotate: 3, scale: 0.98, duration: 2, ease: "sine.inOut" }, 6.44);
      [6.81, 7.18, 7.57, 7.95].forEach((t, i) =>
        tl.fromTo(q(".tile img")[[2, 7, 4, 9][i]], { y: 0, scale: 1 }, { keyframes: { y: [0, -90, 0], scale: [1, 1.35, 1] }, duration: 0.42, ease: "power2.out", immediateRender: false }, t),
      );
      slam(".w-gusti", 6.6, 0.02);
      tl.fromTo(q(".n24"), { scale: 0, rotate: -40 }, { scale: 1, rotate: -8, duration: 0.4, ease: "back.out(3)" }, 7.18);
      // dolly into the empty plate in the middle
      tl.to(q(".D .zoom"), { scale: 5, duration: 0.42, ease: "power3.in" }, 8.0);
      off(".D", 8.42);

      /* ── E 8.42–10.41 · a new flavor is born ── */
      on(".E", 8.42);
      bg(C.mint, 8.42);
      tl.fromTo(q(".E .plate"), { scale: 0 }, { keyframes: { scale: [0, 1.18, 0.95, 1] }, duration: 0.55 }, 8.42);
      tl.fromTo(q(".E .rp"), { scale: 0.5, autoAlpha: 1 }, { scale: 2.4, autoAlpha: 0, duration: 0.9, stagger: 0.16 }, 8.6);
      tl.fromTo(q(".E .nbs"), { y: 200, scaleX: 0.1, scaleY: 0.1, autoAlpha: 0 }, { keyframes: { y: [200, -60, 14, 0], scaleX: [0.1, 1.15, 0.9, 1], scaleY: [0.1, 1.3, 0.86, 1], autoAlpha: [0, 1, 1, 1] }, duration: 0.7, ease: "power2.out" }, 8.75);
      tl.fromTo(q(".E .sp"), { x: 0, y: 0, autoAlpha: 1, scale: 0.4 }, { x: (i: number) => Math.cos(SPR[i].a) * SPR[i].d, y: (i: number) => Math.sin(SPR[i].a) * SPR[i].d, rotate: 400, autoAlpha: 0, scale: 1.2, duration: 1.1, ease: "power3.out" }, 9.0);
      slam(".w-nov", 9.05, 0.035);
      tl.fromTo(q(".E .scene-in"), { rotate: -4 }, { rotate: 4, duration: 2, ease: "sine.inOut" }, 8.42);
      slice(10.41, C.pink, C.lemon);
      off(".E", 10.41);

      /* ── F 10.41–12.4 · full-bleed tubs, one per kick, alternating slides + names slam ── */
      on(".F", 10.41);
      TUB_T.forEach((t, i) => {
        const dir = i % 2 ? -1 : 1;
        tl.set(q(".tub"), { zIndex: 1 }, t)
          .fromTo(q(".tub")[i], { zIndex: 2, xPercent: 100 * dir, scale: 1.3, filter: "blur(16px)" }, { xPercent: 0, scale: 1.05, filter: "blur(0px)", duration: 0.3, ease: "expo.out" }, t)
          .set(q(".tname"), { autoAlpha: 0 }, t)
          .fromTo(q(".tname")[i], { autoAlpha: 1, scale: 2.2, rotate: dir * 8 }, { scale: 1, rotate: dir * -3, duration: 0.3, ease: "back.out(2)" }, t);
      });
      tl.to(q(".tub"), { scale: 1.15, duration: 0.5, ease: "none" }, 11.9);
      iris(12.4, C.mint);
      off(".F", 12.4);

      /* ── G 12.4–14.35 · the wheel: blurred spin, lands on the hit ── */
      on(".G", 12.4);
      bg("#E9FBF5", 12.4);
      tl.fromTo(q(".wheel"), { scale: 0.2, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.4, ease: "back.out(1.8)" }, 12.4);
      tl.fromTo(q(".wspin"), { rotate: 0 }, { rotate: 360 * 6 + 30, duration: 1.95, ease: "power4.out" }, 12.4);
      tl.fromTo(q(".wspin"), { filter: "blur(10px)" }, { filter: "blur(0px)", duration: 1.6, ease: "power2.in" }, 12.4);
      slam(".w-gira", 12.5, 0.04);
      tl.fromTo(q(".win"), { scale: 0, rotate: 30 }, { scale: 1, rotate: -6, duration: 0.4, ease: "back.out(3)" }, 14.35);
      tl.fromTo(q(".cf"), { y: 0, x: 0, autoAlpha: 1 }, { y: (i: number) => 400 + ((i * 97) % 500), x: (i: number) => ((i * 53) % 600) - 300, rotate: (i: number) => i * 47, autoAlpha: 0, duration: 1.1, ease: "power2.out", stagger: 0.004, immediateRender: false }, 14.35);
      flash(14.35, 0.6);
      whip(15.02, -1);
      off(".G", 15.02);

      /* ── H 15.02–16.3 · the cake builds on the kicks ── */
      on(".H", 15.02);
      bg("#FFE3EE", 15.02);
      tl.fromTo(q(".stand"), { y: 400 }, { y: 0, duration: 0.3, ease: "back.out(1.6)" }, 15.02);
      [15.02, 15.38, 15.8].forEach((t, i) =>
        tl.fromTo(q(".lay")[i], { y: -900 }, { y: 0, duration: 0.2, ease: "power3.in" }, t).fromTo(q(".lay")[i], { scaleY: 0.7, scaleX: 1.08 }, { scaleY: 1, scaleX: 1, duration: 0.45, ease: "elastic.out(1.2,0.4)", immediateRender: false }, t + 0.2),
      );
      tl.fromTo(q(".deco"), { y: -500, scale: 0.3, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(2.6)", stagger: 0.04 }, 16.1);
      slam(".w-torta", 15.2, 0.03);
      tl.to(q(".H .cakebox"), { scale: 1.6, xPercent: -30, duration: 0.3, ease: "power3.in" }, 16.3);
      off(".H", 16.6);

      /* ── I 16.6–18.33 · cake photos in columns scrolling against each other ── */
      on(".I", 16.6);
      tl.fromTo(q(".col"), { yPercent: (i: number) => (i % 2 ? -40 : 0) }, { yPercent: (i: number) => (i % 2 ? 0 : -40), duration: 1.75, ease: "none" }, 16.6);
      tl.fromTo(q(".I .cols"), { rotate: -8, scale: 1.4 }, { rotate: -4, scale: 1.25, duration: 1.75, ease: "none" }, 16.6);
      slam(".w-gelato2", 16.75, 0.025);
      slice(18.33, C.lemon, C.mint);
      off(".I", 18.33);

      /* ── J 18.33–20.55 · the Lab: the scoop window flips through the photos on every kick ── */
      on(".J", 18.33);
      bg(C.cream, 18.33);
      LAB_T.forEach((t, i) => {
        tl.set(q(".lab-ph"), { autoAlpha: 0 }, t).set(q(".lab-ph")[i], { autoAlpha: 1 }, t);
        tl.fromTo(q(".labwin"), { scale: 1.15, rotate: i % 2 ? 6 : -6 }, { scale: 1, rotate: 0, duration: 0.25, ease: "power3.out", immediateRender: false }, t);
      });
      tl.fromTo(q(".labwin"), { scale: 0 }, { scale: 1, duration: 0.3, ease: "back.out(2)" }, 18.33);
      slam(".w-lab", 18.4, 0.025);
      tl.fromTo(q(".spat"), { x: -900, rotate: -20 }, { x: 2400, rotate: 30, duration: 0.55, ease: "power2.inOut" }, 19.7);
      tl.fromTo(q(".J .orb"), { scale: 0 }, { scale: 1, duration: 0.4, ease: "back.out(2)", stagger: 0.04 }, 18.4);
      tl.to(q(".J .orbs"), { rotate: 120, duration: 2.2, ease: "none" }, 18.33);
      tl.to(q(".labwin"), { scale: 6, duration: 0.3, ease: "power3.in" }, 20.25);
      off(".J", 20.55);

      /* ── K 20.55–22.29 · the gallery as a tilted infinite wall ── */
      on(".K", 20.55);
      tl.fromTo(q(".gc"), { yPercent: (i: number) => (i % 2 ? -32 : -12) }, { yPercent: (i: number) => (i % 2 ? -12 : -32), duration: 1.75, ease: "none" }, 20.55);
      tl.fromTo(q(".K .wall"), { rotateX: 22, rotateZ: -12, scale: 1.25 }, { rotateX: 14, rotateZ: -7, scale: 1.05, duration: 1.75, ease: "power1.out", transformPerspective: 1400 }, 20.55);
      tl.fromTo(q(".gimg"), { scale: 0.5, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.35, ease: "back.out(1.8)", stagger: { amount: 0.35, from: "center" } }, 20.55);
      off(".K", 22.29);

      /* ── L 22.29–24.28 · the page melts: drips slam down, notes rain in ── */
      on(".L2", 22.29);
      bg("#FFD3E2", 22.29);
      tl.fromTo(q(".melt"), { yPercent: -100 }, { yPercent: 0, duration: 0.3, ease: "expo.out" }, 22.29);
      tl.fromTo(q(".melt"), { scaleY: 1 }, { scaleY: 1.18, duration: 0.9, yoyo: true, repeat: 1, ease: "sine.inOut", transformOrigin: "50% 0%" }, 22.6);
      tl.fromTo(q(".dr"), { y: 0, autoAlpha: 1, scaleY: 0.5 }, { y: 800, scaleY: 1.3, duration: 0.8, ease: "power2.in", stagger: 0.2, immediateRender: false }, 22.5);
      slam(".w-dicono", 22.45, 0.03);
      tl.fromTo(q(".note"), { y: -900, rotate: (i: number) => (i - 1) * 40 }, { y: 0, rotate: (i: number) => (i - 1) * 5, duration: 0.4, ease: "back.out(1.6)", stagger: 0.25 }, 22.8);
      tl.fromTo(q(".stk"), { scale: 0, rotate: -90 }, { scale: 1, rotate: 12, duration: 0.3, ease: "back.out(3)", stagger: 0.25 }, 23.05);
      const r = { v: 0 };
      tl.to(r, { v: 4.6, duration: 0.5, ease: "power2.out", onUpdate: () => void (q(".rnum")[0].textContent = r.v.toFixed(1)) }, 23.2);
      tl.fromTo(q(".seal"), { scale: 0, rotate: -60 }, { scale: 1, rotate: -8, duration: 0.4, ease: "back.out(3)" }, 23.2);
      flash(24.28);
      off(".L2", 24.28);

      /* ── M 24.28–27 · the finale ── */
      on(".M", 24.28);
      bg(C.lemon, 24.28);
      tl.fromTo(q(".M .cm"), { y: 800, rotate: 20 }, { y: 0, rotate: 0, duration: 0.45, ease: "back.out(1.5)" }, 24.28);
      tl.set(q(".cm-cherry"), { autoAlpha: 0 }, 24.28).fromTo(q(".cm-cherry"), { y: -700, autoAlpha: 1 }, { y: 0, duration: 0.25, ease: "power2.in" }, 24.78).fromTo(
        q(".cm-cherry"),
        { scaleY: 0.6, scaleX: 1.3, transformOrigin: "50% 90%" },
        { scaleY: 1, scaleX: 1, duration: 0.6, ease: "elastic.out(1.2,0.3)", immediateRender: false },
        25.03,
      );
      flash(25.03, 0.5);
      tl.fromTo(q(".endlogo .L"), { yPercent: 130, rotate: 12 }, { yPercent: 0, rotate: 0, duration: 0.45, ease: "back.out(2.4)", stagger: 0.06 }, 24.4);
      tl.fromTo(q(".endsub .L"), { yPercent: 115 }, { yPercent: 0, duration: 0.3, stagger: 0.01 }, 24.9);
      tl.fromTo(q(".url"), { scale: 0, rotate: -10 }, { scale: 1, rotate: -2, duration: 0.45, ease: "back.out(2.6)" }, 25.3);
      tl.fromTo(q(".M .burst"), { scale: 0, autoAlpha: 1 }, { scale: 4, autoAlpha: 0, duration: 0.9, ease: "power2.out", stagger: 0.12 }, 25.03);
      tl.to(q(".M .inner"), { scale: 1.06, duration: 2.7, ease: "sine.out" }, 24.28);
      tl.to(q(".fade"), { autoAlpha: 1, duration: 0.6, ease: "none" }, DURATION - 0.6);

      tl.seek(0, false);
      const api = window as unknown as { __promo?: { duration: number; seek: (t: number) => void; ready: boolean } };
      api.__promo = { duration: DURATION, seek: (t: number) => void tl.seek(t, false), ready: false };
      Promise.all([document.fonts.ready, ...[...el.querySelectorAll("img")].map((i) => i.decode().catch(() => {}))]).then(() => api.__promo && (api.__promo.ready = true));
      if (!navigator.webdriver) tl.play(0);
    }, el);
    return () => ctx.revert();
  }, []);

  const D = "font-display font-black tracking-tight";
  return (
    <div className="fixed inset-0 grid place-items-center bg-black">
      <div ref={stage} className="relative overflow-hidden text-chocolate" style={{ width: 1920, height: 1080, transform: `scale(${scale})`, transformOrigin: "center" }}>
        <div className="bgc absolute inset-0" />
        <div className="cam absolute inset-0" style={{ transformOrigin: "50% 50%" }}>
          {/* A */}
          <div className="sc A absolute inset-0">
            <Word text="CIAO!" cls="hello left-[120px] top-[360px]" className={`${D} text-[300px] text-white [text-shadow:0_14px_0_rgba(75,42,32,0.15)]`} />
            <div className="ca absolute top-[20px] right-[360px]">
              <Cone cls="ca" w={340} />
            </div>
          </div>

          {/* B */}
          <div className="sc B absolute inset-0 overflow-hidden">
            <div className="marq absolute inset-0 opacity-0">
              {[0, 1, 2].map((r) => (
                <p key={r} className={`${r % 2 ? "marq-b" : "marq-a"} absolute left-0 w-[200%] text-[220px] leading-none whitespace-nowrap ${D}`} style={{ top: 60 + r * 330, color: "transparent", WebkitTextStroke: `3px ${RAINBOW[r * 2]}` }}>
                  {"GELATO · ARTIGIANALE · ONDA · ".repeat(4)}
                </p>
              ))}
            </div>
            <div className="cntw absolute inset-0 grid place-items-center">
              <p className={`rainbow-text text-[560px] leading-none tabular-nums ${D}`}>
                <span className="cnt">0</span>
              </p>
            </div>
            <Word text="GELATO" cls="w-gelato left-1/2 top-[270px] -translate-x-1/2" className={`${D} text-[330px]`} colors={RAINBOW} />
            <Word text="ARTIGIANALE" cls="w-arti left-1/2 top-[640px] -translate-x-1/2" className={`${D} text-[150px]`} />
          </div>

          {/* C */}
          <div className="sc C absolute inset-0">
            {[0, 1, 2].map((i) => (
              <span key={i} className="ring absolute top-1/2 left-1/2 -mt-[300px] -ml-[300px] size-[600px] rounded-full border-[14px] border-white" />
            ))}
            <div className="logo absolute inset-0 grid place-items-center">
              <p className={`text-[520px] leading-none ${D}`}>
                {["#F2557A", "#FF8A3D", "#1FA37A", "#7B6CF0"].map((c, i) => (
                  <span key={i} className="inline-block overflow-hidden pb-10 align-bottom">
                    <span className="L inline-block [text-shadow:0_18px_0_rgba(75,42,32,0.18)]" style={{ color: i === 0 ? "#fff" : c }}>
                      {"Onda"[i]}
                    </span>
                  </span>
                ))}
              </p>
            </div>
            <Word text="SANTA TERESA GALLURA · SARDEGNA" cls="tagline left-1/2 bottom-[150px] -translate-x-1/2" className="font-body text-5xl font-black tracking-[0.2em] text-chocolate" />
          </div>

          {/* D */}
          <div className="sc D absolute inset-0" style={{ perspective: 1400 }}>
            <div className="zoom absolute inset-0" style={{ transformOrigin: "50% 56%" }}>
              <div className="mgrid grid absolute inset-x-[140px] top-[230px] grid-cols-6 gap-x-8 gap-y-14" style={{ transformStyle: "preserve-3d" }}>
                {MENU.map((s, i) => (
                  <div key={i} className="tile relative grid aspect-square place-items-center">
                    <span className="absolute inset-[4%] rounded-full" style={{ background: `radial-gradient(circle at 50% 35%, #fff, ${MENU_C[i]})` }} />
                    <img src={s} alt="" className="relative w-[96%] -translate-y-[6%]" />
                  </div>
                ))}
              </div>
            </div>
            <Word text="24 GUSTI. OGGI." cls="w-gusti left-[140px] top-[40px]" className={`${D} text-[160px]`} />
            <span className="n24 absolute top-[60px] right-[150px] grid size-[170px] place-items-center rounded-full bg-[#F2557A] text-5xl font-black text-white">NEW</span>
          </div>

          {/* E */}
          <div className="sc E absolute inset-0">
            <div className="scene-in absolute inset-0">
              <Word text="NOVITÀ" cls="w-nov left-1/2 top-[40px] -translate-x-1/2" className={`${D} text-[330px] text-white/90`} />
              <div className="absolute top-[330px] left-1/2 -ml-[300px] grid size-[600px] place-items-center">
                {[0, 1, 2].map((k) => (
                  <span key={k} className="rp absolute inset-0 rounded-full border-[10px] border-white" />
                ))}
                <span className="plate absolute inset-0 rounded-full" style={{ background: "radial-gradient(circle at 50% 35%, #fff, #A8F0D8)" }} />
                {SPR.map((p, i) => (
                  <span key={i} className="sp absolute h-5 w-14 rounded-full" style={{ background: p.c }} />
                ))}
                <img src="/reel/s-menta.webp" alt="" className="nbs relative w-[95%] -translate-y-[6%]" style={{ transformOrigin: "50% 100%" }} />
              </div>
            </div>
          </div>

          {/* F */}
          <div className="sc F absolute inset-0 overflow-hidden">
            {TUBS.map(([, s]) => (
              <img key={s} src={`/img/tubs/${s}.webp`} alt="" className="tub absolute inset-0 h-full w-full object-cover" />
            ))}
            <div className="absolute inset-0 bg-[radial-gradient(transparent_40%,rgba(0,0,0,0.45))]" />
            {TUBS.map(([n, , c]) => (
              <p key={n} className={`tname absolute inset-x-0 top-[360px] text-center text-[260px] leading-none opacity-0 ${D}`} style={{ color: "#fff", textShadow: `0 16px 0 ${c}, 0 30px 60px rgba(0,0,0,0.4)` }}>
                {n}
              </p>
            ))}
          </div>

          {/* G */}
          <div className="sc G absolute inset-0">
            <Word text="GIRA" cls="w-gira left-[90px] top-[360px]" className={`${D} text-[260px] text-[#1FA37A]`} />
            <div className="wheel absolute top-[90px] right-[70px] size-[900px]">
              <div className="wspin absolute inset-0 rounded-full border-[22px] border-white shadow-2xl" style={{ background: `conic-gradient(${MENU_C.slice(0, 6).map((c, i) => `${c} ${i * 60}deg ${(i + 1) * 60}deg`).join(",")})` }}>
                {MENU.slice(0, 6).map((s, i) => (
                  <img key={i} src={s} alt="" className="absolute top-1/2 left-1/2 w-[230px]" style={{ transform: `translate(-50%,-50%) rotate(${i * 60 + 30}deg) translateY(-270px)` }} />
                ))}
              </div>
              <div className="absolute -top-12 left-1/2 -ml-[45px] h-32 w-[90px] bg-[#F2557A]" style={{ clipPath: "polygon(50% 100%,0 0,100% 0)" }} />
            </div>
            <p className={`win absolute bottom-[90px] left-[150px] rounded-[40px] bg-[#F2557A] px-14 py-6 text-[120px] text-white shadow-2xl ${D}`}>Pistacchio!</p>
            {Array.from({ length: 70 }, (_, i) => (
              <span key={i} className="cf absolute top-[300px] h-5 w-12 rounded-full" style={{ left: 300 + ((i * 131) % 1300), background: RAINBOW[i % 6] }} />
            ))}
          </div>

          {/* H */}
          <div className="sc H absolute inset-0">
            <Word text="LA TUA TORTA" cls="w-torta left-[110px] top-[90px]" className={`${D} text-[170px]`} />
            <div className="cakebox absolute right-[180px] bottom-[30px] h-[820px] w-[880px] origin-bottom scale-[1.25]">
              <img src="/img/cake/stand.webp" alt="" className="stand absolute bottom-0 left-1/2 w-[900px] -translate-x-1/2" />
              {["/img/tubs/cioccolato.webp", "/img/tubs/pistacchio.webp", "/img/tubs/fragola.webp"].map((t, i) => (
                <div key={i} className="lay absolute left-[150px] w-[580px] overflow-hidden" style={{ bottom: 240 + i * 92, height: 120, borderRadius: "0 0 50% 50% / 0 0 26px 26px", backgroundImage: `url(${t})`, backgroundSize: "150%", backgroundPosition: "center", boxShadow: "inset -80px 0 60px -40px rgba(75,42,32,0.5), inset 60px 0 50px -40px rgba(255,255,255,0.4)", transformOrigin: "50% 100%" }} />
              ))}
              {[
                ["strawberries", 150, 190, 500],
                ["rosette", 120, 300, 530],
                ["berries", 220, 370, 510],
                ["macarons", 170, 560, 505],
                ["rosette", 120, 640, 530],
              ].map(([nm, w, x, b], i) => (
                <img key={i} src={`/img/cake/${nm}.webp`} alt="" className="deco absolute" style={{ width: Number(w), left: Number(x), bottom: Number(b) }} />
              ))}
            </div>
          </div>

          {/* I */}
          <div className="sc I absolute inset-0 overflow-hidden bg-[#FFE3EE]">
            <div className="cols absolute inset-[-200px] flex gap-6">
              {[0, 1, 2, 3, 4].map((c) => (
                <div key={c} className="col flex flex-1 flex-col gap-6">
                  {[...CAKES, ...CAKES, ...CAKES].map((s, k) => (
                    <img key={k} src={(c + k) % 3 === 0 ? `/img/tubs/${["fragola", "pistacchio", "tiramisu", "mango"][k % 4]}.webp` : s} alt="" className="aspect-[4/5] w-full rounded-[34px] object-cover shadow-xl" />
                  ))}
                </div>
              ))}
            </div>
            <Word text="TORTE GELATO" cls="w-gelato2 left-1/2 top-[400px] -translate-x-1/2" className={`${D} text-[230px] text-white [text-shadow:0_14px_0_#F2557A,0_30px_60px_rgba(0,0,0,0.35)]`} />
          </div>

          {/* J */}
          <div className="sc J absolute inset-0">
            <div className="orbs absolute top-1/2 left-1/2 size-0">
              {Array.from({ length: 10 }, (_, i) => {
                const a = (i / 10) * Math.PI * 2;
                return <span key={i} className="orb absolute -mt-10 -ml-10 size-20 rounded-full" style={{ left: Math.cos(a) * 520, top: Math.sin(a) * 420, background: RAINBOW[i % 6] }} />;
              })}
            </div>
            <div className="labwin absolute top-[150px] left-1/2 -ml-[400px] h-[760px] w-[800px] drop-shadow-[0_40px_60px_rgba(75,42,32,0.4)]" style={masked}>
              {GAL.slice(0, 7).map((g, i) => (
                <img key={i} src={g} alt="" className="lab-ph absolute inset-0 h-full w-full object-cover" />
              ))}
            </div>
            <Word text="IL LABORATORIO" cls="w-lab left-1/2 bottom-[40px] -translate-x-1/2" className={`${D} text-[150px] text-[#1FA37A] [text-shadow:0_10px_0_#fff]`} />
            <img src="/img/spatula.webp" alt="" className="spat absolute top-[520px] left-0 w-[700px]" />
          </div>

          {/* K */}
          <div className="sc K absolute inset-0 overflow-hidden bg-[#E9FBF5]">
            <div className="wall absolute inset-[-700px] flex gap-8" style={{ transformStyle: "preserve-3d" }}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((c) => (
                <div key={c} className="gc flex flex-1 flex-col gap-8">
                  {[...GAL, ...GAL, ...GAL].map((g, k) => (
                    <img key={k} src={GAL[(k + c * 2) % 9]} alt="" className="gimg w-full rounded-[30px] object-cover shadow-2xl" style={{ aspectRatio: (k + c) % 3 ? "4/5" : "1/1" }} />
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* L */}
          <div className="sc L2 absolute inset-0">
            <Word text="DICONO DI NOI" cls="w-dicono left-[80px] top-[470px]" className={`${D} text-[125px]`} />
            <div className="seal absolute top-[690px] left-[130px] grid size-[300px] place-items-center rounded-full bg-[#FFE066] text-center shadow-xl">
              <div>
                <p className="text-2xl font-bold">Google ★★★★★</p>
                <p className={`rnum text-[120px] leading-none ${D}`}>0.0</p>
              </div>
            </div>
            <div className="absolute top-[380px] right-[60px] flex w-[760px] flex-col gap-6">
              {NOTES.map(([t, n, c], i) => (
                <div key={i} className="note relative rounded-[30px] p-8 shadow-2xl" style={{ background: c, marginLeft: i * 60 }}>
                  <span className="stk absolute -top-5 right-6 grid size-16 place-items-center rounded-full bg-[#E5334E] text-3xl text-white">♥</span>
                  <p className="text-4xl leading-snug font-bold">«{t}»</p>
                  <p className="mt-3 font-display text-3xl italic">— {n}</p>
                </div>
              ))}
            </div>
            <svg viewBox="0 0 1920 560" className="melt absolute inset-x-0 top-0 w-full drop-shadow-[0_24px_30px_rgba(214,64,110,0.35)]">
              <defs>
                <linearGradient id="emf" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#FF9FBE" />
                  <stop offset="1" stopColor="#F46F9C" />
                </linearGradient>
              </defs>
              <path d={dripPath} fill="url(#emf)" />
              {DRIPS.map(([x, d, w], i) => (
                <ellipse key={i} cx={x - w * 0.18} cy={d - w * 0.08} rx={w * 0.12} ry={w * 0.16} fill="#fff" opacity=".7" />
              ))}
            </svg>
            {[260, 620, 990, 1340, 1700].map((x, i) => (
              <span key={i} className="dr absolute top-[420px] h-14 w-10 rounded-[50%_50%_50%_50%/60%_60%_40%_40%] bg-[#F46F9C]" style={{ left: x - 20 }} />
            ))}
          </div>

          {/* M */}
          <div className="sc M absolute inset-0">
            <div className="inner absolute inset-0">
              {[0, 1, 2].map((i) => (
                <span key={i} className="burst absolute top-[300px] left-[470px] size-[300px] rounded-full border-[12px] border-white" />
              ))}
              <div className="cm absolute top-[60px] left-[440px]">
                <Cone cls="cm" w={360} />
              </div>
              <div className="absolute top-[280px] left-[900px]">
                <p className={`endlogo text-[300px] leading-none ${D}`}>
                  {["#F2557A", "#FF8A3D", "#1FA37A", "#7B6CF0"].map((c, i) => (
                    <span key={i} className="inline-block overflow-hidden pb-6 align-bottom">
                      <span className="L inline-block" style={{ color: c }}>
                        {"Onda"[i]}
                      </span>
                    </span>
                  ))}
                </p>
                <Word text="gelato artigianale · Santa Teresa Gallura" cls="endsub relative" className="font-display text-5xl italic" />
                <p className="url mt-24 inline-block rounded-full bg-chocolate px-12 py-5 text-5xl font-black text-cream">onda-indol.vercel.app</p>
              </div>
            </div>
          </div>
        </div>

        <div className="iris pointer-events-none absolute top-1/2 left-1/2 z-40 -mt-[1200px] -ml-[1200px] size-[2400px] rounded-full opacity-0" />
        <div className="sl-a pointer-events-none absolute top-[-40%] left-0 z-40 h-[90%] w-[140%] -rotate-12" />
        <div className="sl-b pointer-events-none absolute bottom-[-40%] left-[-20%] z-40 h-[90%] w-[140%] -rotate-12" />
        <div className="flash pointer-events-none absolute inset-0 z-50 bg-white opacity-0" />
        <div className="fade pointer-events-none absolute inset-0 z-[60] bg-[#FFE066] opacity-0" />
      </div>
    </div>
  );
}
