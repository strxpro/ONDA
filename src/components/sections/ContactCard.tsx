"use client";

/* eslint-disable @next/next/no-img-element */
import { Cake, ChatCircleDots, CheckCircle, IceCream, PaperPlaneTilt, Translate } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { sfx } from "@/lib/sound";
import { useSite } from "../providers/SiteData";
import { ScoopModal } from "../ui/ScoopModal";
import { CakeOrder } from "./CakeOrder";
import { OrderForm } from "./OrderCard";

type Tab = "message" | "gelato" | "cake";

/**
 * The shop's contact card (opens from the photo of the shop): write to us in your own language — it reaches the
 * owner in Italian and the answer comes back in yours — or, with the hot buttons, book gelato or a gelato cake
 * right here, in the same card.
 */
export function ContactCard({ from, onClosed }: { from: DOMRect | null; onClosed: () => void }) {
  const ui = useTranslations("ui.contact");
  const [tab, setTab] = useState<Tab>("message");
  const tabs: [Tab, typeof ChatCircleDots, string][] = [
    ["message", ChatCircleDots, "#FF8FB8"],
    ["gelato", IceCream, "#FFE066"],
    ["cake", Cake, "#6FE0C4"],
  ];
  return (
    <ScoopModal from={from} onClosed={onClosed} label={ui("title")} width={tab === "cake" ? 1040 : 900}>
      {/* the shop, as a header */}
      <div className="relative h-44 overflow-hidden sm:h-56">
        <img src="/img/shop.webp" alt="" className="h-full w-full object-cover" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,247,238,0)_30%,#FFF7EE_100%)]" />
        <div className="absolute right-6 bottom-2 left-6">
          <h2 className="font-display text-4xl leading-none sm:text-5xl">{ui("title")}</h2>
          <p className="mt-1 font-semibold text-chocolate/70">{ui("subtitle")}</p>
        </div>
      </div>
      <div className="px-5 pb-8 sm:px-8">
        {/* hot buttons */}
        <div className="sticky top-0 z-10 -mx-5 flex flex-wrap gap-2 bg-cream/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8">
          {tabs.map(([k, Icon, c]) => (
            <button key={k} type="button" onClick={() => (sfx.pop(), setTab(k))} aria-pressed={tab === k} className={`relative flex items-center gap-2 rounded-full px-4 py-2.5 font-bold transition-colors ${tab === k ? "text-chocolate" : "bg-white text-chocolate/70"}`}>
              {tab === k && <motion.span layoutId="contact-tab" className="absolute inset-0 rounded-full" style={{ background: c }} transition={{ type: "spring", stiffness: 420, damping: 30 }} />}
              <Icon weight="duotone" className="relative size-5" />
              <span className="relative">{ui(`tabs.${k}`)}</span>
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }} className="pt-3">
            {tab === "message" && <MessageForm />}
            {tab === "gelato" && <OrderForm embedded onClose={() => setTab("message")} />}
            {tab === "cake" && <CakeOrder embedded onClose={() => setTab("message")} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </ScoopModal>
  );
}

function MessageForm() {
  const { locale } = useSite();
  const ui = useTranslations("ui.contact");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const openedAt = useRef(Date.now());
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: f.get("name"), email: f.get("email"), message: f.get("message"), locale, website: f.get("website") || undefined, elapsed: Date.now() - openedAt.current }),
      });
      if (!res.ok) throw new Error();
      sfx.sparkle();
      setState("done");
    } catch {
      setState("error");
    }
  };
  if (state === "done")
    return (
      <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }} className="py-10 text-center">
        <CheckCircle weight="duotone" className="mx-auto size-16 text-[#2EC4A0]" />
        <p className="mt-3 font-display text-3xl">{ui("thanks")}</p>
        <p className="mt-1 font-semibold text-chocolate/70">{ui("replyNote")}</p>
      </motion.div>
    );
  const field = "w-full rounded-2xl border-2 border-chocolate/10 bg-white px-4 py-3 font-bold outline-none focus:border-pink";
  return (
    <form onSubmit={submit} className="space-y-3">
      <p className="flex items-start gap-2 rounded-2xl bg-[#E9FBF5] px-4 py-3 text-sm font-bold text-[#1F7A63]">
        <Translate weight="duotone" className="mt-0.5 size-5 shrink-0" /> {ui("langNote")}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input name="name" required maxLength={60} placeholder={ui("name")} autoComplete="given-name" className={field} />
        <input name="email" required type="email" maxLength={120} placeholder={ui("email")} autoComplete="email" className={field} />
      </div>
      <textarea name="message" required minLength={2} maxLength={1500} rows={5} placeholder={ui("message")} className={`${field} resize-none font-semibold`} />
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && <p className="font-bold text-cherry">{ui("error")}</p>}
      <button type="submit" disabled={state === "sending"} className="btn-candy w-full justify-center bg-pink disabled:opacity-80">
        <PaperPlaneTilt weight="duotone" className="size-6" /> {state === "sending" ? "…" : ui("send")}
      </button>
      <p className="text-center text-xs font-semibold text-chocolate/50">{ui("replyNote")}</p>
    </form>
  );
}
