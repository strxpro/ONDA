import { MotionAdmin } from "@/components/admin/screens/MotionAdmin";
import { store } from "@/lib/store";
import { DEFAULT_MOTION, type MotionSettings } from "@/lib/types";

export default async function Page() {
  const s = (await store().get("site_settings", 1)) as { motion?: Partial<MotionSettings> };
  return <MotionAdmin motion={{ ...DEFAULT_MOTION, ...(s.motion ?? {}) }} />;
}
