"use client";

import { ArrowsClockwise, MagnifyingGlass, Trash, UploadSimple, X } from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { createRowAction, deleteRowAction, reorderAction, saveRow, uploadImageAction } from "@/app/admin/actions";
import type { GalleryImage } from "@/lib/shared";
import { SortableList } from "../Sortable";
import { Button, Card, ColorField, I18nEditor, PageTitle, Sheet, useAction, useToast } from "../ui";

const PALETTE = ["#FF8FB8", "#FFE066", "#6FE0C4", "#9B8CFF", "#FFAA5C", "#A8DB7A"];

export function GalleryAdmin({ images }: { images: GalleryImage[] }) {
  const { call } = useAction();
  const toast = useToast();
  const [edit, setEdit] = useState<GalleryImage | null>(null);
  const [uploading, setUploading] = useState(0);
  const [q, setQ] = useState("");
  // smart search: every word must appear in the description (any language), accents ignored; "3" finds the 3rd photo
  const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const shown = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    if (!words.length) return images;
    return images.filter((img, i) => {
      const hay = norm(`${i + 1} ${Object.values(img.alt).join(" ")}`);
      return words.every((w) => hay.includes(w));
    });
  }, [images, q]);

  const upload = async (files: FileList) => {
    setUploading(files.length);
    let order = Math.max(0, ...images.map((i) => i.sort_order));
    for (const [i, file] of [...files].entries()) {
      const fd = new FormData();
      fd.append("file", file);
      const res = await uploadImageAction(fd);
      if (!res.ok) {
        toast(false, res.error);
        continue;
      }
      const up = res.data as { url: string; width: number; height: number };
      order += 10;
      await call(
        () => createRowAction("gallery", { image_url: up.url, width: up.width, height: up.height, alt: { it: file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ") }, color: PALETTE[(images.length + i) % PALETTE.length], sort_order: order }),
        "Foto aggiunta",
      );
      setUploading((n) => n - 1);
    }
    setUploading(0);
  };

  return (
    <>
      <PageTitle
        title="Galleria"
        subtitle="Le foto del Laboratorio: la prima va sul cono, le altre girano intorno (max 9)"
        action={
          <label className="flex min-h-12 cursor-pointer items-center gap-2 rounded-2xl bg-chocolate px-4 font-display font-semibold text-cream">
            <UploadSimple weight="bold" className="size-5" /> {uploading ? `${uploading}…` : "Carica"}
            <input type="file" accept="image/*" multiple className="sr-only" onChange={(e) => e.target.files?.length && upload(e.target.files)} />
          </label>
        }
      />
      <p className="mb-3 rounded-2xl bg-lemon-soft p-3 text-sm font-semibold">Le foto vengono ridimensionate e convertite in WebP automaticamente.</p>
      <label className="mb-3 flex items-center gap-2 rounded-2xl border-2 border-chocolate/10 bg-white px-3 focus-within:border-pink">
        <MagnifyingGlass weight="bold" className="size-5 shrink-0 text-chocolate/50" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cerca una foto: «cono», «vetrina», «ragazzo con cappellino», «3»…" className="min-h-12 w-full bg-transparent font-semibold outline-none" />
        {q && (
          <button type="button" onClick={() => setQ("")} aria-label="Cancella" className="grid size-8 place-items-center rounded-full bg-chocolate/5">
            <X weight="bold" className="size-4" />
          </button>
        )}
      </label>
      {q && !shown.length && <Card><p className="text-chocolate/60">Nessuna foto trovata.</p></Card>}
      <SortableList
        items={shown}
        getId={(i) => i.id}
        onReorder={(ids) => !q && call(() => reorderAction("gallery", ids), "Ordine salvato")}
        render={(img, handle) => (
          <Card className="!p-2">
            <div className="flex items-center gap-3">
              {handle}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.image_url} alt="" className="size-16 rounded-full object-cover" style={{ boxShadow: `0 0 0 3px #fff, 0 0 0 6px ${img.color}` }} />
              <button type="button" onClick={() => setEdit(img)} className="min-w-0 flex-1 truncate text-left font-bold">
                {img.alt.it || "Senza descrizione"}
              </button>
              <Button variant="danger" label="Elimina" onClick={() => confirm("Togliere questa foto?") && call(() => deleteRowAction("gallery", img.id), "Foto tolta")}>
                <Trash weight="bold" className="size-5" />
              </Button>
            </div>
          </Card>
        )}
      />
      <Sheet open={!!edit} onClose={() => setEdit(null)} title="Foto">
        {edit && <PhotoEditor key={edit.id} img={edit} onDone={() => setEdit(null)} />}
      </Sheet>
    </>
  );
}

function PhotoEditor({ img, onDone }: { img: GalleryImage; onDone: () => void }) {
  const { call } = useAction();
  const [p, setP] = useState(img);
  const [replacing, setReplacing] = useState(false);
  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.image_url} alt="" className="mx-auto size-48 rounded-full object-cover" style={{ boxShadow: `0 0 0 6px #fff, 0 0 0 12px ${p.color}` }} />
      <label className="mx-auto flex w-max cursor-pointer items-center gap-2 rounded-full bg-chocolate/5 px-4 py-2 text-sm font-bold">
        <ArrowsClockwise weight="bold" className="size-4" /> {replacing ? "Caricamento…" : "Sostituisci la foto"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setReplacing(true);
            const fd = new FormData();
            fd.append("file", file);
            const res = await uploadImageAction(fd);
            setReplacing(false);
            if (res.ok) {
              const up = res.data as { url: string; width: number; height: number };
              setP((x) => ({ ...x, image_url: up.url, width: up.width, height: up.height }));
            }
          }}
        />
      </label>
      <I18nEditor label="Descrizione (anche per chi non vede)" value={p.alt} onChange={(v) => setP({ ...p, alt: v })} />
      <ColorField label="Colore del gelato che cola" value={p.color} onChange={(v) => setP({ ...p, color: v })} />
      <Button
        className="w-full"
        onClick={async () => {
          const { id: _id, ...patch } = p;
          if ((await call(() => saveRow("gallery", img.id, patch))) !== undefined) onDone();
        }}
      >
        Salva
      </Button>
    </div>
  );
}
