/* eslint-disable @next/next/no-img-element */

/**
 * A real paper gelato cup (pastel stripes, red rolled rim — photographed for Onda), in a 160×165 box with the rim
 * at the top, so `photoGeometry(n, { cup: true })` stacks the scoops into it exactly as before.
 */
export function Cup({ className }: { className?: string }) {
  return (
    <span className={className} style={{ aspectRatio: "160 / 165" }} aria-hidden>
      <img src="/img/cup.webp" alt="" className="block h-full w-full object-contain object-top drop-shadow-[0_10px_14px_rgba(75,42,32,0.18)]" draggable={false} />
    </span>
  );
}
