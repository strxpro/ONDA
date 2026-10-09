import type { CSSProperties } from "react";
import { Cone } from "./Cone";
import { Scoop, type ScoopTexture } from "./Scoop";

export type ScoopSpec = { color: string; color2?: string; texture?: ScoopTexture; key?: string };

/**
 * Geometry for a cone with `n` stacked scoops, in units of the container width.
 * Shared by the hero, the preloader and the cone builder so they line up exactly.
 */
export function stackGeometry(n: number, headroom = 0.18) {
  const cone = { w: 0.68, h: 0.68 * (230 / 160) };
  const scoop = { w: 0.92, h: 0.92 * (190 / 200) };
  const step = 0.52;
  const firstBottom = 0.66;
  const height = firstBottom + step * Math.max(0, n - 1) + scoop.h + headroom;
  const pct = (v: number) => `${(v / height) * 100}%`;
  return {
    aspect: `1 / ${height}`,
    cone: { left: `${((1 - cone.w) / 2) * 100}%`, width: `${cone.w * 100}%`, bottom: 0 } as CSSProperties,
    scoop: (i: number): CSSProperties => ({
      left: `${((1 - scoop.w) / 2) * 100}%`,
      width: `${scoop.w * 100}%`,
      bottom: pct(firstBottom + step * i),
      zIndex: 10 + i,
    }),
    /** Scoop i as fractions of the container (left, top, width, height), for flight targets. */
    scoopBox: (i: number) => {
      const bottom = firstBottom + step * i;
      return { left: (1 - scoop.w) / 2, width: scoop.w, top: 1 - (bottom + scoop.h) / height, height: scoop.h / height };
    },
    /** Top of the highest scoop, for placing a cherry. */
    top: (count: number): CSSProperties => ({ bottom: pct(firstBottom + step * Math.max(0, count - 1) + scoop.h * 0.9) }),
  };
}

/** Static cone + scoops illustration. */
export function IceCream({ scoops, className, drips = false, style }: { scoops: ScoopSpec[]; className?: string; drips?: boolean; style?: CSSProperties }) {
  const g = stackGeometry(scoops.length);
  return (
    <div className={`relative ${className ?? ""}`} style={{ aspectRatio: g.aspect, ...style }}>
      <div className="absolute" style={g.cone}>
        <Cone className="block w-full" />
      </div>
      {scoops.map((s, i) => (
        <div key={s.key ?? i} className="absolute" style={g.scoop(i)}>
          <Scoop color={s.color} color2={s.color2} texture={s.texture} drips={drips && i === 0} className="block w-full" />
        </div>
      ))}
    </div>
  );
}
