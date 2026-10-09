"use client";

import { Printer } from "@phosphor-icons/react";
import { LogoMark } from "../../ui/Logo";
import { Button, PageTitle } from "../ui";

/** The QR table card for the counter: print it, cut it, stand it next to the cones. */
export function QrCard({ siteSvg, googleSvg, url }: { siteSvg: string; googleSvg: string | null; url: string }) {
  return (
    <>
      <PageTitle
        title="QR recensioni"
        subtitle="Stampa il cartoncino: i clienti inquadrano il codice e lasciano un commento sul sito"
        action={
          <Button onClick={() => window.print()}>
            <Printer weight="bold" className="size-5" /> Stampa
          </Button>
        }
      />
      <div className="print-card mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
        <Card title="Lasciaci un commento goloso" sub="Inquadra il codice con la fotocamera" svg={siteSvg} />
        {googleSvg && <Card title="Ti è piaciuto? Dillo su Google" sub="Una recensione ci aiuta tantissimo" svg={googleSvg} />}
      </div>
      <p className="mt-6 text-center text-sm text-chocolate/50">{url}</p>
    </>
  );
}

function Card({ title, sub, svg }: { title: string; sub: string; svg: string }) {
  return (
    <div className="rounded-[2rem] bg-[radial-gradient(80%_70%_at_20%_10%,#FFD6E5,transparent_70%),radial-gradient(70%_70%_at_90%_100%,#FFF4BD,transparent_70%)] bg-cream p-8 text-center shadow-soft">
      <LogoMark className="mx-auto h-14 w-auto" />
      <p className="mt-3 font-display text-3xl leading-tight">{title}</p>
      <div className="mx-auto mt-6 w-[70%] rounded-3xl bg-white p-5 [&_svg]:h-auto [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
      <p className="mt-5 text-sm font-bold tracking-[0.18em] text-chocolate/60 uppercase">{sub}</p>
      <p className="mt-1 font-display text-xl">onda.</p>
    </div>
  );
}
