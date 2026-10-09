"use client";

import { ArrowUpRight, GoogleLogo, Star } from "@phosphor-icons/react";
import { animate, motion, useInView } from "motion/react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import { t, type Review } from "@/lib/shared";
import { useSite } from "../providers/SiteData";
import { Title } from "../ui/Title";
import { CommentsWall } from "./Comments";

type Rating = { key: string; label: string; value: number | null; count: number | null; url: string | null; color: string };

/** Scalloped seal outline (like a bakery sticker). viewBox 0 0 200 200. */
const SEAL = (() => {
  const n = 22;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = i % 2 ? 92 : 100;
    d += `${i ? "L" : "M"}${(100 + Math.cos(a) * r).toFixed(2)} ${(100 + Math.sin(a) * r).toFixed(2)} `; // rounded: same on server and client
  }
  return d + "Z";
})();

/** Real ratings and real review texts only (entered by the owner or synced from Google). */
export function Reviews() {
  const { data, locale } = useSite();
  const s = data.settings;
  const ratings: Rating[] = [
    { key: "google", label: "Google", value: s.rating_google, count: s.rating_google_count, url: s.rating_google_url, color: "#FFE066" },
    { key: "tripadvisor", label: "Tripadvisor", value: s.rating_tripadvisor, count: s.rating_tripadvisor_count, url: s.rating_tripadvisor_url, color: "#6FE0C4" },
  ].filter((r) => r.value != null);
  const reviews = data.reviews.filter((r) => r.is_visible);

  return (
    <section id="reviews" className="relative flex min-h-svh flex-col justify-center py-20">
      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-10 px-(--gutter) lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <Title color="#FFAA5C">{t(s.texts.reviews_title, locale)}</Title>
          {ratings.length > 0 && (
            <div className="mt-8 flex justify-center gap-3 sm:mt-10 sm:gap-6 lg:justify-start">
              {ratings.map((r, i) => (
                <Seal key={r.key} rating={r} index={i} />
              ))}
            </div>
          )}
        </div>
        <CommentsWall />
      </div>
      {reviews.length > 0 && <ReviewRiver reviews={reviews} />}
    </section>
  );
}

function Stars({ value, className = "size-6" }: { value: number; className?: string }) {
  return (
    <span className="relative inline-flex" aria-label={`${value} / 5`}>
      <span className="flex text-chocolate/20">
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} weight="fill" className={className} />
        ))}
      </span>
      <span className="absolute inset-0 flex overflow-hidden text-chocolate transition-[width] duration-[1.4s] ease-out" style={{ width: `${(value / 5) * 100}%` }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Star key={i} weight="fill" className={`${className} shrink-0`} />
        ))}
      </span>
    </span>
  );
}

function Seal({ rating, index }: { rating: Rating; index: number }) {
  const ui = useTranslations("ui");
  const ref = useRef<HTMLAnchorElement>(null);
  const inView = useInView(ref, { once: true, margin: "-15% 0px" });
  const [n, setN] = useState(0);
  const value = rating.value ?? 0;
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, value, { duration: 1.6, ease: [0.16, 1, 0.3, 1], onUpdate: setN });
    return () => c.stop();
  }, [inView, value]);

  return (
    <motion.a
      ref={ref}
      href={rating.url ?? undefined}
      target="_blank"
      rel="noopener"
      initial={{ scale: 0.4, rotate: -40, opacity: 0 }}
      whileInView={{ scale: 1, rotate: index ? 6 : -6, opacity: 1 }}
      whileHover={{ scale: 1.05, rotate: 0 }}
      viewport={{ once: true }}
      transition={{ type: "spring", stiffness: 140, damping: 12, delay: index * 0.12 }}
      className="group relative grid size-[min(42vw,11rem)] place-items-center text-center sm:size-56"
    >
      <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full animate-[spin_40s_linear_infinite] drop-shadow-[0_24px_30px_rgba(75,42,32,0.25)]" aria-hidden>
        <path d={SEAL} fill={rating.color} />
        <circle cx="100" cy="100" r="80" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="4 6" />
      </svg>
      <div className="relative">
        <p className="flex items-center justify-center gap-1.5 font-display text-base font-bold sm:text-lg">
          {rating.key === "google" && <GoogleLogo weight="bold" className="size-5" />}
          {rating.label}
          <ArrowUpRight weight="bold" className="size-4 transition-transform duration-500 group-hover:rotate-45" />
        </p>
        <p className="font-display text-5xl leading-none font-bold tabular-nums sm:text-6xl">{n.toFixed(1)}</p>
        <div className="mt-2">
          <Stars value={inView ? value : 0} className="size-4 sm:size-5" />
        </div>
        <p className="mt-1 font-script text-lg sm:text-xl">{rating.count ? ui("reviewsCount", { count: rating.count.toLocaleString() }) : ui("readReviews")}</p>
      </div>
    </motion.a>
  );
}

/** Two rows of real reviews, written on paper notes, drifting in opposite directions. */
function ReviewRiver({ reviews }: { reviews: Review[] }) {
  const rows = [reviews.filter((_, i) => i % 2 === 0), reviews.filter((_, i) => i % 2 === 1)].filter((r) => r.length);
  return (
    <div className="relative mt-16 flex flex-col gap-6 [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]">
      {rows.map((row, ri) => {
        const items = row.length < 4 ? [...row, ...row, ...row] : row;
        return (
          <div key={ri} className="group flex w-max gap-6" style={{ animation: `marquee ${Math.max(30, items.length * 9)}s linear infinite ${ri % 2 ? "reverse" : ""}` }}>
            {[0, 1].map((copy) => (
              <div key={copy} className="flex gap-6" aria-hidden={copy === 1}>
                {items.map((r, i) => (
                  <Note key={`${r.id}-${i}`} review={r} tilt={((i * 53) % 7) - 3} />
                ))}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

function Note({ review: r, tilt }: { review: Review; tilt: number }) {
  const date = r.review_date ? new Date(r.review_date).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null;
  return (
    <figure className="w-[min(78vw,330px)] shrink-0 rounded-sm bg-[#fffdf8] p-6 shadow-[0_14px_30px_-16px_rgba(75,42,32,0.5)]" style={{ rotate: `${tilt}deg` }}>
      <Stars value={r.rating} className="size-5" />
      <blockquote className="mt-2 line-clamp-5 font-script text-2xl leading-snug">{r.text}</blockquote>
      <figcaption className="mt-3 flex items-center justify-between text-sm">
        <span className="font-display font-semibold">— {r.author}</span>
        <span className="flex items-center gap-1 opacity-60">
          {r.source === "google" && <GoogleLogo className="size-4" />}
          {r.source === "tripadvisor" ? "Tripadvisor" : null}
          {date && <span>· {date}</span>}
        </span>
      </figcaption>
    </figure>
  );
}
