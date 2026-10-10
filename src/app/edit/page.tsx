import { notFound } from "next/navigation";
import { Edit } from "./Edit";

/** The motion-design edit — rendered with ROUTE=/edit scripts/record-promo.mjs. Not available in production. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Edit />;
}
