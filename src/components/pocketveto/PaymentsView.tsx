'use client';

/**
 * PocketVeto — the Payments ledger: money that already moved.
 *
 * The other half of the v1.5.0 split. Every payment the capture engine
 * reads lands here as a row; the classifier's autopay flag is shown,
 * never guessed again. Totals sit on top (today / this calendar month,
 * split autopay vs one-off); the list groups by day; a tap opens the
 * evidence. One-offs stay one-offs — the only path from here to the
 * radar is the user's own "Track as subscription" hand.
 */

import { useMemo, useState } from 'react';
import {
  Check,
  Link2,
  Plus,
  Repeat,
  ScanLine,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { MoneyDateItem, PaymentRecord } from '@/lib/pocketveto/types';
import type { SpendSummary } from '@/lib/pocketveto/payments';
import { groupPaymentsByDay } from '@/lib/pocketveto/payments';
import { todayISO } from '@/lib/pocketveto/dates';
import { formatMoney } from '@/lib/pocketveto/risk';
import { toast } from '@/hooks/use-toast';
import { BrandMark } from './BrandMark';

const inputCls =
  'border-ink-800 bg-ink-950 text-mist-100 placeholder:text-mist-500/60 focus-visible:ring-signal-400/50';

/* ------------------------------------------------------------------ */
/* Total spent card                                                     */
/* ------------------------------------------------------------------ */

function RangeToggle({
  range,
  onChange,
}: {
  range: 'today' | 'month';
  onChange: (r: 'today' | 'month') => void;
}) {
  return (
    <div
      className="flex rounded-full border border-ink-800 bg-ink-950 p-0.5"
      role="group"
      aria-label="Total spent range"
    >
      {(['today', 'month'] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          aria-pressed={range === r}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors duration-200 ${
            range === r
              ? 'bg-signal-400/15 text-signal-300'
              : 'text-mist-500 hover:text-mist-300'
          }`}
        >
          {r === 'today' ? 'Today' : 'This month'}
        </button>
      ))}
    </div>
  );
}

export function SpendCard({
  spend,
  onOpen,
}: {
  spend: SpendSummary;
  onOpen?: () => void;
}) {
  const [range, setRange] = useState<'today' | 'month'>('month');
  const w = range === 'today' ? spend.today : spend.month;
  return (
    <div className="rounded-2xl border border-ink-800 bg-ink-925 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="pv-label">Total spent</h3>
        <RangeToggle range={range} onChange={setRange} />
      </div>
      <p className="pv-num mt-3 text-3xl font-semibold tracking-tight text-mist-100">
        {formatMoney(w.total)}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-mist-500">
        {range === 'today'
          ? w.count === 0
            ? 'nothing recorded yet today'
            : `${w.count} payment${w.count > 1 ? 's' : ''} recorded today`
          : w.count === 0
            ? `nothing recorded in ${spend.monthLabel}`
            : `${w.count} payment${w.count > 1 ? 's' : ''} in ${spend.monthLabel}`}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/30 bg-signal-400/10 px-2.5 py-1 text-signal-300">
          <Repeat className="h-3 w-3" strokeWidth={2} aria-hidden /> Autopays {formatMoney(w.autopay)}
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-700 bg-ink-900 px-2.5 py-1 text-mist-400">
          One-off {formatMoney(w.oneoff)}
        </span>
        {onOpen && (
          <button
            type="button"
            onClick={onOpen}
            className="ml-auto text-mist-400 underline-offset-4 transition-colors hover:text-mist-100 hover:underline"
          >
            See all payments
          </button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Ledger rows                                                          */
/* ------------------------------------------------------------------ */

function PaymentRow({
  p,
  tracked,
  onClick,
}: {
  p: PaymentRecord;
  tracked: boolean;
  onClick: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-3.5 px-4 py-3 text-left transition-colors hover:bg-ink-900/60 sm:px-5"
        aria-label={`Open ${p.merchant} payment details`}
      >
        <BrandMark name={p.merchant} raw={p.key} kind={p.autopay ? 'subscription' : 'custom'} />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <span className="truncate font-display text-[15px] font-semibold tracking-tight text-mist-100">
              {p.merchant}
            </span>
            {p.autopay && (
              <span className="inline-flex items-center gap-1 rounded-full border border-signal-500/30 bg-signal-400/10 px-1.5 py-px text-[10px] font-medium uppercase tracking-wider text-signal-400">
                <Repeat className="h-2.5 w-2.5" strokeWidth={2.25} aria-hidden /> autopay
              </span>
            )}
          </span>
          <span className="mt-0.5 block truncate text-xs text-mist-500">
            {p.via}
            {tracked ? ' · on your radar' : ''}
          </span>
        </span>
        <span className="pv-num shrink-0 text-right text-[15px] font-semibold text-mist-200">
          {formatMoney(p.amount)}
        </span>
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/* Manual add form                                                      */
/* ------------------------------------------------------------------ */

function AddPaymentDialog({
  open,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onSave: (merchant: string, amount: number, date: string) => PaymentRecord | null;
}) {
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayISO());
  const [error, setError] = useState<string | null>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = Number(amount.replace(/[, ]/g, ''));
    if (merchant.trim().length < 2) {
      setError('Name the payee — anything works.');
      return;
    }
    if (!Number.isFinite(amt) || amt <= 0) {
      setError('An amount above zero, please.');
      return;
    }
    const saved = onSave(merchant.trim(), amt, date);
    if (!saved) {
      setError('Could not save that payment.');
      return;
    }
    toast({
      title: 'Saved to Payments',
      description: `${formatMoney(saved.amount)} to ${saved.merchant}${saved.autopay ? ' — flagged as an autopay' : ''}.`,
    });
    setMerchant('');
    setAmount('');
    setDate(todayISO());
    setError(null);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-ink-800 bg-ink-900 shadow-2xl shadow-black/60 sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-display tracking-tight text-mist-100">
            Add a payment
          </DialogTitle>
          <DialogDescription className="leading-relaxed text-mist-400">
            A payment you made that no notification caught. It counts in your totals the same way.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="pv-payee" className="text-mist-300">
              Paid to
            </Label>
            <Input
              id="pv-payee"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Netflix, Ravi Sharma, grocery run…"
              className={inputCls}
              autoComplete="off"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="pv-amount" className="text-mist-300">
                Amount
              </Label>
              <Input
                id="pv-amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="149"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="pv-date" className="text-mist-300">
                Date
              </Label>
              <Input
                id="pv-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputCls}
              />
            </div>
          </div>
          {error && <p className="pv-rise text-sm text-cliff-300">{error}</p>}
          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-ink-800 hover:bg-ink-900"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
            >
              Save to ledger
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* The view                                                             */
/* ------------------------------------------------------------------ */

export function PaymentsView({
  payments,
  spend,
  items,
  onTrack,
  onDelete,
  onAddManual,
  onGoScan,
}: {
  payments: PaymentRecord[];
  spend: SpendSummary;
  items: MoneyDateItem[];
  /** Promote a ledger entry to a tracked subscription (user-initiated). */
  onTrack: (p: PaymentRecord) => void;
  onDelete: (id: string) => void;
  onAddManual: (merchant: string, amount: number, date: string) => PaymentRecord | null;
  onGoScan?: () => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<PaymentRecord | null>(null);

  const days = useMemo(
    () => groupPaymentsByDay(payments, todayISO()),
    [payments]
  );
  const selected = payments.find((p) => p.id === selectedId) ?? null;
  const linkedItem = selected?.linkedItemId
    ? items.find((i) => i.id === selected.linkedItemId)
    : undefined;

  return (
    <div className="mx-auto max-w-3xl">
      {/* Header */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-bold tracking-tight text-mist-100">
            Payments
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-mist-400">
            Money that already moved. Every payment your notifications caught lands here —
            one-offs stay put, autopays also feed your radar.
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 border-ink-800 bg-ink-900/60 text-mist-200 hover:bg-ink-850 hover:text-mist-100"
          onClick={() => setAddOpen(true)}
        >
          <Plus className="h-4 w-4" aria-hidden /> Add
        </Button>
      </div>

      {/* Totals */}
      <div className="mb-6">
        <SpendCard spend={spend} />
      </div>

      {/* The ledger */}
      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink-700 p-8 text-center">
          <p className="text-sm leading-relaxed text-mist-400">
            No payments recorded yet. On the Android app, payments you make via PhonePe, GPay,
            Paytm or your bank are captured from notifications and land here automatically —
            junk like OTPs and promos never does.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {onGoScan && (
              <Button
                size="sm"
                className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                onClick={onGoScan}
              >
                <ScanLine className="h-4 w-4" aria-hidden /> Turn on capture
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="border-ink-700 hover:bg-ink-900"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="h-4 w-4" aria-hidden /> Add a payment
            </Button>
          </div>
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-signal-400/80">
            <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            Everything stays on this device — the ledger never leaves your phone.
          </p>
        </div>
      ) : (
        days.map((day) => (
          <section key={day.date} className="mb-5">
            <div className="mb-2.5 flex items-baseline justify-between px-1">
              <h3 className="pv-label">{day.label}</h3>
              <span className="pv-num text-xs text-mist-500">
                {formatMoney(day.total)} · {day.payments.length} payment
                {day.payments.length > 1 ? 's' : ''}
              </span>
            </div>
            <ul className="divide-y divide-ink-800/60 overflow-hidden rounded-2xl border border-ink-800 bg-ink-925">
              {day.payments.map((p) => (
                <PaymentRow
                  key={p.id}
                  p={p}
                  tracked={Boolean(
                    p.linkedItemId && items.some((i) => i.id === p.linkedItemId)
                  )}
                  onClick={() => setSelectedId(p.id)}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {/* Detail sheet — the app's fixed-card pattern (see blip quick view) */}
      {selected && (
        <>
          <div className="fixed inset-0 z-40 isolate" aria-hidden>
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" />
          </div>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedId(null)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={`${selected.merchant} payment`}
            className="pv-pop fixed left-1/2 top-1/2 z-40 max-h-[88dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-ink-800 bg-ink-925 p-5 shadow-2xl shadow-black/50"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <BrandMark
                  name={selected.merchant}
                  raw={selected.key}
                  kind={selected.autopay ? 'subscription' : 'custom'}
                />
                <div>
                  <p className="pv-label">
                    {selected.autopay ? 'Autopay payment' : 'One-off payment'}
                  </p>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-mist-100">
                    {selected.merchant}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedId(null)}
                className="rounded-md p-1 text-mist-500 transition-colors hover:bg-ink-900 hover:text-mist-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border border-ink-800 bg-ink-950/70 p-3">
                <p className="pv-num text-xl font-semibold text-cliff-300">
                  {formatMoney(selected.amount)}
                </p>
                <p className="pv-num mt-0.5 text-[11px] text-mist-500">paid</p>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-950/70 p-3">
                <p className="pv-num text-xl font-semibold text-mist-100">{selected.date}</p>
                <p className="mt-0.5 text-[11px] text-mist-500">via {selected.via}</p>
              </div>
            </div>

            <p className="mb-3 flex items-start gap-2 text-xs leading-relaxed text-mist-400">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-400" strokeWidth={2} aria-hidden />
              <span>
                Why it&apos;s filed here: {selected.reason}.
              </span>
            </p>

            {linkedItem && (
              <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-signal-500/30 bg-signal-400/10 px-3 py-2 text-xs text-signal-300">
                <Link2 className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
                Linked to {linkedItem.name} on your radar
              </p>
            )}

            {selected.raw && (
              <div className="mb-4 rounded-lg border border-ink-800 bg-ink-950/70 p-3">
                <p className="pv-label mb-1.5">Evidence</p>
                <p className="font-mono text-[11px] leading-relaxed text-mist-400">
                  {selected.raw}
                </p>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              {!selected.linkedItemId && (
                <Button
                  size="sm"
                  className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                  onClick={() => {
                    onTrack(selected);
                    setSelectedId(null);
                  }}
                >
                  <Repeat className="h-3.5 w-3.5" aria-hidden /> Track as subscription
                </Button>
              )}
              <Button
                size="sm"
                variant="outline"
                className="border-ink-800 hover:bg-ink-900 hover:text-cliff-300"
                onClick={() => {
                  setConfirmDelete(selected);
                  setSelectedId(null);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden /> Remove
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-mist-500"
                onClick={() => setSelectedId(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Delete confirmation — in-app, never window.confirm */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="border-ink-800 bg-ink-925 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight text-mist-100">
              Remove the {confirmDelete?.merchant ?? ''} payment?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-mist-400">
              It leaves this device&apos;s ledger and your totals adjust. There is no cloud copy —
              that&apos;s the point.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ink-800 bg-transparent text-mist-300 hover:bg-ink-900 hover:text-mist-100">
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-cliff-400 font-semibold text-ink-950 hover:bg-cliff-300"
              onClick={() => {
                if (confirmDelete) onDelete(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AddPaymentDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={onAddManual}
      />
    </div>
  );
}
