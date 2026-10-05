'use client';

/**
 * PocketVeto — add / edit dialog with kind-aware fields.
 * The form body is a keyed component so opening a different item remounts
 * it with fresh state (no state-reset effects needed).
 */

import { useMemo, useState } from 'react';
import { Info } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import type { ItemKind, MoneyDateItem, Recurrence } from '@/lib/pocketveto/types';
import { KIND_META, KIND_ORDER } from '@/lib/pocketveto/types';
import { todayISO, addDays } from '@/lib/pocketveto/dates';
import { newId } from '@/lib/pocketveto/store';
import { servicePlaybook } from '@/lib/pocketveto/playbooks';
import { KindGlyph } from './KindGlyph';

function costLabel(kind: ItemKind): string {
  switch (kind) {
    case 'trial':
      return 'Price after trial ($)';
    case 'subscription':
    case 'membership':
      return 'Renewal price ($)';
    case 'warranty':
      return 'Item price — cost if uncovered ($)';
    case 'giftcard':
      return 'Card balance ($)';
    case 'promo':
      return 'Promo balance ($)';
    case 'document':
      return 'Renewal cost / trip value at stake ($)';
    case 'domain':
      return 'Renewal + recovery cost ($)';
    default:
      return 'Money at stake ($)';
  }
}

function endLabel(kind: ItemKind): string {
  if (kind === 'trial') return 'Trial ends';
  if (kind === 'warranty') return 'Warranty ends';
  if (kind === 'giftcard') return 'Value expires (if ever) — set sooner if fees apply';
  if (kind === 'promo') return '0% APR window ends';
  if (kind === 'document') return 'Expiry (consider the 6-month rule)';
  return 'Money date';
}

export interface ItemDraft {
  id?: string;
  kind: ItemKind;
  name: string;
  costAtStake: string;
  start: string;
  end: string;
  recurrence: Recurrence;
  customDays: string;
  autoAdvance: boolean;
  notes: string;
  url: string;
  apr: string;
  promoMonths: string;
}

function draftFrom(item?: Partial<MoneyDateItem> | null): ItemDraft {
  const kind: ItemKind = item?.kind ?? 'trial';
  return {
    id: item?.id,
    kind,
    name: item?.name ?? '',
    costAtStake: item ? String(item.costAtStake ?? '') : '',
    start: item?.start ?? todayISO(),
    end: item?.end ?? addDays(todayISO(), kind === 'trial' ? 7 : 30),
    recurrence: item?.recurrence ?? 'once',
    customDays: item?.customDays ? String(item.customDays) : '90',
    autoAdvance: item?.autoAdvance ?? true,
    notes: item?.notes ?? '',
    url: item?.url ?? '',
    apr: item?.meta?.apr != null ? String(item.meta.apr) : '29.99',
    promoMonths: item?.meta?.promoMonths != null ? String(item.meta.promoMonths) : '12',
  };
}

/* Fields are inset wells (ink-950) so they read clearly against the
   raised ink-900 dialog panel — the edit surface must feel solid. */
const inputCls = 'border-ink-800 bg-ink-950 text-mist-100 placeholder:text-mist-500/60 focus-visible:ring-signal-400/50';

export function ItemDialog({
  open,
  onOpenChange,
  editing,
  prefill,
  onSave,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing?: MoneyDateItem | null;
  /** Fills the form as a NEW item (e.g. a shared payment) — never edit mode. */
  prefill?: Partial<MoneyDateItem> | null;
  onSave: (item: MoneyDateItem) => void;
  onDelete?: (id: string) => void;
}) {
  const source = editing ?? prefill ?? null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-y-auto border-ink-800 bg-ink-900 shadow-2xl shadow-black/60 sm:max-w-lg">
        <ItemForm
          key={`${open}-${source?.id ?? 'new'}`}
          initial={draftFrom(source)}
          existing={editing ?? null}
          onSave={onSave}
          onDone={() => onOpenChange(false)}
          onCancel={() => onOpenChange(false)}
          onDelete={onDelete}
        />
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  initial,
  existing,
  onSave,
  onDone,
  onCancel,
  onDelete,
}: {
  initial: ItemDraft;
  existing: MoneyDateItem | null;
  onSave: (item: MoneyDateItem) => void;
  onDone: () => void;
  onCancel: () => void;
  onDelete?: (id: string) => void;
}) {
  const hasExisting = Boolean(existing);
  const [draft, setDraft] = useState<ItemDraft>(initial);
  const [error, setError] = useState<string | null>(null);

  const hint = KIND_META[draft.kind];
  const service = useMemo(() => servicePlaybook(draft.name), [draft.name]);

  function set<K extends keyof ItemDraft>(key: K, value: ItemDraft[K]) {
    setDraft((d) => ({ ...d, [key]: value }));
  }

  function handleSave() {
    if (!draft.name.trim()) {
      setError('Name this money date — even "that gym thing" works.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.end)) {
      setError('Pick the money date.');
      return;
    }
    const cost = Number(draft.costAtStake) || 0;
    const meta: MoneyDateItem['meta'] = {};
    if (draft.kind === 'promo') {
      meta.balance = cost;
      meta.apr = Number(draft.apr) || 29.99;
      meta.promoMonths = Number(draft.promoMonths) || 12;
    }
    const now = new Date().toISOString();
    const item: MoneyDateItem = {
      ...(existing ?? {}),
      id: draft.id ?? newId(),
      kind: draft.kind,
      name: draft.name.trim(),
      costAtStake: cost,
      start: /^\d{4}-\d{2}-\d{2}$/.test(draft.start) ? draft.start : draft.end,
      end: draft.end,
      recurrence: draft.recurrence,
      customDays:
        draft.recurrence === 'custom' ? Math.max(1, Number(draft.customDays) || 90) : undefined,
      autoAdvance: draft.recurrence === 'once' ? false : draft.autoAdvance,
      status: existing?.status ?? 'active',
      savedAmount: existing?.savedAmount,
      notes: draft.notes.trim() || undefined,
      url: draft.url.trim() || undefined,
      meta: draft.kind === 'promo' ? meta : undefined,
      notified: draft.end === existing?.end ? existing?.notified : [],
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    } as MoneyDateItem;
    onSave(item);
    onDone();
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display tracking-tight text-mist-100">
          {hasExisting ? 'Edit money date' : 'New money date'}
        </DialogTitle>
        <DialogDescription className="leading-relaxed text-mist-400">{hint.hint}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid gap-1.5">
          <Label htmlFor="pv-kind" className="pv-label">Kind</Label>
          <Select value={draft.kind} onValueChange={(v) => set('kind', v as ItemKind)}>
            <SelectTrigger id="pv-kind" className={inputCls}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-ink-800 bg-ink-900 shadow-2xl shadow-black/60">
              {KIND_ORDER.map((k) => (
                <SelectItem key={k} value={k} className="text-mist-100 focus:bg-ink-850 focus:text-mist-100">
                  <span className="flex items-center gap-2">
                    <KindGlyph kind={k} className="h-4 w-4 text-mist-400" />
                    {KIND_META[k].label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pv-name" className="pv-label">Name</Label>
          <Input
            id="pv-name"
            value={draft.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={
              draft.kind === 'domain'
                ? 'myportfolio.com'
                : draft.kind === 'giftcard'
                  ? 'Amazon gift card from Grandma'
                  : 'Adobe Creative Cloud'
            }
            className={inputCls}
          />
          {service && (
            <p className="flex items-start gap-1.5 text-xs leading-relaxed text-signal-400/90">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
              Cancel playbook available for{' '}
              {service.title.toLowerCase().replace('Cancel ', '')}.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="pv-cost" className="pv-label">{costLabel(draft.kind)}</Label>
            <Input
              id="pv-cost"
              type="number"
              min="0"
              step="0.01"
              value={draft.costAtStake}
              onChange={(e) => set('costAtStake', e.target.value)}
              placeholder="45"
              className={`${inputCls} pv-num`}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="pv-start" className="pv-label">Starts</Label>
            <Input
              id="pv-start"
              type="date"
              value={draft.start}
              onChange={(e) => set('start', e.target.value)}
              className={`${inputCls} pv-num`}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pv-end" className="pv-label">{endLabel(draft.kind)}</Label>
          <Input
            id="pv-end"
            type="date"
            required
            value={draft.end}
            onChange={(e) => set('end', e.target.value)}
            className={`${inputCls} pv-num`}
          />
        </div>

        {draft.kind === 'promo' && (
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pv-apr" className="pv-label">APR after promo (%)</Label>
              <Input
                id="pv-apr"
                type="number"
                min="0"
                step="0.01"
                value={draft.apr}
                onChange={(e) => set('apr', e.target.value)}
                className={`${inputCls} pv-num`}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="pv-months" className="pv-label">Promo length (months)</Label>
              <Input
                id="pv-months"
                type="number"
                min="1"
                step="1"
                value={draft.promoMonths}
                onChange={(e) => set('promoMonths', e.target.value)}
                className={`${inputCls} pv-num`}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="pv-rec" className="pv-label">Repeats</Label>
            <Select value={draft.recurrence} onValueChange={(v) => set('recurrence', v as Recurrence)}>
              <SelectTrigger id="pv-rec" className={inputCls}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-ink-800 bg-ink-900 shadow-2xl shadow-black/60">
                <SelectItem value="once" className="text-mist-100 focus:bg-ink-850 focus:text-mist-100">One-time</SelectItem>
                <SelectItem value="monthly" className="text-mist-100 focus:bg-ink-850 focus:text-mist-100">Monthly</SelectItem>
                <SelectItem value="annual" className="text-mist-100 focus:bg-ink-850 focus:text-mist-100">Annual</SelectItem>
                <SelectItem value="custom" className="text-mist-100 focus:bg-ink-850 focus:text-mist-100">Every N days</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {draft.recurrence === 'custom' && (
            <div className="grid gap-1.5">
              <Label htmlFor="pv-days" className="pv-label">N (days)</Label>
              <Input
                id="pv-days"
                type="number"
                min="1"
                value={draft.customDays}
                onChange={(e) => set('customDays', e.target.value)}
                className={`${inputCls} pv-num`}
              />
            </div>
          )}
        </div>

        {draft.recurrence !== 'once' && (
          <div className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900/50 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-mist-200">Auto-advance renewals</p>
              <p className="mt-0.5 text-xs leading-relaxed text-mist-500">
                When a renewal passes, roll the date forward and count it as money spent.
              </p>
            </div>
            <Switch
              checked={draft.autoAdvance}
              onCheckedChange={(v) => set('autoAdvance', v)}
              aria-label="Auto-advance renewals"
            />
          </div>
        )}

        <div className="grid gap-1.5">
          <Label htmlFor="pv-notes" className="pv-label">Notes</Label>
          <Textarea
            id="pv-notes"
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Order number, where the receipt lives, who to call…"
            className="min-h-[70px] border-ink-800 bg-ink-950 text-mist-100 placeholder:text-mist-500/60 focus-visible:ring-signal-400/50"
          />
        </div>

        <div className="grid gap-1.5">
          <Label htmlFor="pv-url" className="pv-label">Manage-it link</Label>
          <Input
            id="pv-url"
            type="url"
            value={draft.url}
            onChange={(e) => set('url', e.target.value)}
            placeholder="https://netflix.com/cancelplan"
            className={inputCls}
          />
        </div>

        {error && <p className="pv-rise text-sm text-cliff-300">{error}</p>}
      </div>

      <DialogFooter className="gap-2">
        {hasExisting && onDelete && draft.id && (
          <Button
            variant="outline"
            className="mr-auto border-ink-800 text-cliff-300 hover:bg-cliff-400/10 hover:text-cliff-300"
            onClick={() => {
              onDelete(draft.id!);
              onDone();
            }}
          >
            Delete
          </Button>
        )}
        <Button variant="outline" className="border-ink-800 hover:bg-ink-900" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
          onClick={handleSave}
        >
          {hasExisting ? 'Save changes' : 'Add to radar'}
        </Button>
      </DialogFooter>
    </>
  );
}
