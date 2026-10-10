"use client";

import { useState } from "react";
import { saveRow } from "@/app/admin/actions";
import type { I18nText, SiteSettings } from "@/lib/shared";
import { Button, Card, Field, I18nEditor, inputCls, PageTitle, useAction } from "../ui";

const TEXT_LABEL: Record<string, string> = {
  hero_title: "Apertura · titolo",
  hero_subtitle: "Apertura · sottotitolo",
  cta_flavors: "Bottone «gusti»",
  cta_directions: "Bottone «come arrivare»",
  marquee: "Nastro scorrevole (separa con ·)",
  flavors_title: "Gusti · titolo",
  flavors_subtitle: "Gusti · sottotitolo",
  lab_title: "Laboratorio · titolo",
  lab_body: "Laboratorio · testo",
  lab_point_1: "Laboratorio · punto 1",
  lab_point_2: "Laboratorio · punto 2",
  lab_point_3: "Laboratorio · punto 3",
  configurator_title: "Crea il tuo cono · titolo",
  configurator_subtitle: "Crea il tuo cono · testo",
  signature_title: "Gusto firma · titolo",
  signature_body: "Gusto firma · testo",
  prices_title: "Altre delizie · titolo",
  treats_subtitle: "Altre delizie · sottotitolo",
  reviews_title: "Recensioni · titolo",
  visit_title: "Vieni a trovarci · titolo",
  visit_body: "Vieni a trovarci · testo",
  footer_text: "Piè di pagina",
};

export function TextsAdmin({ settings }: { settings: SiteSettings }) {
  const { call, pending } = useAction();
  const [s, setS] = useState(settings);
  const set = <K extends keyof SiteSettings>(k: K, v: SiteSettings[K]) => setS((x) => ({ ...x, [k]: v }));
  const setText = (k: string, v: I18nText) => setS((x) => ({ ...x, texts: { ...x.texts, [k]: v } }));
  const keys = [...Object.keys(TEXT_LABEL), ...Object.keys(s.texts).filter((k) => !(k in TEXT_LABEL) && !k.startsWith("img:"))];

  return (
    <>
      <PageTitle title="Testi e dati" subtitle="Ogni testo del sito, in 6 lingue" />
      <div className="space-y-4">
        <Card className="space-y-4">
          <h2 className="font-display text-xl font-bold">Gelateria</h2>
          <Field label="Nome">
            <input value={s.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </Field>
          <I18nEditor label="Slogan" value={s.tagline} onChange={(v) => set("tagline", v)} />
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Telefono">
              <input value={s.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} className={inputCls} />
            </Field>
            <Field label="Indirizzo">
              <input value={s.address ?? ""} onChange={(e) => set("address", e.target.value || null)} className={inputCls} />
            </Field>
            <Field label="Link Google Maps">
              <input value={s.maps_url ?? ""} onChange={(e) => set("maps_url", e.target.value || null)} className={inputCls} />
            </Field>
            <Field label="Facebook">
              <input value={s.socials.facebook ?? ""} onChange={(e) => set("socials", { ...s.socials, facebook: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Instagram">
              <input value={s.socials.instagram ?? ""} onChange={(e) => set("socials", { ...Object.fromEntries(Object.entries(s.socials).filter(([k]) => k !== "instagram")), ...(e.target.value ? { instagram: e.target.value } : {}) })} className={inputCls} />
            </Field>
          </div>
        </Card>

        <Card className="space-y-4">
          <h2 className="font-display text-xl font-bold">Testi del sito</h2>
          {keys.map((k) => (
            <I18nEditor key={k} label={TEXT_LABEL[k] ?? k} value={s.texts[k] ?? { it: "" }} onChange={(v) => setText(k, v)} multiline={k.endsWith("body") || k.endsWith("subtitle")} />
          ))}
        </Card>
      </div>

      <div className="sticky bottom-20 z-20 mt-4 md:bottom-4">
        <Button
          className="w-full shadow-float"
          disabled={pending}
          onClick={() => {
            const { name, tagline, texts, phone, address, maps_url, socials } = s;
            call(() => saveRow("site_settings", 1, { name, tagline, texts, phone, address, maps_url, socials }));
          }}
        >
          Salva tutti i testi
        </Button>
      </div>
    </>
  );
}
