"use client";

import { motion } from "motion/react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { t, type Locale, type PriceItem } from "@/lib/shared";
import { useSite } from "../providers/SiteData";
import { RollingPrice } from "../ui/RollingPrice";
import { Title } from "../ui/Title";
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
  const extras = data.prices.filter((p) => p.is_active && p.price_group === "extra");

  return (
    <section id="prices" className="relative py-20 sm:py-28">
      <div className="mx-auto w-full max-w-6xl px-(--gutter)">
        <Title color="#FFAA5C">{t(s.texts.prices_title, locale)}</Title>

        <ul className="mt-12 grid gap-y-10 sm:mt-16 md:grid-cols-2 md:gap-x-10 md:gap-y-0">
          {treats.map((p, i) => (
            <Splash key={p.id} item={p} index={i} locale={locale} />
          ))}
        </ul>

        {extras.length > 0 && (
          <ul className="mt-16 flex flex-wrap justify-center gap-2 sm:gap-3">
            {extras.map((p, i) => (
              <li key={p.id} className="flex items-center gap-3 rounded-full bg-white/80 py-2 pr-2 pl-4 font-bold shadow-soft">
                <span>{t(p.label, locale)}</span>
                <span className="rounded-full px-3 py-0.5 font-display text-lg" style={{ background: COLORS[(i + 2) % COLORS.length] }}>
                  <RollingPrice value={p.price_eur} locale={locale} />
                </span>
              </li>
            ))}
          </ul>
        )}
        <OrderCard />
        <p className="sr-only">{ui("coneOrCup")}</p>
      </div>
    </section>
  );
}

function Splash({ item: p, index: i, locale }: { item: PriceItem; index: number; locale: Locale }) {
  const color = COLORS[i % COLORS.length];
  const right = i % 2 === 1; // zig-zag: photo left, then right…
  const sp = splash(i * 11 + 3);
  return (
    <motion.li
      className={`group flex items-center gap-5 sm:gap-8 ${right ? "flex-row-reverse text-right md:translate-y-[45%]" : ""}`}
      initial={{ opacity: 0, x: right ? 60 : -60 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true, margin: "-12% 0px" }}
      transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="relative w-[50%] max-w-[360px] shrink-0">
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
        <div className="absolute inset-[16%] overflow-hidden rounded-full border-4 border-white shadow-[0_24px_40px_-20px_rgba(75,42,32,0.5)] transition-transform duration-700 ease-(--ease-gelato) group-hover:-translate-y-2">
          {p.image_url && <Image src={p.image_url} alt={t(p.label, locale)} fill sizes="(max-width: 768px) 40vw, 220px" className="object-cover transition-transform duration-700 ease-(--ease-gelato) group-hover:scale-110" />}
        </div>
      </div>
      <div className="min-w-0">
        <h3 className="font-display text-[clamp(1.9rem,4vw,3.2rem)] leading-[1.02]">{t(p.label, locale)}</h3>
        {p.price_eur > 0 && <RollingPrice value={p.price_eur} locale={locale} className="mt-2 block font-display text-3xl font-bold sm:text-4xl" />}
      </div>
    </motion.li>
  );
}
