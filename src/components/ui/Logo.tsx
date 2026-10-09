/**
 * Onda's mark: a strawberry scoop with a cream wave ("onda") running through it, on a waffle cone.
 * Next to it the lowercase wordmark with the shop's line underneath. Pure SVG + text, so it is crisp at any size.
 */
export function LogoMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 60" className={className} aria-hidden>
      <path d="M13 31 L24 58 L35 31 Z" fill="#EAA65C" />
      <path d="M15.5 37 L32.5 37 M18 44 L30 44 M17 33 L27 55 M31 33 L21 55" stroke="#B86E2E" strokeWidth="1.6" strokeLinecap="round" opacity=".55" />
      <path d="M6.5 30 C4.5 15 13 4 24 4 C35 4 43.5 15 41.5 30 Q42 34.5 37.5 33.5 Q34 37 30.5 33.5 Q27 37 24 33.5 Q21 37 17.5 33.5 Q14 37 10.5 33.5 Q6 34.5 6.5 30 Z" fill="#FF8FB8" />
      <path d="M8.5 21 C12.5 16.5 16.5 25 20.5 20.5 C24.5 16 28.5 25 32.5 20.5 C35 18 37.5 18.5 39.5 20" fill="none" stroke="#FFF7EE" strokeWidth="3.4" strokeLinecap="round" />
      <ellipse cx="15" cy="11.5" rx="3.6" ry="2.1" fill="#fff" opacity=".7" transform="rotate(-28 15 11.5)" />
    </svg>
  );
}

export function Logo({ tagline, className = "", light = false }: { tagline?: string; className?: string; light?: boolean }) {
  return (
    <span className={`flex items-center gap-2 ${className}`}>
      <LogoMark className="h-10 w-auto shrink-0 transition-transform duration-500 ease-(--ease-gelato) group-hover:-rotate-12" />
      <span className="flex flex-col leading-none">
        <span className={`font-display text-[1.7rem] leading-[0.85] font-bold tracking-tight ${light ? "text-cream" : "text-chocolate"}`}>
          onda<span className="text-pink">.</span>
        </span>
        {tagline && <span className={`mt-0.5 hidden font-script sm:block text-[0.95rem] leading-none ${light ? "text-cream/75" : "text-chocolate/65"}`}>{tagline}</span>}
      </span>
    </span>
  );
}
