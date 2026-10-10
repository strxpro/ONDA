"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowCounterClockwise, Eye, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useAnimationControls, useSpring } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { lighten } from "@/lib/color";
import { ingredientPhoto } from "@/lib/ingredients";
import { sfx } from "@/lib/sound";
import { t, type Flavor, type Locale } from "@/lib/shared";
import { Cup } from "../ice/Cup";
import { PHOTO, photoGeometry, ScoopImg, scoopPhoto, thumb } from "../ice/PhotoStack";
import { Scoop, SCOOP_BODY } from "../ice/Scoop";
import { useSite } from "../providers/SiteData";
import { RollingPrice } from "../ui/RollingPrice";
import { Title } from "../ui/Title";

const SIZES = ["piccolo", "medio", "grande"] as const;
const OPEN_EVENT = "onda:build";

/** Open the builder pop-out from anywhere; it grows out of (x, y) — usually the clicked button. */
export const openBuilder = (x?: number, y?: number) => window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: { x, y } }));
type Lenis = { stop(): void; start(): void };
const lenis = () => (window as unknown as { __lenis?: Lenis }).__lenis;
type Pick = { key: number; id: string };

/**
 * "Crea il tuo cono" as a pop-out: it opens from the "build your own" ad (any link to #build) with a circular
 * reveal from the click, over the whole screen. Choose size and cone/cup, tap the flavors, and each scoop
 * drops onto the cone, squashes and settles. Esc / ✕ closes it.
 */
export function Configurator() {
  const { data, locale } = useSite();
  const ui = useTranslations("ui");
  const s = data.settings;
  const [size, setSize] = useState<(typeof SIZES)[number]>("medio");
  const [kind, setKind] = useState<"coni" | "coppette">("coni");
  const available = data.flavors.filter((f) => f.is_available_today);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [showCard, setShowCard] = useState(false);
  const [mounted, setMounted] = useState(false);
  const stack = useAnimationControls();
  const [open, setOpen] = useState(false);
  const [origin, setOrigin] = useState({ x: 0, y: 0 });
  useEffect(() => setMounted(true), []);

  // open on the event, or on any click on a link to #build
  useEffect(() => {
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ x?: number; y?: number }>).detail ?? {};
      setOrigin({ x: d.x ?? window.innerWidth / 2, y: d.y ?? window.innerHeight / 2 });
      sfx.whoosh();
      setOpen(true);
    };
    const onClick = (e: MouseEvent) => {
      const a = (e.target as Element | null)?.closest?.('a[href="#build"]');
      if (!a) return;
      e.preventDefault();
      openBuilder(e.clientX, e.clientY);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener(OPEN_EVENT, onOpen);
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // while open: no page scroll behind, Esc closes; every scoop photo is warmed up so drops never wait
  useEffect(() => {
    if (!open) return;
    available.forEach((f) => {
      const img = new Image();
      img.src = scoopPhoto(f);
    });
    const html = document.documentElement;
    html.style.overflow = "hidden";
    lenis()?.stop();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !showCard && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => {
      html.style.overflow = "";
      lenis()?.start();
      window.removeEventListener("keydown", esc);
    };
  }, [open, showCard]);

  const item = useMemo(
    () => data.prices.find((p) => p.is_active && p.price_group === kind && p.size === size) ?? data.prices.find((p) => p.is_active && p.price_group === "coni" && p.size === size),
    [data.prices, kind, size],
  );
  const max = item?.max_scoops ?? 3;
  const byId = (id: string) => data.flavors.find((f) => f.id === id);

  // keep picks valid when the size shrinks or a flavor sells out (live updates)
  const availableKey = available.map((f) => f.id).join();
  useEffect(() => setPicks((p) => p.filter((x) => available.some((f) => f.id === x.id)).slice(0, max)), [max, availableKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = (f: Flavor) => {
    if (picks.length >= max) return;
    navigator.vibrate?.(10);
    sfx.pop();
    setPicks((p) => [...p, { key: Date.now() + Math.random(), id: f.id }]);
    // the whole stack gives a little when the scoop lands
    window.setTimeout(() => {
      sfx.plop();
      stack.start({ scaleY: [1, 0.96, 1.01, 1], transition: { duration: 0.45, ease: "easeOut" } });
      if (picks.length + 1 === max) window.setTimeout(sfx.sparkle, 380);
    }, 380);
  };
  const remove = (key: number) => setPicks((p) => p.filter((x) => x.key !== key));
  /** tap the gelato: it jiggles like jelly */
  const jiggle = () => {
    sfx.plop();
    stack.start({ scaleX: [1, 1.08, 0.95, 1.03, 1], scaleY: [1, 0.92, 1.05, 0.98, 1], rotate: [0, -3, 2.5, -1, 0], transition: { duration: 0.7, ease: "easeOut" } });
  };
  // the stack leans toward the pointer
  const tiltX = useSpring(0, { stiffness: 120, damping: 12 });
  const lean = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    tiltX.set(((e.clientX - r.left) / r.width - 0.5) * 14);
  };
  // the real ingredients of the picked flavors, floating around the cone in bubbles
  const bubbles = [...new Map(picks.flatMap((p) => t(byId(p.id)?.ingredients, locale).split(",").map((x) => x.trim()).filter(Boolean)).map((x) => [x.toLowerCase(), x])).values()].slice(0, 5);

  if (!item) return null;

  if (!mounted) return null;
  const circle = (r: string) => `circle(${r} at ${origin.x}px ${origin.y}px)`;

  return createPortal(
    <>
    <AnimatePresence>
      {open && (
        <motion.div
          key="builder"
          role="dialog"
          aria-modal="true"
          aria-label={t(s.texts.configurator_title, locale)}
          className="fixed inset-0 z-[85] overflow-y-auto overscroll-contain bg-[radial-gradient(80%_70%_at_15%_10%,#E6DCFF,transparent_70%),radial-gradient(70%_70%_at_90%_90%,#FFD3E3,transparent_70%)] bg-cream"
          initial={{ clipPath: circle("0px") }}
          animate={{ clipPath: circle("150vmax") }}
          exit={{ clipPath: circle("0px") }}
          transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={ui("close")}
            className="fixed top-4 right-4 z-10 grid size-12 place-items-center rounded-full bg-white shadow-soft transition-transform duration-500 ease-(--ease-gelato) hover:rotate-90 sm:top-6 sm:right-6"
          >
            <X weight="bold" className="size-5" />
          </button>
          <motion.div
            id="build"
            className="relative mx-auto flex min-h-full w-full max-w-6xl flex-col justify-center py-14"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.35, duration: 0.7, ease: [0.16, 1, 0.3, 1] } }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
          >
      <div className="relative w-full px-(--gutter)">
        <Title color="#9B8CFF">{t(s.texts.configurator_title, locale)}</Title>
      </div>
      <div className="relative mt-2 grid w-full items-center gap-3 px-(--gutter) md:mt-4 md:grid-cols-[0.9fr_1.1fr] md:gap-12 [&>*]:min-w-0">
        {/* the stage */}
        <div className="relative flex justify-center py-2 md:py-4" onPointerMove={lean} onPointerLeave={() => tiltX.set(0)}>
          <div className="absolute bottom-3 left-1/2 h-6 w-[40%] -translate-x-1/2 rounded-[50%] bg-chocolate/10 blur-md" aria-hidden />
          <motion.div style={{ rotate: tiltX, transformOrigin: "50% 100%" }} className="relative">
            <motion.div animate={stack} style={{ transformOrigin: "50% 100%" }} className="relative cursor-pointer" onClick={jiggle}>
              <ConeStack picks={picks} max={max} kind={kind} byId={byId} onRemove={remove} />
            </motion.div>
          </motion.div>
          {/* ingredient bubbles: drag them around, they float back */}
          <AnimatePresence>
            {bubbles.map((name, i) => (
              <motion.div
                key={name}
                drag
                dragSnapToOrigin
                dragElastic={0.6}
                whileDrag={{ scale: 1.15, cursor: "grabbing" }}
                onDragStart={() => sfx.pop()}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 14 }}
                className="absolute z-20 w-[clamp(50px,13vw,96px)] cursor-grab touch-none"
                style={{ left: ["4%", "74%", "0%", "78%", "-2%"][i], top: ["8%", "12%", "50%", "62%", "78%"][i] }}
              >
                <motion.div className="flex flex-col items-center" animate={{ y: [0, -8, 0] }} transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, ease: "easeInOut" }}>
                  <span className="relative block aspect-square w-full overflow-hidden rounded-full border-4 border-white bg-white shadow-soft">
                    {ingredientPhoto(name) ? <img src={ingredientPhoto(name, 200)!} alt="" draggable={false} className="h-full w-full object-cover" /> : <span className="block h-full w-full bg-pink-soft" />}
                    <span className="pointer-events-none absolute top-[12%] left-[18%] h-[14%] w-[26%] -rotate-30 rounded-full bg-white/70" />
                  </span>
                  <span className="-mt-2 rounded-full bg-white px-2 py-0.5 font-script text-base whitespace-nowrap capitalize shadow-sm">{name}</span>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* the controls */}
        <div>
          <div className="flex flex-nowrap items-center gap-2 md:flex-wrap md:gap-3">
            <Segmented
              value={size}
              onChange={(v) => setSize(v as (typeof SIZES)[number])}
              options={SIZES.map((sz) => {
                const p = data.prices.find((x) => x.is_active && x.price_group === kind && x.size === sz);
                return { value: sz, label: ui(`sizes.${sz}`), sub: p ? <RollingPrice value={p.price_eur} locale={locale} /> : null };
              })}
            />
            <Segmented
              value={kind}
              onChange={(v) => setKind(v as "coni" | "coppette")}
              options={[
                { value: "coni", label: ui("cone"), sub: null },
                { value: "coppette", label: ui("cup"), sub: null },
              ]}
            />
          </div>

          <p className="mt-3 font-script text-lg md:mt-6 md:text-xl text-chocolate/70 sm:text-2xl">
            {ui("pickUpTo", { n: max })} · {picks.length}/{max}
          </p>
          <ul className="no-scrollbar -mx-(--gutter) mt-2 grid snap-x auto-cols-[22%] grid-flow-col grid-rows-2 gap-x-2 gap-y-3 overflow-x-auto px-(--gutter) pb-1 md:mx-0 md:auto-cols-auto md:grid-flow-row md:grid-cols-5 md:grid-rows-none md:gap-x-3 md:overflow-visible md:px-0 lg:grid-cols-6">
            {available.map((f) => (
              <li key={f.id} className="shrink-0">
                <FlavorBall flavor={f} locale={locale} disabled={picks.length >= max} onAdd={() => add(f)} />
              </li>
            ))}
          </ul>

          <div className="mt-3 flex flex-wrap items-center gap-3 md:mt-6 md:gap-4">
            <RollingPrice value={item.price_eur} locale={locale} className="font-display text-4xl font-bold md:text-5xl lg:text-6xl" />
            <button type="button" disabled={!picks.length} onClick={() => setShowCard(true)} className="btn-candy bg-pink disabled:opacity-40">
              <Eye weight="duotone" className="size-6" /> {ui("showAtCounter")}
            </button>
            <AnimatePresence>
              {picks.length > 0 && (
                <motion.button
                  type="button"
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  onClick={() => (sfx.whoosh(), setPicks([]))}
                  aria-label={ui("reset")}
                  title={ui("reset")}
                  className="grid size-12 place-items-center rounded-full bg-white shadow-soft transition-transform hover:-rotate-90"
                >
                  <ArrowCounterClockwise weight="bold" className="size-5" />
                </motion.button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
          <AnimatePresence>
            {showCard && (
              <motion.div className="fixed inset-0 z-[95] grid place-items-center bg-chocolate/40 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCard(false)} role="dialog" aria-modal="true">
                <motion.div
                  className="relative max-h-[92svh] w-full max-w-sm overflow-y-auto overscroll-contain rounded-[2.5rem] bg-cream px-5 pt-14 pb-6 text-center shadow-float sm:p-6 sm:pt-14"
                  data-lenis-prevent
                  /* above the builder pop-out */
                  initial={{ y: 200, scale: 0.7 }}
                  animate={{ y: 0, scale: 1 }}
                  exit={{ y: 200, scale: 0.7, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 22 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button type="button" onClick={() => setShowCard(false)} aria-label={ui("close")} className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-white shadow-soft transition-transform hover:rotate-90">
                    <X weight="bold" className="size-5" />
                  </button>
                  <p className="font-display text-2xl font-bold sm:text-3xl">
                    {ui(`sizes.${size}`)} · {kind === "coni" ? ui("cone") : ui("cup")}
                  </p>
                  <div className="my-4 flex justify-center">
                    <ConeStack picks={picks} max={max} kind={kind} byId={byId} small />
                  </div>
                  <ol className="space-y-0.5 font-display text-xl font-semibold">
                    {picks.map((p, i) => (
                      <li key={p.key}>
                        {i + 1}. {t(byId(p.id)?.name, locale)}
                      </li>
                    ))}
                  </ol>
                  <RollingPrice value={item.price_eur} locale={locale} className="mt-3 font-display text-5xl font-bold" />
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
    </>,
    document.body,
  );
}

/** The cone (or cup) with the picked scoops; each new one drops in from above. */
function ConeStack({ picks, max, kind, byId, onRemove, small = false }: { picks: Pick[]; max: number; kind: "coni" | "coppette"; byId: (id: string) => Flavor | undefined; onRemove?: (key: number) => void; small?: boolean }) {
  const geo = photoGeometry(Math.max(max, 1), { cup: kind === "coppette", cherry: true });
  return (
    <div
      className="relative"
      style={{
        aspectRatio: geo.aspect,
        // the whole stack (max scoops + cherry) always fits: phones ~30% of the screen height, desktop ~62%
        width: small ? "9rem" : `min(34vw, calc(var(--stack-h) / ${geo.aspect.split("/")[1].trim()}), 300px)`,
      }}
    >
      <div className="absolute" style={geo.cone}>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.div key={kind} initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ type: "spring", stiffness: 240, damping: 20 }}>
            {kind === "coppette" ? <Cup className="block w-full" /> : <img src={PHOTO.cone} alt="" className="block w-full" draggable={false} />}
          </motion.div>
        </AnimatePresence>
      </div>
      {/* empty slots: dashed scoops waiting to be filled */}
      {!small &&
        Array.from({ length: Math.max(0, max - picks.length) }, (_, k) => picks.length + k).map((i) => (
          <svg key={`slot-${i}`} viewBox="0 0 200 190" className="pointer-events-none absolute" style={{ ...geo.scoop(i), left: "9%", width: "82%", height: "auto", aspectRatio: "200 / 190", zIndex: 1 }} aria-hidden>
            <path d={SCOOP_BODY} fill="rgba(155,140,255,0.08)" stroke="rgba(75,42,32,0.22)" strokeWidth="3" strokeDasharray="10 9" strokeLinecap="round" />
            {i === picks.length && <path d="M100 52 V108 M72 80 H128" stroke="rgba(75,42,32,0.3)" strokeWidth="7" strokeLinecap="round" />}
          </svg>
        ))}
      <AnimatePresence>
        {picks.map((p, i) => {
          const f = byId(p.id);
          if (!f) return null;
          const photo = scoopPhoto(f);
          return (
            <motion.button
              key={p.key}
              type="button"
              onClick={() => onRemove?.(p.key)}
              aria-label={`− ${f.slug}`}
              className="absolute"
              style={{ ...geo.scoop(i), transformOrigin: "50% 92%" }}
              initial={small ? false : { y: "-140%", opacity: 0, scaleY: 1.15, scaleX: 0.9 }}
              animate={{ y: 0, opacity: 1, scaleY: [1.15, 1.15, 0.78, 1.04, 1], scaleX: [0.9, 0.9, 1.15, 0.98, 1] }}
              exit={{ y: "-30%", scale: 0.6, opacity: 0, transition: { duration: 0.22 } }}
              transition={{ y: { duration: 0.42, ease: [0.5, 0, 0.9, 0.5] }, opacity: { duration: 0.1 }, scaleY: { duration: 0.9, times: [0, 0.45, 0.55, 0.75, 1] }, scaleX: { duration: 0.9, times: [0, 0.45, 0.55, 0.75, 1] } }}
              whileHover={onRemove ? { y: -4 } : undefined}
            >
              {photo ? <ScoopImg src={photo} className="drop-shadow-[0_8px_8px_rgba(75,42,32,0.2)]" /> : <Scoop color={f.color_primary} color2={f.color_secondary} texture={f.scoop_texture} className="absolute bottom-0 block w-full" />}
            </motion.button>
          );
        })}
      </AnimatePresence>
      {/* full? a cherry on top */}
      <AnimatePresence>
        {picks.length === max && max > 0 && (
          <motion.img
            key="cherry"
            src={PHOTO.cherry}
            alt=""
            draggable={false}
            className="pointer-events-none absolute z-40"
            style={geo.cherry(max)}
            initial={{ y: "-300%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-60%", opacity: 0, transition: { duration: 0.2 } }}
            transition={{ y: { type: "spring", stiffness: 260, damping: 11, delay: 0.5 }, opacity: { delay: 0.5, duration: 0.1 } }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/** A round flavor button: the real scoop in a colored circle, name below. */
function FlavorBall({ flavor: f, locale, disabled, onAdd }: { flavor: Flavor; locale: Locale; disabled: boolean; onAdd: () => void }) {
  const photo = scoopPhoto(f);
  return (
    <motion.button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      whileHover={disabled ? undefined : { y: -4 }}
      whileTap={disabled ? undefined : { scale: 0.9 }}
      data-cursor-color={f.color_primary}
      className="flex w-full snap-start flex-col items-center gap-1 disabled:opacity-40"
    >
      <span className="grid aspect-square w-full place-items-center rounded-full p-1.5 shadow-soft" style={{ background: `radial-gradient(circle at 50% 35%, #fff, ${lighten(f.color_primary, 0.45)})` }}>
        {photo ? <ScoopImg src={thumb(photo)!} className="h-auto" /> : <Scoop color={f.color_primary} color2={f.color_secondary} texture={f.scoop_texture} className="w-full" />}
      </span>
      <span className="text-center line-clamp-2 font-display text-xs leading-tight md:text-sm">{t(f.name, locale)}</span>
    </motion.button>
  );
}

/** Pill segmented control with a sliding thumb. */
function Segmented({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { value: string; label: string; sub: React.ReactNode }[] }) {
  const id = options.map((o) => o.value).join("-");
  return (
    <div className="flex rounded-full bg-white p-1 shadow-soft" role="radiogroup">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`relative rounded-full px-2.5 py-1.5 text-center md:px-4 md:py-2 transition-colors lg:px-5 ${value === o.value ? "text-cream" : "text-chocolate"}`}
        >
          {value === o.value && <motion.span layoutId={`seg-${id}`} className="absolute inset-0 rounded-full bg-chocolate" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
          <span className="relative block font-display text-sm font-semibold md:text-base lg:text-lg">{o.label}</span>
          {o.sub && <span className={`relative block text-xs font-bold ${value === o.value ? "text-cream/75" : "text-chocolate/55"}`}>{o.sub}</span>}
        </button>
      ))}
    </div>
  );
}

