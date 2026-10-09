import { GalleryAdmin } from "@/components/admin/screens/GalleryAdmin";
import { store } from "@/lib/store";
import type { GalleryImage } from "@/lib/types";

export default async function Page() {
  const rows = (await store().list("gallery")) as GalleryImage[];
  return <GalleryAdmin images={rows.sort((a, b) => a.sort_order - b.sort_order)} />;
}
