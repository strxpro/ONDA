import { ReservationsAdmin } from "@/components/admin/screens/ReservationsAdmin";
import { store } from "@/lib/store";
import type { Reservation } from "@/lib/types";

export default async function Page() {
  const rows = (await store().list("reservations")) as Reservation[];
  return <ReservationsAdmin rows={rows.sort((a, b) => a.pickup_at.localeCompare(b.pickup_at))} />;
}
