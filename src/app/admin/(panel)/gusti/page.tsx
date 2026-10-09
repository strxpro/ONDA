import { FlavorsAdmin } from "@/components/admin/screens/FlavorsAdmin";
import { allFlavors } from "@/lib/ops";

export default async function Page() {
  return <FlavorsAdmin flavors={await allFlavors()} />;
}
