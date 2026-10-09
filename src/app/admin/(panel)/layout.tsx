import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";
import { hasSupabase } from "@/lib/env";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="md:flex">
      <AdminNav actor={admin.actor} local={!hasSupabase} />
      <main className="mx-auto w-full max-w-4xl px-4 pt-6 pb-32 md:px-8 md:pt-10 md:pb-16">{children}</main>
    </div>
  );
}
