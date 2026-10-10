"use client";

import { CaretDown, Check } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { LANG_EVENT } from "../LangWave";
import { LOCALE_NAMES, LOCALES, type Locale } from "@/lib/shared";
import { Flag } from "./Flag";

/** Flag dropdown (nav). `inline` renders all flags in a row (footer). */
export function LangSwitch({ inline = false, dark = false }: { inline?: boolean; dark?: boolean }) {
  const locale = useLocale() as Locale;
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  // the other languages are fetched ahead (on hover / when the menu opens), so the switch is instant
  const prefetch = () => LOCALES.forEach((l) => l !== locale && router.prefetch(pathname, { locale: l }));
  const swap = (l: Locale) => l !== locale && window.dispatchEvent(new CustomEvent(LANG_EVENT, { detail: l }));

  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (inline) {
    return (
      <nav aria-label="Language" className="flex flex-wrap gap-2">
        {LOCALES.map((l) => (
          <Link
            key={l}
            href={pathname}
            locale={l}
            scroll={false}
            onClick={() => swap(l)}
            onPointerEnter={prefetch}
            aria-current={l === locale ? "true" : undefined}
            className={`flex items-center gap-2 rounded-full py-1 pr-3 pl-1 text-sm font-bold transition-all duration-300 ease-(--ease-gelato) hover:scale-105 ${l === locale ? (dark ? "bg-cream text-chocolate" : "bg-chocolate text-cream") : dark ? "bg-white/10 text-cream" : "bg-white/60"}`}
          >
            <Flag locale={l} className="size-6" />
            {LOCALE_NAMES[l]}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => (prefetch(), setOpen((o) => !o))}
        onPointerEnter={prefetch}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={LOCALE_NAMES[locale]}
        className="flex items-center gap-1.5 rounded-full bg-white/70 py-1 pr-2.5 pl-1 font-display text-sm font-semibold uppercase transition-transform duration-300 ease-(--ease-gelato) hover:scale-105 active:scale-95"
      >
        <Flag locale={locale} className="size-8" />
        <span className="hidden sm:inline">{locale}</span>
        <CaretDown weight="bold" className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="menu"
            initial={{ opacity: 0, y: -8, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 420, damping: 28 }}
            className="glass absolute top-full right-0 mt-2 w-48 origin-top-right overflow-hidden rounded-3xl p-1.5 shadow-float"
          >
            {LOCALES.map((l, i) => (
              <motion.li key={l} role="none" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}>
                <Link
                  role="menuitem"
                  href={pathname}
                  locale={l}
                  scroll={false}
                  onClick={() => (setOpen(false), swap(l))}
                  className={`flex items-center gap-3 rounded-2xl px-2.5 py-2 font-semibold transition-colors hover:bg-white/80 ${l === locale ? "bg-white" : ""}`}
                >
                  <Flag locale={l} className="size-7" />
                  <span className="flex-1">{LOCALE_NAMES[l]}</span>
                  {l === locale && <Check weight="bold" className="size-4" />}
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
