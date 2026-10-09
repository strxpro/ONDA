"use client";

import { IceCream as IceCreamIcon, MapPin } from "@phosphor-icons/react";
import gsap from "gsap";
import { useEffect, useRef } from "react";
import { t } from "@/lib/shared";
import { PHOTO, PhotoCone, ScoopImg } from "../ice/PhotoStack";
import { HERO_SCOOPS } from "../ice/presets";
import { HANDOFF_EVENT, REVEAL_EVENT } from "../Preloader";
import { useSite } from "../providers/SiteData";

const LETTER_COLORS = ["#F0527F", "#F28C28", "#20A884", "#7B6CF0"];

/**
 * Hero: big candy title whose letters stretch and drip away as you scroll (transforms only),
 * a floating cone with pointer tilt, and a drifting pastel mesh.
 */
export function Hero() {
  const { data, locale, motion: m } = useSite();
  const s = data.settings;
  const title = t(s.texts.hero_title, locale);
  const root = useRef<HTMLElement>(null);
  const cone = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current!;
    const k = m.intensity;
    const reduced = k === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      gsap.set(q(".hero-letter"), { yPercent: 120, rotate: () => gsap.utils.random(-14, 14) });
      gsap.set(q(".hero-fade"), { y: 30, autoAlpha: 0 });
      // The preloader flies its cone onto ours: keep our cone in place (hidden) until it lands.
      if (document.documentElement.dataset.handoff === "pending") {
        gsap.set("#hero-icecream", { autoAlpha: 0 });
        gsap.set(q(".hero-sat"), { scale: 0, autoAlpha: 0 });
      } else gsap.set(q(".hero-cone"), { y: 140, autoAlpha: 0, rotate: -10 });
    }, el);
    const onHandoff = () => {
      gsap.set("#hero-icecream", { autoAlpha: 1 });
      gsap.to(q(".hero-sat"), { scale: 1, autoAlpha: 1, duration: 0.9, ease: "elastic.out(1, 0.5)", stagger: 0.12 });
    };
    if (document.documentElement.dataset.handoff === "done") onHandoff();
    else window.addEventListener(HANDOFF_EVENT, onHandoff, { once: true });

    const intro = () => {
      ctx.add(() => {
        gsap
          .timeline({ defaults: { ease: "expo.out" } })
          .to(q(".hero-letter"), { yPercent: 0, rotate: 0, duration: 1.4, stagger: 0.08 })
          .to(q(".hero-cone"), { y: 0, autoAlpha: 1, rotate: 0, duration: 1.6, ease: "elastic.out(1, 0.6)", overwrite: false }, 0.15)
          .to(q(".hero-fade"), { y: 0, autoAlpha: 1, duration: 1, stagger: 0.1 }, 0.45);
        if (reduced) return;
        // a slow "onda": each letter rides a wave
        gsap.to(q(".hero-letter"), { y: -10 * k, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1, stagger: { each: 0.18 }, delay: 1.4 });

        // scroll: the letters stretch down and drip away (transforms only: GPU-cheap), the cone rises
        q(".hero-letter-wrap").forEach((w, i) =>
          gsap.to(w, { yPercent: (i % 2 ? 40 : 70) * k, scaleY: 1 + (i % 2 ? 0.25 : 0.4) * k, transformOrigin: "50% 0%", ease: "power1.in", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.5 } }),
        );
        gsap.to(q(".hero-cone"), { yPercent: -18 * k, rotate: 8 * k, scale: 0.92, ease: "none", scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: true } });
      });
    };
    if (document.documentElement.dataset.revealed) intro();
    else window.addEventListener(REVEAL_EVENT, intro, { once: true });

    const qc = cone.current
      ? { ry: gsap.quickTo(cone.current, "rotateY", { duration: 1, ease: "power3.out" }), rx: gsap.quickTo(cone.current, "rotateX", { duration: 1, ease: "power3.out" }), x: gsap.quickTo(cone.current, "x", { duration: 1, ease: "power3.out" }) }
      : null;
    const mesh = q(".hero-mesh")[0];
    const qm = mesh ? { x: gsap.quickTo(mesh, "x", { duration: 2, ease: "power2.out" }), y: gsap.quickTo(mesh, "y", { duration: 2, ease: "power2.out" }) } : null;
    let inView = true;
    const vis = new IntersectionObserver(([e]) => (inView = e.isIntersecting));
    vis.observe(el);
    const onMove = (e: PointerEvent) => {
      if (reduced || !inView || e.pointerType !== "mouse" || !qc) return;
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      qc.ry(x * 22 * k);
      qc.rx(-y * 12 * k);
      qc.x(x * 30 * k);
      qm?.x(-x * 40 * k);
      qm?.y(-y * 30 * k);
    };
    window.addEventListener("pointermove", onMove);

    // phones: tilt the cone with the device (iOS asks for permission on the first tap)
    const onTilt = (e: DeviceOrientationEvent) => {
      if (reduced || !inView || !qc || e.gamma == null || e.beta == null) return;
      const x = gsap.utils.clamp(-1, 1, e.gamma / 30);
      const y = gsap.utils.clamp(-1, 1, (e.beta - 45) / 30);
      qc.ry(x * 20 * k);
      qc.rx(-y * 10 * k);
      qc.x(x * 18 * k);
    };
    const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> } | undefined;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const askOnce = () => {
      DOE?.requestPermission?.()
        .then((r) => r === "granted" && window.addEventListener("deviceorientation", onTilt))
        .catch(() => {});
    };
    if (coarse && DOE) {
      if (typeof DOE.requestPermission === "function") window.addEventListener("touchend", askOnce, { once: true });
      else window.addEventListener("deviceorientation", onTilt);
    }

    return () => {
      window.removeEventListener(REVEAL_EVENT, intro);
      window.removeEventListener(HANDOFF_EVENT, onHandoff);
      window.removeEventListener("pointermove", onMove);
      vis.disconnect();
      window.removeEventListener("deviceorientation", onTilt);
      window.removeEventListener("touchend", askOnce);
      ctx.revert();
    };
  }, [m.intensity]);

  return (
    <section ref={root} id="top" className="relative min-h-svh overflow-x-clip pt-28 pb-16 sm:pt-32">

      <div className="relative mx-auto grid max-w-7xl items-center gap-8 px-(--gutter) lg:grid-cols-[1.2fr_1fr]">
        <div className="text-center lg:text-left">
          <h1
            className="font-display candy-text text-mega leading-[0.85] whitespace-nowrap select-none lg:text-[min(15vw,14rem)]"
            aria-label={title}
          >
            {[...title].map((ch, i) => (
              <span key={i} className="hero-letter-wrap inline-block" aria-hidden>
                <span
                  className="hero-letter inline-block cursor-default transition-[scale] duration-500 ease-(--ease-gelato) hover:scale-x-115 hover:scale-y-85"
                  style={{ color: LETTER_COLORS[i % LETTER_COLORS.length], transformOrigin: "50% 100%" }}
                >
                  {ch}
                </span>
              </span>
            ))}
          </h1>
          <p className="hero-fade mx-auto mt-6 max-w-[22rem] text-sm font-bold tracking-[0.22em] text-chocolate/70 uppercase sm:max-w-none sm:text-base lg:mx-0">
            {t(s.texts.hero_subtitle, locale)
              .split(" · ")
              .map((part, i) => (
                <span key={i} className="block sm:inline">
                  {i > 0 && <span className="hidden sm:inline"> · </span>}
                  {part}
                </span>
              ))}
          </p>
          <div className="hero-fade mt-8 flex flex-wrap justify-center gap-3 lg:justify-start">
            <a href="#flavors" className="btn-candy bg-lemon">
              <IceCreamIcon weight="duotone" className="size-6" /> {t(s.texts.cta_flavors, locale)}
            </a>
            {s.maps_url && (
              <a href={s.maps_url} target="_blank" rel="noopener" className="btn-candy bg-mint">
                <MapPin weight="duotone" className="size-6" /> {t(s.texts.cta_directions, locale)}
              </a>
            )}
          </div>
        </div>

        <div className="hero-cone relative mx-auto w-[min(40vw,17svh,300px)] sm:w-[min(34vw,26svh,300px)] lg:w-[min(24vw,29svh,340px)]" style={{ perspective: 900 }}>
          {/* colored glow */}
          <div className="absolute inset-x-[-40%] top-[10%] bottom-[30%] rounded-full bg-[radial-gradient(closest-side,rgba(255,143,184,0.55),transparent)] blur-2xl" aria-hidden />
          <div ref={cone} className="relative" style={{ transformStyle: "preserve-3d" }}>
            <div id="hero-icecream" className="bob relative">
              <PhotoCone scoops={HERO_SCOOPS} cherry className="w-full drop-shadow-[0_34px_30px_rgba(255,111,145,0.4)]" />
            </div>
          </div>
          <div data-speed="1.3" className="hero-sat absolute top-[18%] -left-[34%] w-[34%]">
            <div className="bob w-full -rotate-12 drop-shadow-[0_16px_14px_rgba(75,42,32,0.3)]">
              <ScoopImg src={PHOTO.scoops.cioccolato} />
            </div>
          </div>
          <div data-speed="0.7" className="hero-sat absolute top-[46%] -right-[30%] w-[28%]">
            <div className="bob w-full rotate-12 drop-shadow-[0_16px_14px_rgba(75,42,32,0.25)] [animation-delay:-2s]">
              <ScoopImg src={PHOTO.scoops.stracciatella} />
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
