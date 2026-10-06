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
  Smartphone,
  BellPlus,
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
import {
  getNativeBridge,
  pullCaptures,
  capturesToText,
  sourceLabel,
  type NativeStatusLive,
  type NativeCapture,
} from '@/lib/pocketveto/native';
import { BrandMark } from './BrandMark';

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
  | { mode: 'statement'; origin: 'paste'; parse: ParseResult; detected: DetectedRecurring[] }
  | { mode: 'shared'; origin: 'share' | 'phone'; parse: PaymentParseResult; detected: DetectedRecurring[] };

function runScan(text: string): ScanState {
  if (NOTIFICATION_HINT.test(text)) {
    const { parse, detected } = scanSharedText(text);
    return { mode: 'shared', origin: 'share', parse, detected };
  }
  const { parse, detected } = scanStatement(text);
  return { mode: 'statement', origin: 'paste', parse, detected };
}

function confidenceLabel(c: number, known?: boolean): string {
  if (known) return 'Known subscription';
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
      className="pv-rise rounded-xl border border-ink-800 bg-ink-925 p-4 transition-colors hover:border-ink-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3.5">
        <BrandMark name={d.merchant} raw={d.key} kind={d.kind} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <p className="truncate font-display text-base font-semibold tracking-tight text-mist-100">
              {d.merchant}
            </p>
            {d.known && (
              <span className="rounded-full border border-signal-500/30 bg-signal-400/10 px-2 py-px text-[10px] font-medium uppercase tracking-wider text-signal-400">
                known
              </span>
            )}
          </div>
          <p className="pv-num mt-1 text-xs text-mist-500">
            {d.count} charge{d.count > 1 ? 's' : ''} · {CADENCE_LABEL[d.cadence]}
            {d.amountSpread > 0.02 ? ' · varies' : ''}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="pv-num text-lg font-semibold text-cliff-300">
            {formatMoney(d.monthlyCost)}
            <span className="text-xs text-mist-500">/mo</span>
          </p>
          <p className="pv-num mt-0.5 text-[11px] text-mist-500">
            {formatMoney(d.amount)} · {d.nextDate}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        {/* The bar earns its space only when confidence is real signal —
            for known brands the badge already said it. */}
        <div className="flex min-w-[140px] flex-1 items-center gap-2">
          {d.known ? (
            d.playbookTitle ? (
              <span className="flex items-center gap-1.5 text-[11px] text-signal-400/90">
                <Info className="h-3 w-3" strokeWidth={1.75} aria-hidden /> Cancel playbook ready
              </span>
            ) : null
          ) : (
            <>
              <div className="h-1 flex-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-signal-400 transition-all"
                  style={{ width: `${Math.round(d.confidence * 100)}%` }}
                />
              </div>
              <span className="pv-num text-[11px] text-mist-500">
                {confidenceLabel(d.confidence, d.known)}
              </span>
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
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
      className="pv-rise rounded-xl border border-ink-800 bg-ink-925 p-4 transition-colors hover:border-ink-700"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-3.5">
        <BrandMark name={c.merchant} raw={c.key} kind="subscription" />
        <div className="min-w-0 flex-1">
          <p className="truncate font-display text-base font-semibold tracking-tight text-mist-100">
            {c.merchant}
          </p>
          <p className="pv-num mt-1 text-xs text-mist-500">
            {c.dateAssumed ? 'just now' : c.date} · from a shared notification
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
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
  native,
}: {
  items: MoneyDateItem[];
  onTrack: (item: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>) => void;
  /** Text shared into the app (Web Share Target) — pre-parsed on mount. */
  initialText?: string;
  autoScan?: boolean;
  onAddSingle?: (item: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>) => void;
  /** Native capture engine status — present only inside the Android APK. */
  native?: NativeStatusLive;
}) {
  const [text, setText] = useState(initialText);
  const [result, setResult] = useState<ScanState | null>(() =>
    autoScan && initialText.trim().length >= 8 ? runScan(initialText) : null
  );
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [tracked, setTracked] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [phoneCaptures, setPhoneCaptures] = useState<NativeCapture[] | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const existingNames = useMemo(
    () => new Set(items.map((i) => i.name.trim().toUpperCase())),
    [items]
  );

  const detected = result?.detected ?? [];
  const visible = detected.filter((d) => !dismissed.has(d.key));
  const dismissedCount = detected.length - visible.length;

  const singles = useMemo<ParsedCharge[]>(() => {
    if (!result || result.mode !== 'shared') return [];
    // Charges already represented by a detected recurrence stay folded
    // into that card; unrelated one-off payments still show.
    const detectedKeys = new Set(detected.map((d) => d.key));
    const seen = new Set<string>();
    return result.parse.charges.filter((c) => {
      if (detectedKeys.has(c.key)) return false;
      const id = `${c.key}|${c.date}|${c.amount}`;
      if (seen.has(id) || dismissed.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [result, detected, dismissed]);

  const totalMonthly = useMemo(
    () => visible.reduce((s, d) => s + d.monthlyCost, 0),
    [visible]
  );

  const shared = autoScan && initialText.trim().length >= 8;

  /** Drain the native capture queue and run it through the same detector. */
  function reviewPhoneCaptures() {
    const b = getNativeBridge();
    if (!b) return;
    const caps = pullCaptures();
    if (caps.length === 0) {
      setError('No captured payments waiting — they appear here as notifications arrive.');
      native?.refresh();
      return;
    }
    const joined = capturesToText(caps);
    setText(joined);
    setPhoneCaptures(caps);
    setDismissed(new Set());
    setTracked(new Set());
    setError(null);
    // Captures are notification texts — parse them as such, one truth.
    const { parse, detected } = scanSharedText(joined);
    setResult({ mode: 'shared', origin: 'phone', parse, detected });
    native?.refresh();
  }

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
            <span className="text-mist-200">On your phone:</span> install the Android app
            and payments auto-capture from your notifications — or tap <span className="text-mist-200">Share</span> on any
            payment SMS and pick PocketVeto. Works with ₹, Rs, INR and $ texts.
          </span>
        </p>
        <p className="mt-2.5 flex items-center gap-2 text-xs text-signal-400/90">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Runs entirely on this device — your text never leaves the browser.
        </p>
      </div>

      {/* Phone capture — only inside the Android shell */}
      {native?.available && (
        <div className="pv-rise mb-5 rounded-2xl border border-signal-500/25 bg-signal-400/[0.06] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-semibold text-mist-100">
              <Smartphone className="h-4 w-4 text-signal-400" strokeWidth={1.75} aria-hidden />
              Phone capture
            </p>
            {native.pendingCount > 0 && (
              <span className="pv-num relative flex items-center gap-2 rounded-full bg-signal-400/15 px-3 py-1 text-xs font-semibold text-signal-400">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="pv-ping absolute inline-flex h-full w-full rounded-full bg-signal-400" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal-400" />
                </span>
                {native.pendingCount} captured
              </span>
            )}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {native.notifEnabled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-500/40 bg-signal-400/10 px-3 py-1.5 text-xs text-signal-300">
                <Check className="h-3.5 w-3.5" strokeWidth={2} aria-hidden /> Notification access on
              </span>
            ) : (
              <Button
                size="sm"
                className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                onClick={() => getNativeBridge()?.openNotifAccess()}
              >
                <BellPlus className="h-4 w-4" aria-hidden /> Allow notification capture
              </Button>
            )}
            {native.notifEnabled && (
              <Button
                size="sm"
                variant="ghost"
                className="text-mist-300"
                onClick={reviewPhoneCaptures}
              >
                <ScanLine className="h-4 w-4" aria-hidden />
                Review captured payments{native.pendingCount > 0 ? ` (${native.pendingCount})` : ''}
              </Button>
            )}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-mist-500">
            Captures the raw text of payment notifications (PhonePe, GPay, banks — anything
            with a money line) on this device only. Promo and OTP junk is rejected by the
            parser; nothing is ever uploaded.
          </p>
        </div>
      )}

      {/* Captured-from-phone banner */}
      {result?.origin === 'phone' && (
        <div className="pv-rise mb-4 flex items-start gap-2.5 rounded-xl border border-signal-500/30 bg-signal-400/10 p-3.5 text-xs leading-relaxed text-signal-300">
          <Smartphone className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Auto-captured from your phone — {phoneCaptures?.length ?? 0} notification
          {phoneCaptures?.length === 1 ? '' : 's'} parsed on this device, uploaded nowhere.
          {result.parse.charges.length === 0 && result.detected.length === 0
            ? ' Nothing parsed as a payment yet — nothing is kept.'
            : ''}
        </div>
      )}

      {/* Shared banner */}
      {shared && result && (
        <div className="pv-rise mb-4 flex items-start gap-2.5 rounded-xl border border-signal-500/30 bg-signal-400/10 p-3.5 text-xs leading-relaxed text-signal-300">
          <Share2 className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
          Read from a shared notification — parsed on this device, uploaded nowhere.
        </div>
      )}

      {/* Input */}
      {!result && (
        <div className="rounded-2xl border border-ink-800 bg-ink-925 p-4">
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
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-925 p-4">
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

          {visible.length === 0 && singles.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-ink-700 p-8 text-center text-sm leading-relaxed text-mist-400">
              {result.mode === 'shared'
                ? 'Could not read a payment in that text. The reader looks for payment lines — "Paid ₹349 to Netflix", "Rs.349 debited … towards …" — with an amount and a payee.'
                : 'Nothing repeats in that text — no autopays here. The detector needs at least two charges from the same merchant with a steady rhythm (weekly, monthly, quarterly, yearly).'}
            </div>
          ) : (
            <>
              {visible.length > 0 && (
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

              {singles.length > 0 && (
                <>
                  <p className="mb-3 mt-5 text-sm leading-relaxed text-mist-400">
                    {visible.length > 0
                      ? 'One-off payments read alongside the autopays — track any of them, or leave them.'
                      : 'One-off payments from the captured text. Add one to start tracking it — the same merchant charged twice starts cadence detection automatically.'}
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
              )}
            </>
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
