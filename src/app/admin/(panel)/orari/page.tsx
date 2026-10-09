import { HoursAdmin } from "@/components/admin/screens/HoursAdmin";
import { store } from "@/lib/store";
import type { OpeningHours, SpecialDay } from "@/lib/types";

export default async function Page() {
  const [hours, special] = await Promise.all([store().list("opening_hours"), store().list("special_days")]);
  return (
    <HoursAdmin
      hours={(hours as OpeningHours[]).sort((a, b) => a.weekday - b.weekday)}
      special={(special as SpecialDay[]).sort((a, b) => a.date.localeCompare(b.date))}
    />
  );
}
