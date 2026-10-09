import { ReviewsAdmin } from "@/components/admin/screens/ReviewsAdmin";
import { hasGoogle } from "@/lib/google";
import { store } from "@/lib/store";
import type { Review, SiteSettings } from "@/lib/types";

export default async function Page() {
  const [rows, s] = await Promise.all([store().list("reviews"), store().get("site_settings", 1)]);
  return <ReviewsAdmin reviews={(rows as Review[]).sort((a, b) => a.sort_order - b.sort_order)} settings={s as SiteSettings} canSync={hasGoogle} />;
}
