"use client";

/* eslint-disable @next/next/no-img-element */
import gsap from "gsap";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { t } from "@/lib/shared";
import { sfx } from "@/lib/sound";
import { ingredientPhoto } from "@/lib/ingredients";
import { lighten } from "@/lib/color";
import { PHOTO, photoGeometry, ScoopImg, scoopPhoto } from "../ice/PhotoStack";
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

/** fast at first, gentle at the end — the "speed ramp" of every swap */
const RAMP = [0.7, 0, 0.2, 1] as const;
const G1 = photoGeometry(1);

/**
 * The signature flavor (now Yellow Submarine): the cone surfaces through soft waves; its ingredients rise in bubbles.
 * When the owner picks another signature (by voice or in the admin), everything swaps live: the big name rushes
 * off to the right as the new one sweeps in, a spatula takes the scoop away and brings the new one, the ingredient
 * bubbles change (pop / grow), the colors cross-fade.
 */
export function Signature() {
  const { data, locale, motion: m } = useSite();
  const s = data.settings;
  const flavor = data.flavors.find((f) => f.tags.includes("signature"));
  const root = useRef<HTMLElement>(null);
  const title = flavor ? t(flavor.name, locale) : t(s.texts.signature_title, locale);
  // the owner's own line wins while the signature is the original one; a new signature speaks with its own description
  const body = flavor && !flavor.slug.startsWith("yellow-submarine") ? t(flavor.description, locale) : t(s.texts.signature_body, locale);
  const c1 = flavor?.color_primary ?? "#FFE066";
  const c2 = flavor?.color_secondary ?? "#A8DB7A";
  const ingredients = flavor ? t(flavor.ingredients, locale).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3) : [];
  // count the swaps (not the first render): each one plays the spatula once
  const [swaps, setSwaps] = useState(0);
  const lastSlug = useRef(flavor?.slug);
  useEffect(() => {
    if (flavor?.slug && lastSlug.current && flavor.slug !== lastSlug.current) {
      setSwaps((n) => n + 1);
      sfx.whoosh();
    }
    lastSlug.current = flavor?.slug;
  }, [flavor?.slug]);

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
    <section ref={root} id="signature" className="relative overflow-x-clip" data-flavor={flavor?.slug}>
      <div className="sig-stage relative flex min-h-svh flex-col items-center justify-end overflow-hidden">
        {/* the flavor's own light: its colors wash the stage (cross-fades when the signature changes) */}
        <AnimatePresence initial={false}>
          <motion.div key={flavor.slug} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 1.4, ease: "easeInOut" }} aria-hidden>
            <div className="absolute inset-0" style={{ background: `radial-gradient(80% 60% at 50% 30%, ${lighten(c1, 0.55)}, transparent 75%), radial-gradient(60% 50% at 80% 90%, ${lighten(c2, 0.6)}aa, transparent 70%)` }} />
            <div className="absolute top-[12%] left-1/2 size-[70vmin] -translate-x-1/2 rounded-full opacity-80" style={{ background: `radial-gradient(circle, ${lighten(c1, 0.75)}, transparent 65%)` }} />
          </motion.div>
        </AnimatePresence>

        {/* the giant name drifting by: on a change the old one rushes off to the right, the new one sweeps in from the left */}
        <p className="sig-bigtext pointer-events-none absolute top-[10%] left-0 font-display text-[clamp(6rem,22vw,20rem)] leading-none font-bold whitespace-nowrap select-none" aria-hidden>
          <AnimatePresence initial={false} mode="popLayout">
            <motion.span
              key={flavor.slug}
              className="inline-block"
              style={{ backgroundImage: `linear-gradient(100deg, ${c1}, ${lighten(c2, 0.15)} 45%, ${c1} 90%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", opacity: 0.55 }}
              initial={{ x: "-70%", opacity: 0, filter: "blur(12px)" }}
              animate={{ x: 0, opacity: 0.55, filter: "blur(0px)" }}
              exit={{ x: "70%", opacity: 0, filter: "blur(12px)" }}
              transition={{ duration: 0.85, ease: RAMP }}
            >
              {title} · {title}
            </motion.span>
          </AnimatePresence>
        </p>

        {/* the cone surfacing; a spatula swaps the scoop when the signature changes */}
        <div className="sig-sub relative z-10 mb-[24svh] w-[min(40vw,340px)] sm:mb-[18svh]">
          <motion.div
            className="relative cursor-pointer"
            style={{ aspectRatio: G1.aspect, transformOrigin: "50% 100%", filter: `drop-shadow(0 30px 30px ${c1}99)` }}
            whileHover={{ rotate: -4, scale: 1.03 }}
            whileTap={{ scaleX: 1.1, scaleY: 0.9, rotate: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 8 }}
            onTap={() => sfx.plop()}
          >
            <div className="absolute" style={G1.cone}>
              <img src={PHOTO.cone} alt="" className="block w-full" draggable={false} />
            </div>
            <AnimatePresence initial={false}>
              <motion.div
                key={flavor.slug}
                className="absolute"
                style={{ ...G1.scoop(0), transformOrigin: "50% 92%" }}
                initial={{ x: "-150%", y: "-30%", rotate: -16 }}
                animate={{ x: 0, y: 0, rotate: 0, scaleY: [1, 1, 0.8, 1.05, 1], scaleX: [1, 1, 1.12, 0.97, 1] }}
                exit={{ x: "160%", y: "-35%", rotate: 20, transition: { duration: 0.55, ease: RAMP, delay: 0.2 } }}
                transition={{ x: { duration: 0.6, ease: RAMP, delay: 0.6 }, y: { duration: 0.6, ease: RAMP, delay: 0.6 }, rotate: { duration: 0.6, delay: 0.6 }, scaleY: { duration: 1.4, times: [0, 0.6, 0.72, 0.86, 1], delay: 0.15 }, scaleX: { duration: 1.4, times: [0, 0.6, 0.72, 0.86, 1], delay: 0.15 } }}
              >
                <ScoopImg src={scoopPhoto(flavor)!} />
              </motion.div>
            </AnimatePresence>
            {/* the spatula: slides under the old scoop, carries it off, comes back with the new one and tips it in */}
            {swaps > 0 && (
              <motion.img
                key={swaps}
                src="/img/spatula.webp"
                alt=""
                className="pointer-events-none absolute z-30 w-[95%]"
                style={{ left: "-8%", top: "52%", transformOrigin: "20% 50%" }}
                initial={{ x: "-180%", opacity: 0, rotate: -10 }}
                animate={{ x: ["-180%", "-8%", "170%", "170%", "-170%", "-8%", "60%"], opacity: [0, 1, 1, 0, 0, 1, 0], rotate: [-10, -4, 10, 10, -12, -4, 28] }}
                transition={{ duration: 1.7, times: [0, 0.16, 0.42, 0.44, 0.46, 0.72, 1], ease: "easeInOut" }}
              />
            )}
          </motion.div>
          {[20, 50, 78].map((x, i) => (
            <span key={i} className="sig-drop absolute top-[60%] block h-3 w-2 rounded-full bg-white/80" style={{ left: `${x}%` }} aria-hidden />
          ))}
          {/* ingredients docked around the scoop: same slot → new content in the same bubble; fewer → the bubble pops; more → it grows from the side */}
          {[0, 1, 2].map((i) => {
            const name = ingredients[i];
            return (
              <div key={i} className="sig-ing absolute" style={{ left: ["-62%", "88%", "-46%"][i], top: ["8%", "12%", "46%"][i], width: "62%" }}>
                <div className="sig-ing-inner flex flex-col items-center">
                  <AnimatePresence initial={false}>
                    {name && (
                      <motion.div
                        key="bubble"
                        className="flex w-full flex-col items-center"
                        initial={{ scale: 0, x: i === 1 ? 70 : -70, opacity: 0 }}
                        animate={{ scale: 1, x: 0, opacity: 1 }}
                        exit={{ scale: [1, 1.28, 0], opacity: [1, 0.9, 0], transition: { duration: 0.45, times: [0, 0.55, 1], ease: "easeOut" } }}
                        transition={{ type: "spring", stiffness: 160, damping: 14, delay: 0.9 + i * 0.12 }}
                      >
                        <div className="relative grid aspect-square w-[78%] place-items-center overflow-hidden rounded-full border-4 border-white/90 bg-white/35 shadow-[0_14px_24px_-12px_rgba(180,120,20,0.6)]">
                          <AnimatePresence initial={false} mode="popLayout">
                            <motion.div key={name} className={`absolute inset-0 grid place-items-center ${ingredientPhoto(name) ? "" : "p-[16%]"}`} initial={{ opacity: 0, scale: 1.3, rotate: -20 }} animate={{ opacity: 1, scale: 1, rotate: 0 }} exit={{ opacity: 0, scale: 0.7, rotate: 20 }} transition={{ duration: 0.6, ease: RAMP, delay: 0.7 + i * 0.12 }}>
                              {ingredientPhoto(name) ? <img src={ingredientPhoto(name, 320)!} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Ingredient i={i} />}
                            </motion.div>
                          </AnimatePresence>
                          {/* bubble shine */}
                          <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_-8px_-10px_20px_rgba(255,255,255,0.45)]" />
                          <span className="pointer-events-none absolute top-[12%] left-[18%] h-[14%] w-[26%] -rotate-30 rounded-full bg-white/60" />
                        </div>
                        <AnimatePresence initial={false} mode="popLayout">
                          <motion.span key={name} className="mt-1 rounded-full bg-cream px-3 py-0.5 font-script text-xl whitespace-nowrap capitalize shadow-sm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.4, delay: 0.8 }}>
                            {name}
                          </motion.span>
                        </AnimatePresence>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            );
          })}
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
          <AnimatePresence initial={false} mode="wait">
            <motion.div key={flavor.slug} initial={{ opacity: 0, y: 24, filter: "blur(8px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={{ opacity: 0, y: -16, filter: "blur(8px)" }} transition={{ duration: 0.55, ease: RAMP }}>
              <h2 className="font-display text-display font-bold text-chocolate">{title}</h2>
              {body && <p className="mx-auto mt-1 max-w-md font-script text-2xl text-chocolate/80 sm:text-3xl">{body}</p>}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
