"use client";

import { Trash, UploadSimple } from "@phosphor-icons/react";
import { useState } from "react";
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
      <SortableList
        items={images}
        getId={(i) => i.id}
        onReorder={(ids) => call(() => reorderAction("gallery", ids), "Ordine salvato")}
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
  return (
    <div className="space-y-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.image_url} alt="" className="mx-auto size-48 rounded-full object-cover" style={{ boxShadow: `0 0 0 6px #fff, 0 0 0 12px ${p.color}` }} />
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
