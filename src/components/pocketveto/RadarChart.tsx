'use client';

/**
 * PocketVeto — the signature radar.
 *
 * Center = NOW. Every active item is a blip spiraling inward as its date
 * approaches: outer ring ≈ 60 days out, inner ring ≈ 7 days, the red core
 * = overdue/today. Angle is stable per item (hash of id), so users learn
 * "their map". Clicking a blip opens the item.
 *
 * Motion contract: blips pop in staggered, then glide when their dates
 * move; critical items carry a slow ping. All of it dies instantly under
 * prefers-reduced-motion (see globals.css).
 */

import { useMemo } from 'react';
import type { ItemView, UrgencyTier } from '@/lib/pocketveto/types';
import { formatMoney } from '@/lib/pocketveto/risk';
import { KIND_ICON } from './KindGlyph';

const SIZE = 340;
const CENTER = SIZE / 2;
const R_OUTER = 150; // ≈ 60 days
const R_30 = 120;
const R_14 = 84;
const R_7 = 48; // inner ring
const R_CORE = 22;

/* Token-matched palette (oklch, same values as globals.css @theme) */
const TIER_COLOR: Record<UrgencyTier, string> = {
  overdue: 'oklch(0.7 0.19 22)',
  critical: 'oklch(0.7 0.19 22)',
  warning: 'oklch(0.78 0.155 70)',
  headsUp: 'oklch(0.8 0.168 163)',
  clear: 'oklch(0.66 0.01 173)',
};

const RINGS: { r: number; label: string }[] = [
  { r: R_OUTER, label: '60d' },
  { r: R_30, label: '30d' },
  { r: R_14, label: '14d' },
  { r: R_7, label: '7d' },
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Deterministic angle for an item, kept away from exactly overlapping. */
function angleFor(item: ItemView, index: number): number {
  const jitter = hashString(item.id) % 97;
  return (index * 137.508 + jitter * 3.7) % 360; // golden-angle spread
}

function radiusFor(daysLeft: number): number {
  if (daysLeft <= 0) return R_CORE + 6 + Math.min(-daysLeft, 5) * 2;
  const d = Math.min(daysLeft, 60);
  // outer (60d) → inner core boundary (0d)
  return R_OUTER - (d / 60) * (R_OUTER - R_CORE);
}

export interface RadarBlip {
  item: ItemView;
  x: number;
  y: number;
  color: string;
}

export function RadarChart({
  views,
  onSelect,
}: {
  views: ItemView[];
  onSelect?: (item: ItemView) => void;
}) {
  const active = views.filter((v) => v.status === 'active');
  const blips = useMemo<RadarBlip[]>(
    () =>
      active.map((item, index) => {
        const angle = (angleFor(item, index) * Math.PI) / 180;
        const r = radiusFor(item.daysLeft);
        return {
          item,
          x: CENTER + r * Math.cos(angle),
          y: CENTER + r * Math.sin(angle),
          color: TIER_COLOR[item.urgency],
        };
      }),
    [active]
  );

  const hot = (b: RadarBlip) => b.item.urgency === 'critical' || b.item.urgency === 'overdue';

  return (
    <div className="relative mx-auto touch-pan-y select-none" style={{ width: 'clamp(280px, 92vw, 340px)', maxWidth: '100%' }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="h-auto w-full"
        role="img"
        aria-label="Radar of upcoming money dates; blips closer to the center are due sooner"
      >
        {/* grid rings */}
        {RINGS.map(({ r, label }) => (
          <g key={r}>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke="oklch(1 0 0 / 0.09)"
              strokeDasharray={r === R_7 ? 'none' : '3 5'}
            />
            <text
              x={CENTER + 3}
              y={CENTER - r + 11}
              className="pv-num fill-mist-500"
              fontSize="9"
              letterSpacing="0.08em"
            >
              {label.toUpperCase()}
            </text>
          </g>
        ))}

        {/* cross hairs + degree ticks */}
        <line x1={CENTER - R_OUTER} y1={CENTER} x2={CENTER + R_OUTER} y2={CENTER} stroke="oklch(1 0 0 / 0.05)" />
        <line x1={CENTER} y1={CENTER - R_OUTER} x2={CENTER} y2={CENTER + R_OUTER} stroke="oklch(1 0 0 / 0.05)" />
        {[0, 90, 180, 270].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <line
              key={deg}
              x1={CENTER + (R_OUTER - 5) * Math.cos(a)}
              y1={CENTER + (R_OUTER - 5) * Math.sin(a)}
              x2={CENTER + R_OUTER * Math.cos(a)}
              y2={CENTER + R_OUTER * Math.sin(a)}
              stroke="oklch(1 0 0 / 0.16)"
            />
          );
        })}

        {/* the core = now */}
        <circle cx={CENTER} cy={CENTER} r={R_CORE} fill="oklch(0.7 0.19 22 / 0.10)" />
        <circle cx={CENTER} cy={CENTER} r={R_CORE} fill="none" stroke="oklch(0.7 0.19 22 / 0.45)" />

        {/* rotating sweep */}
        <g className="pv-sweep-origin">
          <path
            d={`M ${CENTER} ${CENTER} L ${CENTER} ${CENTER - R_OUTER} A ${R_OUTER} ${R_OUTER} 0 0 1 ${CENTER + R_OUTER * Math.sin(Math.PI / 9)} ${CENTER - R_OUTER * Math.cos(Math.PI / 9)} Z`}
            fill="url(#pv-sweep)"
          />
          <line
            x1={CENTER}
            y1={CENTER}
            x2={CENTER}
            y2={CENTER - R_OUTER}
            stroke="oklch(0.8 0.168 163 / 0.55)"
            strokeWidth="1.5"
          />
        </g>
        <defs>
          <linearGradient id="pv-sweep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.8 0.168 163 / 0.15)" />
            <stop offset="100%" stopColor="oklch(0.8 0.168 163 / 0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* blips as HTML: crisp labels, real hit targets, keyboard focus */}
      {blips.map((b, i) => {
        const Icon = KIND_ICON[b.item.kind];
        return (
          <button
            key={b.item.id}
            type="button"
            onClick={() => onSelect?.(b.item)}
            className="pv-blip pv-pop group absolute flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center focus:outline-none"
            style={{
              left: `${(b.x / SIZE) * 100}%`,
              top: `${(b.y / SIZE) * 100}%`,
              animationDelay: `${120 + i * 70}ms`,
            }}
            aria-label={`${b.item.name}, ${b.item.daysLeft < 0 ? 'overdue' : `${b.item.daysLeft} days left`}, ${formatMoney(b.item.costAtStake)} at stake`}
          >
            {hot(b) && (
              <span
                className="pv-ping absolute h-3.5 w-3.5 rounded-full"
                style={{ backgroundColor: b.color }}
                aria-hidden
              />
            )}
            <span
              className="relative block h-3.5 w-3.5 rounded-full border-2 border-ink-950 transition-transform duration-200 ease-out motion-safe:group-hover:scale-150 motion-safe:group-focus-visible:scale-150"
              style={{ backgroundColor: b.color, boxShadow: `0 0 12px ${b.color}` }}
            />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-1 hidden -translate-x-1/2 items-center gap-1.5 whitespace-nowrap rounded-md border border-ink-800 bg-ink-925 px-2 py-1 text-[11px] text-mist-300 shadow-xl group-hover:flex group-focus-within:flex">
              <Icon className="h-3 w-3 text-mist-500" strokeWidth={1.75} aria-hidden />
              <span className="text-mist-100">{b.item.name}</span>
              <span className="pv-num text-mist-500">{formatMoney(b.item.costAtStake)}</span>
              <span className="pv-num text-mist-500">{b.item.daysLeft}d</span>
            </span>
          </button>
        );
      })}

      {blips.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <p className="max-w-[200px] text-center text-xs leading-relaxed text-mist-500">
            Radar clear. Add a money date to see it appear.
          </p>
        </div>
      )}
    </div>
  );
}
