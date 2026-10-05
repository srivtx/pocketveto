'use client';

/**
 * PocketVeto — app shell: header ticker, tabs, radar home, dialogs.
 */

import { useEffect, useMemo, useState } from 'react';
import { Plus, Radar as RadarIcon, ListChecks, PiggyBank, Settings2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useItems } from './useItems';
import { RadarChart } from './RadarChart';
import { ItemsView } from './ItemsView';
import { SavedView, SettingsView } from './SavedSettings';
import { ItemDialog } from './ItemDialog';
import { formatMoney } from '@/lib/pocketveto/risk';
import { countdownLabel } from '@/lib/pocketveto/dates';
import { KIND_META, type ItemStatus, type MoneyDateItem, type ItemView } from '@/lib/pocketveto/types';
import { permissionState, requestPermission } from '@/lib/pocketveto/notifications';

type Tab = 'radar' | 'items' | 'saved' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof RadarIcon }[] = [
  { id: 'radar', label: 'Radar', icon: RadarIcon },
  { id: 'items', label: 'Items', icon: ListChecks },
  { id: 'saved', label: 'Saved', icon: PiggyBank },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export function PocketVetoApp({ onExit }: { onExit: () => void }) {
  const state = useItems();
  const [tab, setTab] = useState<Tab>('radar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MoneyDateItem | null>(null);
  const [selectedBlip, setSelectedBlip] = useState<ItemView | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);

  const lapsed = useMemo(
    () => state.views.filter((v) => v.lapsedCycles > 0),
    [state.views]
  );
  const needsPermission = state.ready && permissionState() === 'default' && !nudgeDismissed;

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(item: MoneyDateItem) {
    setEditing(item);
    setDialogOpen(true);
  }

  function handleSave(item: MoneyDateItem) {
    if (editing) {
      void state.updateItem(item);
    } else {
      void state.addItem(item);
    }
  }

  function handleStatus(id: string, status: ItemStatus) {
    void state.setStatus(id, status);
  }

  function handleDelete(id: string) {
    if (window.confirm('Remove this money date?')) {
      void state.deleteItem(id);
    }
  }

  if (!state.ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="animate-pulse text-sm text-zinc-500">Scanning…</p>
      </div>
    );
  }

  const empty = state.items.length === 0;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-900 bg-zinc-950/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={onExit}
            className="flex items-center gap-2"
            aria-label="Back to PocketVeto home"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/15 border border-emerald-500/30">
              <X className="h-4 w-4 text-emerald-400" aria-hidden />
            </span>
            <span className="hidden font-semibold tracking-tight sm:block">PocketVeto</span>
          </button>

          <div className="mx-auto flex items-center gap-2">
            <span
              className={`rounded-full px-3 py-1 text-sm font-bold ${
                state.atRisk > 0
                  ? 'bg-rose-500/15 text-rose-400'
                  : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {state.atRisk > 0 ? `${formatMoney(state.atRisk)} at risk` : 'Nothing at risk'}
            </span>
            {state.saved > 0 && (
              <span className="hidden rounded-full bg-emerald-500/10 px-3 py-1 text-sm font-semibold text-emerald-400 sm:block">
                {formatMoney(state.saved)} saved
              </span>
            )}
          </div>

          <Button
            onClick={openAdd}
            size="sm"
            className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
          >
            <Plus className="mr-1 h-4 w-4" aria-hidden /> Add
          </Button>
        </div>

        {/* Tabs */}
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-4" aria-label="App sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm transition-colors ${
                tab === t.id
                  ? 'border-emerald-400 text-zinc-100'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <t.icon className="h-4 w-4" aria-hidden />
              {t.label}
              {t.id === 'saved' && state.saved > 0 && (
                <span className="rounded-full bg-emerald-500/20 px-1.5 text-[10px] font-semibold text-emerald-300">
                  {state.items.filter((i) => i.status === 'vetoed' || i.status === 'used').length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        {/* Notification nudge */}
        {needsPermission && tab === 'radar' && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <p className="text-sm text-emerald-200">
              Turn on alerts — T-7, T-2 and day-of warnings while PocketVeto can run.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                onClick={async () => {
                  await requestPermission();
                  setNudgeDismissed(true);
                }}
              >
                Enable
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-zinc-400"
                onClick={() => setNudgeDismissed(true)}
              >
                Later
              </Button>
            </div>
          </div>
        )}

        {/* Threshold crossings — the alert banner */}
        {state.pendingAlerts.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="text-sm font-semibold text-amber-300">
                {state.pendingAlerts.length} date{state.pendingAlerts.length > 1 ? 's' : ''} crossed
                an alert threshold:
              </p>
              <button
                type="button"
                onClick={state.dismissAlerts}
                className="rounded-md p-1 text-amber-400/70 hover:bg-amber-500/10 hover:text-amber-300"
                aria-label="Dismiss alerts"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <ul className="space-y-1 text-xs text-amber-200/80">
              {state.pendingAlerts.slice(0, 5).map((a) => (
                <li key={`${a.item.id}-${a.threshold}`}>
                  {KIND_META[a.item.kind].emoji} {a.item.name} — {countdownLabel(a.item.daysLeft)} ·{' '}
                  {formatMoney(a.item.costAtStake)} at stake
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-amber-500/40 bg-transparent text-amber-300 hover:bg-amber-950/40"
              onClick={() => setTab('items')}
            >
              Review now
            </Button>
          </div>
        )}

        {/* While-you-were-away */}
        {lapsed.length > 0 && (
          <div className="mb-5 rounded-xl border border-rose-500/40 bg-rose-500/10 p-4">
            <p className="mb-2 text-sm font-semibold text-rose-300">
              {lapsed.length} renewal{lapsed.length > 1 ? 's' : ''} fired while you were away:
            </p>
            <ul className="space-y-1 text-xs text-rose-200/80">
              {lapsed.map((v) => (
                <li key={v.id}>
                  {KIND_META[v.kind].emoji} {v.name} — {v.lapsedCycles} cycle
                  {v.lapsedCycles > 1 ? 's' : ''} passed ({formatMoney(v.costAtStake * v.lapsedCycles)} billed);
                  date rolled forward. Still want it?
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-rose-500/40 bg-transparent text-rose-300 hover:bg-rose-950/40"
              onClick={() => setTab('items')}
            >
              Review now
            </Button>
          </div>
        )}

        {tab === 'radar' && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4">
              <RadarChart
                views={state.views}
                onSelect={(v) => setSelectedBlip(v)}
              />
              <div className="mt-3 flex flex-wrap justify-center gap-3 text-[11px] text-zinc-500">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-rose-400" aria-hidden /> ≤2 days / overdue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-amber-500" aria-hidden /> ≤7 days
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden /> ≤30 days
                </span>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <p className="text-3xl font-bold text-rose-400">{formatMoney(state.atRisk)}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    at stake across {state.views.filter((v) => v.status === 'active').length} active dates
                  </p>
                </div>
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                  <p className="text-3xl font-bold text-zinc-100">{formatMoney(state.runRate)}</p>
                  <p className="mt-1 text-xs text-zinc-500">annualized run-rate if all renew</p>
                </div>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
                <h3 className="mb-3 text-sm font-semibold text-zinc-200">Next 7 days</h3>
                {state.weekItems.length === 0 ? (
                  <p className="text-sm text-zinc-500">
                    Nothing fires this week. The quiet weeks are for checking the radar.
                  </p>
                ) : (
                  <ul className="grid gap-2">
                    {state.weekItems.map((v) => (
                      <li
                        key={v.id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/60 px-3 py-2"
                      >
                        <span className="min-w-0 truncate text-sm text-zinc-200">
                          {KIND_META[v.kind].emoji} {v.name}
                        </span>
                        <span
                          className={`shrink-0 text-xs font-semibold ${
                            v.daysLeft <= 2 ? 'text-rose-400' : 'text-amber-400'
                          }`}
                        >
                          {countdownLabel(v.daysLeft)} · {formatMoney(v.costAtStake)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {empty && (
                <div className="rounded-2xl border border-dashed border-zinc-700 p-8 text-center">
                  <p className="text-sm text-zinc-300">
                    Your radar is empty. Add the subscription you keep forgetting, or load a
                    sample set to see how this works.
                  </p>
                  <div className="mt-4 flex justify-center gap-2">
                    <Button
                      className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                      onClick={openAdd}
                    >
                      <Plus className="mr-1.5 h-4 w-4" aria-hidden /> Add first date
                    </Button>
                    <Button variant="outline" className="border-zinc-700" onClick={() => void state.loadSample()}>
                      Load sample data
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'items' && (
          <ItemsView
            views={state.views}
            onEdit={openEdit}
            onStatus={handleStatus}
            onDelete={handleDelete}
          />
        )}

        {tab === 'saved' && <SavedView items={state.items} />}

        {tab === 'settings' && (
          <SettingsView
            items={state.items}
            onExport={state.exportJSON}
            onImport={state.importJSON}
            onClearAll={() => void state.clearAll()}
            onLoadSample={() => void state.loadSample()}
          />
        )}
      </main>

      <footer className="mt-auto border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-zinc-600">
          <p>PocketVeto v1.0.0 — local-first. Nothing leaves this device.</p>
          <button onClick={onExit} className="hover:text-zinc-400">
            About the project
          </button>
        </div>
      </footer>

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        onSave={handleSave}
        onDelete={handleDelete}
      />

      {/* Blip click → quick view + playbook */}
      {selectedBlip && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-zinc-950/70 p-4 backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={selectedBlip.name}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedBlip(null);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl">
            <div className="mb-2 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm text-zinc-500">{KIND_META[selectedBlip.kind].label}</p>
                <h3 className="text-lg font-semibold text-zinc-100">
                  {KIND_META[selectedBlip.kind].emoji} {selectedBlip.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBlip(null)}
                className="rounded-md p-1 text-zinc-500 hover:bg-zinc-900 hover:text-zinc-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg bg-zinc-900/70 p-3">
                <p
                  className={`text-xl font-bold ${
                    selectedBlip.daysLeft <= 2
                      ? 'text-rose-400'
                      : selectedBlip.daysLeft <= 7
                        ? 'text-amber-400'
                        : 'text-zinc-100'
                  }`}
                >
                  {countdownLabel(selectedBlip.daysLeft)}
                </p>
                <p className="text-[11px] text-zinc-500">{selectedBlip.end}</p>
              </div>
              <div className="rounded-lg bg-zinc-900/70 p-3">
                <p className="text-xl font-bold text-rose-400">
                  {formatMoney(selectedBlip.costAtStake)}
                </p>
                <p className="text-[11px] text-zinc-500">at stake</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-emerald-500 text-zinc-950 hover:bg-emerald-400"
                onClick={() => {
                  const target = state.items.find((i) => i.id === selectedBlip.id);
                  if (target) openEdit(target);
                  setSelectedBlip(null);
                }}
              >
                Open / edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-zinc-800"
                onClick={() => {
                  handleStatus(
                    selectedBlip.id,
                    selectedBlip.kind === 'giftcard' || selectedBlip.kind === 'warranty'
                      ? 'used'
                      : 'vetoed'
                  );
                  setSelectedBlip(null);
                }}
              >
                {selectedBlip.kind === 'giftcard'
                  ? 'Mark redeemed'
                  : selectedBlip.kind === 'warranty'
                    ? 'Mark claimed'
                    : 'Mark vetoed'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto text-zinc-500"
                onClick={() => setSelectedBlip(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
