"use client";

import { Bicycle, Storefront, NavigationArrow, Phone, ShoppingBag } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { hhmm, isOpenNow, nowIn } from "@/lib/hours";
import { t } from "@/lib/shared";
import { useSite } from "../providers/SiteData";
import { LogoMark } from "../ui/Logo";
import { Title } from "../ui/Title";

/** A postcard of the square, and the shop-door sign that flips APERTO / CHIUSO by itself. */
export function Visit() {
  const { data, locale } = useSite();
  const s = data.settings;
  const ui = useTranslations("ui");
  const weekdays = ui.raw("weekdays") as string[];
  const [today, setToday] = useState<number | null>(null);
  const [open, setOpen] = useState<boolean | null>(null);
  useEffect(() => {
    const check = () => {
      setToday(nowIn(s.timezone).weekday);
      setOpen(isOpenNow(data.hours, data.specialDays, s.timezone));
    };
    check();
    const id = window.setInterval(check, 60_000);
    return () => window.clearInterval(id);
  }, [data.hours, data.specialDays, s.timezone]);
  const upcoming = data.specialDays.slice(0, 3);

  return (
    <section id="visit" className="relative flex min-h-svh flex-col justify-center py-20">
      <div className="relative mx-auto max-w-6xl px-(--gutter)">
        <Title color="#6FE0C4">
          {t(s.texts.visit_title, locale)}
        </Title>

        <div className="mt-12 grid items-start gap-12 md:grid-cols-[1.15fr_1fr]">
          {/* postcard */}
          <motion.a
            href={s.maps_url ?? undefined}
            target="_blank"
            rel="noopener"
            aria-label={ui("navigate")}
            initial={{ y: 60, opacity: 0, rotate: -8 }}
            whileInView={{ y: 0, opacity: 1, rotate: -2.5 }}
            whileHover={{ rotate: -1, y: -4 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ type: "spring", stiffness: 90, damping: 14 }}
            className="relative block rounded-md bg-[#fffdf8] p-3 pb-14 shadow-[0_30px_60px_-24px_rgba(20,60,50,0.55)]"
          >
            <div className="overflow-hidden rounded-sm">
              <StylizedMap />
            </div>
            {/* stamp */}
            <div className="absolute -top-5 -right-3 w-20 rotate-6 rounded-sm border-[3px] border-dotted border-pink bg-[#fffdf8] p-1.5 shadow-md">
              <div className="grid aspect-[4/5] place-items-center bg-pink-soft">
                <LogoMark className="h-12 w-auto" />
              </div>
            </div>
            {/* postmark */}
            <svg viewBox="0 0 120 60" className="absolute top-4 right-16 w-28 opacity-50" aria-hidden>
              <circle cx="30" cy="30" r="24" fill="none" stroke="#4B2A20" strokeWidth="2" />
              <text x="30" y="34" textAnchor="middle" fontSize="9" fontWeight="700" fill="#4B2A20">S. TERESA</text>
              {[16, 26, 36, 46].map((y) => (
                <path key={y} d={`M58 ${y} C70 ${y - 6} 82 ${y + 6} 94 ${y} S112 ${y - 6} 118 ${y}`} fill="none" stroke="#4B2A20" strokeWidth="2" />
              ))}
            </svg>
            <p className="absolute right-4 bottom-3 left-4 font-script text-2xl leading-tight text-chocolate/80">{s.address}</p>
          </motion.a>

          {/* door sign + hours card */}
          <div className="relative flex flex-col items-center md:items-start">
            <div className="swing relative w-72">
              <svg viewBox="0 0 200 60" className="block w-full" aria-hidden>
                <path d="M30 58 L100 6 L170 58" fill="none" stroke="#4B2A20" strokeWidth="2.5" />
                <circle cx="100" cy="6" r="5" fill="#9aa2ac" />
              </svg>
              <motion.div
                key={String(open)}
                initial={{ rotateY: 90 }}
                animate={{ rotateY: 0 }}
                transition={{ type: "spring", stiffness: 160, damping: 14 }}
                className={`-mt-1 rounded-2xl border-4 border-white px-6 py-4 text-center shadow-[0_18px_30px_-12px_rgba(0,0,0,0.35)] ${open ? "bg-[#2e9e5b]" : "bg-[#c0392b]"} ${open === null ? "opacity-0" : ""}`}
                style={{ transformPerspective: 600 }}
              >
                <p className="font-display text-3xl font-bold tracking-[0.1em] whitespace-nowrap text-white uppercase">{open ? ui("openNow") : ui("closed")}</p>
              </motion.div>
            </div>

            <motion.div
              initial={{ y: 40, opacity: 0, rotate: 3 }}
              whileInView={{ y: 0, opacity: 1, rotate: 1.5 }}
              viewport={{ once: true }}
              transition={{ type: "spring", stiffness: 90, damping: 14, delay: 0.15 }}
              className="mt-8 w-full max-w-sm rounded-md bg-[#fffdf8] px-6 py-5 shadow-[0_24px_50px_-24px_rgba(20,60,50,0.6)]"
            >
              <ul>
                {data.hours.map((h) => (
                  <li key={h.weekday} className={`flex justify-between gap-3 py-0.5 font-script text-2xl ${today === h.weekday ? "font-bold text-chocolate" : "text-chocolate/75"}`}>
                    <span>
                      {today === h.weekday && <span className="mr-1 text-cherry">→</span>}
                      {weekdays[h.weekday - 1]}
                    </span>
                    <span className="tabular-nums">{h.is_closed ? ui("closed") : `${hhmm(h.open_time)} – ${hhmm(h.close_time)}`}</span>
                  </li>
                ))}
              </ul>
              {upcoming.length > 0 && (
                <ul className="mt-3 border-t border-dashed border-chocolate/20 pt-2">
                  {upcoming.map((d) => (
                    <li key={d.date} className="flex justify-between gap-3 font-script text-xl text-cherry">
                      <span>
                        {new Date(`${d.date}T12:00:00`).toLocaleDateString(locale, { weekday: "short", day: "numeric", month: "short" })}
                        {t(d.note, locale) && ` · ${t(d.note, locale)}`}
                      </span>
                      <span className="tabular-nums">{d.is_closed ? ui("closed") : `${hhmm(d.open_time)} – ${hhmm(d.close_time)}`}</span>
                    </li>
                  ))}
                </ul>
              )}
            </motion.div>

            {/* from the Google Business Profile */}
            <ul className="mt-6 flex flex-wrap justify-center gap-2 md:justify-start">
              {([["dineIn", Storefront], ["takeaway", ShoppingBag], ["delivery", Bicycle]] as const).map(([k, Icon]) => (
                <li key={k} className="flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5 text-sm font-bold">
                  <Icon weight="duotone" className="size-5" /> {ui(`services.${k}`)}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap justify-center gap-3 md:justify-start">
              {s.phone && (
                <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="btn-candy bg-pink">
                  <Phone weight="duotone" className="size-6" /> <span className="tabular-nums">{s.phone.replace(/^\+39\s*/, "")}</span>
                </a>
              )}
              {s.maps_url && (
                <a href={s.maps_url} target="_blank" rel="noopener" className="btn-candy bg-lemon">
                  <NavigationArrow weight="duotone" className="size-6" /> {ui("navigate")}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Stylized seaside map of Santa Teresa with a bouncing pin on the shop. */
function StylizedMap() {
  return (
    <svg viewBox="0 0 400 260" className="block h-full w-full" role="img" aria-label="Santa Teresa Gallura">
      <rect width="400" height="260" fill="#8fd8ef" />
      {[30, 62, 94].map((y, i) => (
        <path key={y} d={`M-20 ${y} C40 ${y - 10} 80 ${y + 10} 140 ${y} S260 ${y - 10} 320 ${y} S420 ${y + 10} 460 ${y}`} fill="none" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round">
          <animateTransform attributeName="transform" type="translate" values="0 0; -30 0; 0 0" dur={`${6 + i}s`} repeatCount="indefinite" />
        </path>
      ))}
      <path d="M0 120 C60 100 100 130 150 110 C200 90 230 120 290 100 C340 82 370 110 400 98 V260 H0 Z" fill="#E3F5D1" />
      <path d="M0 120 C60 100 100 130 150 110 C200 90 230 120 290 100 C340 82 370 110 400 98" fill="none" stroke="#FFF4BD" strokeWidth="10" opacity="0.9" />
      <g stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none">
        <path d="M60 260 L150 170 L330 140" />
        <path d="M200 260 L210 170" />
        <path d="M150 170 L120 130" />
      </g>
      <circle cx="205" cy="185" r="30" fill="#FFD6E5" />
      <text x="205" y="232" textAnchor="middle" fontFamily="var(--font-script)" fontSize="20" fill="#4B2A20">
        Via Amsicora 2
      </text>
      <ellipse cx="205" cy="184" rx="13" ry="4" fill="#4B2A20" opacity="0.2">
        <animate attributeName="rx" values="13;8;13" dur="1.4s" repeatCount="indefinite" />
      </ellipse>
      <g>
        <animateTransform attributeName="transform" type="translate" values="0 0; 0 -12; 0 0" dur="1.4s" repeatCount="indefinite" calcMode="spline" keySplines=".5 0 .5 1; .5 0 .5 1" />
        <path d="M205 180 C186 156 180 144 180 132 C180 118 191 107 205 107 C219 107 230 118 230 132 C230 144 224 156 205 180 Z" fill="#E5243F" />
        <circle cx="205" cy="132" r="9" fill="#fff" />
      </g>
      <text x="320" y="50" textAnchor="middle" fontFamily="var(--font-script)" fontSize="24" fill="#fff">
        Mare
      </text>
    </svg>
  );
}
