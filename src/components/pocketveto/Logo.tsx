/**
 * PocketVeto — brand mark: the veto cut.
 *
 * A V drawn in one gesture, its returning stroke severed before it lands.
 * The detached tip still completes the letter — the interruption IS the
 * mark: the charge's path, cut. Three strokes, one weight, squared
 * terminals. No tile, no rings, no blip — the geometry is plain and the
 * meaning comes from what's missing. Rendered from currentColor so it
 * inherits context.
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
      {/* optical nudge: the severed arm carries less ink, so the whole mark
          shifts half a unit right to keep the visual weight centered */}
      <g transform="translate(0.5 0)">
        {/* the full arm — the veto hand, driven home */}
        <path d="M8 7 L16 25" stroke="currentColor" strokeWidth="3" />
        {/* the charge's path — severed before it lands */}
        <path d="M24 7 L20.48 14.92" stroke="currentColor" strokeWidth="3" />
        {/* the cut-off tip: still falling, never arriving */}
        <path d="M18.24 19.96 L16 25" stroke="currentColor" strokeWidth="3" />
      </g>
    </svg>
  );
}
