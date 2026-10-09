import { useId } from "react";
import { darken, lighten } from "@/lib/color";

export type ScoopTexture = "smooth" | "chunks" | "swirl";

/** Scooped-gelato silhouette: soft dome + scalloped lip. viewBox 0 0 200 190. */
export const SCOOP_BODY =
  "M14 112 C6 58 46 8 100 8 C154 8 194 58 186 112 Q190 132 172 133 Q160 147 144 137 Q128 149 112 139 Q98 151 84 139 Q68 149 56 137 Q40 147 28 133 Q8 132 14 112 Z";

const DRIPS = [
  "M48 134 C47 150 48 163 55 164 C62 163 63 150 62 137 Z",
  "M104 140 C102 160 104 181 111 182 C118 181 120 160 118 138 Z",
  "M150 134 C150 146 151 156 157 157 C163 156 164 146 163 133 Z",
];

const CHUNKS = [
  [52, 52, 9, 6, 20],
  [92, 34, 7, 5, -15],
  [138, 50, 10, 6, 35],
  [70, 82, 8, 6, -30],
  [118, 78, 9, 7, 10],
  [158, 92, 7, 5, -20],
  [40, 104, 7, 5, 40],
  [96, 112, 10, 6, -5],
  [140, 116, 8, 5, 25],
] as const;

type Props = {
  color: string;
  color2?: string;
  texture?: ScoopTexture;
  /** Render melting drips (animate them via the `.scoop-drip` class). */
  drips?: boolean;
  className?: string;
  title?: string;
};

/** A glossy, realistic-ish gelato scoop in pure SVG. Scales to its container width. */
export function Scoop({ color, color2 = darken(color, 0.35), texture = "smooth", drips = false, className, title }: Props) {
  const uid = useId().replace(/:/g, "");
  const body = `sb${uid}`;
  const hi = `sh${uid}`;
  const clip = `sc${uid}`;

  return (
    <svg viewBox="0 0 200 190" className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      <defs>
        <linearGradient id={body} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={lighten(color, 0.35)} />
          <stop offset="0.45" stopColor={color} />
          <stop offset="1" stopColor={darken(color, 0.28)} />
        </linearGradient>
        <radialGradient id={hi} cx="0.34" cy="0.24" r="0.42">
          <stop offset="0" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="0.45" stopColor="#fff" stopOpacity="0.25" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <clipPath id={clip}>
          <path d={SCOOP_BODY} />
        </clipPath>
      </defs>

      {drips &&
        DRIPS.map((d, i) => (
          <g key={i} className="scoop-drip" style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}>
            <path d={d} fill={`url(#${body})`} />
            <ellipse cx={[52, 108, 154][i]} cy={[150, 164, 146][i]} rx="2" ry="4" fill="#fff" opacity="0.6" />
          </g>
        ))}

      {/* soft contact shadow under the lip */}
      <path d={SCOOP_BODY} fill={darken(color, 0.45)} opacity="0.25" transform="translate(0 5)" />
      <path d={SCOOP_BODY} fill={`url(#${body})`} />

      <g clipPath={`url(#${clip})`}>
        {texture === "chunks" &&
          CHUNKS.map(([x, y, w, h, r], i) => (
            <rect key={i} x={x} y={y} width={w} height={h} rx="2.5" fill={color2} transform={`rotate(${r} ${x} ${y})`} opacity="0.9" />
          ))}
        {texture === "swirl" && (
          <>
            <path d="M18 96 C48 54 78 128 110 76 C132 40 160 76 188 58" fill="none" stroke={color2} strokeWidth="13" strokeLinecap="round" opacity="0.85" />
            <path d="M18 96 C48 54 78 128 110 76 C132 40 160 76 188 58" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity="0.35" transform="translate(-2 -4)" />
          </>
        )}
        {/* scooper ridges */}
        <path d="M34 70 Q100 30 168 68" fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" />
        <path d="M24 104 Q100 76 178 104" fill="none" stroke={darken(color, 0.4)} strokeOpacity="0.18" strokeWidth="4" strokeLinecap="round" />
        {/* lip shading */}
        <path d="M0 118 Q100 104 200 118 L200 190 L0 190 Z" fill={darken(color, 0.4)} opacity="0.15" />
        <ellipse cx="72" cy="46" rx="58" ry="40" fill={`url(#${hi})`} />
      </g>
      <ellipse cx="58" cy="38" rx="11" ry="6" fill="#fff" opacity="0.75" transform="rotate(-28 58 38)" />
    </svg>
  );
}
