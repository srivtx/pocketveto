'use client';

/**
 * PocketVeto — the signature radar.
 *
 * Center = NOW. Every active item is a blip spiraling inward as its date
 * approaches: outer ring ≈ 60 days out, inner ring ≈ 7 days, the red core
 * = overdue/today. Angle is stable per item (hash of id), so users learn
 * "their map". Clicking a blip opens the item.
 */

import { useMemo } from 'react';
import type { ItemView, UrgencyTier } from '@/lib/pocketveto/types';
import { KIND_META } from '@/lib/pocketveto/types';
import { formatMoney } from '@/lib/pocketveto/risk';

const SIZE = 340;
const CENTER = SIZE / 2;
const R_OUTER = 150; // ≈ 60 days
const R_30 = 120;
const R_14 = 84;
const R_7 = 48; // inner ring
const R_CORE = 22;

const TIER_COLOR: Record<UrgencyTier, string> = {
  overdue: 'hsl(350, 90%, 62%)',
  critical: 'hsl(350, 90%, 62%)',
  warning: 'hsl(38, 92%, 55%)',
  headsUp: 'hsl(160, 84%, 45%)',
  clear: 'hsl(160, 30%, 55%)',
};

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

  return (
    <div className="relative mx-auto" style={{ width: SIZE, maxWidth: '100%' }}>
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="w-full h-auto"
        role="img"
        aria-label="Radar of upcoming money dates; blips closer to the center are due sooner"
      >
        {/* grid rings */}
        {[
          { r: R_OUTER, label: '60d' },
          { r: R_30, label: '30d' },
          { r: R_14, label: '14d' },
          { r: R_7, label: '7d' },
        ].map(({ r, label }) => (
          <g key={r}>
            <circle
              cx={CENTER}
              cy={CENTER}
              r={r}
              fill="none"
              stroke="rgba(255,255,255,0.10)"
              strokeDasharray={r === R_7 ? 'none' : '3 5'}
            />
            <text x={CENTER + 4} y={CENTER - r + 13} className="fill-zinc-600" fontSize="10">
              {label}
            </text>
          </g>
        ))}

        {/* cross hairs */}
        <line x1={CENTER - R_OUTER} y1={CENTER} x2={CENTER + R_OUTER} y2={CENTER} stroke="rgba(255,255,255,0.06)" />
        <line x1={CENTER} y1={CENTER - R_OUTER} x2={CENTER} y2={CENTER + R_OUTER} stroke="rgba(255,255,255,0.06)" />

        {/* the core = now */}
        <circle cx={CENTER} cy={CENTER} r={R_CORE} fill="rgba(244,63,94,0.12)" />
        <circle cx={CENTER} cy={CENTER} r={R_CORE} fill="none" stroke="rgba(244,63,94,0.5)" />

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
            stroke="rgba(52,211,153,0.55)"
            strokeWidth="1.5"
          />
        </g>
        <defs>
          <linearGradient id="pv-sweep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(52,211,153,0.16)" />
            <stop offset="100%" stopColor="rgba(52,211,153,0)" />
          </linearGradient>
        </defs>
      </svg>

      {/* blips as HTML for crisp labels + hit targets */}
      {blips.map((b) => (
        <button
          key={b.item.id}
          type="button"
          onClick={() => onSelect?.(b.item)}
          className="group absolute -translate-x-1/2 -translate-y-1/2 focus:outline-none"
          style={{ left: `${(b.x / SIZE) * 100}%`, top: `${(b.y / SIZE) * 100}%` }}
          aria-label={`${b.item.name}, ${b.item.daysLeft} days left, ${formatMoney(b.item.costAtStake)} at stake`}
        >
          <span
            className={`block h-3.5 w-3.5 rounded-full border-2 border-zinc-950 transition-transform group-hover:scale-150 ${b.item.urgency === 'critical' || b.item.urgency === 'overdue' ? 'animate-pulse' : ''}`}
            style={{ backgroundColor: b.color, boxShadow: `0 0 12px ${b.color}` }}
          />
          <span className="pointer-events-none absolute left-1/2 top-5 z-10 hidden -translate-x-1/2 whitespace-nowrap rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 shadow-xl group-hover:block">
            {KIND_META[b.item.kind].emoji} {b.item.name} · {formatMoney(b.item.costAtStake)} · {b.item.daysLeft}d
          </span>
        </button>
      ))}

      {blips.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="max-w-[200px] text-center text-xs text-zinc-500">
            Radar clear. Add a money date to see it appear.
          </p>
        </div>
      )}
    </div>
  );
}
