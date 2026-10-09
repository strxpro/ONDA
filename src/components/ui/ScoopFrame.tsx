"use client";

import Image from "next/image";
import { useId, type CSSProperties, type ReactNode } from "react";
import { SCOOP_BODY } from "../ice/Scoop";

/**
 * A photo (or any content) cut in the shape of a gelato scoop, with a colored "lip" under it.
 * Used for every photo frame on the page, so photos read as scoops.
 * Plain SVG clip-path (no CSS masks) + Next's image optimizer: each photo is fetched at the size it is shown.
 */
export function ScoopFrame({ src, alt = "", color = "#FF8FB8", className = "", style, children, imgClassName = "", sizes = "(max-width: 640px) 45vw, 280px" }: { src?: string; alt?: string; color?: string; className?: string; style?: CSSProperties; children?: ReactNode; imgClassName?: string; sizes?: string }) {
  const id = `scoop-${useId().replace(/:/g, "")}`;
  return (
    <div className={`relative aspect-[200/190] ${className}`} style={style}>
      <svg viewBox="0 0 200 190" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <defs>
          <clipPath id={id} clipPathUnits="objectBoundingBox">
            <path d={SCOOP_BODY} transform="scale(0.005 0.005263)" />
          </clipPath>
        </defs>
        {/* colored scoop behind, offset down: reads as the scoop's own melted lip */}
        <path d={SCOOP_BODY} fill={color} transform="translate(0 9)" />
      </svg>
      <div className="absolute inset-0 overflow-hidden bg-cream" style={{ clipPath: `url(#${id})` }}>
        {src && <Image src={src} alt={alt} fill sizes={sizes} draggable={false} className={`object-cover select-none ${imgClassName}`} />}
        {children}
        {/* soft top light, like the shine on a fresh scoop */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_35%_18%,rgba(255,255,255,0.35),transparent_70%)]" />
      </div>
    </div>
  );
}
