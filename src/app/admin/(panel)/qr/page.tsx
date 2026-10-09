import QRCode from "qrcode";
import { QrCard } from "@/components/admin/screens/QrCard";
import { siteUrl } from "@/lib/env";
import { store } from "@/lib/store";
import type { SiteSettings } from "@/lib/types";

/** Printable table card: customers scan it and the review form opens on the site (and a second code for Google). */
export default async function Page() {
  const s = (await store().get("site_settings", 1)) as SiteSettings;
  const reviewUrl = `${siteUrl}/it?recensione=1`;
  const opts = { margin: 0, color: { dark: "#4B2A20", light: "#00000000" } } as const;
  const [site, google] = await Promise.all([QRCode.toString(reviewUrl, { ...opts, type: "svg" }), s.rating_google_url ? QRCode.toString(s.rating_google_url, { ...opts, type: "svg" }) : Promise.resolve(null)]);
  return <QrCard siteSvg={site} googleSvg={google} url={reviewUrl} />;
}
