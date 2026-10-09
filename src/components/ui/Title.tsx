"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

/**
 * Section title: chunky chocolate letters that plop in, a hand-drawn underline in the section's
 * color, and an optional handwritten note (with a little arrow) — like the chalk notes in a shop.
 */
export function Title({ children, color, note, align = "left", light = false }: { children: string; color: string; note?: ReactNode; align?: "left" | "center"; light?: boolean }) {
  const words = children.split(" ");
  return (
    <div className={`relative pb-5 sm:pb-7 ${align === "center" ? "text-center" : ""}`}>
      <h2 className={`relative inline-block font-display text-title font-bold ${light ? "text-cream" : "text-chocolate"}`} aria-label={children}>
        {words.map((w, wi) => (
          <span key={wi} className="inline-block whitespace-nowrap" aria-hidden>
            {[...w].map((ch, ci) => (
              <motion.span
                key={ci}
                className="inline-block"
                initial={{ y: "70%", opacity: 0, rotate: 8 }}
                whileInView={{ y: 0, opacity: 1, rotate: 0 }}
                viewport={{ once: true, margin: "-10% 0px" }}
                transition={{ type: "spring", stiffness: 260, damping: 16, delay: (wi * 5 + ci) * 0.028 }}
              >
                {ch}
              </motion.span>
            ))}
            {wi < words.length - 1 && <span className="inline-block w-[0.26em]" />}
          </span>
        ))}
        <svg viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute -bottom-[0.42em] left-[2%] h-[0.26em] w-[96%] overflow-visible" aria-hidden>
          <motion.path
            d="M4 14 C40 4 70 22 108 12 C146 2 176 22 214 12 C244 5 270 16 296 10"
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true, margin: "-10% 0px" }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.65, 0, 0.35, 1] }}
          />
        </svg>
      </h2>
      {note && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.6, type: "spring", stiffness: 160, damping: 14 }}
          className={`mt-5 flex items-start gap-2 font-script text-xl leading-snug sm:text-2xl ${light ? "text-cream/85" : "text-chocolate/70"} ${align === "center" ? "justify-center" : ""}`}
        >
          <span className="max-w-md">{note}</span>
        </motion.div>
      )}
    </div>
  );
}
