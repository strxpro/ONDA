"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLocale } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { LOCALE_NAMES, type Locale } from "@/lib/shared";
import { Flag } from "./ui/Flag";

export const LANG_EVENT = "onda:langswap";
const HELLO: Record<Locale, string> = { it: "Ciao!", pl: "Cześć!", en: "Hello!", es: "¡Hola!", de: "Hallo!", fr: "Salut !" };
const EASE = [0.76, 0, 0.24, 1] as const;

/**
 * Language switch: a pastel wave sweeps across the screen (only a transform — smooth even on old phones), the texts
 * change underneath it, and it sweeps on out the other side. Nothing is blurred, nothing reloads.
 */
export function LangWave() {
  const locale = useLocale() as Locale;
  const [to, setTo] = useState<Locale | null>(null);
  const [phase, setPhase] = useState<"in" | "out" | null>(null);
  const covered = useRef(false);
  const arrived = useRef(false);

  useEffect(() => {
    const on = (e: Event) => {
      const l = (e as CustomEvent<Locale>).detail;
      covered.current = false;
      arrived.current = false;
      setTo(l);
      setPhase("in");
    };
    window.addEventListener(LANG_EVENT, on);
    return () => window.removeEventListener(LANG_EVENT, on);
  }, []);

  // the new language is on the page: leave as soon as the screen is covered
  useEffect(() => {
    if (!to || locale !== to) return;
    arrived.current = true;
    if (covered.current) setPhase("out");
  }, [locale, to]);

  // never stay on screen (a slow network): leave anyway
  useEffect(() => {
    if (phase !== "in") return;
    const id = window.setTimeout(() => setPhase("out"), 2500);
    return () => window.clearTimeout(id);
  }, [phase]);

  return (
    <AnimatePresence onExitComplete={() => setTo(null)}>
      {phase && to && (
        <motion.div
          key="wave"
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[120]"
          initial={{ x: "-110%" }}
          animate={{ x: phase === "in" ? "0%" : "110%" }}
          exit={{ x: "110%" }}
          transition={{ duration: phase === "in" ? 0.42 : 0.55, ease: EASE }}
          onAnimationComplete={() => {
            if (phase === "in") {
              covered.current = true;
              if (arrived.current) setPhase("out");
            } else setPhase(null);
          }}
        >
          {/* the trailing waves + the cream body */}
          <svg className="absolute inset-y-0 -left-[16vw] h-full w-[17vw]" viewBox="0 0 100 800" preserveAspectRatio="none">
            <path d="M100 0 C40 70 95 150 50 210 C5 270 90 350 40 410 C-5 470 90 550 45 610 C0 670 85 740 50 800 H100 Z" fill="#6FE0C4" />
          </svg>
          <svg className="absolute inset-y-0 -left-[9vw] h-full w-[10vw]" viewBox="0 0 100 800" preserveAspectRatio="none">
            <path d="M100 0 C30 60 90 140 40 200 C-10 260 80 340 30 400 C-20 460 80 540 30 600 C-10 660 80 740 40 800 H100 Z" fill="#FF8FB8" />
          </svg>
          <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(70%_60%_at_50%_45%,#FFF7EE,#FFE9DA)]">
            <motion.div initial={{ scale: 0.6, opacity: 0, rotate: -8 }} animate={{ scale: 1, opacity: 1, rotate: 0 }} transition={{ delay: 0.18, type: "spring", stiffness: 300, damping: 16 }} className="flex flex-col items-center gap-3 text-chocolate">
              <Flag locale={to} className="size-20 drop-shadow-[0_12px_20px_rgba(75,42,32,0.25)]" />
              <p className="font-display text-5xl font-bold">{HELLO[to]}</p>
              <p className="font-script text-2xl text-chocolate/60">{LOCALE_NAMES[to]}</p>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
