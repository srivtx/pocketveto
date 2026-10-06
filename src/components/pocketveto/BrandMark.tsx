'use client';

/**
 * PocketVeto — the brand mark tile.
 *
 * One geometry on every card: a 40px soft square. A recognized brand
 * carries its real mark (embedded locally — simple-icons path data,
 * never fetched). No brand? A quiet monogram of the name's initial —
 * the same shape language as the letter-mark brands (ZEE5's Z, Canva's
 * C), so unknown merchants still read as entities, never as placeholders.
 * Kind glyphs stay where they classify: the filter chips.
 */

import { logoIdFor, logoById } from '@/lib/pocketveto/brands';
import type { ItemKind } from '@/lib/pocketveto/types';

function monogram(name: string): string {
  const ch = name.trim().match(/[a-zA-Z0-9]/)?.[0] ?? '?';
  return ch.toUpperCase();
}

export function BrandMark({
  name,
  raw,
  className = 'h-10 w-10',
  glyphClass = 'h-[22px] w-[22px]',
}: {
  /** Display name of the merchant / item. */
  name: string;
  /** Fallback monogram comes from this name when no brand matches. */
  raw?: string;
  /** Kept for call-site compatibility — chips own the kind glyphs now. */
  kind?: ItemKind;
  className?: string;
  glyphClass?: string;
}) {
  const logo = logoById(logoIdFor(name, raw ?? ''));

  if (!logo) {
    return (
      <span
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-[10px] border border-ink-800 bg-ink-950 ${className}`}
      >
        <span className="font-display text-[17px] font-bold leading-none tracking-tight text-mist-300">
          {monogram(name)}
        </span>
      </span>
    );
  }

  const ink = logo.glyph === 'ink';
  return (
    <span
      aria-hidden
      className={`flex shrink-0 items-center justify-center rounded-[10px] ${className}`}
      style={{
        backgroundColor: logo.color,
        boxShadow: `inset 0 0 0 1px ${ink ? 'rgba(6,18,14,0.10)' : 'rgba(255,255,255,0.14)'}`,
      }}
    >
      {logo.path ? (
        <svg viewBox="0 0 24 24" className={glyphClass} fill={ink ? '#06120E' : '#FFFFFF'}>
          <path d={logo.path} />
        </svg>
      ) : (
        <span
          className="font-display text-[17px] font-bold leading-none tracking-tight"
          style={{ color: ink ? '#06120E' : '#FFFFFF' }}
        >
          {logo.letter}
        </span>
      )}
    </span>
  );
}
