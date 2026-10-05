'use client';

/**
 * PocketVeto — the items list: countdown cards with veto/claim/redeem actions
 * and the embedded playbook for the selected item.
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

const TIER_CLASS: Record<string, string> = {
  overdue: 'border-rose-500/50 bg-rose-500/10',
  critical: 'border-rose-500/50 bg-rose-500/10',
  warning: 'border-amber-500/40 bg-amber-500/5',
  headsUp: 'border-emerald-500/25 bg-emerald-500/5',
  clear: 'border-zinc-800 bg-zinc-900/40',
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
    <div className="grid gap-4 lg:grid-cols-[1fr_minmax(320px,420px)]">
      <div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`rounded-full border px-3 py-1 text-xs transition-colors ${
              filter === 'all'
                ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            All ({views.length})
          </button>
          {KIND_ORDER.filter((k) => views.some((v) => v.kind === k)).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                filter === k
                  ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                  : 'border-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {KIND_META[k].emoji} {KIND_META[k].plural} (
              {views.filter((v) => v.kind === k).length})
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          {list.length === 0 && (
            <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
              Nothing here yet. Add your first money date — the streaming sub you keep
              forgetting, the gift card in the drawer, the passport.
            </div>
          )}
          {list.map((item) => (
            <div
              key={item.id}
              className={`rounded-xl border p-4 transition-colors ${TIER_CLASS[item.urgency] ?? TIER_CLASS.clear} ${
                item.status !== 'active' ? 'opacity-60' : ''
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-zinc-100">
                      {KIND_META[item.kind].emoji} {item.name}
                    </span>
                    {item.status !== 'active' && (
                      <Badge variant="outline" className="border-zinc-700 text-zinc-400">
                        {STATUS_LABEL[item.status]}
                      </Badge>
                    )}
                    {item.lapsedCycles > 0 && (
                      <span className="text-[11px] text-rose-400">
                        {item.lapsedCycles} renewal{item.lapsedCycles > 1 ? 's' : ''} fired while away
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    {KIND_META[item.kind].verb} · {formatMoney(item.costAtStake)} at stake
                    {item.annualized > 0 && ` · ${formatMoney(item.annualized)}/yr`}
                  </p>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      item.status === 'active' && item.daysLeft <= 2
                        ? 'text-rose-400'
                        : item.status === 'active' && item.daysLeft <= 7
                          ? 'text-amber-400'
                          : 'text-zinc-300'
                    }`}
                  >
                    {countdownLabel(item.daysLeft)}
                  </p>
                  <p className="text-[11px] text-zinc-600">{item.end}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className={`h-7 border-zinc-700 px-2 text-xs ${
                    selected === item.id ? 'bg-zinc-800' : ''
                  }`}
                  onClick={() => setSelected(selected === item.id ? null : item.id)}
                >
                  Playbook
                </Button>
                {item.status === 'active' ? (
                  <>
                    <Button
                      size="sm"
                      className="h-7 bg-emerald-500 px-2 text-xs text-zinc-950 hover:bg-emerald-400"
                      onClick={() =>
                        onStatus(
                          item.id,
                          item.kind === 'giftcard' || item.kind === 'warranty' ? 'used' : 'vetoed'
                        )
                      }
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" aria-hidden />
                      {item.kind === 'giftcard'
                        ? 'Redeemed'
                        : item.kind === 'warranty'
                          ? 'Claimed'
                          : 'Vetoed'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200"
                      onClick={() => onEdit(item)}
                    >
                      <Pencil className="mr-1 h-3.5 w-3.5" aria-hidden /> Edit
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-zinc-400 hover:text-zinc-200"
                    onClick={() => onStatus(item.id, 'active')}
                  >
                    Reactivate
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  className="ml-auto h-7 px-2 text-xs text-zinc-500 hover:text-rose-400"
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

      <aside aria-label="Selected item playbook" className="lg:sticky lg:top-4 self-start">
        {selectedView ? (
          <PlaybookPanel item={selectedView} />
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
            Select <span className="text-zinc-300">Playbook</span> on any item to see the exact
            steps — cancellation paths, claim checklists, redemption moves, or the payoff math
            that beats the 0% APR cliff.
          </div>
        )}
      </aside>
    </div>
  );
}
