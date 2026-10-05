'use client';

/**
 * PocketVeto — statement & shared-payment scan: find your autopays without
 * a bank link.
 *
 * Two ways in, both parsed entirely on-device:
 *  - Paste (or drop) bank/card activity — the detector finds recurring charges.
 *  - Share: on Android, share any payment SMS or app notification straight to
 *    PocketVeto (installed as an app). It lands here already parsed — the
 *    text never leaves the browser.
 */

import { useMemo, useRef, useState } from 'react';
import {
  Check,
  FileUp,
  Info,
  Plus,
  RotateCcw,
  ScanLine,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  scanStatement,
  scanSharedText,
  detectedToItem,
  paymentDraft,
  SAMPLE_STATEMENT,
  type DetectedRecurring,
  type ParseResult,
  type PaymentParseResult,
  type ParsedCharge,
} from '@/lib/pocketveto/scan';
import { formatMoney } from '@/lib/pocketveto/risk';
import type { MoneyDateItem } from '@/lib/pocketveto/types';
import { KindGlyph } from './KindGlyph';

const CADENCE_LABEL: Record<DetectedRecurring['cadence'], string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 weeks',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  annual: 'Yearly',
};

/** Notification markers (₹ / Rs / INR / payment verbs) pick the parser. */
const NOTIFICATION_HINT = /₹|\brs\.?\s?\d|\binr\s?\d|\b(paid|debited|spent|charged)\b/i;

type ScanState =
  | { mode: 'statement'; parse: ParseResult; detected: DetectedRecurring[] }
  | { mode: 'shared'; parse: PaymentParseResult; detected: DetectedRecurring[] };

function runScan(text: string): ScanState {
  if (NOTIFICATION_HINT.test(text)) {
    const { parse, detected } = scanSharedText(text);
    return { mode: 'shared', parse, detected };
  }
  const { parse, detected } = scanStatement(text);
  return { mode: 'statement', parse, detected };
}

function confidenceLabel(c: number): string {
  if (c >= 0.8) return 'High confidence';
  if (c >= 0.65) return 'Good confidence';
  return 'Likely';
}

function DetectedCard({
  d,
  tracked,
  dismissed,
  delay,
  onTrack,
  onDismiss,
}: {
  d: DetectedRecurring;
  tracked: boolean;
  dismissed: boolean;
  delay: number;
  onTrack: () => void;
  onDismiss: () => void;
}) {
  if (dismissed) return null;
  return (
    <li
      className="pv-rise rounded-xl border border-ink-800 bg-ink-925/50 p-4 transition-colors hover:border-ink-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-800 bg-ink-950 text-mist-400">
            <KindGlyph kind={d.kind} className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold tracking-tight text-mist-100">
              {d.merchant}
            </p>
            <p className="pv-num mt-0.5 text-xs text-mist-500">
              {d.count} charge{d.count > 1 ? 's' : ''} · every ~{d.medianGapDays}d ·{' '}
              {CADENCE_LABEL[d.cadence]}
              {d.amountSpread > 0.02 ? ' · varies' : ''}
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="pv-num text-lg font-semibold text-cliff-300">
            {formatMoney(d.monthlyCost)}
            <span className="text-xs text-mist-500">/mo</span>
          </p>
          <p className="pv-num mt-0.5 text-[11px] text-mist-500">
            {formatMoney(d.amount)} next · {d.nextDate}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-[140px] flex-1 items-center gap-2">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
            <div
              className="h-full rounded-full bg-signal-400 transition-all"
              style={{ width: `${Math.round(d.confidence * 100)}%` }}
            />
          </div>
          <span className="pv-num text-[11px] text-mist-500">{confidenceLabel(d.confidence)}</span>
        </div>
        <div className="flex items-center gap-2">
          {d.playbookTitle && (
            <span className="hidden items-center gap-1 text-[11px] text-signal-400/90 sm:flex">
              <Info className="h-3 w-3" strokeWidth={1.75} aria-hidden /> Cancel playbook ready
            </span>
          )}
          {tracked ? (
            <span className="flex items-center gap-1.5 rounded-md border border-signal-500/40 bg-signal-400/10 px-3 py-1.5 text-xs font-semibold text-signal-400">
              <Check className="h-3.5 w-3.5" aria-hidden /> Tracked
            </span>
          ) : (
            <>
              <Button
                size="sm"
                className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                onClick={onTrack}
              >
                Track it
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-mist-500 hover:bg-ink-900 hover:text-mist-300"
                onClick={onDismiss}
                aria-label={`Dismiss ${d.merchant}`}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </>
          )}
        </div>
      </div>
    </li>
  );
}

function SingleChargeCard({
  c,
  delay,
  onAdd,
  onDismiss,
}: {
  c: ParsedCharge;
  delay: number;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  return (
    <li
      className="pv-rise rounded-xl border border-ink-800 bg-ink-925/50 p-4 transition-colors hover:border-ink-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-800 bg-ink-950 text-mist-400">
            <KindGlyph kind="subscription" className="h-4.5 w-4.5" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-base font-semibold tracking-tight text-mist-100">
              {c.merchant}
            </p>
            <p className="pv-num mt-0.5 truncate text-xs text-mist-500">
              {c.dateAssumed ? 'just now' : c.date} · from a shared notification
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="pv-num text-lg font-semibold text-cliff-300">
            {formatMoney(c.amount)}
          </span>
          <Button
            size="sm"
            variant="outline"
            className="border-ink-700 hover:bg-ink-900"
            onClick={onAdd}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden /> Add
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-mist-500 hover:bg-ink-900 hover:text-mist-300"
            onClick={onDismiss}
            aria-label={`Dismiss ${c.merchant}`}
          >
            <X className="h-4 w-4" aria-hidden />
          </Button>
        </div>
      </div>
    </li>
  );
}

export function ScanView({
  items,
  onTrack,
  initialText = '',
  autoScan = false,
  onAddSingle,
}: {
  items: MoneyDateItem[];
  onTrack: (item: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>) => void;
  /** Text shared into the app (Web Share Target) — pre-parsed on mount. */
  initialText?: string;
  autoScan?: boolean;
  onAddSingle?: (item: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>) => void;
}) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<ScanState | null>(() =>
    autoScan && initialText.trim().length >= 8 ? runScan(initialText) : null
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const existingNames = useMemo(
    () => new Set(items.map((i) => i.name.trim().toUpperCase())),
    [items]
  );

  const detected = result?.detected ?? [];
  const visible = detected.filter((d) => !dismissed.has(d.key));
  const dismissedCount = detected.length - visible.length;

  const singles = useMemo<ParsedCharge[]>(() => {
    if (!result || result.mode !== 'shared' || detected.length > 0) return [];
    const seen = new Set<string>();
    return result.parse.charges.filter((c) => {
      const id = `${c.key}|${c.date}|${c.amount}`;
      if (seen.has(id) || dismissed.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [result, detected.length, dismissed]);

  const totalMonthly = useMemo(
    () => visible.reduce((s, d) => s + d.monthlyCost, 0),
    [visible]
  );

  const shared = autoScan && initialText.trim().length >= 8;

  function run() {
    setError(null);
    if (text.trim().length < 8) {
      setError('Paste a few lines of statement activity — or share a payment notification from your phone.');
      setResult(null);
      return;
    }
    setDismissed(new Set());
    setTracked(new Set());
    setResult(runScan(text));
  }

  function track(d: DetectedRecurring) {
    onTrack(detectedToItem(d));
    setTracked((prev) => new Set(prev).add(d.key));
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* Intro */}
      <div className="mb-5">
        <h2 className="font-display text-xl font-bold tracking-tight text-mist-100">
          Find your autopays
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-mist-400">
          Paste your bank or card activity — a CSV export, or just the transaction lines.
          The scanner finds the charges that repeat, works out the cadence, and adds them
          to your radar in one tap.
        </p>
        <p className="mt-2.5 flex items-start gap-2 text-xs leading-relaxed text-mist-400">
          <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-signal-400" strokeWidth={1.75} aria-hidden />
          <span>
            <span className="text-mist-200">On your phone:</span> after installing the app,
            tap <span className="text-mist-200">Share</span> on any payment SMS or GPay/PhonePe
            notification and pick PocketVeto — it lands here, parsed. Works with ₹, Rs, INR
            and $ texts.
          </span>
        </p>
        <p className="mt-2.5 flex items-center gap-2 text-xs text-signal-400/90">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Runs entirely on this device — your text never leaves the browser.
        </p>
      </div>

      {/* Shared banner */}
      {shared && result && (
        <div className="pv-rise mb-4 flex items-start gap-2.5 rounded-xl border border-signal-500/30 bg-signal-400/10 p-3.5 text-xs leading-relaxed text-signal-300">
          <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Read from a shared notification — parsed on this device, uploaded nowhere.
        </div>
      )}

      {/* Input */}
      {!result && (
        <div className="rounded-2xl border border-ink-800 bg-ink-925/50 p-4">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'Date,Description,Amount\n2026-08-03,"NETFLIX.COM",-15.49\n2026-08-09 SPOTIFY -11.99\n…paste as many months as you have'}
            className="min-h-[180px] rounded-xl border-ink-800 bg-ink-950 font-mono text-xs leading-relaxed text-mist-100 placeholder:text-mist-500/60 focus-visible:ring-signal-400/50"
            aria-label="Statement text"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              onClick={run}
              className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
            >
              <ScanLine className="h-4 w-4" aria-hidden /> Detect subscriptions
            </Button>
            <Button variant="outline" className="border-ink-800 hover:bg-ink-900" onClick={() => fileRef.current?.click()}>
              <FileUp className="h-4 w-4" aria-hidden /> Upload .csv / .txt
            </Button>
            <Button
              variant="ghost"
              className="text-mist-400"
              onClick={() => {
                setText(SAMPLE_STATEMENT);
                setError(null);
              }}
            >
              Load sample
            </Button>
            {text && (
              <Button
                variant="ghost"
                className="text-mist-500 hover:text-cliff-300"
                onClick={() => {
                  setText('');
                  setError(null);
                }}
                aria-label="Clear input"
              >
                <Trash2 className="h-4 w-4" aria-hidden /> Clear
              </Button>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.txt,text/csv,text/plain"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setText(await f.text());
              setError(null);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {error && (
        <div className="pv-rise mt-4 rounded-xl border border-warn-400/40 bg-warn-400/10 p-4 text-sm leading-relaxed text-warn-300">
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-925/50 p-4">
            <div>
              <p className="font-display text-base font-semibold tracking-tight text-mist-100">
                {visible.length === 0
                  ? result.mode === 'shared'
                    ? singles.length > 0
                      ? `${singles.length} payment${singles.length > 1 ? 's' : ''} read — nothing repeats yet`
                      : 'No recurring charges found'
                    : 'No recurring charges found'
                  : `${visible.length} autopay${visible.length > 1 ? 's' : ''} detected`}
                {visible.length > 0 && (
                  <span className="pv-num ml-2 text-sm font-normal text-mist-500">
                    ≈ {formatMoney(totalMonthly)}/month
                  </span>
                )}
              </p>
              <p className="pv-num mt-0.5 text-[11px] text-mist-500">
                {result.mode === 'shared'
                  ? `${result.parse.charges.length} payment${result.parse.charges.length === 1 ? '' : 's'} read`
                  : `${result.parse.transactions.length} charges read`}
                {result.mode === 'statement' && result.parse.skipped > 0
                  ? ` · ${result.parse.skipped} lines skipped`
                  : ''}
                {visible.length > 0 ? ' · a year of history detects best' : ''}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="border-ink-800 hover:bg-ink-900"
              onClick={() => {
                setResult(null);
                setError(null);
              }}
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden /> Scan again
            </Button>
          </div>

          {visible.length === 0 ? (
            singles.length > 0 ? (
              <>
                <p className="mb-3 text-sm leading-relaxed text-mist-400">
                  One-off payments from the shared text. Add one to start tracking it — share
                  a few months of the same SMS thread and cadence detection kicks in
                  automatically.
                </p>
                <ul className="grid grid-cols-1 gap-3">
                  {singles.map((c, i) => (
                    <SingleChargeCard
                      key={`${c.key}-${c.date}-${i}`}
                      c={c}
                      delay={Math.min(i * 70, 420)}
                      onAdd={() => onAddSingle?.(paymentDraft(c))}
                      onDismiss={() => setDismissed((prev) => new Set(prev).add(`${c.key}|${c.date}|${c.amount}`))}
                    />
                  ))}
                </ul>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-ink-700 p-8 text-center text-sm leading-relaxed text-mist-400">
                {result.mode === 'shared'
                  ? 'Could not read a payment in that text. The reader looks for payment lines — "Paid ₹349 to Netflix", "Rs.349 debited … towards …" — with an amount and a payee.'
                  : 'Nothing repeats in that text — no autopays here. The detector needs at least two charges from the same merchant with a steady rhythm (weekly, monthly, quarterly, yearly).'}
              </div>
            )
          ) : (
            <ul className="grid grid-cols-1 gap-3">
              {visible.map((d, i) => (
                <DetectedCard
                  key={d.key}
                  d={d}
                  delay={Math.min(i * 70, 420)}
                  tracked={tracked.has(d.key) || existingNames.has(d.merchant.trim().toUpperCase())}
                  dismissed={false}
                  onTrack={() => track(d)}
                  onDismiss={() => setDismissed((prev) => new Set(prev).add(d.key))}
                />
              ))}
            </ul>
          )}

          {dismissedCount > 0 && (
            <button
              type="button"
              onClick={() => setDismissed(new Set())}
              className="mx-auto mt-4 block text-xs text-mist-500 underline-offset-4 transition-colors hover:text-mist-300 hover:underline"
            >
              Restore {dismissedCount} dismissed
            </button>
          )}
        </>
      )}
    </div>
  );
}
