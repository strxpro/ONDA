"use client";

/* eslint-disable @next/next/no-img-element */
import gsap from "gsap";
import { motion } from "motion/react";
import { useEffect, useRef } from "react";
import { t } from "@/lib/shared";
import { sfx } from "@/lib/sound";
import { ingredientPhoto } from "@/lib/ingredients";
import { IceCream } from "../ice/IceCream";
import { PhotoCone, scoopPhoto } from "../ice/PhotoStack";
import { useSite } from "../providers/SiteData";

/** Ricotta, saffron, pistachio — drawn small enough to sit in a bubble. */
function Ingredient({ i }: { i: number }) {
  if (i === 0)
    return (
      <svg viewBox="0 0 100 80" className="w-full" aria-hidden>
        <path d="M10 50 C4 30 22 14 40 18 C50 6 74 8 80 24 C96 26 98 50 86 60 C80 74 56 76 46 68 C30 76 12 68 10 50 Z" fill="#fffdf6" />
        <circle cx="36" cy="40" r="4" fill="#efe6d2" />
        <circle cx="58" cy="34" r="5" fill="#efe6d2" />
        <ellipse cx="34" cy="28" rx="10" ry="5" fill="#fff" />
      </svg>
    );
  if (i === 1)
    return (
      <svg viewBox="0 0 100 100" className="w-full" aria-hidden>
        {["M24 80 C32 52 50 60 56 22", "M42 86 C48 60 70 64 74 32", "M60 88 C64 70 82 70 86 46"].map((d, k) => (
          <path key={k} d={d} fill="none" stroke={["#E5243F", "#F2552C", "#D93A1F"][k]} strokeWidth="6" strokeLinecap="round" />
        ))}
      </svg>
    );
  return (
    <svg viewBox="0 0 100 80" className="w-full" aria-hidden>
      {[[30, 40, -20], [62, 34, 25], [48, 58, 5]].map(([x, y, r], k) => (
        <g key={k} transform={`rotate(${r} ${x} ${y})`}>
          <ellipse cx={x} cy={y} rx="18" ry="12" fill="#C9A26B" />
          <ellipse cx={x + 2} cy={y} rx="11" ry="7" fill="#8DC45A" />
        </g>
      ))}
    </svg>
  );
}

/** "Yellow Submarine": the cone surfaces through golden waves; its ingredients rise in bubbles. */
export function Signature() {
  const { data, locale, motion: m } = useSite();
  const s = data.settings;
  const flavor = data.flavors.find((f) => f.tags.includes("signature"));
  const root = useRef<HTMLElement>(null);
  const ingredients = flavor ? t(flavor.ingredients, locale).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3) : [];

  useEffect(() => {
    const el = root.current;
    if (!el || m.intensity === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      // no pinning: the cone surfaces while the section scrolls in, the name drifts across the whole pass
      gsap.fromTo(q(".sig-bigtext"), { xPercent: 8 }, { xPercent: -30, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 85%", end: "top 15%", scrub: 0.8 } });
      tl.fromTo(q(".sig-sub"), { yPercent: 60, rotate: -8 }, { yPercent: 0, rotate: 0, duration: 1.6, ease: "power2.out" }, 0)
        .fromTo(q(".sig-drop"), { y: 0, opacity: 0 }, { y: 120, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power1.in" }, 0.6)
        .to(q(".sig-drop"), { opacity: 0, duration: 0.3 }, 1.3);
      q(".sig-ing").forEach((b, i) => {
        tl.fromTo(b, { y: "30vh", scale: 0.4, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 1, ease: "back.out(1.6)" }, 0.5 + i * 0.3);
      });
      // ingredients bob gently once they've docked
      q(".sig-ing-inner").forEach((b, i) => gsap.to(b, { y: -8, duration: 1.6 + i * 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    }, el);
    return () => ctx.revert();
  }, [m.intensity]);

  if (!flavor) return null;

  return (
    <section ref={root} id="signature" className="relative overflow-x-clip">
      <div className="sig-stage relative flex min-h-svh flex-col items-center justify-end overflow-hidden">
        {/* soft sun */}
        <div className="absolute top-[12%] left-1/2 size-[70vmin] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,#fff6cf,transparent_65%)] opacity-80" aria-hidden />
        {/* giant outline name drifting by */}
        <p
          className="sig-bigtext pointer-events-none absolute top-[10%] left-0 font-display text-[clamp(6rem,22vw,20rem)] leading-none font-bold whitespace-nowrap select-none"
          style={{ color: "transparent", WebkitTextStroke: "2px rgba(255,255,255,0.85)" }}
          aria-hidden
        >
          {t(s.texts.signature_title, locale)} · {t(s.texts.signature_title, locale)}
        </p>

        {/* the cone surfacing */}
        <div className="sig-sub relative z-10 mb-[24svh] w-[min(40vw,340px)] sm:mb-[18svh]">
          {scoopPhoto(flavor) ? (
            <motion.div
              className="cursor-pointer"
              style={{ transformOrigin: "50% 100%" }}
              whileHover={{ rotate: -4, scale: 1.03 }}
              whileTap={{ scaleX: 1.1, scaleY: 0.9, rotate: 3 }}
              transition={{ type: "spring", stiffness: 400, damping: 8 }}
              onTap={() => sfx.plop()}
            >
              <PhotoCone scoops={[scoopPhoto(flavor)!]} className="w-full" style={{ filter: "drop-shadow(0 30px 30px rgba(242,169,59,0.55))" }} />
            </motion.div>
          ) : (
            <IceCream scoops={[{ color: flavor.color_primary, color2: flavor.color_secondary, texture: flavor.scoop_texture }]} drips className="w-full" />
          )}
          {[20, 50, 78].map((x, i) => (
            <span key={i} className="sig-drop absolute top-[60%] block h-3 w-2 rounded-full bg-white/80" style={{ left: `${x}%` }} aria-hidden />
          ))}
          {/* ingredients docked around the scoop */}
          {ingredients.map((name, i) => (
            <div key={name} className="sig-ing absolute" style={{ left: ["-62%", "88%", "-46%"][i], top: ["8%", "12%", "46%"][i], width: "62%" }}>
              <div className="sig-ing-inner flex flex-col items-center">
                <div className={`relative grid aspect-square w-[78%] place-items-center overflow-hidden rounded-full border-4 border-white/90 bg-white/35 shadow-[0_14px_24px_-12px_rgba(180,120,20,0.6)] ${ingredientPhoto(name) ? "" : "p-[16%]"}`}>
                  {ingredientPhoto(name) ? <img src={ingredientPhoto(name, 320)!} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Ingredient i={i} />}
                  {/* bubble shine */}
                  <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_-8px_-10px_20px_rgba(255,255,255,0.45)]" />
                  <span className="pointer-events-none absolute top-[12%] left-[18%] h-[14%] w-[26%] -rotate-30 rounded-full bg-white/60" />
                </div>
                <span className="mt-1 rounded-full bg-cream px-3 py-0.5 font-script text-xl whitespace-nowrap capitalize shadow-sm">{name}</span>
              </div>
            </div>
          ))}
        </div>

        {/* bubbles */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-full" aria-hidden>
          {Array.from({ length: 14 }, (_, i) => (
            <span
              key={i}
              className="bubble absolute bottom-[8%] block rounded-full border border-white/80 bg-white/25"
              style={{ left: `${(i * 37) % 100}%`, width: 8 + ((i * 7) % 18), height: 8 + ((i * 7) % 18), animationDuration: `${5 + ((i * 3) % 6)}s`, animationDelay: `${-(i * 0.9)}s` }}
            />
          ))}
        </div>


        <div className="sig-title absolute inset-x-0 bottom-[7svh] z-30 px-(--gutter) text-center">
          <h2 className="font-display text-display font-bold text-chocolate">{t(s.texts.signature_title, locale)}</h2>
          <p className="mx-auto mt-1 max-w-md font-script text-2xl text-chocolate/80 sm:text-3xl">{t(s.texts.signature_body, locale)}</p>
        </div>
      </div>
    </section>
  );
}
