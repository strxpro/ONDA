"use client";

import { useLocale } from "next-intl";
import { useEffect } from "react";

/** When the visitor leaves the tab, its title gently calls them back (a few lines, rotating); it comes back on return. */
const MISS: Record<string, string[]> = {
  it: ["🍦 Ci manchi già…", "🍦 Il gelato ti aspetta!", "🍨 Torna, si scioglie!"],
  pl: ["🍦 Już tęsknimy…", "🍦 Lody czekają na Ciebie!", "🍨 Wróć, zanim się roztopią!"],
  en: ["🍦 We miss you already…", "🍦 Your gelato is waiting!", "🍨 Come back, it's melting!"],
  es: ["🍦 Ya te echamos de menos…", "🍦 ¡Tu helado te espera!", "🍨 ¡Vuelve, que se derrite!"],
  de: ["🍦 Wir vermissen dich schon…", "🍦 Dein Eis wartet auf dich!", "🍨 Komm zurück, es schmilzt!"],
  fr: ["🍦 Tu nous manques déjà…", "🍦 Ta glace t'attend !", "🍨 Reviens, elle fond !"],
};

export function TabTitle() {
  const locale = useLocale();
  useEffect(() => {
    const lines = MISS[locale] ?? MISS.it;
    let original = document.title;
    let timer: ReturnType<typeof setInterval> | undefined;
    const onVis = () => {
      if (document.hidden) {
        original = document.title;
        let i = 0;
        document.title = lines[0];
        timer = setInterval(() => (document.title = lines[++i % lines.length]), 2600);
      } else {
        clearInterval(timer);
        document.title = original;
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [locale]);
  return null;
}
