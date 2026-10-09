import { setRequestLocale } from "next-intl/server";
import { PublicPage } from "@/components/PublicPage";
import type { Locale } from "@/lib/types";

export default async function Home({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <PublicPage />;
}
