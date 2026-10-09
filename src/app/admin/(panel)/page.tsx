import { Dashboard } from "@/components/admin/screens/Dashboard";
import { allFlavors, getStats } from "@/lib/ops";

export default async function AdminHome() {
  const [today, week, month, flavors] = await Promise.all([getStats("today"), getStats("7d"), getStats("30d"), allFlavors()]);
  return <Dashboard stats={{ today, week, month }} flavors={flavors} />;
}
