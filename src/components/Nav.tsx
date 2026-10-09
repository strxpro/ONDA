"use client";

import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { useState } from "react";
import { useSite } from "./providers/SiteData";
import { LangSwitch } from "./ui/LangSwitch";
import { Logo } from "./ui/Logo";
import { OpenBadge } from "./ui/OpenBadge";
import { SoundToggle } from "./ui/SoundToggle";

/** Floating glass pill; hides while scrolling down, comes back on scroll up. */
export function Nav() {
  const { data } = useSite();
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, "change", (y) => {
    const prev = scrollY.getPrevious() ?? 0;
    setHidden(y > prev && y > 240);
    setScrolled(y > 40);
  });

  return (
    <motion.header
      className="fixed inset-x-0 top-3 z-50 px-3 sm:top-5"
      animate={{ y: hidden ? -120 : 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 30 }}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-2 rounded-full py-1.5 pr-1.5 pl-2 transition-all duration-500 ${scrolled ? "glass shadow-float" : "bg-transparent"}`}
      >
        <a href="#top" className="group shrink-0" aria-label={data.settings.name}>
          <Logo tagline="gelateria artigianale" spin />
        </a>
        <OpenBadge hours={data.hours} specialDays={data.specialDays} timeZone={data.settings.timezone} />
        <div className="flex items-center gap-1.5">
          <SoundToggle />
          <LangSwitch />
        </div>
      </div>
    </motion.header>
  );
}
