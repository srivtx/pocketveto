'use client';

/**
 * PocketVeto — the items list: countdown cards with veto/claim/redeem actions
 * and the embedded playbook for the selected item.
 *
 * Each card carries an urgency rail (the colored left edge) so scan-order
 * and stakes line up without painting the whole card in tint.
 */

import { useState } from 'react';
import { CheckCircle2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ItemKind, ItemStatus, ItemView } from '@/lib/pocketveto/types';
import { KIND_META, KIND_ORDER } from '@/lib/pocketveto/types';
import { countdownLabel } from '@/lib/pocketveto/dates';
import { formatMoney } from '@/lib/pocketveto/risk';
import { PlaybookPanel } from './PlaybookPanel';
import { KindGlyph } from './KindGlyph';
import { BrandMark } from './BrandMark';

const TIER_RAIL: Record<string, string> = {
  overdue: 'border-l-cliff-400',
  critical: 'border-l-cliff-400',
  warning: 'border-l-warn-400',
  headsUp: 'border-l-signal-500',
  clear: 'border-l-ink-700',
};

const STATUS_LABEL: Record<ItemStatus, string> = {
  active: 'Active',
  vetoed: 'Vetoed',
  used: 'Used',
  expired: 'Expired',
};

export function ItemsView({
  views,
  onEdit,
  onStatus,
  onDelete,
}: {
  views: ItemView[];
  onEdit: (item: ItemView) => void;
  onStatus: (id: string, status: ItemStatus) => void;
  onDelete: (id: string) => void;
}) {
  const [filter, setFilter] = useState<ItemKind | 'all'>('all');
  const [selected, setSelected] = useState<string | null>(null);

  const list = views
    .filter((v) => filter === 'all' || v.kind === filter)
    .sort((a, b) => {
      // actives by urgency first, then closed
      if (a.status !== b.status) return a.status === 'active' ? -1 : 1;
      return a.daysLeft - b.daysLeft;
    });

  const selectedView = views.find((v) => v.id === selected) ?? null;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_minmax(320px,420px)]">
      <div>
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filter by kind">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`pv-num rounded-full border px-3 py-1.5 text-xs transition-colors duration-200 ${
              filter === 'all'
                ? 'border-signal-500/50 bg-signal-400/15 text-signal-300'
                : 'border-ink-800 text-mist-400 hover:border-ink-700 hover:text-mist-200'
            }`}
          >
            All ({views.length})
          </button>
          {KIND_ORDER.filter((k) => views.some((v) => v.kind === k)).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors duration-200 ${
                filter === k
                  ? 'border-signal-500/50 bg-signal-400/15 text-signal-300'
                  : 'border-ink-800 text-mist-400 hover:border-ink-700 hover:text-mist-200'
              }`}
            >
              <KindGlyph kind={k} className="h-3 w-3" />
              {KIND_META[k].plural}
              <span className="pv-num text-mist-500">
                ({views.filter((v) => v.kind === k).length})
              </span>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3">
          {list.length === 0 && (
            <div className="rounded-xl border border-dashed border-ink-800 p-8 text-center text-sm leading-relaxed text-mist-500">
              Nothing here yet. Add your first money date — the streaming sub you keep
              forgetting, the gift card in the drawer, the passport.
            </div>
          )}
          {list.map((item, i) => (
            <div
              key={item.id}
              style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
              className={`pv-rise rounded-xl border border-ink-800 border-l-2 bg-ink-925/40 p-4 transition-colors duration-200 hover:border-ink-700 ${
                TIER_RAIL[item.urgency] ?? TIER_RAIL.clear
              } ${item.status !== 'active' ? 'opacity-60' : ''}`}
            >
              <div className="flex items-start gap-3.5">
                <BrandMark name={item.name} kind={item.kind} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <span className="text-sm font-semibold text-mist-100">{item.name}</span>
                    {item.status !== 'active' && (
                      <Badge variant="outline" className="border-ink-700 text-mist-400">
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    )}
                    {item.lapsedCycles > 0 && (
                      <span className="pv-num text-[11px] text-cliff-400">
                        {item.lapsedCycles} renewal{item.lapsedCycles > 1 ? 's' : ''} fired while away
                      </span>
                    )}
                  </div>
                  <p className="mt-1.5 text-xs text-mist-500">
                    {KIND_META[item.kind].verb} · <span className="pv-num">{formatMoney(item.costAtStake)}</span> at stake
                    {item.annualized > 0 && (
                      <> · <span className="pv-num">{formatMoney(item.annualized)}/yr</span></>
                    )}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p
                    className={`pv-num text-sm font-semibold ${
                      item.status === 'active' && item.daysLeft <= 2
                        ? 'text-cliff-300'
                        : item.status === 'active' && item.daysLeft <= 7
                          ? 'text-warn-300'
                          : 'text-mist-300'
                    }`}
                  >
                    {countdownLabel(item.daysLeft)}
                  </p>
                  <p className="pv-num mt-0.5 text-[11px] text-mist-500">{item.end}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 border-ink-800 px-2.5 text-xs transition-colors ${
                    selected === item.id
                      ? 'border-signal-500/50 bg-ink-900 text-signal-300'
                      : 'hover:bg-ink-900'
                  }`}
                  onClick={() => setSelected(selected === item.id ? null : item.id)}
                >
                  Playbook
                </Button>
                {item.status === 'active' ? (
                  <>
                    <Button
                      size="sm"
                      className="h-7 bg-signal-400 px-2.5 text-xs font-semibold text-ink-950 hover:bg-signal-300"
                      onClick={() =>
                        onStatus(
                          item.id,
                          item.kind === 'giftcard' || item.kind === 'warranty' ? 'used' : 'vetoed'
                        )
                      }
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
                      {item.kind === 'giftcard'
                        ? 'Redeemed'
                        : item.kind === 'warranty'
                          ? 'Claimed'
                          : 'Vetoed'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2.5 text-xs text-mist-400 hover:text-mist-100"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden /> Edit
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2.5 text-xs text-mist-400 hover:text-mist-100"
                    onClick={() => onStatus(item.id, 'active')}
                  >
                    Reactivate
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 px-2.5 text-xs text-mist-500 hover:text-cliff-300"
                  onClick={() => onDelete(item.id)}
                  aria-label={`Delete ${item.name}`}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <aside aria-label="Selected item playbook" className="self-start lg:sticky lg:top-40">
        {selectedView ? (
          <PlaybookPanel item={selectedView} />
        ) : (
          <div className="rounded-xl border border-dashed border-ink-800 p-6 text-sm leading-relaxed text-mist-500">
            Select <span className="text-mist-300">Playbook</span> on any item to see the exact
            steps — cancellation paths, claim checklists, redemption moves, or the payoff math
            that beats the 0% APR cliff.
          </div>
        )}
      </aside>
    </div>
  );
}
