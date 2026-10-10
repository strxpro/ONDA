"use client";

import { ShieldCheck } from "@phosphor-icons/react";
import { useState } from "react";
import { PRIVACY } from "@/lib/privacy";
import { useSite } from "../providers/SiteData";
import { ScoopModal } from "../ui/ScoopModal";

const DOT = ["#FF8FB8", "#FFE066", "#6FE0C4", "#9B8CFF", "#FFAA5C"];

/** "Privacy" in the footer: the policy opens out of a scoop, in the visitor's language. */
export function PrivacyLink({ className = "" }: { className?: string }) {
  const { data, locale } = useSite();
  const [from, setFrom] = useState<DOMRect | null | false>(false);
  const doc = PRIVACY[locale] ?? PRIVACY.it;
  const s = data.settings;
  const fill = (x: string) => x.replaceAll("{name}", s.name).replaceAll("{address}", s.address ?? "Via Amsicora 2, Santa Teresa Gallura").replaceAll("{phone}", s.phone ?? "—");
  return (
    <>
      <button type="button" onClick={(e) => setFrom(e.currentTarget.getBoundingClientRect())} className={`inline-flex items-center gap-1.5 font-bold underline-offset-4 hover:underline ${className}`}>
        <ShieldCheck weight="duotone" className="size-5" /> {doc.title}
      </button>
      {from !== false && (
        <ScoopModal from={from} onClosed={() => setFrom(false)} label={doc.title} width={820}>
          <article className="px-6 pt-10 pb-12 text-chocolate sm:px-12">
            <p className="flex items-center gap-2 text-xs font-black tracking-[0.18em] text-[#F0527F] uppercase">
              <ShieldCheck weight="fill" className="size-4" /> {s.name}
            </p>
            <h2 className="mt-2 pr-12 font-display text-4xl leading-tight sm:text-5xl">{doc.title}</h2>
            <p className="mt-1 text-sm font-semibold text-chocolate/50">{doc.updated}</p>
            <p className="mt-5 text-lg leading-relaxed font-semibold text-chocolate/80">{fill(doc.intro)}</p>
            <ol className="mt-8 space-y-6">
              {doc.sections.map((sec, i) => (
                <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <span className="grid size-9 place-items-center rounded-full font-display text-lg font-bold" style={{ background: DOT[i % DOT.length] }}>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-2xl leading-tight">{sec.h}</h3>
                    {sec.p.map((p, k) => (
                      <p key={k} className="mt-2 leading-relaxed text-chocolate/80">
                        {fill(p)}
                      </p>
                    ))}
                  </div>
                </li>
              ))}
            </ol>
          </article>
        </ScoopModal>
      )}
    </>
  );
}
