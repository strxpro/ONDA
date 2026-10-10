"use client";

import {
  ArrowSquareOut,
  CalendarCheck,
  ChatCircleDots,
  QrCode,
  ChartLineUp,
  ClockCounterClockwise,
  Clock,
  CurrencyEur,
  DotsThreeCircle,
  Images,
  IceCream,
  Megaphone,
  Sliders,
  SquaresFour,
  Star,
  TextAa,
} from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Scoop } from "../ice/Scoop";

const MAIN = [
  { href: "/admin", label: "Oggi", icon: ChartLineUp },
  { href: "/admin/gusti", label: "Gusti", icon: IceCream },
  { href: "/admin/prezzi", label: "Prezzi", icon: CurrencyEur },
  { href: "/admin/orari", label: "Orari", icon: Clock },
];
const MORE = [
  { href: "/admin/banner", label: "Banner", icon: Megaphone },
  { href: "/admin/galleria", label: "Galleria", icon: Images },
  { href: "/admin/testi", label: "Testi e dati", icon: TextAa },
  { href: "/admin/recensioni", label: "Recensioni", icon: Star },
  { href: "/admin/prenotazioni", label: "Prenotazioni", icon: CalendarCheck },
  { href: "/admin/commenti", label: "Commenti", icon: ChatCircleDots },
  { href: "/admin/qr", label: "QR recensioni", icon: QrCode },
  { href: "/admin/sezioni", label: "Sezioni", icon: SquaresFour },
  { href: "/admin/animazioni", label: "Animazioni", icon: Sliders },
  { href: "/admin/cronologia", label: "Cronologia", icon: ClockCounterClockwise },
];

export function AdminNav({ actor, local }: { actor: string; local: boolean }) {
  const path = usePathname();
  const [more, setMore] = useState(false);
  // the same waffle-cone cursor as the site (desktop)
  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    document.documentElement.classList.add("cone-cursor");
    return () => document.documentElement.classList.remove("cone-cursor");
  }, []);
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path.startsWith(href));

  return (
    <>
      {/* desktop sidebar */}
      <aside className="sticky top-0 hidden h-svh w-64 shrink-0 flex-col gap-1 border-r border-chocolate/10 bg-white/60 p-4 md:flex">
        <Link href="/admin" className="mb-4 flex items-center gap-2 font-display text-2xl font-bold">
          <Scoop color="#FF8FB8" texture="chunks" color2="#E5243F" className="w-10" /> Onda
        </Link>
        {[...MAIN, ...MORE].map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href} className={`flex min-h-11 items-center gap-3 rounded-2xl px-3 font-bold transition-colors ${active(href) ? "bg-chocolate text-cream" : "hover:bg-chocolate/5"}`}>
            <Icon weight={active(href) ? "fill" : "duotone"} className="size-5" /> {label}
          </Link>
        ))}
        <div className="mt-auto space-y-2 text-xs font-semibold text-chocolate/60">
          <a href="/it" target="_blank" className="flex items-center gap-1 font-bold text-chocolate">
            Apri il sito <ArrowSquareOut className="size-4" />
          </a>
          {local && <p className="rounded-xl bg-lemon-soft p-2">Modalità locale: i dati sono in .data/onda.json</p>}
          <p className="truncate">{actor}</p>
        </div>
      </aside>

      {/* phone: bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-[100] border-t border-chocolate/10 bg-white/90 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <div className="grid grid-cols-5">
          {MAIN.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${active(href) ? "text-chocolate" : "text-chocolate/50"}`}>
              <Icon weight={active(href) ? "fill" : "duotone"} className="size-7" /> {label}
            </Link>
          ))}
          <button type="button" onClick={() => setMore(true)} className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-bold ${MORE.some((m) => active(m.href)) ? "text-chocolate" : "text-chocolate/50"}`}>
            <DotsThreeCircle weight="duotone" className="size-7" /> Altro
          </button>
        </div>
      </nav>
      <AnimatePresence>
        {more && (
          <motion.div className="fixed inset-0 z-[120] md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-chocolate/40" onClick={() => setMore(false)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }} className="absolute inset-x-0 bottom-0 grid grid-cols-3 gap-2 rounded-t-[2rem] bg-cream p-4 pb-10">
              {MORE.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} onClick={() => setMore(false)} className={`flex flex-col items-center gap-1 rounded-2xl p-3 text-center text-sm font-bold ${active(href) ? "bg-chocolate text-cream" : "bg-white"}`}>
                  <Icon weight="duotone" className="size-8" /> {label}
                </Link>
              ))}
              <a href="/it" target="_blank" className="flex flex-col items-center gap-1 rounded-2xl bg-white p-3 text-center text-sm font-bold">
                <ArrowSquareOut weight="duotone" className="size-8" /> Il sito
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
