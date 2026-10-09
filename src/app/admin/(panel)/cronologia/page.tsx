import { HistoryAdmin } from "@/components/admin/screens/HistoryAdmin";
import { store } from "@/lib/store";

export default async function Page() {
  return <HistoryAdmin entries={await store().listAudit(150)} />;
}
