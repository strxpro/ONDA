import { notFound } from "next/navigation";
import { Reel } from "./Reel";

/** The motion-design reel — rendered with ROUTE=/reel scripts/record-promo.mjs. Not available in production. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Reel />;
}
