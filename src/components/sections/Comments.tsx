"use client";

/* eslint-disable @next/next/no-img-element */
import { ArrowBendDownRight, ArrowLeft, Camera, ChatCircleDots, GoogleLogo, Heart, PaperPlaneTilt, Smiley, Star, Translate, X } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { lighten } from "@/lib/color";
import { sfx } from "@/lib/sound";
import { t, type Comment } from "@/lib/shared";
import { ScoopImg, scoopPhoto, thumb } from "../ice/PhotoStack";
import { useSite } from "../providers/SiteData";
import { useScrollLock } from "../ui/useScrollLock";

const STICKERS = { heart: Heart, star: Star, smile: Smiley, yum: ChatCircleDots } as const;
const NOTE_COLORS = ["#FFF4BD", "#FFD6E5", "#D2F8EE", "#E0DBFF", "#FFE2C6", "#E3F5D1"];
const PAGE = 6;

/** Scoop-shaped frames for the visitors' photos (CSS masks): a classic scoop, a dripping one, a soft tilted one. */
const SCOOP_MASKS = [
  "M8 62 C4 30 26 6 50 6 C74 6 96 30 92 62 Q95 72 86 71 Q80 79 72 72 Q64 80 56 73 Q50 80 44 73 Q36 80 28 72 Q20 79 14 71 Q5 72 8 62 Z",
  "M10 58 C6 28 28 6 50 6 C72 6 94 28 90 58 C90 66 84 68 82 74 C80 86 72 86 71 74 C70 68 64 70 58 72 C52 74 52 94 44 94 C36 94 38 74 32 72 C26 70 22 76 16 70 C10 66 10 62 10 58 Z",
  "M12 66 C2 44 14 12 46 8 C80 4 98 30 90 60 C94 70 84 74 80 70 C74 80 64 74 60 78 C52 84 44 76 38 80 C28 84 22 74 18 76 C10 78 8 70 12 66 Z",
].map((d) => `url("data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`);
const maskOf = (id: string) => SCOOP_MASKS[[...id].reduce((a, c) => a + c.charCodeAt(0), 0) % SCOOP_MASKS.length];

type Filter = "all" | "photos" | "best" | "top";

/**
 * The comment wall: sticky notes that arrive a few at a time (more load as you scroll), newest first, live — a new
 * comment drops in at the top the moment it is published. Photos sit in scoop-shaped frames; every note can be
 * liked and answered; the owner's answer (written or spoken on Telegram) shows under it in the visitor's language,
 * and so does the comment itself (translated, "see original" one tap away). Filters appear once there are 10+.
 */
export function CommentsWall() {
  const { data, locale } = useSite();
  const ui = useTranslations("ui.comments");
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [shown, setShown] = useState(PAGE);
  const [older, setOlder] = useState<Comment[]>([]);
  const [more, setMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const firstIds = useRef<Set<string> | null>(null);

  // the page's comments (live) + the older ones fetched while scrolling
  const all = useMemo(() => {
    const byId = new Map<string, Comment>();
    for (const c of [...older, ...data.comments]) byId.set(c.id, c);
    return [...byId.values()];
  }, [data.comments, older]);
  const top = all.filter((c) => !c.parent_id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  const repliesOf = (id: string) => all.filter((c) => c.parent_id === id).sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (firstIds.current === null) firstIds.current = new Set(top.map((c) => c.id));

  const list = (() => {
    if (filter === "photos") return top.filter((c) => c.photo_url);
    if (filter === "best") return top.filter((c) => c.rating === 5);
    if (filter === "top") return [...top].sort((a, b) => (b.likes ?? 0) - (a.likes ?? 0) || b.created_at.localeCompare(a.created_at));
    return top;
  })();
  const visible = list.slice(0, shown);

  // reveal a few more when the end comes into view; fetch older ones from the server when the page's run out
  const sentinel = useRef<HTMLDivElement>(null);
  const loadMore = async () => {
    if (loading) return;
    if (shown < list.length) return setShown((n) => n + PAGE);
    if (!more) return;
    setLoading(true);
    try {
      const before = top.at(-1)?.created_at;
      const res = await fetch(`/api/comments?limit=12${before ? `&before=${encodeURIComponent(before)}` : ""}`);
      const j = (await res.json()) as { comments: Comment[]; more: boolean };
      setOlder((o) => [...o, ...j.comments]);
      setMore(j.more);
      setShown((n) => n + PAGE);
    } catch {
      setMore(false);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver((e) => e[0].isIntersecting && void loadMore(), { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  });

  // arriving from the QR card at the counter (…?recensione): bring the reviews into view and open the form
  useEffect(() => {
    const p = new URLSearchParams(location.search);
    if (!p.has("recensione") && location.hash !== "#recensione") return;
    const id = window.setTimeout(() => {
      document.getElementById("reviews")?.scrollIntoView({ block: "center" });
      setOpen(true);
    }, 3200); // after the preloader
    return () => window.clearTimeout(id);
  }, []);

  const filters: Filter[] = ["all", "photos", "best", "top"];
  return (
    <div>
      {top.length > 10 && (
        <div className="mb-5 flex flex-wrap items-center gap-1.5">
          <span className="mr-1 font-script text-xl text-chocolate/60">
            {top.length}
            {more ? "+" : ""} {ui("count")}
          </span>
          {filters.map((f) => (
            <button key={f} type="button" onClick={() => (sfx.pop(), setFilter(f), setShown(PAGE))} className={`relative rounded-full px-3.5 py-1.5 text-sm font-bold transition-colors ${filter === f ? "text-cream" : "bg-white/80 text-chocolate/75"}`}>
              {filter === f && <motion.span layoutId="cm-filter" className="absolute inset-0 rounded-full bg-chocolate" transition={{ type: "spring", stiffness: 420, damping: 32 }} />}
              <span className="relative">{ui(`f_${f}`)}</span>
            </button>
          ))}
        </div>
      )}

      {visible.length ? (
        <motion.ul layout className="columns-1 gap-4 sm:columns-2 [&>li]:mb-4 [&>li]:break-inside-avoid">
          <AnimatePresence initial={false}>
            {visible.map((c, i) => (
              <Note key={c.id} comment={c} index={i} replies={repliesOf(c.id)} fresh={!firstIds.current!.has(c.id) && !older.some((o) => o.id === c.id)} locale={locale} />
            ))}
          </AnimatePresence>
          {/* skeleton notes while older comments are on their way */}
          {loading &&
            [0, 1].map((k) => (
              <li key={`sk${k}`} className="space-y-2 rounded-2xl bg-white/60 p-4" aria-hidden>
                <span className="skeleton block h-3.5 w-11/12 rounded-full" />
                <span className="skeleton block h-3.5 w-8/12 rounded-full" />
                <span className="skeleton mt-3 block h-4 w-24 rounded-full" />
              </li>
            ))}
        </motion.ul>
      ) : (
        <p className="rounded-3xl border-4 border-dashed border-chocolate/15 p-6 text-center font-script text-2xl text-chocolate/60">{top.length ? ui("none") : ui("empty")}</p>
      )}

      <div ref={sentinel} />
      {(shown < list.length || more) && visible.length >= PAGE && (
        <div className="mt-2 flex justify-center">
          <button type="button" onClick={() => void loadMore()} className="flex items-center gap-2 rounded-full bg-white/80 px-5 py-2.5 text-sm font-bold text-chocolate/70 shadow-soft">
            {loading ? (
              <>
                {[0, 1, 2].map((k) => (
                  <motion.span key={k} className="block size-2 rounded-full bg-chocolate/60" animate={{ y: [0, -5, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: k * 0.12 }} />
                ))}
                <span className="ml-1">{ui("loading")}</span>
              </>
            ) : (
              ui("more")
            )}
          </button>
        </div>
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

/** The comment in the visitor's language when it was translated; the original one tap away. */
function useText(c: Comment, locale: string) {
  const [orig, setOrig] = useState(false);
  const tr = c.message_i18n?.[locale as "it"];
  const translated = Boolean(tr && c.locale && c.locale !== locale && tr !== c.message);
  return { text: translated && !orig ? tr! : c.message, translated, orig, toggle: () => setOrig((o) => !o) };
}

function timeAgo(iso: string, locale: string) {
  const s = (Date.parse(iso) - Date.now()) / 1000;
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  for (const [unit, sec] of [["year", 31536000], ["month", 2592000], ["week", 604800], ["day", 86400], ["hour", 3600], ["minute", 60]] as const) if (Math.abs(s) >= sec) return rtf.format(Math.round(s / sec), unit);
  return rtf.format(0, "second");
}

function Note({ comment: c, index: i, replies, fresh, locale }: { comment: Comment; index: number; replies: Comment[]; fresh: boolean; locale: string }) {
  const { data } = useSite();
  const ui = useTranslations("ui.comments");
  const Icon = STICKERS[c.sticker] ?? Heart;
  const flavor = c.flavor_slug ? data.flavors.find((f) => f.slug === c.flavor_slug) : null;
  const photo = flavor ? scoopPhoto(flavor) : null;
  const { text, translated, orig, toggle } = useText(c, locale);
  const [replyOpen, setReplyOpen] = useState(false);
  const [showReplies, setShowReplies] = useState(replies.length <= 2);
  const reply = c.reply ? (c.reply[locale as "it"] ?? c.reply.it ?? Object.values(c.reply)[0]) : null;
  return (
    <motion.li
      layout
      initial={fresh ? { opacity: 0, y: -40, scale: 0.85, rotate: -6 } : { opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: i % 2 ? 1.5 : -1.2 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ rotate: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 18, delay: fresh ? 0 : (i % PAGE) * 0.07 }}
      className="relative rounded-2xl p-4 pt-5 shadow-soft"
      style={{ background: NOTE_COLORS[i % NOTE_COLORS.length] }}
    >
      {/* tape + sticker */}
      <span className="absolute -top-2 left-1/2 h-4 w-14 -translate-x-1/2 rotate-[-4deg] rounded-sm bg-white/70" aria-hidden />
      <span className="absolute -top-3 -right-2 grid size-9 rotate-12 place-items-center rounded-full bg-cherry text-white shadow">
        <Icon weight="fill" className="size-5" />
      </span>
      {fresh && <span className="absolute -top-3 left-3 rounded-full bg-[#4FA845] px-2.5 py-0.5 text-[11px] font-black text-white uppercase shadow">{ui("newOne")}</span>}

      {c.photo_url && (
        <div className="mx-auto mb-3 aspect-[10/9] w-full max-w-[260px] drop-shadow-[0_10px_14px_rgba(75,42,32,0.25)]">
          <img src={c.photo_url} alt="" loading="lazy" className="h-full w-full object-cover" style={{ maskImage: maskOf(c.id), WebkitMaskImage: maskOf(c.id), maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />
        </div>
      )}
      {c.rating && c.rating >= 4 ? (
        <span className="mb-1 flex text-amber-400">
          {Array.from({ length: c.rating }, (_, k) => (
            <Star key={k} weight="fill" className="size-3.5" />
          ))}
        </span>
      ) : null}
      <p className="text-sm leading-snug font-semibold sm:text-base">«{text}»</p>
      {translated && (
        <button type="button" onClick={toggle} className="mt-1 flex items-center gap-1 text-[11px] font-bold text-chocolate/45">
          <Translate weight="bold" className="size-3.5" /> {orig ? ui("original") : ui("translated")}
        </button>
      )}
      <div className="mt-2 flex items-center gap-1.5">
        {photo && (
          <span className="block h-6 w-7 shrink-0">
            <ScoopImg src={thumb(photo)!} />
          </span>
        )}
        <span className="font-script text-lg text-chocolate/75">— {c.name}</span>
        <span className="ml-auto text-[11px] font-semibold text-chocolate/40">{timeAgo(c.created_at, locale)}</span>
      </div>

      {/* like · reply */}
      <div className="mt-2 flex items-center gap-1">
        <LikeButton comment={c} />
        {c.likes != null && <button type="button" onClick={() => (sfx.pop(), setReplyOpen((o) => !o))} className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold text-chocolate/60 hover:bg-white/60">
          <ArrowBendDownRight weight="bold" className="size-3.5" /> {ui("reply")}
        </button>}
        {replies.length > 2 && (
          <button type="button" onClick={() => setShowReplies((s) => !s)} className="ml-auto text-xs font-bold text-chocolate/50">
            {showReplies ? ui("hideReplies") : `${ui("showReplies")} (${replies.length})`}
          </button>
        )}
      </div>

      {/* the owner's answer */}
      {reply && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-3 rounded-2xl bg-white/80 p-3">
          <p className="flex items-center gap-1.5 text-xs font-black tracking-wide text-[#F0527F] uppercase">
            🍦 {ui("ownerReply")}
          </p>
          <p className="mt-1 text-sm font-semibold">{reply}</p>
        </motion.div>
      )}

      {/* visitors' replies */}
      <AnimatePresence initial={false}>
        {showReplies &&
          replies.map((r) => (
            <motion.div key={r.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <ReplyLine reply={r} locale={locale} />
            </motion.div>
          ))}
      </AnimatePresence>
      <AnimatePresence>{replyOpen && <ReplyForm parent={c} onDone={() => (setReplyOpen(false), setShowReplies(true))} />}</AnimatePresence>
    </motion.li>
  );
}

function ReplyLine({ reply: r, locale }: { reply: Comment; locale: string }) {
  const ui = useTranslations("ui.comments");
  const { text, translated, orig, toggle } = useText(r, locale);
  return (
    <div className="mt-2 ml-3 border-l-2 border-chocolate/15 pl-3">
      <p className="text-sm font-semibold">
        <span className="font-script text-base text-chocolate/70">{r.name}: </span>
        {text}
      </p>
      <div className="flex items-center gap-2">
        <LikeButton comment={r} small />
        {translated && (
          <button type="button" onClick={toggle} className="text-[10px] font-bold text-chocolate/40">
            {orig ? ui("original") : ui("translated")}
          </button>
        )}
      </div>
    </div>
  );
}

/** ♥ with a little burst; the browser remembers what this visitor liked. */
function LikeButton({ comment: c, small = false }: { comment: Comment; small?: boolean }) {
  const ui = useTranslations("ui.comments");
  const key = `onda:like:${c.id}`;
  const [on, setOn] = useState(false);
  const [extra, setExtra] = useState(0);
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    try {
      setOn(localStorage.getItem(key) === "1");
    } catch {}
  }, [key]);
  useEffect(() => setExtra(0), [c.likes]); // the live count arrived: it already includes ours
  if (c.likes == null) return null; // the database does not have likes yet
  const count = Math.max(0, (c.likes ?? 0) + extra);
  const toggle = async () => {
    const next = !on;
    setOn(next);
    setExtra((e) => e + (next ? 1 : -1));
    if (next) {
      sfx.pop();
      setBurst((b) => b + 1);
      navigator.vibrate?.(8);
    }
    try {
      localStorage.setItem(key, next ? "1" : "0");
    } catch {}
    await fetch("/api/comments/like", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: c.id, on: next }) }).catch(() => {});
  };
  return (
    <button type="button" onClick={toggle} aria-pressed={on} aria-label={ui("like")} className={`relative flex items-center gap-1 rounded-full px-2.5 py-1 font-bold hover:bg-white/60 ${small ? "text-[11px]" : "text-xs"} ${on ? "text-cherry" : "text-chocolate/60"}`}>
      <motion.span key={burst} initial={burst ? { scale: 0.4 } : false} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 12 }} className="relative grid">
        <Heart weight={on ? "fill" : "bold"} className={small ? "size-3.5" : "size-4"} />
        {burst > 0 &&
          [0, 1, 2, 3, 4, 5].map((k) => (
            <motion.span
              key={`${burst}-${k}`}
              className="absolute top-1/2 left-1/2 block size-1.5 rounded-full"
              style={{ background: ["#FF8FB8", "#FFE066", "#6FE0C4"][k % 3] }}
              initial={{ x: 0, y: 0, opacity: 1 }}
              animate={{ x: Math.cos((k / 6) * Math.PI * 2) * 16, y: Math.sin((k / 6) * Math.PI * 2) * 16, opacity: 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          ))}
      </motion.span>
      {count > 0 && <span className="tabular-nums">{count}</span>}
    </button>
  );
}

function ReplyForm({ parent, onDone }: { parent: Comment; onDone: () => void }) {
  const { locale } = useSite();
  const ui = useTranslations("ui.comments");
  const [state, setState] = useState<"idle" | "sending" | "hold" | "error">("idle");
  const openedAt = useRef(Date.now());
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    try {
      const res = await fetch("/api/comments", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: f.get("name"), message: f.get("message"), parent_id: parent.id, locale, sticker: "heart", website: f.get("website") || undefined, elapsed: Date.now() - openedAt.current }),
      });
      const j = (await res.json()) as { ok: boolean; published?: boolean };
      if (!j.ok) throw new Error();
      sfx.sparkle();
      if (j.published) onDone();
      else setState("hold");
    } catch {
      setState("error");
    }
  };
  if (state === "hold") return <p className="mt-2 rounded-xl bg-white/70 p-2 text-xs font-bold text-chocolate/60">{ui("thanks")}</p>;
  const field = "w-full rounded-xl border-2 border-chocolate/10 bg-white px-3 py-2 text-sm font-semibold outline-none focus:border-pink";
  return (
    <motion.form initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} onSubmit={submit} className="mt-2 space-y-2 overflow-hidden">
      <input name="name" required maxLength={40} placeholder={ui("replyName")} className={field} />
      <div className="flex gap-2">
        <input name="message" required minLength={2} maxLength={280} placeholder={ui("replyPh")} className={field} />
        <button type="submit" disabled={state === "sending"} aria-label={ui("sendReply")} className="grid size-10 shrink-0 place-items-center rounded-full bg-chocolate text-cream disabled:opacity-50">
          <PaperPlaneTilt weight="fill" className="size-4" />
        </button>
      </div>
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {state === "error" && <p className="text-xs font-bold text-cherry">{ui("error")}</p>}
    </motion.form>
  );
}

/** Shrink a photo in the browser before sending (fast on mobile data): max 1600 px, JPEG. */
async function shrink(file: File): Promise<Blob> {
  try {
    const bmp = await createImageBitmap(file);
    const k = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * k);
    canvas.height = Math.round(bmp.height * k);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((r) => canvas.toBlob((b) => r(b ?? file), "image/jpeg", 0.85));
  } catch {
    return file;
  }
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
      setPic(null);
      setPublished(false);
    }
  }, [open]);

  const [copied, setCopied] = useState(false);
  // a photo for the wall (shown in a scoop-shaped frame)
  const [pic, setPic] = useState<{ blob: Blob; url: string } | null>(null);
  const [published, setPublished] = useState(false);
  useEffect(() => () => void (pic && URL.revokeObjectURL(pic.url)), [pic]);
  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    const blob = await shrink(file);
    sfx.pop();
    setPic({ blob, url: URL.createObjectURL(blob) });
  };
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const message = String(f.get("message") ?? "");
    // 4–5★: copy the text and open Google right now, inside the click (browsers block pop-ups opened later)
    let tab: Window | null = null;
    if (happy && googleUrl) {
      navigator.clipboard?.writeText(message).then(
        () => setCopied(true),
        () => {},
      );
      tab = window.open("about:blank", "_blank");
    }
    setState("sending");
    try {
      const body = new FormData();
      const fields = { name: f.get("name"), message, website: f.get("website") || "", flavor_slug: flavor ?? "", sticker, rating, locale, elapsed: Date.now() - openedAt.current };
      for (const [k, v] of Object.entries(fields)) if (v !== "" && v != null) body.append(k, String(v));
      if (pic) body.append("photo", pic.blob, "photo.jpg");
      const res = await fetch("/api/comments", { method: "POST", body });
      if (!res.ok) throw new Error();
      setPublished(Boolean(((await res.json()) as { published?: boolean }).published));
      sfx.sparkle();
      setState("done");
      if (tab && googleUrl) tab.location.href = googleUrl;
    } catch {
      tab?.close();
      setState("error");
    }
  };

  if (!mounted) return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] grid place-items-center bg-chocolate/40 p-4 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={ui("title")}
        >
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
            <button
              type="button"
              onClick={onClose}
              aria-label={uiRoot("close")}
              className="absolute top-4 right-4 z-10 grid size-10 place-items-center rounded-full bg-white transition-transform hover:rotate-90"
            >
              <X weight="bold" className="size-5" />
            </button>
            <AnimatePresence mode="wait" initial={false}>
              {state === "done" ? (
                <motion.div key="done" className="py-8 text-center" {...STEP}>
                  <motion.div
                    initial={{ scale: 0, rotate: -40 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 10 }}
                    className="mx-auto grid size-20 place-items-center rounded-full bg-pink text-white"
                  >
                    <Heart weight="fill" className="size-10" />
                  </motion.div>
                  <p className="mt-4 font-display text-2xl font-bold">{happy ? (published ? ui("thanksLive") : ui("thanks")) : ui("thanksPrivate")}</p>
                  {happy && !published && pic && <p className="mt-2 text-sm font-semibold text-chocolate/60">{ui("photoHold")}</p>}
                  {happy && googleUrl && (
                    <>
                      <p className="mt-3 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-chocolate/75">{copied ? ui("copiedHint") : ui("pasteHint")}</p>
                      <GoogleButton href={googleUrl} label={ui("googleCta")} className="mt-4" />
                    </>
                  )}
                  {!happy && googleUrl && (
                    <a href={googleUrl} target="_blank" rel="noopener" className="mt-5 inline-block text-sm font-semibold text-chocolate/55 underline underline-offset-4">
                      {ui("googleAnyway")}
                    </a>
                  )}
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
                  <h3 className="pr-10 font-display text-3xl leading-tight font-bold">{ui("title")}</h3>
                  <input
                    name="name"
                    required
                    maxLength={40}
                    placeholder={ui("name")}
                    className="w-full rounded-2xl border-2 border-chocolate/10 bg-white px-4 py-3 font-bold outline-none focus:border-pink"
                  />
                  <textarea
                    name="message"
                    required
                    minLength={2}
                    maxLength={280}
                    rows={3}
                    placeholder={ui("message")}
                    className="w-full resize-none rounded-2xl border-2 border-chocolate/10 bg-white px-4 py-3 font-semibold outline-none focus:border-pink"
                  />
                  {happy && (
                    <div className="flex items-center gap-3">
                      {pic ? (
                        <>
                          <span className="block aspect-[10/9] w-28 shrink-0 drop-shadow-[0_8px_10px_rgba(75,42,32,0.25)]">
                            <img src={pic.url} alt="" className="h-full w-full object-cover" style={{ maskImage: SCOOP_MASKS[0], WebkitMaskImage: SCOOP_MASKS[0], maskSize: "100% 100%", WebkitMaskSize: "100% 100%" }} />
                          </span>
                          <button type="button" onClick={() => setPic(null)} className="flex items-center gap-1.5 rounded-full bg-white px-3 py-2 text-sm font-bold text-chocolate/70">
                            <X weight="bold" className="size-4" /> {ui("removePhoto")}
                          </button>
                        </>
                      ) : (
                        <label className="flex cursor-pointer items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold shadow-soft">
                          <Camera weight="duotone" className="size-5 text-[#F0527F]" /> {ui("addPhoto")}
                          <input type="file" accept="image/*" className="hidden" onChange={(e) => void pickPhoto(e.target.files?.[0])} />
                        </label>
                      )}
                    </div>
                  )}
                  {/* honeypot */}
                  <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
                  {
                    <>
                      <div>
                        <p className="font-script text-xl text-chocolate/70">{ui("favorite")}</p>
                        <div className="mt-2 grid grid-cols-5 gap-x-1.5 gap-y-3">
                          {data.flavors
                            .filter((f) => f.is_available_today)
                            .map((f) => {
                              const on = flavor === f.slug;
                              return (
                                <motion.button
                                  key={f.id}
                                  type="button"
                                  whileTap={{ scale: 0.88 }}
                                  onClick={() => (sfx.pop(), setFlavor(on ? null : f.slug))}
                                  aria-pressed={on}
                                  className="flex flex-col items-center gap-1"
                                >
                                  <span
                                    className={`grid aspect-square w-full place-items-center rounded-full p-1.5 transition-transform duration-300 ${on ? "scale-105 ring-[3px] ring-chocolate" : ""}`}
                                    style={{ background: lighten(f.color_primary, 0.4) }}
                                  >
                                    <ScoopImg src={thumb(scoopPhoto(f))!} />
                                  </span>
                                  <span
                                    className={`max-w-full truncate rounded-full px-1.5 py-0.5 text-[10px] leading-tight font-bold sm:text-xs ${on ? "bg-chocolate text-cream" : "bg-white text-chocolate/80"}`}
                                  >
                                    {t(f.name, locale)}
                                  </span>
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
                              <motion.button
                                key={k}
                                type="button"
                                whileTap={{ scale: 0.8, rotate: 20 }}
                                onClick={() => (sfx.pop(), setSticker(k))}
                                aria-pressed={sticker === k}
                                aria-label={k}
                                className={`grid size-12 place-items-center rounded-full text-white shadow ${sticker === k ? "bg-cherry ring-4 ring-chocolate" : "bg-cherry/50"}`}
                              >
                                <Icon weight="fill" className="size-6" />
                              </motion.button>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  }
                  {state === "error" && <p className="font-bold text-cherry">{ui("error")}</p>}
                  <button type="submit" disabled={state === "sending"} className="btn-candy w-full justify-center bg-lemon disabled:opacity-50">
                    <PaperPlaneTilt weight="duotone" className="size-6" /> {ui("send")}
                  </button>
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
