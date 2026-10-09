"use client";

import { SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";
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
      className={`relative grid size-10 shrink-0 place-items-center rounded-full shadow-soft transition-colors ${on ? "bg-lemon" : "bg-white"}`}
    >
      {on ? <SpeakerHigh weight="duotone" className="size-5" /> : <SpeakerSlash weight="duotone" className="size-5 opacity-60" />}
      {on && (
        <span className="absolute -top-1 -right-1 flex gap-0.5" aria-hidden>
          {[0, 1, 2].map((i) => (
            <motion.span key={i} className="block w-0.5 rounded-full bg-chocolate" animate={{ height: [3, 8, 4, 7, 3] }} transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </span>
      )}
    </motion.button>
  );
}
