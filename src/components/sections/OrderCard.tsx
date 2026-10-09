"use client";

 
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

const MAX_FLAVORS = 4;

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

function OrderForm({ onClose }: { onClose: () => void }) {
  useScrollLock();
  const { data, locale } = useSite();
  const ui = useTranslations("ui.order");
  const items = data.prices.filter((p) => p.is_active && (p.price_group === "vaschette" || p.price_group === "delizie"));
  const flavors = data.flavors.filter((f) => f.is_available_today);
  const [item, setItem] = useState(items[0]?.id ?? "");
  const [picked, setPicked] = useState<string[]>([]);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const openedAt = useRef(Date.now());
  const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const isTub = items.find((p) => p.id === item)?.price_group === "vaschette";

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const toggle = (slug: string) => {
    sfx.pop();
    setPicked((p) => (p.includes(slug) ? p.filter((x) => x !== slug) : p.length < MAX_FLAVORS ? [...p, slug] : p));
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const label = t(items.find((p) => p.id === item)?.label ?? { it: "" }, "it");
    const names = picked.map((slug) => t(flavors.find((x) => x.slug === slug)?.name ?? { it: slug }, "it"));
    setState("sending");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          phone: f.get("phone"),
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
    <motion.div className="fixed inset-0 z-[96] grid place-items-center bg-chocolate/40 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={ui("formTitle")}>
      <motion.div
        data-lenis-prevent
        className="relative max-h-[92svh] w-full max-w-lg overflow-y-auto overscroll-contain rounded-[2rem] bg-cream p-6 shadow-float"
        initial={{ y: 120, scale: 0.85, rotate: -4 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        exit={{ y: 120, scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="×" className="absolute top-4 right-4 grid size-10 place-items-center rounded-full bg-white transition-transform hover:rotate-90">
          <X weight="bold" className="size-5" />
        </button>
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
            <div>
              <p className="font-script text-xl text-chocolate/70">{ui("what")}</p>
              <div className="mt-1 flex flex-wrap gap-2">
                {items.map((p) => (
                  <button key={p.id} type="button" onClick={() => (sfx.pop(), setItem(p.id))} aria-pressed={item === p.id} className={`rounded-full px-4 py-2 text-sm font-bold transition-colors ${item === p.id ? "bg-chocolate text-cream" : "bg-white text-chocolate/80"}`}>
                    {t(p.label, locale)}
                    {p.price_eur > 0 && <span className="ml-1.5 opacity-70">{p.price_eur.toLocaleString(locale, { style: "currency", currency: "EUR" })}</span>}
                  </button>
                ))}
              </div>
            </div>
            {isTub && (
              <div>
                <p className="font-script text-xl text-chocolate/70">{ui("flavors")}</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {flavors.map((fl) => {
                    const on = picked.includes(fl.slug);
                    return (
                      <motion.button key={fl.id} type="button" whileTap={{ scale: 0.85 }} onClick={() => toggle(fl.slug)} aria-pressed={on} title={t(fl.name, locale)} className={`grid size-14 place-items-center rounded-full p-1.5 transition-transform ${on ? "scale-110 ring-4 ring-chocolate" : ""}`} style={{ background: lighten(fl.color_primary, 0.4) }}>
                        <ScoopImg src={thumb(scoopPhoto(fl))!} />
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
            </div>
            <textarea name="notes" maxLength={400} rows={2} placeholder={ui("notes")} className={`${field} resize-none font-semibold`} />
            <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
            {state === "error" && <p className="font-bold text-cherry">{ui("error")}</p>}
            <button type="submit" disabled={state === "sending" || !item} className="btn-candy w-full justify-center bg-lemon disabled:opacity-50">
              <PaperPlaneTilt weight="duotone" className="size-6" /> {ui("send")}
            </button>
          </form>
        )}
      </motion.div>
    </motion.div>
  );
}
