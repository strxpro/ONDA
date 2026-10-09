"use client";

 
import { ArrowLeft, ArrowRight, Check, ChatCircleText, PaperPlaneTilt, Phone, WhatsappLogo, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { darken, lighten } from "@/lib/color";
import { sfx } from "@/lib/sound";
import { t, type Flavor } from "@/lib/shared";
import { ScoopImg, scoopPhoto, thumb } from "../ice/PhotoStack";
import { useSite } from "../providers/SiteData";
import { useScrollLock } from "../ui/useScrollLock";

/** Photos of gelato cakes (Unsplash, free licence) until the shop's own are uploaded. */
export const CAKE_PHOTOS = ["1621303837174-89787a7d4729", "1541780171255-b162a3a147e3", "1642047362005-676d4400bc9d", "1562634185-94581bf444ae", "1505253599537-305b179737ce", "1642047362152-6dfaa16ba3bb"].map(
  (id) => `https://images.unsplash.com/photo-${id}?w=1100&q=72&auto=format&fit=crop`,
);

const SHAPES = ["round", "heart", "square"] as const;
const PEOPLE = [6, 8, 10, 12, 16] as const;
const BASES = { sponge: "#F3D9A4", cocoa: "#6B3F2A", brownie: "#4A2A1C", crumble: "#D9A86C" } as const;
const COATS = { cream: "#FFF8EE", chocolate: "#5A3324", meringue: "#FFF2E0", pink: "#FFB3CB" } as const;
const DECOR = ["berries", "strawberries", "chocolate", "sprinkles", "candles", "wafers"] as const;
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
          <div className="py-14 text-center">
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
                        <div className="grid max-h-[38vh] grid-cols-5 gap-x-1.5 gap-y-3 overflow-y-auto pr-1" data-lenis-prevent>
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
                            <button key={d} type="button" onClick={() => set("decor", on ? cake.decor.filter((x) => x !== d) : [...cake.decor, d])} className={chip(on)}>
                              {on ? "✓ " : "+ "}
                              {ui(`decor.${d}`)}
                            </button>
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

/** The cake, drawn live: plate, base, gelato layers in the flavors' colors, coating (drips for glazes), decorations, candles, the message. */
function CakeView({ cake, flavors }: { cake: Cake; flavors: Flavor[] }) {
  const w = 150 + (cake.people - 6) * 9; // wider for more people
  const x0 = 200 - w / 2;
  const layers = [{ key: `base-${cake.base}`, color: BASES[cake.base], h: 24 }, ...flavors.map((f) => ({ key: f.slug, color: f.color_primary, h: Math.max(22, 54 / Math.max(1, flavors.length)) }))];
  const bodyH = layers.reduce((a, l) => a + l.h, 0) + 14;
  const bottom = 268;
  const top = bottom - bodyH;
  const coat = COATS[cake.coat];
  const ry = cake.shape === "square" ? 16 : 22;
  const topPath = useMemo(() => {
    if (cake.shape === "round") return `M${x0} ${top} a${w / 2} ${ry} 0 1 0 ${w} 0 a${w / 2} ${ry} 0 1 0 ${-w} 0`;
    if (cake.shape === "square") return `M${x0} ${top - ry * 0.6} h${w} v${ry * 1.2} h${-w} Z`;
    // heart, seen from a little above
    const cx = 200;
    const s = w / 160;
    return `M${cx} ${top + ry * 1.1} C${cx - 90 * s} ${top - 4} ${cx - 70 * s} ${top - ry * 1.6} ${cx} ${top - ry * 0.6} C${cx + 70 * s} ${top - ry * 1.6} ${cx + 90 * s} ${top - 4} ${cx} ${top + ry * 1.1} Z`;
  }, [cake.shape, x0, w, top, ry]);
  const spots = useMemo(() => Array.from({ length: 9 }, (_, i) => ({ x: x0 + 18 + ((i * 37) % (w - 36)), y: top - ry * 0.4 + ((i * 13) % (ry * 0.9)) })), [x0, w, top, ry]);
  const glaze = cake.coat === "chocolate" || cake.coat === "pink";
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[radial-gradient(70%_60%_at_50%_35%,#fff,#FFE9F1_60%,#FFE3C9)]">
      <svg viewBox="0 0 400 320" className="block w-full">
        {/* plate */}
        <ellipse cx="200" cy={bottom + 6} rx={w / 2 + 34} ry="16" fill="#fff" stroke="#EADFD8" strokeWidth="2" />
        <ellipse cx="200" cy={bottom + 10} rx={w / 2 + 10} ry="7" fill="rgba(75,42,32,0.12)" />
        {/* layers, from the base up */}
        <AnimatePresence initial={false}>
          {(() => {
            let y = bottom;
            return layers.map((l, i) => {
              y -= l.h;
              return (
                <motion.rect
                  key={l.key + i}
                  x={x0}
                  width={w}
                  height={l.h}
                  rx="4"
                  fill={l.color}
                  initial={{ y: y - 80, opacity: 0 }}
                  animate={{ y, opacity: 1 }}
                  exit={{ opacity: 0, y: y - 40 }}
                  transition={{ type: "spring", stiffness: 260, damping: 18 }}
                  stroke={darken(l.color, 0.08)}
                  strokeWidth="1"
                />
              );
            });
          })()}
        </AnimatePresence>
        {/* coating on the sides + top */}
        <motion.rect x={x0 - 2} y={top} width={w + 4} height={14} rx="6" fill={coat} animate={{ fill: coat }} />
        <motion.path d={topPath} fill={coat} animate={{ fill: coat }} stroke={darken(coat, 0.06)} strokeWidth="1.5" />
        {/* glaze drips */}
        {glaze &&
          Array.from({ length: 7 }, (_, i) => (
            <motion.rect key={`d${i}`} x={x0 + 10 + i * ((w - 20) / 6) - 5} y={top + 8} width="10" rx="5" fill={coat} initial={{ height: 0 }} animate={{ height: 14 + ((i * 11) % 22) }} transition={{ duration: 0.8, delay: i * 0.05, ease: "easeOut" }} />
          ))}
        {/* decorations on top */}
        <AnimatePresence>
          {cake.decor.includes("berries") &&
            spots.slice(0, 7).map((p, i) => (
              <motion.circle key={`b${i}`} cx={p.x} cy={p.y} r="6" fill={i % 2 ? "#3B2F7A" : "#B0213F"} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 400, damping: 12, delay: i * 0.03 }} style={{ transformOrigin: `${p.x}px ${p.y}px` }} />
            ))}
          {cake.decor.includes("strawberries") &&
            spots.slice(2, 6).map((p, i) => (
              <motion.path key={`s${i}`} d={`M${p.x + 8} ${p.y - 8} q-9 0 -9 9 q0 9 9 13 q9 -4 9 -13 q0 -9 -9 -9 z`} fill="#E5243F" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 380, damping: 12, delay: i * 0.05 }} style={{ transformOrigin: `${p.x + 8}px ${p.y}px` }} />
            ))}
          {cake.decor.includes("chocolate") &&
            spots.map((p, i) => <motion.rect key={`c${i}`} x={p.x + 4} y={p.y - 2} width="10" height="4" rx="1" fill="#3B2620" transform={`rotate(${(i * 47) % 180} ${p.x + 9} ${p.y})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />)}
          {cake.decor.includes("sprinkles") &&
            Array.from({ length: 18 }, (_, i) => {
              const p = spots[i % spots.length];
              const c = ["#FF8FB8", "#FFE066", "#6FE0C4", "#9B8CFF"][i % 4];
              return <motion.rect key={`k${i}`} x={p.x - 10 + ((i * 7) % 24)} y={p.y - 4 + ((i * 5) % 10)} width="6" height="2.4" rx="1.2" fill={c} transform={`rotate(${(i * 61) % 180} ${p.x} ${p.y})`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />;
            })}
          {cake.decor.includes("wafers") &&
            [0.28, 0.72].map((k, i) => (
              <motion.rect key={`w${i}`} x={x0 + w * k - 6} y={top - 34} width="12" height="34" rx="2" fill="#E8B26A" stroke="#B9813F" initial={{ y: top - 80, opacity: 0 }} animate={{ y: top - 34, opacity: 1 }} exit={{ opacity: 0 }} transform={`rotate(${i ? 12 : -12} ${x0 + w * k} ${top})`} />
            ))}
          {cake.decor.includes("candles") &&
            [0.38, 0.5, 0.62].map((k, i) => (
              <motion.g key={`n${i}`} initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 14, delay: i * 0.06 }}>
                <rect x={x0 + w * k - 3} y={top - 40} width="6" height="34" rx="2" fill={["#9B8CFF", "#FF8FB8", "#6FE0C4"][i]} />
                <motion.ellipse cx={x0 + w * k} cy={top - 46} rx="4" ry="7" fill="#FFB43B" animate={{ scaleY: [1, 1.25, 0.9, 1], opacity: [0.9, 1, 0.85, 0.9] }} transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.2 }} style={{ transformOrigin: `${x0 + w * k}px ${top - 40}px` }} />
              </motion.g>
            ))}
        </AnimatePresence>
        {/* the message on a little plaque */}
        <AnimatePresence>
          {cake.text && (
            <motion.g key="plaque" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ type: "spring", stiffness: 300, damping: 16 }} style={{ transformOrigin: `200px ${top + bodyH / 2}px` }}>
              <rect x={200 - Math.min(w - 20, 30 + cake.text.length * 7) / 2} y={top + bodyH / 2 - 13} width={Math.min(w - 20, 30 + cake.text.length * 7)} height="26" rx="13" fill="#FFF7EE" stroke="#4B2A20" strokeOpacity=".15" />
              <text x="200" y={top + bodyH / 2 + 5} textAnchor="middle" fontFamily="var(--font-script)" fontSize="15" fill="#4B2A20">
                {cake.text}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>
    </div>
  );
}
