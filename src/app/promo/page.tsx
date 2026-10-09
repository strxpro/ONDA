import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { siteUrl } from "@/lib/env";
import { Promo } from "./Promo";

/** The presentation film for the owner — rendered with scripts/record-promo.mjs. Not available in production. */
export default async function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  const qr = await QRCode.toString(`${siteUrl}/it?recensione=1`, { type: "svg", margin: 0, color: { dark: "#4B2A20", light: "#00000000" } });
  return <Promo qr={qr} />;
}
