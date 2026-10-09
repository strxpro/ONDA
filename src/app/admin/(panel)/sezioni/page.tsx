import { SectionsAdmin } from "@/components/admin/screens/SectionsAdmin";
import { store } from "@/lib/store";
import type { Section } from "@/lib/types";

export default async function Page() {
  const rows = (await store().list("sections")) as Section[];
  return <SectionsAdmin sections={rows.sort((a, b) => a.sort_order - b.sort_order)} />;
}
