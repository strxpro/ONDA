export function Cherry({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 70" className={className} aria-hidden>
      <path d="M30 30 C30 18 36 8 48 2" fill="none" stroke="#5b3a1a" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M40 8 C46 2 56 4 58 8 C52 12 44 12 40 8 Z" fill="#6fbf4a" />
      <circle cx="28" cy="46" r="22" fill="#e5243f" />
      <circle cx="28" cy="46" r="22" fill="url(#cherryShade)" />
      <ellipse cx="20" cy="38" rx="6" ry="4" fill="#fff" opacity="0.75" transform="rotate(-30 20 38)" />
      <defs>
        <radialGradient id="cherryShade" cx="0.35" cy="0.3" r="0.8">
          <stop offset="0.5" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#5a0010" stopOpacity="0.5" />
        </radialGradient>
      </defs>
    </svg>
  );
}
