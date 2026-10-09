"use client";

import { ArrowLeft, ChatCircleDots, GoogleLogo, Heart, LockSimple, PaperPlaneTilt, Smiley, Star, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lighten } from "@/lib/color";
import { sfx } from "@/lib/sound";
import { t, type Comment } from "@/lib/shared";
import { ScoopImg, scoopPhoto, thumb } from "../ice/PhotoStack";
import { useSite } from "../providers/SiteData";
import { useScrollLock } from "../ui/useScrollLock";

const STICKERS = { heart: Heart, star: Star, smile: Smiley, yum: ChatCircleDots } as const;
const NOTE_COLORS = ["#FFF4BD", "#FFD6E5", "#D2F8EE", "#E0DBFF", "#FFE2C6", "#E3F5D1"];

/** Visitors' comments as sticky notes, plus the button and form to leave one (published after the owner approves). */
export function CommentsWall() {
  const { data } = useSite();
  const ui = useTranslations("ui.comments");
  const [open, setOpen] = useState(false);
  const comments = data.comments.slice(0, 6);

  // arriving from the QR card at the counter (…?recensione): bring the reviews into view and open the form
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (!p.has("recensione") && location.hash !== "#recensione") return;
    const t = window.setTimeout(() => {
      document.getElementById("reviews")?.scrollIntoView({ block: "center" });
      setOpen(true);
    }, 3200); // after the preloader
    return () => window.clearTimeout(t);
  }, []);

  return (
    <div>
      {comments.length ? (
        <ul className="grid grid-cols-2 gap-3 sm:gap-4">
          {comments.map((c, i) => (
            <Note key={c.id} comment={c} index={i} />
          ))}
        </ul>
      ) : (
        <p className="rounded-3xl border-4 border-dashed border-chocolate/15 p-6 text-center font-script text-2xl text-chocolate/60">{ui("empty")}</p>
      )}
      <div className="mt-5 flex justify-center">
        <motion.button type="button" whileHover={{ rotate: -2, scale: 1.04 }} whileTap={{ scale: 0.95 }} onClick={() => (sfx.whoosh(), setOpen(true))} className="btn-candy bg-pink">
          <ChatCircleDots weight="duotone" className="size-6" /> {ui("cta")}
        </motion.button>
      </div>
      <CommentForm open={open} onClose={() => setOpen(false)} />
    </div>
  );
}

function Note({ comment: c, index: i }: { comment: Comment; index: number }) {
  const { data } = useSite();
  const Icon = STICKERS[c.sticker] ?? Heart;
  const flavor = c.flavor_slug ? data.flavors.find((f) => f.slug === c.flavor_slug) : null;
  const photo = flavor ? scoopPhoto(flavor) : null;
  return (
    <motion.li
      initial={{ opacity: 0, y: 30, rotate: 0 }}
      whileInView={{ opacity: 1, y: 0, rotate: i % 2 ? 2.5 : -2 }}
      whileHover={{ rotate: 0, scale: 1.04 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 200, damping: 15, delay: i * 0.06 }}
      className="relative rounded-2xl p-4 pt-5 shadow-soft"
      style={{ background: NOTE_COLORS[i % NOTE_COLORS.length] }}
    >
      {/* tape */}
      <span className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-4deg] rounded-sm bg-white/70" aria-hidden />
      <span className="absolute -top-3 -right-2 grid size-9 rotate-12 place-items-center rounded-full bg-cherry text-white shadow">
        <Icon weight="fill" className="size-5" />
      </span>
      <p className="line-clamp-4 text-sm leading-snug font-semibold sm:text-base">«{c.message}»</p>
      <p className="mt-2 flex items-center gap-1.5 font-script text-lg text-chocolate/70">
        {photo && <span className="block h-6 w-7 shrink-0"><ScoopImg src={thumb(photo)!} /></span>}— {c.name}
      </p>
    </motion.li>
  );
}

/**
 * The review card. Step 1: the stars. Step 2 depends on them —
 * 4–5★: a warm invitation to review on Google (plus an optional note for the wall);
 * 1–3★: private feedback that only the owner reads (stays pending; the owner may still publish it).
 * Every guest can reach Google whatever they rated: reviews are never gated.
 */
function CommentForm({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data, locale } = useSite();
  const ui = useTranslations("ui.comments");
  const uiRoot = useTranslations("ui");
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [flavor, setFlavor] = useState<string | null>(null);
  const [sticker, setSticker] = useState<keyof typeof STICKERS>("heart");
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const openedAt = useRef(0);
  useScrollLock(open);
  const googleUrl = data.settings.google_review_url || data.settings.rating_google_url;
  const happy = rating >= 4;
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (open) {
      openedAt.current = Date.now();
      setState("idle");
      setRating(0);
      setHover(0);
    }
  }, [open]);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: f.get("name"), message: f.get("message"), website: f.get("website") || undefined, flavor_slug: happy ? flavor : null, sticker, rating, locale, elapsed: Date.now() - openedAt.current }),
      });
      if (!res.ok) throw new Error();
      sfx.sparkle();
      setState("done");
    } catch {
      setState("error");
    }
  };

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[95] grid place-items-center bg-chocolate/40 p-4 backdrop-blur-md" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} role="dialog" aria-modal="true" aria-label={ui("title")}>
          <motion.div
            layout
            data-lenis-prevent
            className="relative max-h-[92svh] w-full max-w-md overflow-y-auto overscroll-contain rounded-[2rem] bg-cream p-6 shadow-float"
            initial={{ y: 120, scale: 0.85, rotate: -4 }}
            animate={{ y: 0, scale: 1, rotate: 0 }}
            exit={{ y: 120, scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button type="button" onClick={onClose} aria-label={uiRoot("close")} className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-white transition-transform hover:rotate-90">
              <X weight="bold" className="size-5" />
            </button>
            <AnimatePresence mode="wait" initial={false}>
              {state === "done" ? (
                <motion.div key="done" className="py-8 text-center" {...STEP}>
                  <motion.div initial={{ scale: 0, rotate: -40 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", stiffness: 260, damping: 10 }} className="mx-auto grid size-20 place-items-center rounded-full bg-pink text-white">
                    <Heart weight="fill" className="size-10" />
                  </motion.div>
                  <p className="mt-4 font-display text-2xl font-bold">{happy ? ui("thanks") : ui("thanksPrivate")}</p>
                  {happy && googleUrl && <GoogleButton href={googleUrl} label={ui("googleCta")} className="mt-6" />}
                </motion.div>
              ) : !rating ? (
                <motion.div key="rate" className="py-6 text-center" {...STEP}>
                  <h3 className="px-8 font-display text-3xl leading-tight font-bold">{ui("rate")}</h3>
                  <div className="mt-6 flex justify-center gap-1" onMouseLeave={() => setHover(0)}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <motion.button
                        key={n}
                        type="button"
                        aria-label={`${n}/5`}
                        data-rate={n}
                        initial={{ scale: 0, rotate: -40 }}
                        animate={{ scale: hover >= n ? 1.14 : 1, rotate: 0 }}
                        whileTap={{ scale: 0.8 }}
                        transition={{ type: "spring", stiffness: 420, damping: 13, delay: hover ? 0 : 0.06 * n }}
                        onMouseEnter={() => setHover(n)}
                        onClick={() => (sfx.pop(), setRating(n))}
                        className="grid size-14 place-items-center"
                      >
                        <Star weight={hover >= n ? "fill" : "duotone"} className={`size-12 transition-colors duration-200 ${hover >= n ? "text-amber-400" : "text-chocolate/25"}`} />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.form key="form" onSubmit={submit} className="space-y-4" {...STEP}>
                  <button type="button" onClick={() => setRating(0)} className="flex items-center gap-1.5 text-sm font-bold text-chocolate/60" aria-label={ui("changeRating")}>
                    <ArrowLeft weight="bold" className="size-4" />
                    <span className="flex text-amber-400" data-stars={rating}>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} weight={n <= rating ? "fill" : "regular"} className="size-4" />
                      ))}
                    </span>
                  </button>
                  {happy ? (
                    <>
                      <h3 className="pr-10 font-display text-3xl leading-tight font-bold">{ui("googleAsk")}</h3>
                      {googleUrl && <GoogleButton href={googleUrl} label={ui("googleCta")} />}
                      <p className="flex items-center gap-3 pt-1 font-script text-xl whitespace-nowrap text-chocolate/60 before:h-px before:flex-1 before:bg-chocolate/15 after:h-px after:flex-1 after:bg-chocolate/15">{ui("orNote")}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="pr-10 font-display text-3xl leading-tight font-bold">{ui("privateTitle")}</h3>
                      <p className="flex items-center gap-2 rounded-2xl bg-chocolate/5 px-4 py-3 text-sm font-semibold text-chocolate/70" data-private>
                        <LockSimple weight="duotone" className="size-5 shrink-0" /> {ui("privateHint")}
                      </p>
                    </>
                  )}
                  <input name="name" required maxLength={40} placeholder={ui("name")} className="w-full rounded-2xl border-2 border-chocolate/10 bg-white px-4 py-3 font-bold outline-none focus:border-pink" />
                  <textarea name="message" required minLength={2} maxLength={280} rows={3} placeholder={happy ? ui("message") : ui("messageLow")} className="w-full resize-none rounded-2xl border-2 border-chocolate/10 bg-white px-4 py-3 font-semibold outline-none focus:border-pink" />
                  {/* honeypot */}
                  <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                  {happy && (
                    <>
                      <div>
                        <p className="font-script text-xl text-chocolate/70">{ui("favorite")}</p>
                        <div className="mt-2 grid grid-cols-5 gap-x-1.5 gap-y-3">
                          {data.flavors.filter((f) => f.is_available_today).map((f) => {
                            const on = flavor === f.slug;
                            return (
                              <motion.button key={f.id} type="button" whileTap={{ scale: 0.88 }} onClick={() => (sfx.pop(), setFlavor(on ? null : f.slug))} aria-pressed={on} className="flex flex-col items-center gap-1">
                                <span className={`grid aspect-square w-full place-items-center rounded-full p-1.5 transition-transform duration-300 ${on ? "scale-105 ring-[3px] ring-chocolate" : ""}`} style={{ background: lighten(f.color_primary, 0.4) }}>
                                  <ScoopImg src={thumb(scoopPhoto(f))!} />
                                </span>
                                <span className={`max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] leading-tight font-bold sm:text-xs ${on ? "bg-chocolate text-cream" : "bg-white text-chocolate/80"}`}>{t(f.name, locale)}</span>
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="font-script text-xl text-chocolate/70">{ui("sticker")}</p>
                        <div className="mt-1 flex gap-2">
                          {(Object.keys(STICKERS) as (keyof typeof STICKERS)[]).map((k) => {
                            const Icon = STICKERS[k];
                            return (
                              <motion.button key={k} type="button" whileTap={{ scale: 0.8, rotate: 20 }} onClick={() => (sfx.pop(), setSticker(k))} aria-pressed={sticker === k} aria-label={k} className={`grid size-12 place-items-center rounded-full text-white shadow ${sticker === k ? "bg-cherry ring-4 ring-chocolate" : "bg-cherry/50"}`}>
                                <Icon weight="fill" className="size-6" />
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                  {state === "error" && <p className="font-bold text-cherry">{ui("error")}</p>}
                  <button type="submit" disabled={state === "sending"} className="btn-candy w-full justify-center bg-lemon disabled:opacity-50">
                    <PaperPlaneTilt weight="duotone" className="size-6" /> {ui("send")}
                  </button>
                  {!happy && googleUrl && (
                    <a href={googleUrl} target="_blank" rel="noopener" className="block text-center text-sm font-semibold text-chocolate/55 underline underline-offset-4">
                      {ui("googleAnyway")}
                    </a>
                  )}
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

const STEP = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -16, scale: 0.96 },
  transition: { type: "spring", stiffness: 320, damping: 28 },
} as const;

function GoogleButton({ href, label, className = "" }: { href: string; label: string; className?: string }) {
  return (
    <motion.a
      href={href}
      target="_blank"
      rel="noopener"
      data-google
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      className={`flex items-center justify-center gap-3 rounded-full bg-white px-5 py-4 font-bold shadow-soft ring-2 ring-chocolate/10 ${className}`}
    >
      <GoogleLogo weight="bold" className="size-6 text-[#4285F4]" /> {label}
    </motion.a>
  );
}
