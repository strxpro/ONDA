"use client";

import { AnimatePresence, motion } from "motion/react";

/** Price where every digit rolls like an odometer when the value changes. */
export function RollingPrice({ value, locale, className = "" }: { value: number; locale: string; className?: string }) {
  const text = new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(value);
  return (
    <span className={`inline-flex overflow-hidden tabular-nums ${className}`} aria-label={text}>
      {[...text].map((ch, i) => (
        <span key={i} className="relative inline-block" aria-hidden>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={ch + i}
              className="inline-block whitespace-pre"
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "-100%", opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 22, delay: i * 0.03 }}
            >
              {ch}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  );
}
