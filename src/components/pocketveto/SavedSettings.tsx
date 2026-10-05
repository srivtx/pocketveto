'use client';

/**
 * PocketVeto — the saved ledger (victory lap) + settings (data controls).
 */

import { useRef, useState } from 'react';
import { BellRing, Download, FileJson, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { MoneyDateItem } from '@/lib/pocketveto/types';
import { KIND_META } from '@/lib/pocketveto/types';
import { formatMoney } from '@/lib/pocketveto/risk';
import { permissionState, requestPermission } from '@/lib/pocketveto/notifications';
import { toast } from '@/hooks/use-toast';
import { KindGlyph } from './KindGlyph';
import { useCountUp } from './motion';

export function SavedView({ items }: { items: MoneyDateItem[] }) {
  const closed = items
    .filter((i) => i.status === 'vetoed' || i.status === 'used')
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

  const total = closed.reduce((s, i) => s + (i.savedAmount ?? 0), 0);
  const totalDisplay = useCountUp(total);

  return (
    <div className="max-w-2xl">
      <div className="pv-rise mb-8 rounded-2xl border border-signal-500/30 bg-signal-400/10 p-8 text-center">
        <p className="pv-num text-5xl font-semibold tracking-tight text-signal-300">
          {formatMoney(totalDisplay)}
        </p>
        <p className="mt-2 text-sm text-signal-300/70">
          kept instead of lost — vetoes, claims and redemptions you acted on
        </p>
      </div>

      {closed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-ink-800 p-8 text-center text-sm leading-relaxed text-mist-500">
          Nothing here yet. The first entry feels great — veto a trial, redeem a card, claim a
          warranty before it lapses, then mark it done.
        </div>
      ) : (
        <div className="grid gap-3">
          {closed.map((item, i) => (
            <div
              key={item.id}
              style={{ animationDelay: `${Math.min(i, 8) * 50}ms` }}
              className="pv-rise flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-800 bg-ink-925/40 p-4 transition-colors hover:border-ink-700"
            >
              <div className="flex min-w-0 items-center gap-3">
                <KindGlyph kind={item.kind} className="h-4 w-4 shrink-0 text-mist-400" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-mist-200">{item.name}</p>
                  <p className="mt-0.5 text-xs text-mist-500">
                    {item.status === 'vetoed' ? 'Cancelled before the charge' : 'Used before it decayed'}
                    {item.updatedAt ? ` · ${item.updatedAt.slice(0, 10)}` : ''}
                  </p>
                </div>
              </div>
              <p className="pv-num text-lg font-semibold text-signal-400">
                +{formatMoney(item.savedAmount ?? 0)}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SettingsView({
  items,
  onExport,
  onImport,
  onClearAll,
  onLoadSample,
}: {
  items: MoneyDateItem[];
  onExport: () => string;
  onImport: (raw: string) => { imported: number; skipped: number };
  onClearAll: () => void;
  onLoadSample: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [perm, setPerm] = useState(permissionState());
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmSample, setConfirmSample] = useState(false);

  function loadSample() {
    // Sample data replaces everything — ask first if real items exist.
    if (items.length > 0) {
      setConfirmSample(true);
      return;
    }
    onLoadSample();
  }

  async function askPermission() {
    const result = await requestPermission();
    setPerm(result);
    if (result === 'granted') {
      toast({ title: 'Alerts on', description: 'T-7, T-2 and day-of notifications are live while PocketVeto can run.' });
    }
  }

  function download() {
    const blob = new Blob([onExport()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pocketveto-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Exported', description: 'Your money dates are in that JSON file. Keep it anywhere.' });
  }

  async function upload(file: File) {
    const text = await file.text();
    const result = onImport(text);
    if (result.imported > 0) {
      toast({
        title: `Imported ${result.imported} item${result.imported > 1 ? 's' : ''}`,
        description: result.skipped ? `${result.skipped} entries skipped (unrecognized).` : undefined,
      });
    } else {
      toast({ title: 'Nothing imported', description: 'No valid PocketVeto items found in that file.' });
    }
  }

  return (
    <div className="grid max-w-2xl gap-6">
      <section className="rounded-2xl border border-ink-800 bg-ink-925/40 p-6">
        <h3 className="mb-1.5 flex items-center gap-2.5 text-sm font-semibold text-mist-100">
          <BellRing className="h-4 w-4 text-signal-400" strokeWidth={1.75} aria-hidden /> Alerts
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-mist-500">
          Notifications fire at T-7, T-2 and day-of while PocketVeto is open or its background
          worker can run (installed PWAs on Android/desktop do best; iOS Safari is stricter).
          No push server exists — v1 keeps everything on-device by design.
        </p>
        {perm === 'granted' ? (
          <Badge className="border-signal-500/40 bg-signal-400/15 text-signal-300">Granted</Badge>
        ) : perm === 'unsupported' ? (
          <p className="text-xs text-mist-500">This browser doesn&apos;t support notifications.</p>
        ) : (
          <Button
            size="sm"
            className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
            onClick={askPermission}
          >
            Turn on alerts
          </Button>
        )}
      </section>

      <section className="rounded-2xl border border-ink-800 bg-ink-925/40 p-6">
        <h3 className="mb-1.5 flex items-center gap-2.5 text-sm font-semibold text-mist-100">
          <FileJson className="h-4 w-4 text-signal-400" strokeWidth={1.75} aria-hidden /> Your data
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-mist-500">
          {items.length} item{items.length === 1 ? '' : 's'} stored on this device only. Export
          moves devices; import merges (existing ids are kept).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="border-ink-800 hover:bg-ink-900" onClick={download}>
            <Download className="h-3.5 w-3.5" aria-hidden /> Export JSON
          </Button>
          <Button size="sm" variant="outline" className="border-ink-800 hover:bg-ink-900" onClick={() => fileRef.current?.click()}>
            <Upload className="h-3.5 w-3.5" aria-hidden /> Import JSON
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
              e.target.value = '';
            }}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-ink-800 bg-ink-925/40 p-6">
        <h3 className="mb-1.5 flex items-center gap-2.5 text-sm font-semibold text-mist-100">
          <Sparkles className="h-4 w-4 text-signal-400" strokeWidth={1.75} aria-hidden /> Demo
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-mist-500">
          Load a sample set of eight money dates across every kind to see the radar fully lit.
          {items.length > 0 && ' It replaces what\u2019s here now.'}
        </p>
        <Button size="sm" variant="outline" className="border-ink-800 hover:bg-ink-900" onClick={loadSample}>
          Load sample data
        </Button>
      </section>

      <section className="rounded-2xl border border-cliff-400/25 bg-cliff-400/5 p-6">
        <h3 className="mb-1.5 flex items-center gap-2.5 text-sm font-semibold text-cliff-300">
          <Trash2 className="h-4 w-4" strokeWidth={1.75} aria-hidden /> Danger zone
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-cliff-300/60">
          Erases every item on this device. There is no cloud copy — that&apos;s the point.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-cliff-400/40 text-cliff-300 hover:bg-cliff-400/10 hover:text-cliff-300"
          onClick={() => setConfirmClear(true)}
        >
          Clear all data
        </Button>
      </section>

      <p className="flex items-start gap-2.5 text-[11px] leading-relaxed text-mist-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
        PocketVeto v1.1.0 · MIT licensed · no account, no bank link, no server — an
        organizational tool, not financial advice.
      </p>

      <AlertDialog open={confirmClear} onOpenChange={setConfirmClear}>
        <AlertDialogContent className="border-ink-800 bg-ink-925 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight text-mist-100">
              Delete all PocketVeto data on this device?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-mist-400">
              Every item, every saved entry. This cannot be undone — there is no cloud copy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ink-800 bg-transparent text-mist-300 hover:bg-ink-900 hover:text-mist-100">
              Keep my data
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-cliff-400 font-semibold text-ink-950 hover:bg-cliff-300"
              onClick={() => {
                onClearAll();
                toast({ title: 'Cleared', description: 'All items removed from this device.' });
              }}
            >
              Clear everything
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmSample} onOpenChange={setConfirmSample}>
        <AlertDialogContent className="border-ink-800 bg-ink-925 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight text-mist-100">
              Replace your {items.length} item{items.length === 1 ? '' : 's'} with the sample set?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-mist-400">
              The demo replaces everything on this device. Export first if you want to keep
              your current money dates.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ink-800 bg-transparent text-mist-300 hover:bg-ink-900 hover:text-mist-100">
              Keep mine
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
              onClick={() => {
                onLoadSample();
                toast({ title: 'Sample loaded', description: 'Eight demo money dates across every kind.' });
              }}
            >
              Load sample
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
