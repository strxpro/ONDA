"use client";

import { Cow, Crown, GrainsSlash, Leaf, Sparkle, type IconProps } from "@phosphor-icons/react";
import type { ComponentType } from "react";

/** Icon per flavor tag (no emoji). */
export const TAG_ICONS: Record<string, ComponentType<IconProps>> = {
  vegan: Leaf,
  gluten_free: GrainsSlash,
  lactose_free: Cow,
  new: Sparkle,
  signature: Crown,
};

export function TagIcon({ tag, ...props }: { tag: string } & IconProps) {
  const Icon = TAG_ICONS[tag] ?? Sparkle;
  return <Icon weight="duotone" {...props} />;
}
