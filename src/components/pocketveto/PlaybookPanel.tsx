'use client';

/**
 * PocketVeto — the action panel: playbook steps + APR-cliff calculator.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink, ListChecks, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ItemView } from '@/lib/pocketveto/types';
import { genericPlaybook, servicePlaybook } from '@/lib/pocketveto/playbooks';
import { payoffPlan } from '@/lib/pocketveto/interest';
import { formatMoney } from '@/lib/pocketveto/risk';
import { todayISO } from '@/lib/pocketveto/dates';

export function PlaybookPanel({ item }: { item: ItemView }) {
  const pb = servicePlaybook(item.name) ?? genericPlaybook(item.kind);
  const isPromo = item.kind === 'promo';

  const balance = Number(item.meta?.balance ?? item.costAtStake) || 0;
  const apr = Number(item.meta?.apr ?? 29.99) || 29.99;
  const promoMonths = Number(item.meta?.promoMonths ?? 12) || 12;
  const [planned, setPlanned] = useState('');
  const plan = useMemo(
    () =>
      payoffPlan(
        item.end,
        balance,
        apr,
        promoMonths,
        planned ? Number(planned) : undefined,
        todayISO()
      ),
    [item.end, balance, apr, promoMonths, planned]
  );

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
      <div className="mb-3 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-emerald-400" aria-hidden />
        <h4 className="text-sm font-semibold text-zinc-100">{pb.title}</h4>
      </div>
      <p className="mb-3 text-xs text-zinc-500">
        Where: <span className="text-zinc-300">{pb.where}</span>
      </p>
      <ol className="space-y-2">
        {pb.steps.map((s, i) => (
          <li key={i} className="flex gap-2 text-sm text-zinc-300">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-[11px] font-semibold text-emerald-400">
              {i + 1}
            </span>
            <span className="leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
      {pb.watchOut && pb.watchOut.length > 0 && (
        <div className="mt-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-amber-400">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden /> Watch out
          </p>
          <ul className="space-y-1">
            {pb.watchOut.map((w, i) => (
              <li key={i} className="text-xs leading-relaxed text-amber-200/80">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.url && (
        <Button
          variant="outline"
          size="sm"
          className="mt-4 border-zinc-800 text-zinc-300 hover:bg-zinc-900"
          onClick={() => window.open(item.url, '_blank', 'noopener')}
        >
          <ExternalLink className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Open manage-it link
        </Button>
      )}

      {isPromo && (
        <div className="mt-5 rounded-lg border border-rose-500/25 bg-rose-500/5 p-4">
          <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold text-rose-300">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden /> Deferred-interest cliff math
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-lg font-bold text-zinc-100">
                {formatMoney(plan.monthlyPayment)}
              </p>
              <p className="text-[11px] text-zinc-500">/mo clears it</p>
            </div>
            <div>
              <p className="text-lg font-bold text-zinc-100">{plan.monthsLeft}</p>
              <p className="text-[11px] text-zinc-500">months left</p>
            </div>
            <div>
              <p className="text-lg font-bold text-rose-300">
                {formatMoney(plan.estimatedCliffInterest)}
              </p>
              <p className="text-[11px] text-zinc-500">retro-interest floor if missed</p>
            </div>
          </div>
          <div className="mt-3 grid gap-1.5">
            <Label htmlFor="pv-pace" className="text-xs text-zinc-400">
              Your planned monthly payment
            </Label>
            <Input
              id="pv-pace"
              type="number"
              min="0"
              step="1"
              value={planned}
              onChange={(e) => setPlanned(e.target.value)}
              placeholder={String(Math.round(plan.monthlyPayment))}
              className="h-8 border-zinc-800 bg-zinc-900 text-sm"
            />
          </div>
          {planned && plan.onPaceForCliff && (
            <p className="mt-2 text-xs font-medium text-rose-300">
              That pace misses the cliff — interest on the original {formatMoney(balance)} gets
              charged retroactively. Raise it to {formatMoney(plan.monthlyPayment)}/mo or pay it
              off with one lump sum.
            </p>
          )}
          {planned && !plan.onPaceForCliff && (
            <p className="mt-2 text-xs font-medium text-emerald-400">
              On pace to clear the cliff — keep every payment above{' '}
              {formatMoney(plan.monthlyPayment)} and confirm the promo balance hits $0.
            </p>
          )}
          <p className="mt-3 text-[11px] leading-relaxed text-zinc-600">
            Estimate: simple interest on the original balance across the promo window — a floor,
            not a ceiling. Card agreements using average-daily-balance can land higher.
          </p>
        </div>
      )}
    </div>
  );
}
