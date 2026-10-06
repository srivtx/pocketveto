'use client';

/**
 * PocketVeto — the action panel: playbook steps, the cancel-email draft,
 * and the APR-cliff calculator.
 */

import { useMemo, useState } from 'react';
import { AlertTriangle, Copy, ExternalLink, ListChecks, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { ItemView } from '@/lib/pocketveto/types';
import { cancelEmailDraft, genericPlaybook, servicePlaybook } from '@/lib/pocketveto/playbooks';
import { payoffPlan } from '@/lib/pocketveto/interest';
import { formatMoney } from '@/lib/pocketveto/risk';
import { todayISO } from '@/lib/pocketveto/dates';
import { toast } from '@/hooks/use-toast';
import { KindGlyph } from './KindGlyph';

const EMAIL_KINDS = new Set(['trial', 'subscription', 'membership']);

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

  async function copyCancelEmail() {
    const draft = cancelEmailDraft(
      item.name,
      '[your account email]',
      '[account or reference number]',
      todayISO()
    );
    try {
      await navigator.clipboard.writeText(draft);
      toast({
        title: 'Cancellation email copied',
        description: 'Paste it into your mail app, then fill in your email and reference.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Your browser blocked clipboard access — select and copy manually.',
      });
    }
  }

  return (
    <div className="rounded-xl border border-ink-800 bg-ink-925 p-4">
      <div className="mb-3 flex items-center gap-2.5">
        <KindGlyph kind={item.kind} className="h-4 w-4 text-signal-400" />
        <h4 className="text-sm font-semibold text-mist-100">{pb.title}</h4>
      </div>
      <p className="mb-4 text-xs text-mist-500">
        Where: <span className="text-mist-300">{pb.where}</span>
      </p>
      <ol className="space-y-2.5">
        {pb.steps.map((s, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-mist-300">
            <span className="pv-num mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-signal-500/30 bg-signal-400/10 text-[11px] font-semibold text-signal-400">
              {i + 1}
            </span>
            <span className="leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
      {pb.watchOut && pb.watchOut.length > 0 && (
        <div className="mt-4 rounded-lg border border-warn-400/25 bg-warn-400/5 p-3">
          <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-warn-300">
            <ShieldAlert className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Watch out
          </p>
          <ul className="space-y-1">
            {pb.watchOut.map((w, i) => (
              <li key={i} className="text-xs leading-relaxed text-warn-300/80">
                {w}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {EMAIL_KINDS.has(item.kind) && (
          <Button
            variant="outline"
            size="sm"
            className="border-ink-800 text-mist-300 hover:bg-ink-900 hover:text-mist-100"
            onClick={() => void copyCancelEmail()}
          >
            <Copy className="h-3.5 w-3.5" aria-hidden /> Copy cancel email
          </Button>
        )}
        {item.url && (
          <Button
            variant="outline"
            size="sm"
            className="border-ink-800 text-mist-300 hover:bg-ink-900 hover:text-mist-100"
            onClick={() => window.open(item.url, '_blank', 'noopener')}
          >
            <ExternalLink className="h-3.5 w-3.5" aria-hidden /> Open manage-it link
          </Button>
        )}
      </div>

      {isPromo && (
        <div className="mt-5 rounded-lg border border-cliff-400/25 bg-cliff-400/5 p-4">
          <p className="mb-3.5 flex items-center gap-1.5 text-xs font-semibold text-cliff-300">
            <AlertTriangle className="h-3.5 w-3.5" strokeWidth={1.75} aria-hidden /> Deferred-interest cliff math
          </p>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="pv-num text-lg font-semibold text-mist-100">
                {formatMoney(plan.monthlyPayment)}
              </p>
              <p className="mt-0.5 text-[11px] text-mist-500">/mo clears it</p>
            </div>
            <div>
              <p className="pv-num text-lg font-semibold text-mist-100">{plan.monthsLeft}</p>
              <p className="mt-0.5 text-[11px] text-mist-500">months left</p>
            </div>
            <div>
              <p className="pv-num text-lg font-semibold text-cliff-300">
                {formatMoney(plan.estimatedCliffInterest)}
              </p>
              <p className="mt-0.5 text-[11px] text-mist-500">retro-interest floor if missed</p>
            </div>
          </div>
          <div className="mt-3.5 grid gap-1.5">
            <Label htmlFor="pv-pace" className="pv-label">
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
              className="pv-num h-8 border-ink-800 bg-ink-900 text-sm text-mist-100 placeholder:text-mist-500/60 focus-visible:ring-signal-400/50"
            />
          </div>
          {planned && plan.onPaceForCliff && (
            <p className="pv-rise mt-2 text-xs font-medium leading-relaxed text-cliff-300">
              That pace misses the cliff — interest on the original {formatMoney(balance)} gets
              charged retroactively. Raise it to {formatMoney(plan.monthlyPayment)}/mo or pay it
              off with one lump sum.
            </p>
          )}
          {planned && !plan.onPaceForCliff && (
            <p className="pv-rise mt-2 text-xs font-medium leading-relaxed text-signal-400">
              On pace to clear the cliff — keep every payment above{' '}
              {formatMoney(plan.monthlyPayment)} and confirm the promo balance hits $0.
            </p>
          )}
          <p className="mt-3.5 text-[11px] leading-relaxed text-mist-500">
            Estimate: simple interest on the original balance across the promo window — a floor,
            not a ceiling. Card agreements using average-daily-balance can land higher.
          </p>
        </div>
      )}
    </div>
  );
}
