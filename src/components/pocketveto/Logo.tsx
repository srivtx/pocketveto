/**
 * PocketVeto — brand mark.
 *
 * A radar in a tile: two range rings, one sweep, one blip, center = now.
 * Rendered from currentColor so it inherits signal/mist contextually.
 */

export function Logo({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      role="img"
      aria-label="PocketVeto"
    >
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="8"
        stroke="currentColor"
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="5.75" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.5" />
      <path
        d="M16 16 L26 16"
        stroke="currentColor"
        strokeOpacity="0.85"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <circle cx="16" cy="16" r="2" fill="currentColor" />
      <circle cx="21" cy="11" r="2.1" fill="currentColor" />
    </svg>
  );
}
