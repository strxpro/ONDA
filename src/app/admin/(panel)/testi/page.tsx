import { TextsAdmin } from "@/components/admin/screens/TextsAdmin";
import { store } from "@/lib/store";
import type { SiteSettings } from "@/lib/types";

export default async function Page() {
  const s = (await store().get("site_settings", 1)) as SiteSettings;
  return <TextsAdmin settings={s} />;
}
