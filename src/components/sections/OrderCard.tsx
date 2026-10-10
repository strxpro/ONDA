"use client";

/* eslint-disable @next/next/no-img-element */

 
import { CalendarCheck, Check, PaperPlaneTilt, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lighten } from "@/lib/color";
import { sfx } from "@/lib/sound";
import { t } from "@/lib/shared";
import { ScoopImg, scoopPhoto, thumb } from "../ice/PhotoStack";
import { useSite } from "../providers/SiteData";
import { RollingPrice } from "../ui/RollingPrice";
import { useScrollLock } from "../ui/useScrollLock";

const CUSTOM = "custom";
const MIN_G = 250;
const MAX_G = 3000;
/** "Vaschetta 500 g" → 500, "Vaschetta 1 kg" → 1000. */
function gramsOf(label: string) {
  const kg = /(\d+(?:[.,]\d+)?)\s*kg/i.exec(label);
  if (kg) return Math.round(parseFloat(kg[1].replace(",", ".")) * 1000);
  const g = /(\d+)\s*g\b/i.exec(label);
  return g ? Number(g[1]) : null;
}
/** How many flavors fit: up to 500 g → 4, up to 1 kg → 6, more → 8. */
const maxFlavors = (grams: number | null) => (grams == null ? 4 : grams <= 500 ? 4 : grams <= 1000 ? 6 : 8);

/** "YYYY-MM-DD" + "HH:MM" in Sardinia → ISO with the right offset (summer/winter time). */
function romeISO(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", timeZoneName: "longOffset" }).formatToParts(guess).find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  return `${date}T${time}:00${tz.replace("GMT", "") || "+00:00"}`;
}

/**
 * Gelato to take home: the tubs by weight with big prices, and "Prenota" — a short form that sends the order to the
 * owner on Telegram (✅ / ❌) and WhatsApp. Nothing is paid online: you pay when you pick it up.
 */
export function OrderCard() {
  const { data, locale } = useSite();
  const ui = useTranslations("ui.order");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const tubs = data.prices.filter((p) => p.is_active && p.price_group === "vaschette").sort((a, b) => a.price_eur - b.price_eur);
  if (!tubs.length) return null;

  return (
    <div className="relative mt-16 overflow-hidden rounded-[2.5rem] bg-[linear-gradient(125deg,#D2F8EE,#FFF4BD_55%,#FFD6E5)] p-6 shadow-[0_30px_60px_-30px_rgba(75,42,32,0.45)] sm:p-10">
      <span className="pointer-events-none absolute -right-16 -bottom-20 size-72 rounded-full bg-white/50 blur-3xl" aria-hidden />
      <div className="relative grid items-center gap-8 md:grid-cols-[1.1fr_1fr]">
        <div>
          <h3 className="font-display text-4xl leading-[1.02] sm:text-6xl">{ui("title")}</h3>
          <p className="mt-3 max-w-md text-base font-semibold text-chocolate/75 sm:text-lg">{ui("subtitle")}</p>
          <motion.button type="button" whileHover={{ scale: 1.04, rotate: -1 }} whileTap={{ scale: 0.95 }} onClick={() => (sfx.whoosh(), setOpen(true))} className="btn-candy mt-6 bg-chocolate text-cream">
            <CalendarCheck weight="duotone" className="size-6" /> {ui("cta")}
          </motion.button>
        </div>
        <ul className="grid gap-3">
          {tubs.map((p, i) => (
            <motion.li
              key={p.id}
              initial={{ opacity: 0, x: 40 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 160, damping: 18, delay: i * 0.08 }}
              className="flex items-center justify-between gap-4 rounded-3xl bg-white/85 px-5 py-4 shadow-soft"
            >
              <span className="font-display text-2xl leading-tight sm:text-3xl">{t(p.label, locale)}</span>
              <RollingPrice value={p.price_eur} locale={locale} className="font-display text-3xl font-bold whitespace-nowrap sm:text-5xl" />
            </motion.li>
          ))}
        </ul>
      </div>
      {mounted && createPortal(<AnimatePresence>{open && <OrderForm onClose={() => setOpen(false)} />}</AnimatePresence>, document.body)}
    </div>
  );
}

/** The pre-order form; `embedded` = inside another pop-up (the shop's contact card): no overlay of its own. */
export function OrderForm({ onClose, embedded = false }: { onClose: () => void; embedded?: boolean }) {
  useScrollLock(!embedded);
  const { data, locale } = useSite();
  const ui = useTranslations("ui.order");
  const items = data.prices.filter((p) => p.is_active && p.price_group === "vaschette");
  const flavors = data.flavors.filter((f) => f.is_available_today);
  const [item, setItem] = useState(items[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [grams, setGrams] = useState(750);
  // price per kilo from the 1 kg tub (else the biggest tub), for "su misura"
  const tubs = items.filter((p) => p.price_group === "vaschette").map((p) => ({ p, g: gramsOf(t(p.label, "it")) })).filter((x) => x.g);
  const ref = tubs.sort((a, b) => Math.abs(1000 - a.g!) - Math.abs(1000 - b.g!))[0];
  const perKg = ref ? (ref.p.price_eur / ref.g!) * 1000 : 0;
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const openedAt = useRef(Date.now());
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const current = items.find((p) => p.id === item);
  const isCustom = item === CUSTOM;
  const isTub = isCustom || current?.price_group === "vaschette";
  const tubGrams = isCustom ? grams : current ? gramsOf(t(current.label, "it")) : null;
  const MAX_FLAVORS = maxFlavors(tubGrams);
  const customPrice = Math.round(perKg * (grams / 1000) * 10) / 10;

  useEffect(() => {
    if (embedded) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose, embedded]);

  const toggle = (slug: string) => {
    sfx.pop();
    setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : p.length < MAX_FLAVORS ? [...p, slug] : p));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const label = isCustom ? `Vaschetta su misura ${grams} g (~${customPrice.toFixed(2)} €)` : t(current?.label ?? { it: "" }, "it");
    const names = picked.map((slug) => t(flavors.find((x) => x.slug === slug)?.name ?? { it: slug }, "it"));
    setState("sending");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          phone: f.get("phone"),
          email: String(f.get("email") ?? "") || undefined,
          items: `${label}${names.length ? ` — ${names.join(", ")}` : ""}`,
          pickup_at: romeISO(String(f.get("date")), String(f.get("time"))),
          notes: String(f.get("notes") ?? "") || undefined,
          locale,
          website: f.get("website") || undefined,
          elapsed: Date.now() - openedAt.current,
        }),
      });
      if (!res.ok) throw new Error();
      sfx.sparkle();
      setState("done");
    } catch {
      setState("error");
    }
  };

  const field = "w-full rounded-2xl border-2 border-chocolate/10 bg-white px-4 py-3 font-bold outline-none focus:border-pink";
  return (
    <motion.div className={embedded ? "contents" : "fixed inset-0 z-[96] grid place-items-center bg-chocolate/40 p-4 backdrop-blur-md"} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={embedded ? undefined : onClose} role={embedded ? undefined : "dialog"} aria-modal={embedded ? undefined : true} aria-label={ui("formTitle")}>
      <motion.div
        data-lenis-prevent
        className={embedded ? "relative w-full" : "relative max-h-[92svh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[2rem] bg-cream p-6 shadow-float"}
        initial={embedded ? { y: 30, opacity: 0 } : { y: 120, scale: 0.85, rotate: -4 }}
        animate={embedded ? { y: 0, opacity: 1 } : { y: 0, scale: 1, rotate: 0 }}
        exit={{ y: 120, scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        {!embedded && (
          <button type="button" onClick={onClose} aria-label="×" className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white transition-transform hover:rotate-90">
            <X weight="bold" className="size-5" />
          </button>
        )}
        {state === "done" ? (
          <div className="py-10 text-center">
            <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 10 }} className="mx-auto grid size-20 place-items-center rounded-full bg-[#4FA845] text-white">
              <Check weight="bold" className="size-10" />
            </motion.div>
            <p className="mt-4 font-display text-2xl font-bold">{ui("thanks")}</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h3 className="pr-10 font-display text-3xl font-bold">{ui("formTitle")}</h3>
            {/* "what shall I prepare?": the sizes follow you while you scroll the form */}
            <div className="sticky z-[5] -mx-2 rounded-2xl bg-cream/95 px-2 pt-1 pb-3 backdrop-blur" style={{ top: "var(--sticky-top, 0px)" }}>
              <p className="font-script text-xl text-chocolate/70">{ui("what")}</p>
              <div className="mt-3 flex flex-wrap gap-x-2 gap-y-4">
                {items.map((p) => {
                  const n = maxFlavors(gramsOf(t(p.label, "it")));
                  const on = item === p.id;
                  return (
                    <button key={p.id} type="button" onClick={() => (sfx.pop(), setItem(p.id), setPicked((x) => x.slice(0, n)))} aria-pressed={on} className={`relative rounded-full px-4 py-2 text-sm font-bold transition-colors ${on ? "bg-chocolate text-cream" : "bg-white text-chocolate/80"}`}>
                      {/* how many flavors fit: a scoop and the number, right above the price */}
                      <span className={`absolute -top-3 right-3 flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-black shadow-sm ${on ? "bg-lemon text-chocolate" : "bg-chocolate text-cream"}`}>
                        <img src="/img/ice/sm/fragola.webp" alt="" className="size-4 object-contain" />
                        {n}
                      </span>
                      {t(p.label, locale)}
                      {p.price_eur > 0 && <span className="ml-1.5 opacity-70">{p.price_eur.toLocaleString(locale, { style: "currency", currency: "EUR" })}</span>}
                    </button>
                  );
                })}
                {perKg > 0 && (
                  <button type="button" onClick={() => (sfx.pop(), setItem(CUSTOM))} aria-pressed={isCustom} className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${isCustom ? "bg-chocolate text-cream" : "bg-white text-chocolate/80"}`}>
                    {ui("custom")}
                  </button>
                )}
              </div>
              <AnimatePresence initial={false}>
                {isCustom && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ type: "spring", stiffness: 260, damping: 30 }} className="overflow-hidden">
                    <WeightPicker grams={grams} onChange={(g) => (setGrams(g), setPicked((x) => x.slice(0, maxFlavors(g))))} price={customPrice} locale={locale} />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {isTub && (
              <div>
                <p className="flex items-baseline justify-between font-script text-xl text-chocolate/70">
                  {ui("flavors", { n: MAX_FLAVORS })}
                  <span className="font-sans text-sm font-bold">
                    {picked.length}/{MAX_FLAVORS}
                  </span>
                </p>
                <div className="mt-2 grid grid-cols-5 gap-x-1.5 gap-y-3">
                  {flavors.map((fl) => {
                    const on = picked.includes(fl.slug);
                    const full = !on && picked.length >= MAX_FLAVORS;
                    return (
                      <motion.button key={fl.id} type="button" whileTap={{ scale: 0.88 }} onClick={() => toggle(fl.slug)} aria-pressed={on} disabled={full} className={`flex flex-col items-center gap-1 transition-opacity ${full ? "opacity-35" : ""}`}>
                        <span className={`grid aspect-square w-full place-items-center rounded-full p-1.5 transition-transform duration-300 ${on ? "scale-105 ring-[3px] ring-chocolate" : ""}`} style={{ background: lighten(fl.color_primary, 0.4) }}>
                          <ScoopImg src={thumb(scoopPhoto(fl))!} />
                        </span>
                        <span className={`max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] leading-tight font-bold sm:text-xs ${on ? "bg-chocolate text-cream" : "bg-white text-chocolate/80"}`}>{t(fl.name, locale)}</span>
                      </motion.button>
                    );
                  })}
                </div>
                {picked.length > 0 && <p className="mt-1 text-sm font-bold text-chocolate/70">{picked.map((slug) => t(flavors.find((x) => x.slug === slug)!.name, locale)).join(" · ")}</p>}
              </div>
            )}
            <div>
              <p className="font-script text-xl text-chocolate/70">{ui("when")}</p>
              <div className="mt-1 grid grid-cols-[1.4fr_1fr] gap-2">
                <input name="date" type="date" required min={today} defaultValue={today} className={field} />
                <input name="time" type="time" required step={900} defaultValue="18:00" className={field} />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <input name="name" required maxLength={60} placeholder={ui("name")} autoComplete="given-name" className={field} />
              <input name="phone" required type="tel" maxLength={30} placeholder={ui("phone")} autoComplete="tel" className={field} />
              <input name="email" type="email" maxLength={120} placeholder={ui("email")} autoComplete="email" className={`${field} sm:col-span-2`} />
            </div>
            <textarea name="notes" maxLength={400} rows={2} placeholder={ui("notes")} className={`${field} resize-none font-semibold`} />
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            {state === "error" && <p className="font-bold text-cherry">{ui("error")}</p>}
            <button type="submit" disabled={state === "sending" || !item} className="btn-candy w-full justify-center bg-lemon disabled:opacity-90">
              {state === "sending" ? (
                <span className="flex h-6 items-center gap-1.5" aria-label="…">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="block size-2.5 rounded-full bg-chocolate" animate={{ y: [0, -8, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.12, ease: "easeInOut" }} />
                  ))}
                </span>
              ) : (
                <>
                  <PaperPlaneTilt weight="duotone" className="size-6" /> {ui("send")}
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}

/**
 * "Su misura": a weight slider in 50 g steps. Above it a small bar ladder like a price filter: each bar is how often
 * people pre-order that weight (real orders, /api/reservations/stats) — the most chosen weight is the tallest.
 * Until there are orders, the 1 kg tub (the classic) leads. The bars up to the chosen weight light up.
 */
function WeightPicker({ grams, onChange, price, locale }: { grams: number; onChange: (g: number) => void; price: number; locale: string }) {
  const ui = useTranslations("ui.order");
  const steps = Array.from({ length: (MAX_G - MIN_G) / 250 + 1 }, (_, i) => MIN_G + i * 250);
  const [counts, setCounts] = useState<number[] | null>(null);
  useEffect(() => {
    fetch("/api/reservations/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setCounts(d.buckets))
      .catch(() => {});
  }, []);
  // a gentle prior around 1 kg gives the ladder a shape before the first orders; real orders quickly dominate
  const score = steps.map((g, i) => (counts?.[i] ?? 0) * 3 + Math.exp(-(((g - 1000) / 600) ** 2)));
  const top = Math.max(...score);
  const best = score.indexOf(top);
  const pct = ((grams - MIN_G) / (MAX_G - MIN_G)) * 100;
  return (
    <div className="mt-3 rounded-3xl bg-white p-4 shadow-soft">
      <div className="flex items-baseline justify-between">
        <span className="font-display text-3xl font-bold tabular-nums">{grams >= 1000 ? `${(grams / 1000).toLocaleString(locale)} kg` : `${grams} g`}</span>
        <span className="font-display text-2xl font-bold tabular-nums">≈ {price.toLocaleString(locale, { style: "currency", currency: "EUR" })}</span>
      </div>
      <div className="relative mt-5 flex h-9 items-end gap-[3px]" aria-hidden>
        {steps.map((g, i) => (
          <motion.span key={g} className="relative flex-1 rounded-t-[4px]" animate={{ backgroundColor: g <= grams ? "#9B8CFF" : "#E7E1F7" }} transition={{ duration: 0.25 }} style={{ height: `${18 + (score[i] / top) * 82}%` }}>
            {i === best && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-black whitespace-nowrap text-[#7a6be0]">★ {ui("popular")}</span>}
          </motion.span>
        ))}
      </div>
      <div className="relative mt-2 h-8">
        <div className="absolute top-1/2 right-0 left-0 h-1.5 -translate-y-1/2 rounded-full bg-[#E7E1F7]" />
        <div className="absolute top-1/2 left-0 h-1.5 -translate-y-1/2 rounded-full bg-[#9B8CFF]" style={{ width: `${pct}%` }} />
        <img src="/img/ice/sm/fragola.webp" alt="" className="pointer-events-none absolute top-1/2 w-10 -translate-x-1/2 -translate-y-[58%] drop-shadow-[0_4px_5px_rgba(75,42,32,0.35)]" style={{ left: `${pct}%` }} />
        <input type="range" min={MIN_G} max={MAX_G} step={50} value={grams} onChange={(e) => onChange(Number(e.target.value))} aria-label={ui("weight")} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" />
      </div>
      <div className="mt-1 flex justify-between text-xs font-bold text-chocolate/50">
        <span>{MIN_G} g</span>
        <span>{ui("perKgNote")}</span>
        <span>{MAX_G / 1000} kg</span>
      </div>
    </div>
  );
}
