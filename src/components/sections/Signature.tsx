"use client";

/* eslint-disable @next/next/no-img-element */
import gsap from "gsap";
import { motion } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
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

const G1 = photoGeometry(1);
type View = { slug: string; title: string; body: string; c1: string; c2: string; scoop: string; ingredients: string[] };

/** Wait until these images are decoded (or 4 s), so the swap never starts on a half-loaded picture. */
function preload(urls: string[]) {
  const one = (u: string) =>
    new Promise<void>((done) => {
      const img = new Image();
      img.onload = img.onerror = () => done();
      img.src = u;
      img.decode?.().then(done, done);
    });
  return Promise.race([Promise.all(urls.map(one)), new Promise((r) => setTimeout(r, 4000))]);
}

/**
 * The signature flavor (now Yellow Submarine): the cone surfaces through soft waves; its ingredients float in bubbles.
 * When the owner picks another signature (by voice or in the admin), the new pictures load first, then ONE timeline
 * plays: the big name rushes off to the right while the new one slides in behind it (and keeps drifting with the
 * scroll), the spatula from the Lab lifts the old scoop and tosses it away, comes back with the new one and tips it
 * onto the cone; same-slot ingredient bubbles change their picture, extra ones pop like soap bubbles, new ones grow
 * in from the side; the colors cross-fade. Transforms and opacity only.
 */
export function Signature() {
  const { data, locale, motion: m } = useSite();
  const s = data.settings;
  const flavor = data.flavors.find((f) => f.tags.includes("signature"));
  const root = useRef<HTMLElement>(null);
  const viewOf = (f: NonNullable<typeof flavor>): View => ({
    slug: f.slug,
    title: t(f.name, locale),
    // the owner's own line wins while the signature is the original one; a new signature speaks with its description
    body: f.slug.startsWith("yellow-submarine") ? t(s.texts.signature_body, locale) : t(f.description, locale),
    c1: f.color_primary,
    c2: f.color_secondary,
    scoop: scoopPhoto(f),
    ingredients: t(f.ingredients, locale).split(",").map((x) => x.trim()).filter(Boolean).slice(0, 3),
  });
  const target = flavor ? viewOf(flavor) : null;
  const [cur, setCur] = useState<View | null>(target);
  const [next, setNext] = useState<View | null>(null);

  // the signature changed: load the new pictures, then swap
  useEffect(() => {
    if (!target) return;
    if (!cur) return setCur(target);
    if (target.slug === cur.slug || next) {
      if (target.slug === cur.slug && !next && JSON.stringify(target) !== JSON.stringify(cur)) setCur(target); // same flavor, new text/locale
      return;
    }
    let alive = true;
    preload([target.scoop, ...target.ingredients.map((n) => ingredientPhoto(n, 320)).filter(Boolean) as string[]]).then(() => alive && setNext(target));
    return () => {
      alive = false;
    };
  }, [target?.slug, target?.title, target?.body, locale]); // eslint-disable-line react-hooks/exhaustive-deps

  // development only: window.__sigSwap("pistacchio") plays the swap without touching the database
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    (window as unknown as { __sigSwap?: (slug: string) => void }).__sigSwap = (slug) => {
      const f = data.flavors.find((x) => x.slug === slug);
      if (f) setNext(viewOf(f));
    };
  });

  // scroll: the cone surfaces, the name drifts across the whole pass, the bubbles rise and bob
  useEffect(() => {
    const el = root.current;
    if (!el || m.intensity === 0 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const q = gsap.utils.selector(el);
    const ctx = gsap.context(() => {
      gsap.fromTo(q(".sig-bigtext"), { xPercent: 8 }, { xPercent: -30, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: 0.6 } });
      const tl = gsap.timeline({ scrollTrigger: { trigger: el, start: "top 85%", end: "top 15%", scrub: 0.8 } });
      tl.fromTo(q(".sig-sub"), { yPercent: 60, rotate: -8 }, { yPercent: 0, rotate: 0, duration: 1.6, ease: "power2.out" }, 0)
        .fromTo(q(".sig-drop"), { y: 0, opacity: 0 }, { y: 120, opacity: 1, duration: 0.8, stagger: 0.1, ease: "power1.in" }, 0.6)
        .to(q(".sig-drop"), { opacity: 0, duration: 0.3 }, 1.3);
      q(".sig-ing").forEach((b, i) => tl.fromTo(b, { y: "30vh", scale: 0.4, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 1, ease: "back.out(1.6)" }, 0.5 + i * 0.3));
      q(".sig-ing-inner").forEach((b, i) => gsap.to(b, { y: -8, duration: 1.6 + i * 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" }));
    }, el);
    return () => ctx.revert();
  }, [m.intensity]);

  // the swap: one timeline over both versions (rendered together while it plays)
  useLayoutEffect(() => {
    const el = root.current;
    if (!el || !next || !cur) return;
    const q = gsap.utils.selector(el);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setCur(next);
      setNext(null);
      return;
    }
    sfx.whoosh();
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: "power3.inOut" }, onComplete: () => (setCur(next), setNext(null)) });
      // colors
      tl.fromTo(q(".sig-bg-new"), { opacity: 0 }, { opacity: 1, duration: 1.4, ease: "sine.inOut" }, 0.2);
      // the name: old one rushes right, the new one follows it in from the left
      tl.to(q(".sig-name-old"), { xPercent: 120, duration: 0.75, ease: "power3.in" }, 0)
        .fromTo(q(".sig-name-new"), { xPercent: -120 }, { xPercent: 0, duration: 1, ease: "power3.out" }, 0.45);
      // the spatula: under the old scoop, lift, toss it away
      const sp = q(".sig-spatula");
      tl.fromTo(sp, { xPercent: -170, yPercent: 0, rotate: -8, opacity: 0 }, { xPercent: -6, opacity: 1, rotate: -3, duration: 0.45, ease: "power3.out" }, 0)
        .to([sp, q(".sig-scoop-old")], { yPercent: "-=14", duration: 0.25, ease: "power2.out" }, 0.45)
        .to(q(".sig-scoop-old"), { xPercent: 230, yPercent: -90, rotate: 50, opacity: 0, duration: 0.55, ease: "power2.in" }, 0.72)
        .to(sp, { xPercent: 150, yPercent: -40, rotate: 18, opacity: 0, duration: 0.5, ease: "power2.in" }, 0.72)
        // …and back from the left with the new one
        .set(sp, { xPercent: -170, yPercent: -14, rotate: -3 }, 1.25)
        .fromTo(q(".sig-scoop-new"), { xPercent: -170, yPercent: -14, opacity: 0 }, { xPercent: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 1.25)
        .to(sp, { xPercent: -6, opacity: 1, duration: 0.6, ease: "power3.out" }, 1.25)
        // tip it onto the cone, squash, the spatula leaves
        .to(sp, { rotate: 24, duration: 0.25, ease: "power2.in" }, 1.88)
        .to(q(".sig-scoop-new"), { yPercent: 0, duration: 0.28, ease: "power2.in" }, 1.9)
        .fromTo(q(".sig-scoop-new"), { scaleY: 1, scaleX: 1 }, { keyframes: { scaleY: [0.8, 1.06, 1], scaleX: [1.14, 0.97, 1] }, duration: 0.6, ease: "sine.out", immediateRender: false }, 2.18)
        .to(sp, { xPercent: 120, yPercent: -40, rotate: 40, opacity: 0, duration: 0.5, ease: "power2.in" }, 2.15);
      // the ingredient bubbles
      const a = cur.ingredients.length;
      const b = next.ingredients.length;
      for (let i = 0; i < 3; i++) {
        if (i < Math.min(a, b)) tl.to(q(`.sig-ing-${i} .ing-old`), { opacity: 0, scale: 0.6, rotate: 25, duration: 0.45 }, 1.3).fromTo(q(`.sig-ing-${i} .ing-new`), { opacity: 0, scale: 1.3, rotate: -25 }, { opacity: 1, scale: 1, rotate: 0, duration: 0.55, ease: "back.out(1.8)" }, 1.55);
        else if (i < a) tl.to(q(`.sig-ing-${i} .ing-bubble`), { keyframes: { scale: [1, 1.28, 0], opacity: [1, 0.9, 0] }, duration: 0.45, ease: "power2.out" }, 0.55);
        else if (i < b) tl.fromTo(q(`.sig-ing-${i} .ing-bubble`), { scale: 0, x: i === 1 ? 80 : -80, opacity: 0 }, { scale: 1, x: 0, opacity: 1, duration: 0.8, ease: "back.out(1.6)" }, 1.7);
      }
      // the title under the cone
      tl.to(q(".sig-title-old"), { yPercent: -40, opacity: 0, duration: 0.4, ease: "power2.in" }, 0.2).fromTo(q(".sig-title-new"), { yPercent: 40, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 0.6, ease: "power3.out" }, 0.75);
    }, el);
    return () => ctx.revert();
  }, [next]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!cur) return null;
  const nv = next;
  const bubble = (i: number) => {
    const oldName = cur.ingredients[i];
    const newName = nv?.ingredients[i];
    if (!oldName && !newName) return null;
    const img = (name: string, cls: string) => (
      <div className={`${cls} absolute inset-0 grid place-items-center ${ingredientPhoto(name) ? "" : "p-[16%]"}`}>
        {ingredientPhoto(name) ? <img src={ingredientPhoto(name, 320)!} alt="" className="h-full w-full object-cover" /> : <Ingredient i={i} />}
      </div>
    );
    return (
      <div className={`ing-bubble flex w-full flex-col items-center ${!oldName ? "opacity-0" : ""}`}>
        <div className="relative grid aspect-square w-[78%] place-items-center overflow-hidden rounded-full border-4 border-white/90 bg-white/35 shadow-[0_14px_24px_-12px_rgba(180,120,20,0.6)]">
          {oldName && img(oldName, nv ? "ing-old" : "")}
          {nv && newName && img(newName, oldName ? "ing-new opacity-0" : "")}
          <span className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_-8px_-10px_20px_rgba(255,255,255,0.45)]" />
          <span className="pointer-events-none absolute top-[12%] left-[18%] h-[14%] w-[26%] -rotate-30 rounded-full bg-white/60" />
        </div>
        <span className="relative mt-1 grid">
          {oldName && <span className={`${nv && newName ? "ing-old" : ""} col-start-1 row-start-1 rounded-full bg-cream px-3 py-0.5 font-script text-xl whitespace-nowrap capitalize shadow-sm`}>{oldName}</span>}
          {nv && newName && oldName && <span className="ing-new col-start-1 row-start-1 rounded-full bg-cream px-3 py-0.5 font-script text-xl whitespace-nowrap capitalize opacity-0 shadow-sm">{newName}</span>}
          {nv && newName && !oldName && <span className="rounded-full bg-cream px-3 py-0.5 font-script text-xl whitespace-nowrap capitalize shadow-sm">{newName}</span>}
        </span>
      </div>
    );
  };
  const bg = (v: View) => (
    <>
      <div className="absolute inset-0" style={{ background: `radial-gradient(80% 60% at 50% 30%, ${lighten(v.c1, 0.55)}, transparent 75%), radial-gradient(60% 50% at 80% 90%, ${lighten(v.c2, 0.6)}aa, transparent 70%)` }} />
      <div className="absolute top-[12%] left-1/2 size-[70vmin] -translate-x-1/2 rounded-full opacity-80" style={{ background: `radial-gradient(circle, ${lighten(v.c1, 0.75)}, transparent 65%)` }} />
    </>
  );
  const name = (v: View, cls: string) => (
    <span className={`${cls} col-start-1 row-start-1 inline-block`} style={{ backgroundImage: `linear-gradient(100deg, ${v.c1}, ${lighten(v.c2, 0.15)} 45%, ${v.c1} 90%)`, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", opacity: 0.55 }}>
      {v.title} · {v.title}
    </span>
  );

  return (
    <section ref={root} id="signature" className="relative overflow-x-clip" data-flavor={cur.slug}>
      <div className="sig-stage relative flex min-h-svh flex-col items-center justify-end overflow-hidden">
        <div className="absolute inset-0" aria-hidden>
          {bg(cur)}
        </div>
        {nv && (
          <div className="sig-bg-new absolute inset-0 opacity-0" aria-hidden>
            {bg(nv)}
          </div>
        )}

        {/* the giant name drifting by (the scroll moves the line, the swap moves the words) */}
        <p className="sig-bigtext pointer-events-none absolute top-[10%] left-0 grid font-display text-[clamp(6rem,22vw,20rem)] leading-none font-bold whitespace-nowrap select-none" aria-hidden>
          {name(cur, nv ? "sig-name-old" : "")}
          {nv && name(nv, "sig-name-new")}
        </p>

        {/* the cone; the spatula from the Lab swaps the scoop */}
        <div className="sig-sub relative z-10 mb-[24svh] w-[min(40vw,340px)] sm:mb-[18svh]">
          <motion.div
            className="relative cursor-pointer"
            style={{ aspectRatio: G1.aspect, transformOrigin: "50% 100%", filter: `drop-shadow(0 30px 30px ${cur.c1}99)` }}
            whileHover={{ rotate: -4, scale: 1.03 }}
            whileTap={{ scaleX: 1.1, scaleY: 0.9, rotate: 3 }}
            transition={{ type: "spring", stiffness: 400, damping: 8 }}
            onTap={() => sfx.plop()}
          >
            <div className="absolute" style={G1.cone}>
              <img src={PHOTO.cone} alt="" className="block w-full" draggable={false} />
            </div>
            <div className="sig-scoop-old absolute" style={{ ...G1.scoop(0), transformOrigin: "50% 92%" }}>
              <ScoopImg src={cur.scoop} />
            </div>
            {nv && (
              <div className="sig-scoop-new absolute opacity-0" style={{ ...G1.scoop(0), transformOrigin: "50% 92%" }}>
                <ScoopImg src={nv.scoop} />
              </div>
            )}
            {nv && <img src="/img/spatula.webp" alt="" className="sig-spatula pointer-events-none absolute z-30 w-[150%] max-w-none opacity-0 drop-shadow-[0_10px_14px_rgba(75,42,32,0.35)]" style={{ left: "-12%", top: "33%", transformOrigin: "20% 50%" }} />}
          </motion.div>
          {[20, 50, 78].map((x, i) => (
            <span key={i} className="sig-drop absolute top-[60%] block h-3 w-2 rounded-full bg-white/80" style={{ left: `${x}%` }} aria-hidden />
          ))}
          {/* ingredients docked around the scoop */}
          {[0, 1, 2].map((i) => (
            <div key={i} className={`sig-ing sig-ing-${i} absolute`} style={{ left: ["-62%", "88%", "-46%"][i], top: ["8%", "12%", "46%"][i], width: "62%" }}>
              <div className="sig-ing-inner flex flex-col items-center">{bubble(i)}</div>
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

        <div className="sig-title absolute inset-x-0 bottom-[7svh] z-30 grid px-(--gutter) text-center">
          <div className={`${nv ? "sig-title-old" : ""} col-start-1 row-start-1`}>
            <h2 className="font-display text-display font-bold text-chocolate">{cur.title}</h2>
            {cur.body && <p className="mx-auto mt-1 max-w-md font-script text-2xl text-chocolate/80 sm:text-3xl">{cur.body}</p>}
          </div>
          {nv && (
            <div className="sig-title-new col-start-1 row-start-1 opacity-0">
              <h2 className="font-display text-display font-bold text-chocolate">{nv.title}</h2>
              {nv.body && <p className="mx-auto mt-1 max-w-md font-script text-2xl text-chocolate/80 sm:text-3xl">{nv.body}</p>}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
