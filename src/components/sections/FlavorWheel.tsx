"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowsClockwise, Sparkle, X } from "@phosphor-icons/react";
import { AnimatePresence, animate, motion, useMotionValue } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lighten } from "@/lib/color";
import { sfx } from "@/lib/sound";
import { t, type Flavor } from "@/lib/shared";
import { scoopPhoto, thumb } from "../ice/PhotoStack";
import { useSite } from "../providers/SiteData";
import { useScrollLock } from "../ui/useScrollLock";

/** Hot buttons above the wheel: they decide which of today's flavors go on it. */
const CHIPS = [
  { key: "all", test: () => true },
  { key: "creamy", test: (f: Flavor) => f.category === "crema" || f.category === "speciali" },
  { key: "fruity", test: (f: Flavor) => f.category === "frutta" || f.category === "sorbetti" },
  { key: "lactose_free", test: (f: Flavor) => f.tags.includes("lactose_free") || f.tags.includes("vegan") },
  { key: "vegan", test: (f: Flavor) => f.tags.includes("vegan") },
  { key: "new", test: (f: Flavor) => f.tags.includes("new") },
] as const;
type ChipKey = (typeof CHIPS)[number]["key"];
const MAX = 12;
const POINTER_COLORS = ["#F0527F", "#FFC93C", "#2EC4A0"];

/**
 * "Can't decide? Spin the wheel" — a banner with a photo of happy kids at the counter; it opens a wheel of fortune
 * made of today's real scoops. Tap the middle: it spins, ticks past each flavor, stops, confetti, and the winner's
 * card opens (the spatula scoops it and shows what's inside).
 */
export function FlavorWheel({ flavors, onResult }: { flavors: Flavor[]; onResult: (f: Flavor) => void }) {
  const ui = useTranslations("ui.wheel");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (flavors.length < 2) return null;

  return (
    <>
      <motion.button
        type="button"
        onClick={() => (sfx.whoosh(), setOpen(true))}
        whileHover="hover"
        whileTap={{ scale: 0.98 }}
        className="group relative block min-h-[260px] w-full overflow-hidden rounded-[2rem] text-left shadow-[0_30px_60px_-30px_rgba(75,42,32,0.6)] sm:min-h-[300px]"
      >
        <motion.img src="/img/wheel-kids.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-[70%_40%]" variants={{ hover: { scale: 1.05 } }} transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }} />
        <span className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,247,238,0.97)_0%,rgba(255,247,238,0.85)_38%,rgba(255,247,238,0)_70%)]" aria-hidden />
        <span className="relative flex h-full max-w-[62%] flex-col justify-center gap-3 p-6 sm:max-w-[55%] sm:p-8">
          <span className="flex w-max items-center gap-1.5 rounded-full bg-[#F0527F] px-3 py-1 text-xs font-black tracking-[0.14em] text-white uppercase">
            <Sparkle weight="fill" className="size-3.5" /> {ui("eyebrow")}
          </span>
          <span className="font-display text-3xl leading-[1.02] sm:text-5xl">{ui("title")}</span>
          <span className="text-sm font-semibold text-chocolate/75 sm:text-base">{ui("subtitle")}</span>
          <span className="mt-1 flex w-max items-center gap-2 rounded-full bg-chocolate px-5 py-3 font-bold text-cream">
            <MiniWheel /> {ui("cta")}
          </span>
        </span>
      </motion.button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {open && (
              <WheelModal
                flavors={flavors}
                onClose={() => setOpen(false)}
                onResult={(f) => {
                  setOpen(false);
                  onResult(f);
                }}
              />
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

function MiniWheel() {
  return (
    <motion.svg viewBox="0 0 24 24" className="size-5" variants={{ hover: { rotate: 180 } }} transition={{ type: "spring", stiffness: 120, damping: 12 }} aria-hidden>
      {["#FF8FB8", "#FFE066", "#6FE0C4", "#9B8CFF"].map((c, i) => (
        <path key={c} d={`M12 12 L${12 + 10 * Math.cos((i * Math.PI) / 2)} ${12 + 10 * Math.sin((i * Math.PI) / 2)} A10 10 0 0 1 ${12 + 10 * Math.cos(((i + 1) * Math.PI) / 2)} ${12 + 10 * Math.sin(((i + 1) * Math.PI) / 2)} Z`} fill={c} />
      ))}
      <circle cx="12" cy="12" r="3" fill="#FFF7EE" />
    </motion.svg>
  );
}

function WheelModal({ flavors, onClose, onResult }: { flavors: Flavor[]; onClose: () => void; onResult: (f: Flavor) => void }) {
  useScrollLock();
  const { locale } = useSite();
  const ui = useTranslations("ui.wheel");
  const [chip, setChip] = useState<ChipKey>("all");
  const [spinning, setSpinning] = useState(false);
  const [winners, setWinners] = useState<Flavor[]>([]);
  const winner = winners[0] ?? null;
  // how many scoops to draw (1–3): one pointer per scoop, placed at random around the rim
  const [count, setCount] = useState(1);
  const [pointers, setPointers] = useState<number[]>([0]);
  const rot = useMotionValue(0);
  const lastSeg = useRef(-1);
  // a scoop's name: shown while the pointer is on it, and pinned by a tap (stays until another tap or a spin)
  const [peek, setPeek] = useState<{ k: number; pinned: boolean } | null>(null);

  const chips = CHIPS.filter((c) => c.key === "all" || flavors.filter(c.test).length >= 2);
  const items = useMemo(() => {
    const list = flavors.filter(CHIPS.find((c) => c.key === chip)!.test);
    return list.slice(0, MAX);
  }, [flavors, chip]);
  const seg = 360 / items.length;
  const maxCount = Math.min(3, items.length);

  /** n pointer angles (clockwise from the top), far enough apart to always land on different flavors */
  const scatter = (n: number) => {
    if (n === 1) return [Math.random() < 0.5 ? 0 : Math.round((Math.random() - 0.5) * 120)];
    for (let tries = 0; tries < 200; tries++) {
      const a = Array.from({ length: n }, () => Math.round(Math.random() * 360));
      const ok = a.every((x, i) => a.every((y, j) => i === j || Math.min(Math.abs(x - y), 360 - Math.abs(x - y)) >= Math.max(seg * 1.15, 50)));
      if (ok) return a.sort((x, y) => x - y);
    }
    return Array.from({ length: n }, (_, i) => (i * 360) / n);
  };
  const pickCount = (n: number) => {
    sfx.pop();
    setCount(n);
    setWinners([]);
    setPointers(scatter(n));
  };
  useEffect(() => {
    if (count > maxCount) pickCount(maxCount);
  }, [maxCount]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !spinning && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose, spinning]);

  const spin = () => {
    if (spinning || items.length < 2) return;
    setWinners([]);
    setPeek(null);
    setSpinning(true);
    sfx.whoosh();
    // the pointers jump to new random places too: every spin is different
    const ptrs = scatter(count);
    setPointers(ptrs);
    const i = Math.floor(Math.random() * items.length);
    const current = rot.get();
    // bring the middle of segment i under the first pointer, after 5–6 full turns
    const base = Math.ceil(current / 360) * 360 + 360 * (5 + Math.floor(Math.random() * 2));
    const target = base + ptrs[0] - (i + 0.5) * seg + (Math.random() - 0.5) * seg * 0.4;
    /** the flavor under a pointer at clockwise angle p, for a wheel rotated by r */
    const under = (p: number, r: number) => items[Math.floor((((p - r) % 360) + 360) % 360 / seg) % items.length];
    animate(rot, target, {
      duration: 4.8,
      ease: [0.12, 0.75, 0.15, 1],
      onUpdate: (v) => {
        const s = Math.floor((((-v % 360) + 360) % 360) / seg);
        if (s !== lastSeg.current) {
          lastSeg.current = s;
          sfx.click();
        }
      },
      onComplete: () => {
        setSpinning(false);
        const won = [...new Set(ptrs.map((p) => under(p, target)))];
        setWinners(won);
        sfx.sparkle();
        navigator.vibrate?.([20, 40, 20]);
        // one scoop: its card opens by itself; more: tap the one you want to see
        if (won.length === 1) window.setTimeout(() => onResult(won[0]), 1900);
      },
    });
  };

  const R = 200;
  const arc = (k: number) => {
    const a0 = ((k * seg - 90) * Math.PI) / 180;
    const a1 = (((k + 1) * seg - 90) * Math.PI) / 180;
    return `M0 0 L${(R * Math.cos(a0)).toFixed(2)} ${(R * Math.sin(a0)).toFixed(2)} A${R} ${R} 0 ${seg > 180 ? 1 : 0} 1 ${(R * Math.cos(a1)).toFixed(2)} ${(R * Math.sin(a1)).toFixed(2)} Z`;
  };

  return (
    <motion.div data-lenis-prevent className="fixed inset-0 z-[96] grid place-items-center overflow-y-auto overscroll-contain bg-chocolate/45 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !spinning && onClose()} role="dialog" aria-modal="true" aria-label={ui("title")}>
      <motion.div
        className="relative w-full max-w-xl rounded-[2.5rem] bg-cream p-5 text-center shadow-float sm:p-8"
        initial={{ y: 120, scale: 0.85, rotate: -5 }}
        animate={{ y: 0, scale: 1, rotate: 0 }}
        exit={{ y: 120, scale: 0.85, opacity: 0 }}
        transition={{ type: "spring", stiffness: 240, damping: 20 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" onClick={onClose} disabled={spinning} aria-label="×" className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-white transition-transform hover:rotate-90 disabled:opacity-40">
          <X weight="bold" className="size-5" />
        </button>
        <h3 className="px-10 font-display text-3xl leading-tight sm:text-4xl">{ui("modalTitle")}</h3>

        {/* hot buttons */}
        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              disabled={spinning}
              onClick={() => (sfx.pop(), setChip(c.key), setWinners([]))}
              className={`relative rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${chip === c.key ? "text-cream" : "bg-white text-chocolate/75"}`}
            >
              {chip === c.key && <motion.span layoutId="wheel-chip" className="absolute inset-0 rounded-full bg-[#F0527F]" transition={{ type: "spring", stiffness: 420, damping: 30 }} />}
              <span className="relative">{ui(`chips.${c.key}`)}</span>
            </button>
          ))}
        </div>

        {/* how many scoops */}
        {maxCount > 1 && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="font-script text-xl text-chocolate/65">{ui("howMany")}</span>
            {Array.from({ length: maxCount }, (_, k) => k + 1).map((n) => (
              <button key={n} type="button" disabled={spinning} onClick={() => pickCount(n)} aria-pressed={count === n} className={`relative flex items-center gap-1 rounded-full px-3 py-1.5 text-sm font-black transition-colors ${count === n ? "text-cream" : "bg-white text-chocolate/75"}`}>
                {count === n && <motion.span layoutId="wheel-count" className="absolute inset-0 rounded-full bg-chocolate" transition={{ type: "spring", stiffness: 420, damping: 30 }} />}
                <span className="relative flex items-center gap-0.5">
                  {n}
                  {Array.from({ length: n }, (_, d) => (
                    <span key={d} className="ml-0.5 size-2 rounded-full" style={{ background: POINTER_COLORS[d] }} />
                  ))}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* the wheel */}
        <div className="relative mx-auto mt-6 aspect-square w-full max-w-[420px]">
          {/* pointers: one per scoop, each flies to its random place around the rim */}
          {pointers.map((p, n) => (
            <motion.div key={n} className="pointer-events-none absolute inset-0 z-20" initial={{ rotate: p, scale: 0 }} animate={{ rotate: p, scale: 1 }} transition={{ type: "spring", stiffness: 140, damping: 15 }}>
              <motion.div className="absolute -top-3 left-1/2 -ml-5" animate={spinning ? { rotate: [0, -14, 0] } : { rotate: 0 }} transition={spinning ? { duration: 0.18, repeat: Infinity, delay: n * 0.05 } : {}} style={{ transformOrigin: "50% 0%" }}>
                <svg viewBox="0 0 40 48" className="w-10 drop-shadow-[0_4px_6px_rgba(75,42,32,0.4)]" aria-hidden>
                  <path d="M20 46 L4 10 A16 16 0 1 1 36 10 Z" fill={POINTER_COLORS[n]} />
                  <circle cx="20" cy="15" r="6" fill="#FFF7EE" />
                </svg>
              </motion.div>
            </motion.div>
          ))}
          <motion.svg viewBox="-210 -210 420 420" className="h-full w-full drop-shadow-[0_24px_30px_rgba(75,42,32,0.35)]" style={{ rotate: rot }} key={chip}>
            <circle r="208" fill="#4B2A20" />
            {items.map((f, k) => {
              const mid = ((k + 0.5) * seg - 90) * (Math.PI / 180);
              const x = 138 * Math.cos(mid);
              const y = 138 * Math.sin(mid);
              const size = Math.min(84, 2 * Math.PI * 138 * (seg / 360) * 0.85);
              return (
                <g
                  key={f.id}
                  className="cursor-pointer"
                  onPointerEnter={(e) => e.pointerType === "mouse" && !spinning && setPeek((p) => (p?.pinned ? p : { k, pinned: false }))}
                  onPointerLeave={(e) => e.pointerType === "mouse" && setPeek((p) => (p?.pinned ? p : null))}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (spinning) return;
                    sfx.pop();
                    setPeek((p) => (p?.pinned && p.k === k ? null : { k, pinned: true }));
                  }}
                >
                  <path d={arc(k)} fill={k % 2 ? lighten(f.color_primary, 0.35) : lighten(f.color_primary, 0.15)} stroke="#FFF7EE" strokeWidth="3" />
                  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(k + 0.5) * seg})`}>
                    <image href={thumb(scoopPhoto(f))!} x={-size / 2} y={-size / 2} width={size} height={size} preserveAspectRatio="xMidYMid meet" />
                  </g>
                </g>
              );
            })}
            {/* lights on the rim */}
            {Array.from({ length: 24 }, (_, k) => {
              const a = (k / 24) * Math.PI * 2;
              return <circle key={k} cx={(203 * Math.cos(a)).toFixed(1)} cy={(203 * Math.sin(a)).toFixed(1)} r="3.2" fill={k % 2 ? "#FFE066" : "#FFF7EE"} />;
            })}
          </motion.svg>
          {/* the middle: tap to spin */}
          <motion.button
            type="button"
            onClick={spin}
            disabled={spinning}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.9 }}
            animate={spinning ? {} : { scale: [1, 1.06, 1] }}
            transition={spinning ? {} : { duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-1/2 left-1/2 z-10 grid size-[26%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-chocolate font-display text-xl font-bold tracking-wide text-cream shadow-[0_0_0_6px_#FFF7EE,0_10px_24px_rgba(75,42,32,0.45)] sm:text-2xl"
          >
            {spinning ? <ArrowsClockwise weight="bold" className="size-8 animate-spin" /> : ui("spin")}
          </motion.button>
          {/* the name of the scoop under the pointer / tapped */}
          <AnimatePresence>
            {peek && items[peek.k] && !spinning && (() => {
              const a = (((peek.k + 0.5) * seg - 90 + rot.get()) * Math.PI) / 180;
              const left = 50 + (138 / 210) * 50 * Math.cos(a);
              const top = 50 + (138 / 210) * 50 * Math.sin(a);
              const f = items[peek.k];
              return (
                <motion.span
                  key={f.id}
                  initial={{ opacity: 0, scale: 0.6, y: 6 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.7 }}
                  transition={{ type: "spring", stiffness: 420, damping: 22 }}
                  className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-[135%] rounded-full bg-chocolate px-3 py-1.5 text-sm font-bold whitespace-nowrap text-cream shadow-float"
                  style={{ left: `${left}%`, top: `${top}%` }}
                >
                  {t(f.name, locale)}
                  <span className="absolute top-full left-1/2 -ml-1.5 border-x-[6px] border-t-[7px] border-x-transparent border-t-chocolate" />
                </motion.span>
              );
            })()}
          </AnimatePresence>
          {winner && <Confetti colors={[...winners.map((w) => w.color_primary), winner.color_secondary, "#FFE066", "#FF8FB8", "#6FE0C4"]} />}
        </div>

        <div className="mt-5 min-h-[3.5rem]">
          <AnimatePresence mode="wait">
            {winners.length > 1 ? (
              <motion.div key="wins" initial={{ scale: 0.4, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 14 }}>
                <p className="font-display text-2xl sm:text-3xl">{ui("wonMany")}</p>
                <div className="mt-2 flex flex-wrap justify-center gap-2">
                  {winners.map((w, n) => (
                    <motion.button
                      key={w.id}
                      type="button"
                      onClick={() => onResult(w)}
                      initial={{ scale: 0, rotate: -20 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{ type: "spring", stiffness: 380, damping: 14, delay: 0.1 + n * 0.12 }}
                      className="flex items-center gap-1.5 rounded-full bg-white py-1 pr-3.5 pl-1 font-bold"
                      style={{ boxShadow: `0 0 0 3px ${POINTER_COLORS[n]}` }}
                    >
                      <img src={thumb(scoopPhoto(w))!} alt="" className="size-8 object-contain" />
                      {t(w.name, locale)}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            ) : winner ? (
              <motion.p key="win" initial={{ scale: 0.4, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 320, damping: 14 }} className="font-display text-2xl sm:text-3xl">
                {ui("won")} <span className="text-[#F0527F]">{t(winner.name, locale)}</span>!
              </motion.p>
            ) : (
              <motion.p key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-script text-2xl text-chocolate/60">
                {spinning ? ui("spinning") : ui("hint")}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

/** A burst of paper confetti from the middle of the wheel. */
function Confetti({ colors }: { colors: string[] }) {
  const bits = useMemo(
    () =>
      Array.from({ length: 70 }, (_, i) => {
        const a = Math.random() * Math.PI * 2;
        const v = 120 + Math.random() * 260;
        return { i, x: Math.cos(a) * v, y: Math.sin(a) * v - 120, r: Math.random() * 720 - 360, c: colors[i % colors.length], w: 6 + Math.random() * 8, round: i % 4 === 0 };
      }),
    [colors],
  );
  return (
    <div className="pointer-events-none absolute top-1/2 left-1/2 z-30" aria-hidden>
      {bits.map((b) => (
        <motion.span
          key={b.i}
          className={`absolute block ${b.round ? "rounded-full" : "rounded-[2px]"}`}
          style={{ width: b.w, height: b.round ? b.w : b.w * 0.45, background: b.c }}
          initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
          animate={{ x: b.x, y: [0, b.y, b.y + 260], rotate: b.r, opacity: [1, 1, 0] }}
          transition={{ duration: 1.8, ease: [0.2, 0.8, 0.4, 1], times: [0, 0.45, 1] }}
        />
      ))}
    </div>
  );
}
