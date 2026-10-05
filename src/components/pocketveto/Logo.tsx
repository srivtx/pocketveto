/**
 * PocketVeto — brand mark: the intercept.
 *
 * A radar ring with a decisive slash through it — the veto — and a blip
 * caught exactly where the slash meets the ring: the charge, intercepted
 * at the boundary. Rendered from currentColor so it inherits context.
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
      {/* tile */}
      <rect
        x="1.25"
        y="1.25"
        width="29.5"
        height="29.5"
        rx="8"
        stroke="currentColor"
        strokeOpacity="0.32"
        strokeWidth="1.5"
      />
      {/* radar rings */}
      <circle cx="16" cy="16" r="10.5" stroke="currentColor" strokeOpacity="0.5" strokeWidth="1.75" />
      <circle cx="16" cy="16" r="5.75" stroke="currentColor" strokeOpacity="0.32" strokeWidth="1.5" />
      {/* the veto — the boldest stroke in the mark */}
      <line
        x1="8.6"
        y1="23.4"
        x2="23.4"
        y2="8.6"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      {/* the charge, caught at the ring */}
      <circle cx="23.4" cy="8.6" r="2.2" fill="currentColor" />
    </svg>
  );
}
