import { CommentsAdmin } from "@/components/admin/screens/CommentsAdmin";
import { store } from "@/lib/store";
import type { Comment } from "@/lib/types";

export default async function Page() {
  const rows = (await store().list("comments")) as Comment[];
  return <CommentsAdmin comments={rows.sort((a, b) => b.created_at.localeCompare(a.created_at))} />;
}
