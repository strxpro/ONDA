"use client";

 
import { ArrowLeft, ArrowRight, Check, ChatCircleText, PaperPlaneTilt, Phone, WhatsappLogo, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { darken, lighten } from "@/lib/color";
import { sfx } from "@/lib/sound";
import { t, type Flavor } from "@/lib/shared";
import { ScoopImg, scoopPhoto, thumb } from "../ice/PhotoStack";
import { useSite } from "../providers/SiteData";
import { useScrollLock } from "../ui/useScrollLock";

export { CAKE_PHOTOS } from "@/lib/assets";

const SHAPES = ["round", "heart", "square"] as const;
const PEOPLE = [6, 8, 10, 12, 16] as const;
const BASES = { sponge: "#F3D9A4", cocoa: "#6B3F2A", brownie: "#4A2A1C", crumble: "#D9A86C" } as const;
const COATS = { cream: "#FFF8EE", chocolate: "#5A3324", meringue: "#FFF2E0", pink: "#FFB3CB" } as const;
const DECOR = ["strawberries", "berries", "chocolate", "macarons", "wafers", "sprinkles", "candles"] as const;
type Shape = (typeof SHAPES)[number];
type Base = keyof typeof BASES;
type Coat = keyof typeof COATS;
type Decor = (typeof DECOR)[number];
type Cake = { shape: Shape; people: number; base: Base; flavors: string[]; coat: Coat; decor: Decor[]; text: string };
const STEPS = ["shape", "base", "flavors", "coat", "decor", "details"] as const;

/** "YYYY-MM-DD" + "HH:MM" in Sardinia → ISO with the right offset. */
function romeISO(date: string, time: string) {
  const guess = new Date(`${date}T${time}:00Z`);
  const tz = new Intl.DateTimeFormat("en-US", { timeZone: "Europe/Rome", timeZoneName: "longOffset" }).formatToParts(guess).find((p) => p.type === "timeZoneName")?.value ?? "GMT+01:00";
  return `${date}T${time}:00${tz.replace("GMT", "") || "+00:00"}`;
}

/**
 * Order a gelato cake: build your own (a stepper with a live cake that grows layer by layer — shape and size, base,
 * gelato layers from today's flavors, coating, decorations, a message on top) or just get in touch (call, WhatsApp,
 * a short message). Either way the owner gets it on Telegram. Price: confirmed by the shop.
 */
export function CakeOrder({ onClose }: { onClose: () => void }) {
  useScrollLock();
  const { data, locale } = useSite();
  const ui = useTranslations("ui.cake");
  const [tab, setTab] = useState<"build" | "contact">("build");
  const [step, setStep] = useState(0);
  const flavors = data.flavors.filter((f) => f.is_available_today);
  const [cake, setCake] = useState<Cake>({ shape: "round", people: 8, base: "sponge", flavors: flavors.slice(0, 2).map((f) => f.slug), coat: "cream", decor: ["berries"], text: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const openedAt = useRef(Date.now());
  const set = <K extends keyof Cake>(k: K, v: Cake[K]) => (sfx.pop(), setCake((c) => ({ ...c, [k]: v })));
  const bySlug = (slug: string) => flavors.find((f) => f.slug === slug);
  const phone = data.settings.phone?.replace(/[^\d+]/g, "") ?? "";
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const minDate = new Date(Date.now() + 2 * 86_400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });
  const summary = () =>
    [
      `TORTA GELATO · ${ui(`shapes.${cake.shape}`)} · ${cake.people} ${ui("people")}`,
      `${ui("steps.base")}: ${ui(`bases.${cake.base}`)}`,
      `${ui("steps.flavors")}: ${cake.flavors.map((s) => t(bySlug(s)?.name ?? { it: s }, "it")).join(", ") || "—"}`,
      `${ui("steps.coat")}: ${ui(`coats.${cake.coat}`)}`,
      `${ui("steps.decor")}: ${cake.decor.map((d) => ui(`decor.${d}`)).join(", ") || "—"}`,
      cake.text ? `${ui("writing")}: «${cake.text}»` : "",
    ]
      .filter(Boolean)
      .join("\n");

  const send = async (form: HTMLFormElement, items: string) => {
    const f = new FormData(form);
    setState("sending");
    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          phone: f.get("phone"),
          email: String(f.get("email") ?? "") || undefined,
          items: items.slice(0, 500),
          pickup_at: romeISO(String(f.get("date") || minDate), String(f.get("time") || "17:00")),
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
  const chip = (on: boolean) => `rounded-full px-4 py-2 text-sm font-bold transition-colors ${on ? "bg-chocolate text-cream" : "bg-white text-chocolate/80 hover:bg-white/70"}`;
  const sendBtn = (
    <button type="submit" disabled={state === "sending"} className="btn-candy w-full justify-center bg-lemon disabled:opacity-90">
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
  );

  return (
    <motion.div className="fixed inset-0 z-[98] grid place-items-center overflow-y-auto overscroll-contain bg-chocolate/45 p-3 backdrop-blur-md sm:p-4" data-lenis-prevent initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={ui("title")}>
      <motion.div
        className="relative w-full max-w-4xl rounded-[2.5rem] bg-cream p-5 shadow-float sm:p-8"
        initial={{ y: 120, scale: 0.88, rotate: -3 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        exit={{ y: 120, scale: 0.88, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} aria-label="×" className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-white transition-transform hover:rotate-90">
          <X weight="bold" className="size-5" />
        </button>
        <h3 className="pr-12 font-display text-3xl leading-tight sm:text-5xl">{ui("title")}</h3>
        {/* two ways */}
        <div className="mt-4 flex w-max gap-1 rounded-full bg-white p-1 shadow-soft">
          {(["build", "contact"] as const).map((k) => (
            <button key={k} type="button" onClick={() => (sfx.pop(), setTab(k), setState("idle"))} className={`relative rounded-full px-4 py-2 text-sm font-bold transition-colors ${tab === k ? "text-cream" : "text-chocolate/70"}`}>
              {tab === k && <motion.span layoutId="cake-tab" className="absolute inset-0 rounded-full bg-chocolate" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <span className="relative">{ui(`tabs.${k}`)}</span>
            </button>
          ))}
        </div>

        {state === "done" ? (
          <div className="relative py-14 text-center">
            <Confetti />
            <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 10 }} className="mx-auto grid size-24 place-items-center rounded-full bg-[#4FA845] text-white">
              <Check weight="bold" className="size-12" />
            </motion.div>
            <p className="mt-5 font-display text-3xl font-bold">{ui("thanks")}</p>
            <p className="mt-2 font-semibold text-chocolate/70">{ui("priceNote")}</p>
          </div>
        ) : tab === "contact" ? (
          <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1.2fr]">
            <div className="space-y-3">
              <p className="font-semibold text-chocolate/75">{ui("contactIntro")}</p>
              {phone && (
                <a href={`tel:${phone}`} className="btn-candy w-full justify-center bg-pink">
                  <Phone weight="duotone" className="size-6" /> {data.settings.phone}
                </a>
              )}
              {phone && (
                <a href={`https://wa.me/${phone.replace("+", "")}?text=${encodeURIComponent(ui("waText"))}`} target="_blank" rel="noopener" className="btn-candy w-full justify-center bg-[#6FE0C4]">
                  <WhatsappLogo weight="duotone" className="size-6" /> WhatsApp
                </a>
              )}
            </div>
            <form onSubmit={(e) => (e.preventDefault(), send(e.currentTarget, `RICHIESTA TORTA: ${String(new FormData(e.currentTarget).get("message") ?? "")}`))} className="space-y-3">
              <p className="flex items-center gap-2 font-script text-2xl text-chocolate/75">
                <ChatCircleText weight="duotone" className="size-6" /> {ui("writeUs")}
              </p>
              <textarea name="message" required minLength={5} maxLength={420} rows={4} placeholder={ui("messagePh")} className={`${field} resize-none font-semibold`} />
              <div className="grid gap-2 sm:grid-cols-2">
                <input name="name" required maxLength={60} placeholder={ui("name")} className={field} />
                <input name="phone" required type="tel" maxLength={30} placeholder={ui("phone")} className={field} />
                <input name="email" type="email" maxLength={120} placeholder={ui("email")} autoComplete="email" className={`${field} sm:col-span-2`} />
              </div>
              <input type="hidden" name="date" value={minDate} />
              <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
              {state === "error" && <p className="font-bold text-cherry">{ui("error")}</p>}
              {sendBtn}
            </form>
          </div>
        ) : (
          <div className="mt-6 grid items-start gap-6 md:grid-cols-[1.05fr_1fr]">
            {/* the live cake */}
            <div className="md:sticky md:top-4">
              <CakeView cake={cake} flavors={cake.flavors.map(bySlug).filter(Boolean) as Flavor[]} />
              <p className="mt-2 text-center text-sm font-semibold text-chocolate/60">
                {ui(`shapes.${cake.shape}`)} · {cake.people} {ui("people")} · {ui("priceNote")}
              </p>
            </div>
            {/* the stepper */}
            <div>
              <div className="flex items-center gap-1.5">
                {STEPS.map((s, i) => (
                  <button key={s} type="button" onClick={() => setStep(i)} aria-label={ui(`steps.${s}`)} className="h-2 flex-1 overflow-hidden rounded-full bg-chocolate/10">
                    <motion.span className="block h-full rounded-full bg-[linear-gradient(90deg,#FF8FB8,#FFAA5C)]" initial={false} animate={{ width: i <= step ? "100%" : "0%" }} transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }} />
                  </button>
                ))}
              </div>
              <p className="mt-3 text-xs font-black tracking-[0.16em] text-chocolate/50 uppercase">
                {step + 1} / {STEPS.length}
              </p>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={step} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }} className="mt-1">
                  <h4 className="font-display text-2xl sm:text-3xl">{ui(`stepTitles.${STEPS[step]}`)}</h4>
                  <div className="mt-4">
                    {STEPS[step] === "shape" && (
                      <div className="space-y-4">
                        <div className="flex flex-wrap gap-2">
                          {SHAPES.map((s) => (
                            <button key={s} type="button" onClick={() => set("shape", s)} className={chip(cake.shape === s)}>
                              {ui(`shapes.${s}`)}
                            </button>
                          ))}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {PEOPLE.map((n) => (
                            <button key={n} type="button" onClick={() => set("people", n)} className={chip(cake.people === n)}>
                              {n} {ui("people")}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    {STEPS[step] === "base" && (
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(BASES) as Base[]).map((b) => (
                          <button key={b} type="button" onClick={() => set("base", b)} className={`flex items-center gap-3 rounded-2xl p-3 text-left font-bold transition-colors ${cake.base === b ? "bg-chocolate text-cream" : "bg-white"}`}>
                            <span className="size-8 shrink-0 rounded-lg" style={{ background: BASES[b] }} />
                            {ui(`bases.${b}`)}
                          </button>
                        ))}
                      </div>
                    )}
                    {STEPS[step] === "flavors" && (
                      <>
                        <p className="mb-2 text-sm font-bold text-chocolate/60">
                          {ui("flavorsHint")} · {cake.flavors.length}/3
                        </p>
                        <div className="grid max-h-[38vh] grid-cols-5 gap-x-1.5 gap-y-3 overflow-y-auto px-1.5 pt-2 pb-2" data-lenis-prevent>
                          {flavors.map((f) => {
                            const on = cake.flavors.includes(f.slug);
                            const full = !on && cake.flavors.length >= 3;
                            return (
                              <button key={f.id} type="button" disabled={full} onClick={() => set("flavors", on ? cake.flavors.filter((x) => x !== f.slug) : [...cake.flavors, f.slug])} className={`flex flex-col items-center gap-1 ${full ? "opacity-35" : ""}`}>
                                <span className={`grid aspect-square w-full place-items-center rounded-full p-1.5 transition-transform ${on ? "scale-105 ring-[3px] ring-chocolate" : ""}`} style={{ background: lighten(f.color_primary, 0.4) }}>
                                  <ScoopImg src={thumb(scoopPhoto(f))!} />
                                </span>
                                <span className={`max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] font-bold ${on ? "bg-chocolate text-cream" : "bg-white text-chocolate/80"}`}>{t(f.name, locale)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                    {STEPS[step] === "coat" && (
                      <div className="grid grid-cols-2 gap-2">
                        {(Object.keys(COATS) as Coat[]).map((c) => (
                          <button key={c} type="button" onClick={() => set("coat", c)} className={`flex items-center gap-3 rounded-2xl p-3 text-left font-bold transition-colors ${cake.coat === c ? "bg-chocolate text-cream" : "bg-white"}`}>
                            <span className="size-8 shrink-0 rounded-full border border-chocolate/10" style={{ background: COATS[c] }} />
                            {ui(`coats.${c}`)}
                          </button>
                        ))}
                      </div>
                    )}
                    {STEPS[step] === "decor" && (
                      <div className="flex flex-wrap gap-2">
                        {DECOR.map((d) => {
                          const on = cake.decor.includes(d);
                          return (
                            <motion.button key={d} type="button" whileTap={{ scale: 0.9 }} onClick={() => set("decor", on ? cake.decor.filter((x) => x !== d) : [...cake.decor, d])} className={`flex items-center gap-2 rounded-full py-1.5 pr-4 pl-1.5 text-sm font-bold transition-colors ${on ? "bg-chocolate text-cream" : "bg-white text-chocolate/80 hover:bg-white/70"}`}>
                              <span className={`grid size-9 place-items-center rounded-full ${on ? "bg-cream/15" : "bg-cream"}`}>
                                {DECOR_IMG[d] ? <img src={DECOR_IMG[d]} alt="" className="max-h-8 max-w-8 object-contain" /> : <span className="text-lg">{d === "candles" ? "🕯️" : "✨"}</span>}
                              </span>
                              {ui(`decor.${d}`)}
                              {on && <Check weight="bold" className="size-4" />}
                            </motion.button>
                          );
                        })}
                      </div>
                    )}
                    {STEPS[step] === "details" && (
                      <form onSubmit={(e) => (e.preventDefault(), send(e.currentTarget, summary()))} className="space-y-3">
                        <input value={cake.text} onChange={(e) => setCake((c) => ({ ...c, text: e.target.value.slice(0, 24) }))} placeholder={ui("writingPh")} className={field} />
                        <div className="grid grid-cols-[1.4fr_1fr] gap-2">
                          <input name="date" type="date" required min={minDate} defaultValue={minDate} className={field} />
                          <input name="time" type="time" required step={900} defaultValue="17:00" className={field} />
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <input name="name" required maxLength={60} placeholder={ui("name")} className={field} />
                          <input name="phone" required type="tel" maxLength={30} placeholder={ui("phone")} className={field} />
                          <input name="email" type="email" maxLength={120} placeholder={ui("email")} autoComplete="email" className={`${field} sm:col-span-2`} />
                        </div>
                        <textarea name="notes" maxLength={400} rows={2} placeholder={ui("notes")} className={`${field} resize-none font-semibold`} />
                        <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                        {state === "error" && <p className="font-bold text-cherry">{ui("error")}</p>}
                        {sendBtn}
                      </form>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
              {/* back / next */}
              {STEPS[step] !== "details" && (
                <div className="mt-6 flex gap-2">
                  {step > 0 && (
                    <button type="button" onClick={() => (sfx.pop(), setStep((s) => s - 1))} className="grid size-12 place-items-center rounded-full bg-white shadow-soft" aria-label={ui("back")}>
                      <ArrowLeft weight="bold" className="size-5" />
                    </button>
                  )}
                  <button type="button" onClick={() => (sfx.whoosh(), setStep((s) => Math.min(STEPS.length - 1, s + 1)))} className="btn-candy flex-1 justify-center bg-chocolate text-cream">
                    {ui("next")} <ArrowRight weight="bold" className="size-5" />
                  </button>
                </div>
              )}
              {STEPS[step] === "details" && (
                <button type="button" onClick={() => setStep((s) => s - 1)} className="mt-3 flex items-center gap-1.5 text-sm font-bold text-chocolate/60">
                  <ArrowLeft weight="bold" className="size-4" /> {ui("back")}
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

/** Real decorations (generated for Onda, transparent cut-outs) — sprites that land on the cake. */
export const DECOR_IMG: Partial<Record<Decor, string>> = {
  strawberries: "/img/cake/strawberries.webp",
  berries: "/img/cake/berries.webp",
  chocolate: "/img/cake/chocolate.webp",
  wafers: "/img/cake/wafers.webp",
  macarons: "/img/cake/macarons.webp",
};
const SPRITE: Record<string, { src: string; aspect: number; size: number }> = {
  strawberries: { src: "/img/cake/strawberries.webp", aspect: 420 / 384, size: 0.3 },
  berries: { src: "/img/cake/berries.webp", aspect: 420 / 369, size: 0.27 },
  chocolate: { src: "/img/cake/chocolate.webp", aspect: 420 / 377, size: 0.26 },
  macarons: { src: "/img/cake/macarons.webp", aspect: 420 / 268, size: 0.34 },
  wafers: { src: "/img/cake/wafers.webp", aspect: 127 / 420, size: 0.13 },
  rosette: { src: "/img/cake/rosette.webp", aspect: 420 / 367, size: 0.17 },
};
/** where each decoration sits on the top (fractions of the top ellipse: -1…1) */
const PLACES: Partial<Record<Decor, [number, number][]>> = {
  strawberries: [[-0.45, -0.25], [0.3, 0.35], [0.5, -0.45]],
  berries: [[0.05, -0.55], [-0.35, 0.45], [0.62, 0.05]],
  chocolate: [[-0.62, 0.05], [0.18, 0.02]],
  macarons: [[-0.15, 0.4], [0.25, -0.3]],
  wafers: [[-0.12, -0.15], [0.12, -0.1]],
};

const STAND = { src: "/img/cake/stand.webp", aspect: 808 / 420, plateY: 0.226 };

/**
 * The cake, built live on a porcelain stand: the sides show the gelato layers in the flavors' own colors (with
 * light and shade, like a real cylinder), the coating on top (glossy drips for glazes, piped cream rosettes along
 * the rim), real fruit / chocolate / wafers / macarons that drop onto it, candles, sprinkles and the message.
 * Every change makes it squash and bounce a little.
 */
function CakeView({ cake, flavors }: { cake: Cake; flavors: Flavor[] }) {
  const W = 150 + (cake.people - 6) * 9; // wider for more people
  const rx = W / 2;
  const ry = rx * 0.25;
  const x0 = 200 - rx;
  const x1 = 200 + rx;
  const PY = 268; // where the cake stands on the plate
  const layers: { key: string; color: string; h: number; tex?: string }[] = [{ key: `base-${cake.base}`, color: BASES[cake.base], h: 22 }, ...flavors.map((f) => ({ key: f.slug, color: f.color_primary, h: Math.max(24, 60 / Math.max(1, flavors.length)), tex: thumb(scoopPhoto(f)) ?? undefined }))];
  const bodyH = layers.reduce((a, l) => a + l.h, 0) + 12;
  const TY = PY - bodyH;
  const coat = COATS[cake.coat];
  const heart = cake.shape === "heart";
  const square = cake.shape === "square";

  /** the front curve of the cake at height y (what the eye sees as the bottom edge of a band) */
  const front = (y: number, dir: "lr" | "rl") => {
    if (square) return dir === "lr" ? `L${x1} ${y}` : `L${x0} ${y}`;
    if (heart) return dir === "lr" ? `Q200 ${y + ry * 2.4} ${x1} ${y}` : `Q200 ${y + ry * 2.4} ${x0} ${y}`;
    return dir === "lr" ? `A${rx} ${ry} 0 0 0 ${x1} ${y}` : `A${rx} ${ry} 0 0 1 ${x0} ${y}`;
  };
  const band = (ya: number, yb: number) => `M${x0} ${ya} L${x0} ${yb} ${front(yb, "lr")} L${x1} ${ya} ${front(ya, "rl")} Z`;
  const topPath = useMemo(() => {
    if (square) return `M${x0} ${TY} L${x0 + 18} ${TY - ry * 1.7} L${x1 - 18} ${TY - ry * 1.7} L${x1} ${TY} Z`;
    if (heart) {
      const s = W / 160;
      return `M200 ${TY + ry * 1.2} C${200 - 70 * s} ${TY + ry * 0.7} ${200 - 112 * s} ${TY - ry * 0.2} ${200 - 80 * s} ${TY - ry * 1.15} C${200 - 58 * s} ${TY - ry * 1.75} ${200 - 18 * s} ${TY - ry * 1.55} 200 ${TY - ry * 0.85} C${200 + 18 * s} ${TY - ry * 1.55} ${200 + 58 * s} ${TY - ry * 1.75} ${200 + 80 * s} ${TY - ry * 1.15} C${200 + 112 * s} ${TY - ry * 0.2} ${200 + 70 * s} ${TY + ry * 0.7} 200 ${TY + ry * 1.2} Z`;
    }
    return `M${x0} ${TY} A${rx} ${ry} 0 1 0 ${x1} ${TY} A${rx} ${ry} 0 1 0 ${x0} ${TY} Z`;
  }, [square, heart, x0, x1, TY, ry, rx, W]);
  // a point on the top, from fractions (-1…1) of its half-width / half-depth
  const onTop = (fx: number, fy: number) => ({ x: 200 + fx * rx * 0.8, y: TY + fy * ry * (heart ? 0.9 : 0.8) - (square ? ry * 0.85 : 0) });

  // everything standing on the cake, drawn back to front
  const items: { key: string; kind: string; x: number; y: number; tint?: string }[] = [];
  if (cake.coat === "cream" || cake.coat === "meringue") {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const p = onTop(Math.cos(a) * 1.18, Math.sin(a) * 1.22);
      items.push({ key: `r${i}`, kind: "rosette", x: p.x, y: p.y + 4, tint: cake.coat === "meringue" ? "sepia(0.55) saturate(1.6) brightness(0.98)" : undefined });
    }
  }
  for (const d of cake.decor) for (const [i, [fx, fy]] of (PLACES[d] ?? []).entries()) items.push({ key: `${d}${i}`, kind: d, ...onTop(fx, fy) });
  items.sort((a, b) => a.y - b.y);

  const spots = Array.from({ length: 22 }, (_, i) => onTop(Math.sin(i * 2.4) * 0.85, Math.cos(i * 1.7) * 0.8));
  const glaze = cake.coat === "chocolate" || cake.coat === "pink";
  const standW = W * 1.62;
  const standH = standW / STAND.aspect;

  // squash & bounce on every change
  const bounce = useAnimationControls();
  const sig = JSON.stringify(cake);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    void bounce.start({ scaleY: [1, 0.93, 1.04, 1], scaleX: [1, 1.05, 0.98, 1], transition: { duration: 0.55, ease: "easeOut" } });
  }, [sig]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(70%_60%_at_50%_38%,#fff,#FFE9F1_60%,#FFE3C9)]">
      {/* soft light from above */}
      <div className="pointer-events-none absolute -top-1/3 left-1/2 h-2/3 w-2/3 -translate-x-1/2 rounded-full bg-white/70 blur-3xl" />
      <svg viewBox="0 30 400 330" className="relative block w-full">
        <defs>
          <linearGradient id="cake-shade" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0" stopColor="#000" stopOpacity=".28" />
            <stop offset=".18" stopColor="#000" stopOpacity=".04" />
            <stop offset=".34" stopColor="#fff" stopOpacity=".3" />
            <stop offset=".5" stopColor="#fff" stopOpacity="0" />
            <stop offset=".82" stopColor="#000" stopOpacity=".1" />
            <stop offset="1" stopColor="#000" stopOpacity=".32" />
          </linearGradient>
          <radialGradient id="cake-top" cx=".4" cy=".35" r=".8">
            <stop offset="0" stopColor="#fff" stopOpacity=".55" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <filter id="cake-soft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
          {/* real gelato on the sides: the middle of each flavor's own scoop photo, as a texture */}
          {layers.map((l) =>
            l.tex ? (
              <pattern key={l.key} id={`tex-${l.key}`} patternUnits="userSpaceOnUse" width="400" height="520">
                <rect width="400" height="520" fill={l.color} />
                {/* only the middle of the scoop (no edges, no seams): one big copy behind the whole cake */}
                <image href={l.tex} x="-140" y="-40" width="680" height="560" preserveAspectRatio="xMidYMid slice" />
              </pattern>
            ) : null,
          )}
          {/* the base: crumbs and pores (sponge, cocoa biscuit, brownie, crumble) */}
          <filter id="cake-crumb" x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency={cake.base === "sponge" ? 0.55 : cake.base === "crumble" ? 0.9 : 0.35} numOctaves="2" seed="7" />
            <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.25" />
            <feComposite in2="SourceGraphic" operator="in" />
          </filter>
        </defs>

        {/* the porcelain stand + the cake's shadow on it */}
        <image href={STAND.src} x={200 - standW / 2} y={PY - standH * STAND.plateY} width={standW} height={standH} className="transition-all duration-500" />
        <ellipse cx="200" cy={PY + 4} rx={rx + 6} ry={ry + 3} fill="rgba(75,42,32,0.22)" filter="url(#cake-soft)" />

        <motion.g animate={bounce} style={{ transformOrigin: `200px ${PY}px`, transformBox: "view-box" }}>
          {/* the gelato layers, from the base up */}
          <AnimatePresence initial={false}>
            {(() => {
              let y = PY;
              return layers.map((l, i) => {
                const yb = y;
                y -= l.h;
                return (
                  <motion.g key={l.key + i} initial={{ y: -90, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0, y: -50 }} transition={{ type: "spring", stiffness: 260, damping: 17 }}>
                    <path d={band(y, yb)} fill={l.tex ? `url(#tex-${l.key})` : l.color} stroke={darken(l.color, 0.12)} strokeWidth="0.8" />
                    {/* the base gets its crumbs, darker */}
                    {!l.tex && <path d={band(y, yb)} fill={darken(l.color, 0.35)} opacity="0.55" filter="url(#cake-crumb)" />}
                  </motion.g>
                );
              });
            })()}
          </AnimatePresence>
          {/* light and shade on the sides, like a real cylinder */}
          <path d={band(TY, PY)} fill="url(#cake-shade)" pointerEvents="none" />
          {/* the coating: a band on top of the sides + the top */}
          <motion.path d={band(TY, TY + 12)} animate={{ fill: coat }} stroke={darken(coat, 0.08)} strokeWidth="1" />
          {glaze &&
            Array.from({ length: 9 }, (_, i) => {
              const fx = -0.92 + (i * 1.84) / 8;
              const x = 200 + fx * rx;
              const yTop = TY + 8 + (square ? 0 : heart ? (1 - Math.abs(fx)) * ry * 1.1 : Math.sqrt(Math.max(0, 1 - fx * fx)) * ry);
              const h = 12 + ((i * 13) % 26);
              return <motion.rect key={`d${i}`} x={x - 5} y={yTop} width="10" rx="5" fill={coat} initial={{ height: 0 }} animate={{ height: h }} transition={{ duration: 0.9, delay: i * 0.05, ease: "easeOut" }} />;
            })}
          <motion.path d={topPath} animate={{ fill: coat }} stroke={darken(coat, 0.07)} strokeWidth="1.4" />
          <path d={topPath} fill="url(#cake-top)" pointerEvents="none" />

          {/* sprinkles on the top */}
          <AnimatePresence>
            {cake.decor.includes("sprinkles") &&
              spots.map((p, i) => (
                <motion.rect key={`k${i}`} x={p.x - 3} y={p.y - 1.2} width="7" height="2.6" rx="1.3" fill={["#FF6F91", "#FFE066", "#6FE0C4", "#9B8CFF", "#FFAA5C"][i % 5]} transform={`rotate(${(i * 61) % 180} ${p.x} ${p.y})`} initial={{ opacity: 0, y: -40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: i * 0.015 }} />
              ))}
          </AnimatePresence>

          {/* rosettes, fruit, chocolate, wafers, macarons — real cut-outs, landing one by one */}
          <AnimatePresence>
            {items.map((it, i) => {
              const sp = SPRITE[it.kind];
              const w = W * sp.size;
              const h = w / sp.aspect;
              return (
                <motion.image
                  key={it.key}
                  href={sp.src}
                  x={it.x - w / 2}
                  y={it.y - h * 0.86}
                  width={w}
                  height={h}
                  style={it.tint ? { filter: it.tint } : undefined}
                  initial={{ y: -70, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ opacity: 0, y: -30 }}
                  transition={{ type: "spring", stiffness: 380, damping: 16, delay: it.kind === "rosette" ? i * 0.02 : 0.05 + (i % 4) * 0.05 }}
                />
              );
            })}
          </AnimatePresence>

          {/* candles */}
          <AnimatePresence>
            {cake.decor.includes("candles") &&
              [-0.32, 0, 0.32].map((fx, i) => {
                const p = onTop(fx, -0.05 + Math.abs(fx) * 0.2);
                return (
                  <motion.g key={`n${i}`} initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: i * 0.07 }}>
                    <rect x={p.x - 3.5} y={p.y - 44} width="7" height="44" rx="2.5" fill={["#9B8CFF", "#FF8FB8", "#6FE0C4"][i]} />
                    <path d={`M${p.x - 3.5} ${p.y - 36} l7 -5 M${p.x - 3.5} ${p.y - 24} l7 -5 M${p.x - 3.5} ${p.y - 12} l7 -5`} stroke="#fff" strokeOpacity=".7" strokeWidth="1.6" />
                    <circle cx={p.x} cy={p.y - 52} r="9" fill="#FFD36B" opacity=".35" filter="url(#cake-soft)" />
                    <motion.ellipse cx={p.x} cy={p.y - 51} rx="4" ry="7.5" fill="#FFB43B" animate={{ scaleY: [1, 1.25, 0.9, 1], opacity: [0.9, 1, 0.85, 0.9] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} style={{ transformOrigin: `${p.x}px ${p.y - 45}px` }} />
                  </motion.g>
                );
              })}
          </AnimatePresence>

          {/* the message on a white chocolate plaque, on the front */}
          <AnimatePresence>
            {cake.text && (
              <motion.g key="plaque" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 300, damping: 16 }} style={{ transformOrigin: `200px ${TY + bodyH / 2 + 8}px` }}>
                <rect x={200 - Math.min(W - 16, 34 + cake.text.length * 7.4) / 2} y={TY + bodyH / 2 - 6} width={Math.min(W - 16, 34 + cake.text.length * 7.4)} height="28" rx="14" fill="#FFF7EE" stroke="#4B2A20" strokeOpacity=".15" />
                <text x="200" y={TY + bodyH / 2 + 13} textAnchor="middle" fontFamily="var(--font-script)" fontSize="16" fill="#4B2A20">
                  {cake.text}
                </text>
              </motion.g>
            )}
          </AnimatePresence>
        </motion.g>
      </svg>
    </div>
  );
}

/** A burst of sprinkles and little scoops when the order is sent. */
function Confetti() {
  const bits = useMemo(() => Array.from({ length: 46 }, (_, i) => ({ x: (Math.random() - 0.5) * 760, y: -160 - Math.random() * 300, r: Math.random() * 720 - 360, c: ["#FF8FB8", "#FFE066", "#6FE0C4", "#9B8CFF", "#FFAA5C", "#A8DB7A"][i % 6], round: i % 5 === 0, d: Math.random() * 0.25 })), []);
  return (
    <div className="pointer-events-none absolute inset-x-0 top-24 flex justify-center" aria-hidden>
      {bits.map((b, i) => (
        <motion.span
          key={i}
          className={`absolute block ${b.round ? "size-3 rounded-full" : "h-1.5 w-4 rounded-full"}`}
          style={{ background: b.c }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 520], rotate: b.r, opacity: [1, 1, 0] }}
          transition={{ duration: 1.9, delay: b.d, ease: [0.2, 0.7, 0.4, 1], times: [0, 0.35, 1] }}
        />
      ))}
    </div>
  );
}
