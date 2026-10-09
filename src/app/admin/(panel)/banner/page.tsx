import { BannerAdmin } from "@/components/admin/screens/BannerAdmin";
import { store } from "@/lib/store";
import type { Announcement } from "@/lib/types";

export default async function Page() {
  const rows = (await store().list("announcements")) as (Announcement & { created_at?: string })[];
  return <BannerAdmin items={rows.sort((a, b) => String(b.starts_at ?? "").localeCompare(String(a.starts_at ?? "")))} />;
}
