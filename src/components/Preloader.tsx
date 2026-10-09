"use client";

import gsap from "gsap";
import { useEffect, useRef, useState } from "react";
/* eslint-disable @next/next/no-img-element */
import { PHOTO, photoGeometry, ScoopImg } from "./ice/PhotoStack";
import { HERO_SCOOPS } from "./ice/presets";

const SESSION_KEY = "onda:preloaded";
/** One flood of color per scoop, in the scoop's own flavor color (pistachio, strawberry, Yellow Submarine). */
const FLOODS = ["#BFE59A", "#FFB3CE", "#FFE37A"];
const FLOOD_EDGE = "M0 60 C180 10 360 110 540 60 C720 10 900 110 1080 60 C1260 10 1440 110 1620 60 C1800 10 1980 110 2160 60 C2340 10 2520 110 2880 60 V140 H0 Z";
/** Glitch slices left behind by each flood (deterministic so server and client render the same). */
const GLITCH = Array.from({ length: 9 }, (_, i) => ({ top: (i * 37 + 11) % 92, h: 1.5 + ((i * 53) % 7), w: 40 + ((i * 29) % 60), left: (i * 41) % 50 }));
const MAX_WAIT = 2.4; // seconds: never hold the page longer than this, loaded or not

/** Fired when the curtain starts lifting; the hero starts its intro on it. */
export const REVEAL_EVENT = "onda:revealed";
/** Fired when the preloader's cone has landed exactly on the hero cone. */
export const HANDOFF_EVENT = "onda:handoff";

type Lenis = { stop(): void; start(): void };
const lenis = () => (window as unknown as { __lenis?: Lenis }).__lenis;

/**
 * The signature moment: a waffle cone draws itself, three scoops drop and squash onto it, a cherry lands —
 * then the whole cone flies into the hero, exactly where the hero's cone sits, while a wave lifts the curtain.
 */
export function Preloader({ mode = "full" }: { mode?: "full" | "short" }) {
  const root = useRef<HTMLDivElement>(null);
  const stack = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);
  const geo = photoGeometry(HERO_SCOOPS.length, { cherry: true });

  useEffect(() => {
    const el = root.current!;
    const q = gsap.utils.selector(el);
    const html = document.documentElement;
    html.dataset.handoff = "pending";
    html.style.overflow = "hidden";
    lenis()?.stop();

    const finish = () => {
      html.style.overflow = "";
      lenis()?.start();
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {}
      setDone(true);
    };
    const reveal = () => {
      html.dataset.revealed = "true";
      window.dispatchEvent(new Event(REVEAL_EVENT));
    };
    const handoff = () => {
      html.dataset.handoff = "done";
      window.dispatchEvent(new Event(HANDOFF_EVENT));
    };

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      reveal();
      handoff();
      gsap.to(el, { opacity: 0, duration: 0.35, onComplete: finish });
      return;
    }

    // The full stacking plays on every visit; the owner can switch to the short version in the admin.
    const repeat = mode === "short";
    // safety net: whatever happens (slow device, blocked script…), never keep the page covered
    const failsafe = window.setTimeout(() => !document.documentElement.dataset.revealed && (reveal(), handoff(), finish()), 7000);

    /** Fly the stack onto the hero cone (FLIP), lift the curtain with a colored wave. */
    const exit = (speed = 1) => {
      const target = document.getElementById("hero-icecream")?.getBoundingClientRect();
      if (!stack.current) {
        reveal();
        handoff();
        finish();
        return gsap.timeline();
      }
      const from = stack.current.getBoundingClientRect();
      const visible = target && target.top < window.innerHeight * 0.95 && target.bottom > 0 && target.width > 0;
      const tl = gsap.timeline({ onStart: reveal, onComplete: finish, defaults: { ease: "expo.inOut" } }).timeScale(speed);
      tl.to(q(".pl-ui"), { autoAlpha: 0, y: -12, duration: 0.35, ease: "power2.in" }, 0);
      if (visible) {
        tl.to(stack.current, { x: target.left - from.left, y: target.top - from.top, scale: target.width / from.width, duration: 1.05 }, 0.05).call(handoff, [], 1.1);
      } else {
        tl.to(stack.current, { yPercent: -40, scale: 0.6, autoAlpha: 0, duration: 0.7 }, 0.05).call(handoff, [], 0.4);
      }
      tl.to(q(".pl-curtain"), { yPercent: -100, duration: 1, stagger: 0.07 }, 0.12);
      tl.set(stack.current, { autoAlpha: 0 }, visible ? 1.12 : 0.8);
      return tl;
    };

    if (repeat) {
      gsap.set(q(".pl-cone-fill, .pl-scoop, .pl-cherry"), { autoAlpha: 1 });
      gsap.set(q(".pl-ui"), { autoAlpha: 0 });
      const t = exit(1.6).delay(0.15);
      return () => {
        t.kill();
        window.clearTimeout(failsafe);
      };
    }

    // real loading progress (fonts + window load), capped by MAX_WAIT
    let real = 0;
    const parts = { fonts: false, load: document.readyState === "complete" };
    const update = () => (real = (parts.fonts ? 0.45 : 0.1) + (parts.load ? 0.55 : 0));
    document.fonts?.ready.then(() => ((parts.fonts = true), update()));
    const onLoad = () => ((parts.load = true), update());
    window.addEventListener("load", onLoad, { once: true });
    update();
    const started = performance.now();

    const tl = gsap.timeline();
    // the wafer rises out of the floor, then the scoops drop on it one by one
    tl.fromTo(q(".pl-cone-fill"), { autoAlpha: 1, clipPath: "inset(100% 0% 0% 0%)", y: 60 }, { clipPath: "inset(0% 0% 0% 0%)", y: 0, duration: 0.6, ease: "power3.out" });
    q(".pl-scoop").forEach((s, i) => {
      const at = 0.5 + i * 0.4;
      tl.fromTo(s, { y: "-75vh", autoAlpha: 1, scaleX: 0.9, scaleY: 1.12, rotate: i % 2 ? 6 : -6 }, { y: 0, rotate: 0, duration: 0.38, ease: "power2.in" }, at)
        .to(s, { scaleX: 1.16, scaleY: 0.8, duration: 0.08, ease: "power1.out" }, at + 0.38)
        .to(s, { scaleX: 1, scaleY: 1, duration: 0.7, ease: "elastic.out(1.1, 0.35)" }, at + 0.46);
      // a wave of the scoop's color floods the whole background from the bottom, then glitches out
      const flood = q(".pl-flood")[i];
      if (flood) {
        tl.fromTo(flood, { yPercent: 118, autoAlpha: 1 }, { yPercent: 0, duration: 0.62, ease: "power2.inOut" }, at - 0.12);
        const g = gsap.timeline();
        q(".pl-glitch > span").forEach((bar, k) => {
          g.set(bar, { background: FLOODS[(i + 1 + (k % 2)) % FLOODS.length], autoAlpha: 0.9, x: gsap.utils.random(-80, 80) }, k * 0.012)
            .to(bar, { x: gsap.utils.random(-140, 140), duration: 0.08, ease: "steps(2)", repeat: 2, yoyo: true }, k * 0.012)
            .set(bar, { autoAlpha: 0 }, 0.26 + k * 0.012);
        });
        g.to(stack.current, { x: 6, filter: "drop-shadow(5px 0 0 rgba(255,0,140,0.55)) drop-shadow(-5px 0 0 rgba(0,220,255,0.55))", duration: 0.05, repeat: 4, yoyo: true, ease: "steps(1)" }, 0).set(stack.current, { x: 0, filter: "none" });
        tl.add(g, at + 0.5);
      }
      // the cone and the scoops below take the hit too
      tl.to(q(i ? ".pl-scoop" : ".pl-cone-fill").slice(0, i || 1), { scaleY: 0.95, scaleX: 1.03, duration: 0.07, yoyo: true, repeat: 1, ease: "sine.inOut", transformOrigin: "50% 100%" }, at + 0.38);
    });
    const cherryAt = 0.5 + HERO_SCOOPS.length * 0.4 + 0.05;
    tl.fromTo(q(".pl-cherry"), { y: "-40vh", autoAlpha: 1 }, { y: 0, duration: 0.42, ease: "bounce.out" }, cherryAt);

    const num = q(".pl-num")[0];
    const bar = q(".pl-bar")[0];
    let shown = 0;
    let leaving = false;
    const tick = () => {
      const elapsed = (performance.now() - started) / 1000;
      const loaded = elapsed > MAX_WAIT ? 1 : real;
      const target = Math.min(tl.progress(), loaded) * 100;
      shown += (target - shown) * 0.18;
      if (target >= 100 && shown > 99.3) shown = 100;
      num.textContent = String(Math.round(shown)).padStart(2, "0");
      bar.style.transform = `scaleX(${shown / 100})`;
      if (shown === 100 && !leaving) {
        leaving = true;
        gsap.ticker.remove(tick);
        exit().delay(0.15);
      }
    };
    gsap.ticker.add(tick);

    return () => {
      window.clearTimeout(failsafe);
      gsap.ticker.remove(tick);
      tl.kill();
      window.removeEventListener("load", onLoad);
      html.style.overflow = "";
    };
  }, [mode]);

  if (done) return null;

  return (
    <div ref={root} className="fixed inset-0 z-[100]" aria-hidden>
      {/* curtain: cream + two colored waves trailing below it */}
      {[
        { c: "#6FE0C4", z: 1 },
        { c: "#FF8FB8", z: 2 },
        { c: "#FFF7EE", z: 3 },
      ].map(({ c, z }, i) => (
        <div key={c} className="pl-curtain absolute inset-x-0 top-0 h-full" style={{ zIndex: z }}>
          <div className="h-full w-full" style={{ background: i === 2 ? "radial-gradient(70% 60% at 50% 40%, #FFF7EE, #FFE9DA)" : c }} />
          {i === 2 && (
            <div className="absolute inset-0 overflow-hidden">
              {FLOODS.map((f, k) => (
                <div key={f} className="pl-flood invisible absolute inset-0" style={{ background: f, zIndex: k }}>
                  <svg viewBox="0 0 2880 140" preserveAspectRatio="none" className="band-wave absolute bottom-[calc(100%-2px)] left-0 block h-[12vh] w-[200%]" style={{ animationDuration: `${3 + k}s` }}>
                    <path d={FLOOD_EDGE} fill={f} />
                  </svg>
                  {/* sprinkles riding the wave */}
                  {[12, 31, 54, 72, 88].map((x, n) => (
                    <span key={x} className="absolute block h-1.5 w-4 rounded-full" style={{ left: `${x}%`, top: `${8 + ((n * 17) % 30)}%`, rotate: `${n * 47}deg`, background: FLOODS[(k + 1 + (n % 2)) % 3] === f ? "#fff" : ["#FF6F91", "#6FE0C4", "#9B8CFF", "#FFAA5C", "#fff"][n] }} />
                  ))}
                </div>
              ))}
              <div className="pl-glitch absolute inset-0 z-10">
                {GLITCH.map((b, k) => (
                  <span key={k} className="invisible absolute block mix-blend-multiply" style={{ top: `${b.top}%`, height: `${b.h}vh`, width: `${b.w}%`, left: `${b.left}%` }} />
                ))}
              </div>
            </div>
          )}
          <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className="absolute top-full left-0 -mt-px block h-[11vh] w-full">
            <path d={["M0 0 H1440 V60 C1200 130 960 10 720 70 C480 130 240 20 0 80 Z", "M0 0 H1440 V80 C1260 20 1020 120 760 60 C500 0 260 110 0 50 Z", "M0 0 H1440 V50 C1180 120 940 0 700 60 C460 120 220 10 0 70 Z"][i]} fill={c === "#FFF7EE" ? "#FFE9DA" : c} />
          </svg>
        </div>
      ))}

      <div className="absolute inset-0 z-10 flex items-center justify-center">
        <div ref={stack} className="relative drop-shadow-[0_40px_40px_rgba(75,42,32,0.25)]" style={{ height: "min(62svh, 560px)", aspectRatio: geo.aspect, transformOrigin: "0 0" }}>
          <div className="pl-cone-fill invisible absolute" style={{ ...geo.cone, transformOrigin: "50% 100%" }}>
            <img src={PHOTO.cone} alt="" className="block w-full" />
          </div>
          {HERO_SCOOPS.map((src, i) => (
            <div key={i} className="pl-scoop invisible absolute" style={{ ...geo.scoop(i), transformOrigin: "50% 90%" }}>
              <ScoopImg src={src} />
            </div>
          ))}
          <div className="pl-cherry invisible absolute" style={geo.cherry(HERO_SCOOPS.length)}>
            <img src={PHOTO.cherry} alt="" className="block w-full" />
          </div>
        </div>
      </div>

      <div className="pl-ui absolute inset-x-0 bottom-0 z-10 flex items-end justify-between px-[var(--gutter)] pb-8 text-chocolate">
        <div>
          <p className="font-display text-3xl font-bold">Onda</p>
          <p className="font-script text-xl text-chocolate/70">gelato artigianale</p>
        </div>
        <div className="w-40 text-right">
          <p className="font-display text-5xl leading-none font-bold tabular-nums">
            <span className="pl-num">00</span>
            <span className="text-2xl">%</span>
          </p>
          <div className="mt-3 h-1 overflow-hidden rounded-full bg-chocolate/10">
            <div className="pl-bar h-full origin-left scale-x-0 rounded-full" style={{ background: "linear-gradient(90deg,#A8DB7A,#FF8FB8,#FFE066)" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
