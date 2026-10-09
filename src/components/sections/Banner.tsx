"use client";

import { Megaphone, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { t } from "@/lib/shared";
import { useSite } from "../providers/SiteData";

/** Announcement ribbon with a wavy edge; slides in once the page is revealed and on every live change. */
export function Banner() {
  const { data, locale } = useSite();
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const [now, setNow] = useState(0);

  useEffect(() => {
    const show = () => setReady(true);
    if (document.documentElement.dataset.revealed) show();
    else window.addEventListener("onda:revealed", show, { once: true });
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => {
      window.removeEventListener("onda:revealed", show);
      window.clearInterval(id);
    };
  }, []);

  const active = data.announcements.find((x) => x.is_active && (!x.starts_at || Date.parse(x.starts_at) <= now) && (!x.ends_at || Date.parse(x.ends_at) > now));
  const visible = ready && now > 0 && active && dismissed !== active.id;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key={active.id}
          className="fixed inset-x-0 bottom-0 z-40 sm:top-[88px] sm:bottom-auto"
          initial={{ y: "130%" }}
          animate={{ y: 0 }}
          exit={{ y: "130%" }}
          transition={{ type: "spring", stiffness: 200, damping: 22, delay: 0.4 }}
          role="status"
        >
          <svg viewBox="0 0 1440 24" preserveAspectRatio="none" className="block h-4 w-full sm:hidden" aria-hidden>
            <path d="M0 24 V12 C240 0 480 24 720 12 C960 0 1200 24 1440 12 V24 Z" fill={active.color} />
          </svg>
          <div className="flex items-center justify-center gap-3 px-4 py-3 text-center font-display text-lg font-semibold" style={{ background: active.color }}>
            <motion.span animate={{ rotate: [0, -14, 10, 0] }} transition={{ duration: 1, repeat: Infinity, repeatDelay: 2.5 }}>
              <Megaphone weight="duotone" className="size-6" />
            </motion.span>
            {t(active.text, locale)}
            <button type="button" onClick={() => setDismissed(active.id)} className="grid size-8 shrink-0 place-items-center rounded-full bg-cream/70" aria-label="Close">
              <X weight="bold" className="size-4" />
            </button>
          </div>
          <svg viewBox="0 0 1440 24" preserveAspectRatio="none" className="hidden h-4 w-full sm:block" aria-hidden>
            <path d="M0 0 V12 C240 24 480 0 720 12 C960 24 1200 0 1440 12 V0 Z" fill={active.color} />
          </svg>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
