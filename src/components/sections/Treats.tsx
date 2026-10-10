"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Cake, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ingredientPhoto } from "@/lib/ingredients";
import { sfx } from "@/lib/sound";
import { useScrollLock } from "../ui/useScrollLock";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { t, type Locale, type PriceItem } from "@/lib/shared";
import { useSite } from "../providers/SiteData";
import { RollingPrice } from "../ui/RollingPrice";
import { Title } from "../ui/Title";
import { CAKE_PHOTOS, CakeOrder } from "./CakeOrder";
import { OrderCard } from "./OrderCard";

const COLORS = ["#FF8FB8", "#FFE066", "#6FE0C4", "#FFAA5C", "#9B8CFF", "#A8DB7A"];

/** Deterministic pseudo-random in [0,1). */
const rnd = (seed: number) => {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
};

/** A soft paint splash: a smooth closed blob (Catmull-Rom → Bézier) plus a few drops. viewBox 0 0 200 200. */
function splash(seed: number) {
  const n = 12;
  const pts = Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const r = 74 * (1 + (rnd(seed + i) - 0.5) * 0.32 + (i % 3 === 0 ? 0.1 : 0));
    return [100 + Math.cos(a) * r, 100 + Math.sin(a) * r];
  });
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += ` C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  const drops = Array.from({ length: 4 }, (_, i) => {
    const a = rnd(seed * 5 + i) * Math.PI * 2;
    const r = 88 + rnd(seed * 3 + i) * 12;
    return { cx: +(100 + Math.cos(a) * r).toFixed(1), cy: +(100 + Math.sin(a) * r).toFixed(1), r: +(3 + rnd(seed + i * 7) * 7).toFixed(1) };
  });
  return { d: d + "Z", drops };
}

/**
 * "Altre delizie": the other things served at the counter, each photo resting on a paint splash —
 * alternating left and right like a menu you read in a zig-zag. Below, the take-away tubs and extras.
 */
export function Treats() {
  const { data, locale } = useSite();
  const s = data.settings;
  const ui = useTranslations("ui");
  const treats = data.prices.filter((p) => p.is_active && p.price_group === "delizie");
  const [open, setOpen] = useState<PriceItem | null>(null);
  const [cakeOpen, setCakeOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section id="prices" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-(--gutter)">
        <Title color="#FFAA5C">{t(s.texts.prices_title, locale)}</Title>

        <ul className="mt-12 grid gap-y-10 sm:mt-16 md:grid-cols-2 md:gap-x-10 md:gap-y-0 md:pb-48">
          {treats.map((p, i) => (
            <Splash key={p.id} item={p} index={i} locale={locale} onOpen={() => (sfx.whoosh(), setOpen(p))} />
          ))}
        </ul>

        <OrderCard />
        {mounted && createPortal(<AnimatePresence>{open && <TreatCard key={open.id} item={open} index={treats.findIndex((x) => x.id === open.id)} locale={locale} onClose={() => setOpen(null)} onOrderCake={() => (setOpen(null), setCakeOpen(true))} />}
            {cakeOpen && <CakeOrder key="cake" onClose={() => setCakeOpen(false)} />}</AnimatePresence>, document.body)}
        <p className="sr-only">{ui("coneOrCup")}</p>
      </div>
    </section>
  );
}

function Splash({ item: p, index: i, locale, onOpen }: { item: PriceItem; index: number; locale: Locale; onOpen: () => void }) {
  const ui = useTranslations("ui.treats");
  const color = COLORS[i % COLORS.length];
  const right = i % 2 === 1; // zig-zag: photo left, then right…
  const sp = splash(i * 11 + 3);
  return (
    <motion.li
      onClick={onOpen}
      className={`group flex cursor-pointer items-center gap-5 sm:gap-8 ${right ? "flex-row-reverse text-right md:translate-y-[40%]" : ""}`}
      initial={{ opacity: 0, x: right ? 60 : -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-[56%] max-w-[420px] shrink-0">
        {/* the splash */}
        <motion.svg
          viewBox="0 0 200 200"
          className="block w-full overflow-visible"
          initial={{ scale: 0.3, rotate: right ? 40 : -40 }}
          whileInView={{ scale: 1, rotate: 0 }}
          viewport={{ once: true, margin: "-12% 0px" }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          aria-hidden
        >
          <g className="origin-center transition-transform duration-700 ease-(--ease-gelato) group-hover:scale-105 group-hover:rotate-6">
            <path d={sp.d} fill={color} />
            {sp.drops.map((d, k) => (
              <circle key={k} {...d} fill={color} />
            ))}
          </g>
        </motion.svg>
        {/* the photo resting on it */}
        <div className="absolute inset-[13%] overflow-hidden rounded-full border-4 border-white shadow-[0_24px_40px_-20px_rgba(75,42,32,0.5)] transition-transform duration-700 ease-(--ease-gelato) group-hover:-translate-y-2">
          {p.image_url && <Image src={p.image_url} alt={t(p.label, locale)} fill sizes="(max-width: 768px) 46vw, 320px" className="object-cover transition-transform duration-700 ease-(--ease-gelato) group-hover:scale-110" />}
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.02]">{t(p.label, locale)}</h3>
        {p.price_eur > 0 && <RollingPrice value={p.price_eur} locale={locale} className="mt-2 block font-display text-3xl font-bold sm:text-4xl" />}
        {/* "there is more": opens its card */}
        <span className={`mt-3 inline-flex items-center gap-2 rounded-full bg-chocolate py-2 pr-2 pl-4 text-sm font-bold text-cream transition-transform duration-500 ease-(--ease-gelato) group-hover:scale-105 ${right ? "flex-row-reverse pr-4 pl-2" : ""}`}>
          {ui("discover")}
          <span className="grid size-7 place-items-center rounded-full bg-cream text-chocolate transition-transform duration-500 ease-(--ease-gelato) group-hover:translate-x-1">
            <ArrowRight weight="bold" className="size-4" />
          </span>
        </span>
      </div>
    </motion.li>
  );
}

/**
 * A treat's own card: the photo big on its paint splash (the splash grows into the card), its name, a short warm
 * line, what it is made of and the price. Everything here is editable by voice (update_menu_item).
 */
function TreatCard({ item: p, index: i, locale, onClose, onOrderCake }: { item: PriceItem; index: number; locale: Locale; onClose: () => void; onOrderCake: () => void }) {
  useScrollLock();
  const ui = useTranslations("ui.treats");
  const uiCake = useTranslations("ui.cake");
  const isCake = /^tort/.test(p.slug);
  // the shop's own cake photo first (not the old stock one), then Onda's cakes
  const own = p.image_url && !p.image_url.includes("unsplash.com") ? [p.image_url] : [];
  const photos = isCake ? [...own, ...CAKE_PHOTOS.filter((x) => x !== p.image_url)] : p.image_url ? [p.image_url] : [];
  const [shown, setShown] = useState(0);
  const color = COLORS[Math.max(0, i) % COLORS.length];
  const sp = splash(Math.max(0, i) * 11 + 3);
  const ingredients = t(p.ingredients ?? {}, locale)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <motion.div className="fixed inset-0 z-[97] grid place-items-center overflow-y-auto overscroll-contain bg-chocolate/40 p-4 backdrop-blur-md" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={t(p.label, locale)}>
      <motion.div
        className="relative grid w-full max-w-3xl items-center gap-6 rounded-[2.5rem] bg-cream p-6 shadow-float sm:grid-cols-[1fr_1.05fr] sm:p-8"
        initial={{ y: 120, scale: 0.85, rotate: -3 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        exit={{ y: 120, scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="×" className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-white transition-transform hover:rotate-90">
          <X weight="bold" className="size-5" />
        </button>
        <div className="relative mx-auto w-full max-w-[340px]">
          <motion.svg viewBox="0 0 200 200" className="block w-full overflow-visible" initial={{ scale: 0.4, rotate: -50 }} animate={{ scale: 1.08, rotate: 0 }} transition={{ type: "spring", stiffness: 120, damping: 14 }} aria-hidden>
            <path d={sp.d} fill={color} />
            {sp.drops.map((d, k) => (
              <circle key={k} {...d} fill={color} />
            ))}
          </motion.svg>
          <motion.div className="absolute inset-[10%] overflow-hidden rounded-full border-[6px] border-white shadow-[0_30px_50px_-24px_rgba(75,42,32,0.55)]" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 180, damping: 16, delay: 0.1 }}>
            <AnimatePresence initial={false} mode="popLayout">
              {photos[shown] && (
                <motion.div key={photos[shown]} className="absolute inset-0" initial={{ opacity: 0, scale: 1.15 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                  <Image src={photos[shown]} alt={t(p.label, locale)} fill sizes="340px" className="object-cover" />
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
          {/* more photos: tap to see each one big */}
          {photos.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5">
              {photos.slice(0, 6).map((src, k) => (
                <button key={src} type="button" onClick={() => (sfx.pop(), setShown(k))} className={`relative size-11 overflow-hidden rounded-full border-2 transition-transform ${k === shown ? "scale-110 border-chocolate" : "border-white"}`} aria-label={`${k + 1}`}>
                  <Image src={src} alt="" fill sizes="44px" className="object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="min-w-0 pr-6">
          <h3 className="font-display text-4xl leading-[1.02] sm:text-5xl">{t(p.label, locale)}</h3>
          {t(p.description ?? {}, locale) && <p className="mt-3 font-script text-2xl leading-snug text-chocolate/80">{t(p.description!, locale)}</p>}
          {ingredients.length > 0 && (
            <>
              <p className="mt-5 text-sm font-bold tracking-[0.14em] text-chocolate/55 uppercase">{ui("madeWith")}</p>
              <ul className="mt-2 flex flex-wrap gap-2">
                {ingredients.map((ing, k) => (
                  <motion.li key={ing} initial={{ opacity: 0, y: 10, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.25 + k * 0.08, type: "spring", stiffness: 300, damping: 18 }} className="flex items-center gap-2 rounded-full bg-white py-1 pr-3.5 pl-1 text-sm font-bold capitalize shadow-sm">
                    {ingredientPhoto(ing, 96) ? <img src={ingredientPhoto(ing, 96)!} alt="" loading="lazy" className="size-9 rounded-full object-cover" /> : <span className="size-9 rounded-full" style={{ background: color }} />}
                    {ing}
                  </motion.li>
                ))}
              </ul>
            </>
          )}
          {p.price_eur > 0 && <RollingPrice value={p.price_eur} locale={locale} className="mt-5 block font-display text-5xl font-bold" />}
          {isCake && (
            <motion.button type="button" onClick={onOrderCake} whileHover={{ scale: 1.04, rotate: -1 }} whileTap={{ scale: 0.95 }} className="btn-candy mt-6 bg-[linear-gradient(110deg,#FF8FB8,#FFAA5C)]">
              <Cake weight="duotone" className="size-6" /> {uiCake("order")}
            </motion.button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}
