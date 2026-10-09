/* eslint-disable @next/next/no-img-element */
import type { CSSProperties, ReactNode } from "react";

/** Photo cut-outs (generated for Onda, transparent WebP). Flavors without a photo fall back to the drawn scoop. */
export const PHOTO = {
  cone: "/img/ice/cone.webp",
  cherry: "/img/ice/cherry.webp",
  scoops: {
    "yellow-submarine": "/img/ice/yellow-submarine.webp",
    pistacchio: "/img/ice/pistacchio.webp",
    cioccolato: "/img/ice/cioccolato.webp",
    stracciatella: "/img/ice/stracciatella.webp",
    "banana-bread": "/img/ice/banana-bread.webp",
    fragola: "/img/ice/fragola.webp",
  } as Record<string, string>,
};

/**
 * The photo for a flavor: its own uploaded cut-out, else the bundled one for its slug,
 * else the shared realistic scoop tinted to the flavor's color — so every flavor always has a real-looking scoop.
 */
export function scoopPhoto(f: { slug: string; image_url?: string | null; color_primary?: string; scoop_texture?: string }) {
  return f.image_url || PHOTO.scoops[f.slug] || `/api/scoop/${(f.color_primary ?? "#FFF3E2").replace("#", "")}?b=${scoopShape(f.slug, f.scoop_texture)}`;
}

/** A shape for a flavor without a photo: picked from its texture, varied by its name — always the same for it. */
function scoopShape(slug: string, texture?: string) {
  const h = [...slug].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const pool = texture === "swirl" ? [4, 0] : texture === "chunks" ? [3, 5, 1] : [0, 1, 2];
  return pool[h % pool.length];
}

/** Small (360 px) version of a scoop photo, for tiles and buttons: far cheaper to decode than the full one. */
export const thumb = (src: string | null) =>
  !src ? src : src.startsWith("/img/ice/") ? src.replace("/img/ice/", "/img/ice/sm/") : src.startsWith("/api/scoop/") ? `${src}${src.includes("?") ? "&" : "?"}s=sm` : src;

/**
 * Geometry for a photographed cone with `n` scoops, in units of the scoop width W.
 * Each scoop's wavy lip sits over the rim (or the scoop below), like a real double/triple cone.
 */
export function photoGeometry(n: number, { cherry = false, cup = false } = {}) {
  // the paper cup (viewBox 160×165) is wider and shorter than the cone, and the first scoop sits deeper in it
  const cone = cup ? { w: 0.8, h: (0.8 * 165) / 160 } : { w: 0.62, h: 0.62 / 0.494 };
  const scoopH = 0.8; // scoop box (object-fit: contain, bottom-aligned)
  const sink = cup ? 0.3 : 0.22; // how far the first lip covers the rim
  const step = 0.5; // each next scoop sits this much higher
  const first = cone.h - sink;
  const top = first + step * Math.max(0, n - 1) + scoopH;
  const height = top + (cherry ? 0.22 : 0.04);
  const pct = (v: number) => `${(v / height) * 100}%`;
  return {
    aspect: `1 / ${height}`,
    cone: { left: `${((1 - cone.w) / 2) * 100}%`, width: `${cone.w * 100}%`, bottom: 0 } as CSSProperties,
    scoop: (i: number): CSSProperties => ({ left: 0, width: "100%", bottom: pct(first + step * i), height: pct(scoopH), zIndex: 10 + i }),
    cherry: (count: number): CSSProperties => ({ left: "36%", width: "28%", bottom: pct(first + step * Math.max(0, count - 1) + scoopH * 0.78), zIndex: 30 }),
    /** Box of scoop i as fractions of the container, for flight targets. */
    scoopBox: (i: number) => ({ left: 0, width: 1, top: 1 - (first + step * i + scoopH) / height, height: scoopH / height }),
  };
}

export function ScoopImg({ src, className = "", style }: { src: string; className?: string; style?: CSSProperties }) {
  return <img src={src} alt="" draggable={false} className={`h-full w-full object-contain object-bottom select-none ${className}`} style={style} />;
}

/** Static photographed cone with scoops (top of the list = top of the cone). */
export function PhotoCone({ scoops, cherry = false, small = false, className = "", style, children }: { scoops: string[]; cherry?: boolean; small?: boolean; className?: string; style?: CSSProperties; children?: ReactNode }) {
  const px = (src: string) => (small ? thumb(src)! : src);
  const g = photoGeometry(scoops.length, { cherry });
  return (
    <div className={`relative ${className}`} style={{ aspectRatio: g.aspect, ...style }}>
      <div className="absolute" style={g.cone}>
        <img src={px(PHOTO.cone)} alt="" draggable={false} className="block w-full select-none" />
      </div>
      {scoops.map((src, i) => (
        <div key={i} className="absolute" style={g.scoop(i)}>
          <ScoopImg src={px(src)} />
        </div>
      ))}
      {cherry && (
        <div className="absolute" style={g.cherry(scoops.length)}>
          <img src={PHOTO.cherry} alt="" draggable={false} className="block w-full select-none" />
        </div>
      )}
      {children}
    </div>
  );
}

