"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowRight, Sparkle, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { darken, lighten } from "@/lib/color";
import { ingredientPhoto } from "@/lib/ingredients";
import { sfx } from "@/lib/sound";
import { t, type Flavor, type Locale } from "@/lib/shared";
import { PHOTO, PhotoCone, ScoopImg, scoopPhoto, thumb } from "../ice/PhotoStack";
import { useSite } from "../providers/SiteData";
import { FrameSequence, type FrameSequenceHandle } from "../ui/FrameSequence";
import { RollingPrice } from "../ui/RollingPrice";
import { ScoopFrame } from "../ui/ScoopFrame";
import { TagIcon } from "../ui/TagIcon";
import { Title } from "../ui/Title";

/** The flavor that gets the "Novità" ribbon / first place: a new one, else the featured one. */
function badgeOf(f: Flavor, ui: (k: string) => string) {
  if (f.tags.includes("new")) return ui("badgeNew");
  if (f.tags.includes("signature")) return ui("badgeSignature");
  return null;
}

/**
 * "I gusti di oggi" — the gelato menu. Prices on top, a small ad for "build your own", then every flavor
 * grouped by family: big real scoops (a photo, or the shared scoop tinted to the flavor's color), easy to scan.
 * Tap a scoop: the filmed spatula scoops it and the card tells what's inside.
 */
export function Flavors() {
  const { data, locale } = useSite();
  const ui = useTranslations("ui");
  const s = data.settings;
  const [active, setActive] = useState<Flavor | null>(null);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const all = useMemo(
    () =>
      data.flavors
        .slice()
        .sort(
          (a, b) =>
            Number(b.is_available_today) - Number(a.is_available_today) ||
            Number(b.tags.includes("new")) - Number(a.tags.includes("new")) ||
            Number(b.is_featured) - Number(a.is_featured) ||
            a.sort_order - b.sort_order,
        ),
    [data.flavors],
  );
  // families in a fixed, appetizing order; signature/new first inside each
  const groups = (["speciali", "crema", "frutta", "sorbetti"] as const).map((c) => ({ cat: c, list: all.filter((f) => f.category === c) })).filter((g) => g.list.length);

  // keep the open card in sync with live updates (e.g. it sold out meanwhile)
  useEffect(() => {
    if (active) setActive(data.flavors.find((f) => f.id === active.id) ?? null);
  }, [data.flavors]); // eslint-disable-line react-hooks/exhaustive-deps

  const pick = (f: Flavor) => {
    navigator.vibrate?.(10);
    sfx.pop();
    setActive(f);
  };

  return (
    <section id="flavors" className="relative py-20 sm:py-28">
      <div className="relative mx-auto w-full max-w-6xl px-(--gutter)">
        <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <Title color="#FF8FB8">
            {t(s.texts.flavors_title, locale)}
          </Title>
          <PriceStrip />
        </div>

        {/* the fan: today's flavors, each on its own waffle cone */}
        <ConeFan flavors={all.filter((f) => f.is_available_today).slice(0, 9)} locale={locale} onPick={pick} />

        {/* a small ad: build your own */}
        <BuildPromo />

        <div className="mt-14 space-y-12 sm:mt-20 sm:space-y-16">
          {groups.map((g) => (
            <div key={g.cat}>
              <h3 className="flex items-baseline gap-3 border-b border-chocolate/10 pb-3 font-display text-3xl sm:text-4xl">
                {ui(`categories.${g.cat}`)}
              </h3>
              <ul className="mt-5 grid grid-cols-3 gap-x-3 gap-y-6 sm:grid-cols-4 sm:gap-x-6 lg:grid-cols-6">
                {g.list.map((f, i) => (
                  <li key={f.id}>
                    <ScoopTile flavor={f} locale={locale} index={i} selected={active?.id === f.id} onPick={() => pick(f)} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* the flavor card, over the page (portaled: sections are transformed while they glide in) */}
      {mounted &&
        createPortal(
          <AnimatePresence>
            {active && (
              <motion.div className="fixed inset-0 z-[90] grid place-items-center bg-chocolate/30 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setActive(null)}>
                <div onClick={(e) => e.stopPropagation()} className="w-full max-w-3xl">
                  <Detail key={active.id} flavor={active} locale={locale} onClose={() => setActive(null)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </section>
  );
}

/**
 * A hand of waffle cones fanned out from one pivot, like cards — today's flavors at a glance.
 * They fan open when the menu comes into view; hover lifts one, tap opens its card.
 */
function ConeFan({ flavors, locale, onPick }: { flavors: Flavor[]; locale: Locale; onPick: (f: Flavor) => void }) {
  const n = flavors.length;
  if (n < 3) return null;
  const spread = Math.min(70, 9 * (n - 1)); // total angle in degrees
  return (
    <div className="relative mx-auto mt-12 h-[clamp(230px,30vw,380px)] w-full max-w-4xl sm:mt-16" aria-label="gelato">
      {flavors.map((f, i) => {
        const angle = n > 1 ? -spread / 2 + (spread * i) / (n - 1) : 0;
        return (
          <motion.button
            key={f.id}
            type="button"
            onClick={() => onPick(f)}
            aria-label={t(f.name, locale)}
            className="group absolute bottom-0 left-1/2 w-[clamp(62px,9vw,118px)] -translate-x-1/2"
            style={{ transformOrigin: "50% 190%", zIndex: 10 + Math.round(n / 2 - Math.abs(i - (n - 1) / 2)) }}
            initial={{ rotate: 0, y: 40, opacity: 0 }}
            whileInView={{ rotate: angle, y: 0, opacity: 1 }}
            viewport={{ once: true, margin: "0px 0px -10% 0px" }}
            transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1], delay: 0.1 + Math.abs(i - (n - 1) / 2) * 0.05 }}
          >
            <span className="block transition-transform duration-500 ease-(--ease-gelato) group-hover:-translate-y-[18%] group-hover:scale-105">
              <PhotoCone small scoops={[scoopPhoto(f)]} className="w-full drop-shadow-[0_18px_18px_rgba(75,42,32,0.22)]" />
            </span>
            <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 rounded-full bg-chocolate px-3 py-1 text-xs font-bold whitespace-nowrap text-cream opacity-0 transition-all duration-300 group-hover:-top-11 group-hover:opacity-100">
              {t(f.name, locale)}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/** "Crea il tuo cono" — a little advert inside the menu that leads to the builder. */
function BuildPromo() {
  const { data, locale } = useSite();
  const s = data.settings;
  return (
    <a
      href="#build"
      className="group relative mt-10 flex items-center gap-4 overflow-hidden rounded-[2rem] bg-[linear-gradient(110deg,#FF8FB8,#FFAA5C_55%,#FFE066)] p-4 pr-5 text-chocolate shadow-[0_24px_50px_-24px_rgba(240,82,127,0.7)] sm:gap-8 sm:p-5 sm:pr-8"
    >
      <span className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-white/25 blur-2xl" aria-hidden />
      <PhotoCone small scoops={[PHOTO.scoops.pistacchio, PHOTO.scoops.fragola, PHOTO.scoops["yellow-submarine"]]} cherry className="h-24 shrink-0 transition-transform duration-500 ease-(--ease-gelato) group-hover:-rotate-6 sm:h-32" />
      <span className="min-w-0 flex-1">
        <span className="block font-display text-2xl leading-tight sm:text-4xl">{t(s.texts.configurator_title, locale)}</span>
        <span className="mt-1 block text-sm font-semibold text-chocolate/75 sm:text-base">{t(s.texts.configurator_subtitle, locale)}</span>
      </span>
      <span className="grid size-12 shrink-0 place-items-center rounded-full bg-chocolate text-cream transition-transform duration-500 ease-(--ease-gelato) group-hover:translate-x-1 sm:size-14">
        <ArrowRight weight="bold" className="size-5" />
      </span>
    </a>
  );
}

/** The scoop held up on the paddle, with what's inside. */
function Detail({ flavor: f, locale, onClose }: { flavor: Flavor; locale: Locale; onClose: () => void }) {
  const ui = useTranslations("ui");
  const photo = scoopPhoto(f);
  const ingredients = t(f.ingredients, locale)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  return (
    <motion.div
      role="dialog"
      aria-label={t(f.name, locale)}
      initial={{ opacity: 0, y: 40, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.97, transition: { duration: 0.2 } }}
      transition={{ type: "spring", stiffness: 220, damping: 24 }}
      className="pointer-events-auto relative flex w-full max-w-3xl shrink-0 items-center gap-4 rounded-[2rem] bg-cream/95 p-4 shadow-float backdrop-blur sm:gap-8 sm:p-6"
      style={{ boxShadow: `0 30px 60px -30px ${darken(f.color_primary, 0.2)}, 0 0 0 3px ${f.color_primary}` }}
    >
      <button type="button" onClick={onClose} aria-label={ui("close")} className="absolute top-3 right-3 grid size-10 place-items-center rounded-full bg-white transition-transform hover:rotate-90">
        <X weight="bold" className="size-5" />
      </button>

      {/* the real scoop, filmed: the spatula curls the gelato into a ball (tinted to the flavor) */}
      <ScoopClip color={f.color_primary} photo={photo} />

      <div className="min-w-0 flex-1 pr-8">
        <h3 className="font-display text-2xl leading-tight font-bold sm:text-4xl">{t(f.name, locale)}</h3>
        {t(f.description, locale) && <p className="mt-1 text-sm font-semibold text-chocolate/80 sm:text-base">{t(f.description, locale)}</p>}
        {ingredients.length > 0 && (
          <>
            <p className="mt-3 font-script text-xl text-chocolate/70 sm:text-2xl">{ui("whatsInside")}</p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {ingredients.map((ing, i) => (
                <motion.li
                  key={ing}
                  initial={{ opacity: 0, y: 10, scale: 0.8 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.25 + i * 0.09, type: "spring", stiffness: 300, damping: 18 }}
                  className="flex items-center gap-2 rounded-full bg-white py-1 pr-3.5 pl-1 text-sm font-bold capitalize shadow-sm sm:text-base"
                >
                  {ingredientPhoto(ing, 96) ? (
                    <img src={ingredientPhoto(ing, 96)!} alt="" loading="lazy" className="size-9 rounded-full object-cover sm:size-11" />
                  ) : (
                    <span className="size-9 rounded-full sm:size-11" style={{ background: i ? f.color_secondary : f.color_primary }} />
                  )}
                  {ing}
                </motion.li>
              ))}
            </ul>
          </>
        )}
        {f.tags.length > 0 && (
          <p className="mt-3 flex flex-wrap gap-2 text-xs font-bold text-chocolate/70">
            {f.tags.map((tag) => (
              <span key={tag} className="flex items-center gap-1">
                <TagIcon tag={tag} className="size-4" /> {ui(`filters.${tag}`)}
              </span>
            ))}
          </p>
        )}
        {!f.is_available_today && <p className="mt-2 font-display text-lg font-bold text-cherry">{ui("soldOut")}</p>}
      </div>
    </motion.div>
  );
}

/** Small / medium / large at a glance — the same price in a cone or a cup. */
function PriceStrip() {
  const { data, locale } = useSite();
  const ui = useTranslations("ui");
  const cones = data.prices.filter((p) => p.is_active && p.price_group === "coni" && p.max_scoops).sort((a, b) => a.price_eur - b.price_eur);
  const photos = [PHOTO.scoops.pistacchio, PHOTO.scoops.fragola, PHOTO.scoops["yellow-submarine"], PHOTO.scoops.cioccolato];
  const BG = ["#FFD6E5", "#FFF4BD", "#D2F8EE"];
  if (!cones.length) return null;
  return (
    <div>
      <ul className="flex gap-2">
        {cones.map((c, i) => (
          <motion.li
            key={c.id}
            whileHover={{ y: -4 }}
            className="flex items-end gap-1.5 rounded-2xl py-1.5 pr-3 pl-1.5"
            style={{ background: BG[i % 3] }}
          >
            <PhotoCone small scoops={photos.slice(0, c.max_scoops ?? 1).reverse()} className="h-16 shrink-0 sm:h-20" />
            <div className="pb-0.5">
              <p className="font-display text-sm leading-none font-bold sm:text-base">{ui(`sizes.${c.size ?? "medio"}`)}</p>
              <p className="font-script text-sm leading-tight text-chocolate/65">{ui("nFlavors", { n: c.max_scoops ?? 1 })}</p>
              <RollingPrice value={c.price_eur} locale={locale} className="font-display text-lg leading-none font-bold sm:text-xl" />
            </div>
          </motion.li>
        ))}
      </ul>
      <p className="mt-1 text-right font-script text-base text-chocolate/65">{ui("coneOrCup")}</p>
    </div>
  );
}

/** The filmed scoop (frames from a real clip), played once, in a scoop-shaped frame; the flavor's own scoop lands on top. */
function ScoopClip({ color, photo }: { color: string; photo: string | null }) {
  const seq = useRef<FrameSequenceHandle>(null);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      seq.current?.seek(1);
      setDone(true);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / 2200);
      seq.current?.seek(p);
      if (p < 1) raf = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="relative w-[40%] max-w-[260px] shrink-0">
      <ScoopFrame color={color} className="w-full">
        <FrameSequence ref={seq} base="/seq/scoop" count={60} fit="cover" className="absolute inset-0" />
        <div className="pointer-events-none absolute inset-0 opacity-55 mix-blend-color" style={{ background: color }} />
      </ScoopFrame>
      <AnimatePresence>
        {done && photo && (
          <motion.div
            className="absolute -right-[12%] -bottom-[8%] w-[52%] drop-shadow-[0_10px_10px_rgba(75,42,32,0.3)]"
            initial={{ y: -60, opacity: 0, scaleY: 1.15 }}
            animate={{ y: 0, opacity: 1, scaleY: [1.15, 0.82, 1.05, 1] }}
            transition={{ duration: 0.6, times: [0, 0.55, 0.8, 1] }}
            style={{ transformOrigin: "50% 100%" }}
          >
            <div className="aspect-[5/4]">
              <ScoopImg src={photo} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** One flavor in the menu: a big real scoop sitting on a soft plate in the flavor's color, the name under it. */
function ScoopTile({ flavor: f, locale, index, selected, onPick }: { flavor: Flavor; locale: Locale; index: number; selected: boolean; onPick: () => void }) {
  const ui = useTranslations("ui");
  const soldOut = !f.is_available_today;
  const badge = badgeOf(f, ui);
  return (
    <motion.button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`${badge ? `${badge}: ` : ""}${t(f.name, locale)}${soldOut ? ` — ${ui("soldOut")}` : ""}`}
      whileTap={{ scale: 0.94 }}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: Math.min(index, 8) * 0.04 }}
      className={`group relative block w-full text-center ${soldOut ? "opacity-60 saturate-50" : ""}`}
    >
      <span className="relative block aspect-square">
        <span className="absolute inset-x-[6%] top-[10%] bottom-0 rounded-full transition-transform duration-500 ease-(--ease-gelato) group-hover:scale-105" style={{ background: `radial-gradient(circle at 50% 35%, #fff, ${lighten(f.color_primary, 0.45)})` }} aria-hidden />
        <img src={thumb(scoopPhoto(f))!} alt="" loading="lazy" decoding="async" draggable={false} className="absolute bottom-[8%] left-1/2 w-[96%] -translate-x-1/2 transition-transform duration-500 ease-(--ease-gelato) group-hover:-translate-y-[6%]" />
        {badge && (
          <span className="absolute top-0 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-chocolate px-2.5 py-1 text-[10px] font-bold tracking-wider whitespace-nowrap text-cream uppercase">
            <Sparkle weight="fill" className="size-3 text-lemon" /> {badge}
          </span>
        )}
      </span>
      <span className={`mt-2 block font-display text-base leading-tight sm:text-xl ${soldOut ? "line-through" : ""}`}>{t(f.name, locale)}</span>
      {soldOut && <span className="block text-xs font-bold tracking-wider text-cherry uppercase">{ui("soldOut")}</span>}
    </motion.button>
  );
}
