"use client";

import { motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { music, onSound, setSound, sfx, soundOn } from "@/lib/sound";

/** Speaker button: music + sound effects on/off (off by default). Also gives every button on the page a soft click. */
export function SoundToggle() {
  const ui = useTranslations("ui");
  const [on, setOn] = useState(false);

  useEffect(() => {
    setOn(soundOn());
    const off = onSound(setOn);
    // browsers only allow audio after a gesture: resume the music on the first tap if it was left on
    const first = () => soundOn() && music.start();
    window.addEventListener("pointerdown", first, { once: true });
    const click = (e: PointerEvent) => (e.target as Element | null)?.closest?.("button, a, [role=button]") && sfx.click();
    window.addEventListener("pointerdown", click);
    return () => {
      off();
      window.removeEventListener("pointerdown", first);
      window.removeEventListener("pointerdown", click);
    };
  }, []);

  return (
    <motion.button
      type="button"
      whileTap={{ scale: 0.85 }}
      onClick={() => setSound(!on)}
      aria-pressed={on}
      aria-label={on ? ui("soundOff") : ui("soundOn")}
      title={on ? ui("soundOff") : ui("soundOn")}
      className={`relative grid size-10 shrink-0 place-items-center rounded-full shadow-soft transition-colors duration-500 ${on ? "bg-lemon" : "bg-white"}`}
    >
      {/* one speaker; its sound waves draw in (and breathe) when the sound is on, a soft slash when off */}
      <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9.5h3l4.5-4v13L7 14.5H4z" fill="currentColor" fillOpacity=".18" />
        {[
          "M15 9.2a4 4 0 0 1 0 5.6",
          "M17.6 6.8a7.4 7.4 0 0 1 0 10.4",
        ].map((d, i) => (
          <motion.path
            key={d}
            d={d}
            initial={false}
            animate={on ? { pathLength: 1, opacity: [1, 0.45, 1] } : { pathLength: 0, opacity: 0 }}
            transition={on ? { pathLength: { duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }, opacity: { duration: 1.6, repeat: Infinity, delay: 0.6 + i * 0.3, ease: "easeInOut" } } : { duration: 0.3 }}
          />
        ))}
        <motion.path d="M15.5 9.5l5 5M20.5 9.5l-5 5" initial={false} animate={on ? { pathLength: 0, opacity: 0 } : { pathLength: 1, opacity: 0.55 }} transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }} />
      </svg>
    </motion.button>
  );
}
