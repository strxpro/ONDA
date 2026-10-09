import { useId } from "react";

/** Striped paper cup (viewBox 160×165); `photoGeometry(n, { cup: true })` stacks scoops into it. */
export function Cup({ className }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 160 165" className={className} aria-hidden>
      <defs>
        <clipPath id={`cu${uid}`}>
          <path d="M4 14 H156 L134 150 Q132 160 122 160 H38 Q28 160 26 150 Z" />
        </clipPath>
        <linearGradient id={`cs${uid}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.35" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.15" />
        </linearGradient>
      </defs>
      <g clipPath={`url(#cu${uid})`}>
        <rect width="160" height="230" fill="#fff7ee" />
        {Array.from({ length: 9 }, (_, i) => (
          <path key={i} d={`M${i * 20 - 6} 0 L${i * 20 + 6} 0 L${i * 17 + 18} 170 L${i * 17 + 8} 170 Z`} fill="#FF8FB8" />
        ))}
        <rect width="160" height="230" fill={`url(#cs${uid})`} />
      </g>
      <path d="M0 8 Q80 2 160 8 L158 22 Q80 16 2 22 Z" fill="#E5243F" />
    </svg>
  );
}
