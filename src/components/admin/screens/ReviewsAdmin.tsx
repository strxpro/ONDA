"use client";

import { ArrowsClockwise, Plus, Star, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { createRowAction, deleteRowAction, saveRow, syncGoogleAction } from "@/app/admin/actions";
import type { Review, SiteSettings } from "@/lib/shared";
import { Button, Card, Field, inputCls, PageTitle, Toggle, useAction } from "../ui";

export function ReviewsAdmin({ reviews, settings, canSync }: { reviews: Review[]; settings: SiteSettings; canSync: boolean }) {
  const { call, pending } = useAction();
  const [r, setR] = useState({
    rating_google: settings.rating_google ?? "",
    rating_google_count: settings.rating_google_count ?? "",
    rating_google_url: settings.rating_google_url ?? "",
    rating_tripadvisor: settings.rating_tripadvisor ?? "",
    rating_tripadvisor_count: settings.rating_tripadvisor_count ?? "",
    rating_tripadvisor_url: settings.rating_tripadvisor_url ?? "",
    google_review_url: settings.google_review_url ?? "",
  });
  const [draft, setDraft] = useState({ author: "", rating: 5, text: "", source: "google" as Review["source"], review_date: "", url: "" });
  const num = (v: string | number) => (v === "" ? null : Number(String(v).replace(",", ".")));

  return (
    <>
      <PageTitle
        title="Recensioni"
        subtitle="Solo recensioni vere, copiate da Google o Tripadvisor"
        action={
          canSync ? (
            <Button onClick={() => call(() => syncGoogleAction(), "Sincronizzato con Google")} disabled={pending}>
              <ArrowsClockwise weight="bold" className="size-5" /> Google
            </Button>
          ) : undefined
        }
      />
      {!canSync && <p className="mb-3 rounded-2xl bg-lemon-soft p-3 text-sm font-semibold">Per scaricare voto e recensioni da Google in automatico servono GOOGLE_PLACES_API_KEY e GOOGLE_PLACE_ID (vedi README).</p>}

      <Card className="space-y-3">
        <h2 className="font-display text-xl font-bold">Voti</h2>
        {(["google", "tripadvisor"] as const).map((src) => (
          <div key={src} className="grid grid-cols-[1fr_1fr] gap-3 sm:grid-cols-[110px_120px_1fr]">
            <Field label={`${src === "google" ? "Google" : "Tripadvisor"} ★`}>
              <input inputMode="decimal" value={r[`rating_${src}`]} onChange={(e) => setR({ ...r, [`rating_${src}`]: e.target.value })} className={inputCls} />
            </Field>
            <Field label="N. recensioni">
              <input inputMode="numeric" value={r[`rating_${src}_count`]} onChange={(e) => setR({ ...r, [`rating_${src}_count`]: e.target.value })} className={inputCls} />
            </Field>
            <Field label="Link">
              <input value={r[`rating_${src}_url`]} onChange={(e) => setR({ ...r, [`rating_${src}_url`]: e.target.value })} className={inputCls} />
            </Field>
          </div>
        ))}
        <Field label="Link «Scrivi una recensione» di Google (lo apre chi dà 4–5 stelle dal QR)">
          <input value={r.google_review_url} placeholder="https://search.google.com/local/writereview?placeid=…" onChange={(e) => setR({ ...r, google_review_url: e.target.value })} className={inputCls} />
        </Field>
        <Button
          className="w-full"
          onClick={() =>
            call(() =>
              saveRow("site_settings", 1, {
                rating_google: num(r.rating_google),
                rating_google_count: num(r.rating_google_count),
                rating_google_url: r.rating_google_url || null,
                rating_tripadvisor: num(r.rating_tripadvisor),
                rating_tripadvisor_count: num(r.rating_tripadvisor_count),
                rating_tripadvisor_url: r.rating_tripadvisor_url || null,
                google_review_url: r.google_review_url || null,
              }),
            )
          }
        >
          Salva voti
        </Button>
      </Card>

      <Card className="mt-4 space-y-3">
        <h2 className="font-display text-xl font-bold">Aggiungi una recensione vera</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Autore">
            <input value={draft.author} onChange={(e) => setDraft({ ...draft, author: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Fonte">
            <select value={draft.source} onChange={(e) => setDraft({ ...draft, source: e.target.value as Review["source"] })} className={inputCls}>
              <option value="google">Google</option>
              <option value="tripadvisor">Tripadvisor</option>
              <option value="other">Altro</option>
            </select>
          </Field>
        </div>
        <Field label="Stelle">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setDraft({ ...draft, rating: n })} className="p-1" aria-label={`${n} stelle`}>
                <Star weight={n <= draft.rating ? "fill" : "regular"} className="size-8 text-mango" />
              </button>
            ))}
          </div>
        </Field>
        <Field label="Testo (copiato così com'è)">
          <textarea value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} rows={3} className={inputCls} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Data">
            <input type="date" value={draft.review_date} onChange={(e) => setDraft({ ...draft, review_date: e.target.value })} className={inputCls} />
          </Field>
          <Field label="Link alla recensione">
            <input value={draft.url} onChange={(e) => setDraft({ ...draft, url: e.target.value })} className={inputCls} />
          </Field>
        </div>
        <Button
          className="w-full"
          disabled={!draft.author || !draft.text}
          onClick={async () => {
            const ok = await call(
              () => createRowAction("reviews", { ...draft, review_date: draft.review_date || null, url: draft.url || null, language: null, is_visible: true, sort_order: (reviews.length + 1) * 10 }),
              "Recensione aggiunta",
            );
            if (ok !== undefined) setDraft({ ...draft, author: "", text: "", url: "", review_date: "" });
          }}
        >
          <Plus weight="bold" className="size-5" /> Aggiungi
        </Button>
      </Card>

      {reviews.length > 0 && (
        <Card className="mt-4 !p-2">
          <ul className="divide-y divide-chocolate/5">
            {reviews.map((rv) => (
              <li key={rv.id} className="flex items-start gap-3 px-2 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-bold">
                    {rv.author} · {"★".repeat(Math.round(rv.rating))} <span className="text-xs font-semibold text-chocolate/50">{rv.source}</span>
                  </p>
                  <p className="line-clamp-2 text-sm text-chocolate/70">{rv.text}</p>
                </div>
                <Toggle checked={rv.is_visible} label="Visibile" onChange={(v) => call(() => saveRow("reviews", rv.id, { is_visible: v }), v ? "Visibile" : "Nascosta")} />
                <Button variant="danger" label="Elimina" onClick={() => confirm("Eliminare?") && call(() => deleteRowAction("reviews", rv.id), "Eliminata")}>
                  <Trash weight="bold" className="size-5" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}
