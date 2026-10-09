import { useId } from "react";

/** Waffle cone. viewBox 0 0 160 230; the rim is the top ~22 units. */
export function Cone({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 160 230" className={className} aria-hidden>
      <defs>
        <linearGradient id={`cg${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#f6c07e" />
          <stop offset="0.45" stopColor="#eaa65c" />
          <stop offset="1" stopColor="#b86e2e" />
        </linearGradient>
        <pattern id={`cp${uid}`} width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="16" height="16" fill="none" />
          <path d="M0 0 V16 M0 0 H16" stroke="#9c5a22" strokeWidth="2.4" opacity="0.55" />
          <path d="M2 2 H14" stroke="#ffd9a3" strokeWidth="1.2" opacity="0.5" />
        </pattern>
        <clipPath id={`cc${uid}`}>
          <path d="M8 12 Q80 2 152 12 L87 221 Q80 232 73 221 Z" />
        </clipPath>
      </defs>
      <path d="M8 12 Q80 2 152 12 L87 221 Q80 232 73 221 Z" fill={`url(#cg${uid})`} />
      <g clipPath={`url(#cc${uid})`}>
        <rect width="160" height="230" fill={`url(#cp${uid})`} />
        <path d="M30 12 L80 226" stroke="#fff" strokeOpacity="0.18" strokeWidth="10" />
      </g>
      {/* rolled rim */}
      <path d="M3 6 Q80 -5 157 6 L155 24 Q80 13 5 24 Z" fill="#d48a43" />
      <path d="M5 8 Q80 -2 155 8" fill="none" stroke="#ffd9a3" strokeWidth="2.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
