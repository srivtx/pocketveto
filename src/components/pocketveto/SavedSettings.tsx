'use client';

/**
 * PocketVeto — the saved ledger (victory lap) + settings (data controls).
 */

import { useRef, useState } from 'react';
import { BellRing, Download, FileJson, ShieldCheck, Sparkles, Trash2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ItemStatus, MoneyDateItem } from '@/lib/pocketveto/types';
import { KIND_META } from '@/lib/pocketveto/types';
import { formatMoney } from '@/lib/pocketveto/risk';
import { permissionState, requestPermission } from '@/lib/pocketveto/notifications';
import { toast } from '@/hooks/use-toast';

export function SavedView({ items }: { items: MoneyDateItem[] }) {
  const closed = items
    .filter((i) => i.status === 'vetoed' || i.status === 'used')
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''));

  return (
    <div>
      <div className="mb-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6 text-center">
        <p className="text-4xl font-bold text-emerald-300">
          {formatMoney(closed.reduce((s, i) => s + (i.savedAmount ?? 0), 0))}
        </p>
        <p className="mt-1 text-sm text-emerald-200/70">
          kept instead of lost — vetoes, claims and redemptions you acted on
        </p>
      </div>

      {closed.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-800 p-8 text-center text-sm text-zinc-500">
          Nothing here yet. The first entry feels great — veto a trial, redeem a card, claim a
          warranty before it lapses, then mark it done.
        </div>
      ) : (
        <div className="grid gap-3">
          {closed.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-zinc-800 bg-zinc-900/40 p-4"
            >
              <div>
                <p className="text-sm font-medium text-zinc-200">
                  {KIND_META[item.kind].emoji} {item.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {item.status === 'vetoed' ? 'Cancelled before the charge' : 'Used before it decayed'}
                  {item.updatedAt ? ` · ${item.updatedAt.slice(0, 10)}` : ''}
                </p>
              </div>
              <p className="text-lg font-bold text-emerald-400">
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
    <div className="grid gap-6 max-w-2xl">
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <BellRing className="h-4 w-4 text-emerald-400" aria-hidden /> Alerts
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          Notifications fire at T-7, T-2 and day-of while PocketVeto is open or its background
          worker can run (installed PWAs on Android/desktop do best; iOS Safari is stricter).
          No push server exists — v1 keeps everything on-device by design.
        </p>
        {perm === 'granted' ? (
          <Badge className="border-emerald-500/40 bg-emerald-500/15 text-emerald-300">Granted</Badge>
        ) : perm === 'unsupported' ? (
          <p className="text-xs text-zinc-500">This browser doesn&apos;t support notifications.</p>
        ) : (
          <Button
            size="sm"
            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
            onClick={askPermission}
          >
            Turn on alerts
          </Button>
        )}
      </section>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <FileJson className="h-4 w-4 text-emerald-400" aria-hidden /> Your data
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          {items.length} item{items.length === 1 ? '' : 's'} stored on this device only. Export
          moves devices; import merges (existing ids are kept).
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="border-zinc-800" onClick={download}>
            <Download className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Export JSON
          </Button>
          <Button size="sm" variant="outline" className="border-zinc-800" onClick={() => fileRef.current?.click()}>
            <Upload className="mr-1.5 h-3.5 w-3.5" aria-hidden /> Import JSON
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

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-zinc-100">
          <Sparkles className="h-4 w-4 text-emerald-400" aria-hidden /> Demo
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-zinc-500">
          Load a sample set of eight money dates across every kind to see the radar fully lit.
        </p>
        <Button size="sm" variant="outline" className="border-zinc-800" onClick={onLoadSample}>
          Load sample data
        </Button>
      </section>

      <section className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-6">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold text-rose-300">
          <Trash2 className="h-4 w-4" aria-hidden /> Danger zone
        </h3>
        <p className="mb-4 text-xs leading-relaxed text-rose-200/60">
          Erases every item on this device. There is no cloud copy — that&apos;s the point.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="border-rose-500/40 text-rose-300 hover:bg-rose-950/40"
          onClick={() => {
            if (window.confirm('Delete all PocketVeto data on this device? This cannot be undone.')) {
              onClearAll();
              toast({ title: 'Cleared', description: 'All items removed from this device.' });
            }
          }}
        >
          Clear all data
        </Button>
      </section>

      <p className="flex items-start gap-2 text-[11px] leading-relaxed text-zinc-600">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        PocketVeto v1.0.0 · MIT licensed · no account, no bank link, no server — an
        organizational tool, not financial advice.
      </p>
    </div>
  );
}
