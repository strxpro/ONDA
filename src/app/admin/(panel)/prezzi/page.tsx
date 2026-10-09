import { PricesAdmin } from "@/components/admin/screens/PricesAdmin";
import { allPrices } from "@/lib/ops";

export default async function Page() {
  return <PricesAdmin prices={await allPrices()} />;
}
