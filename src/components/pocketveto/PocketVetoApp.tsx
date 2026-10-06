'use client';

/**
 * PocketVeto — app shell: header ticker, tabs, radar home, dialogs.
 *
 * Motion: the $ ticker counts up (useCountUp), the tab indicator glides,
 * tab content rises in once per switch, banners and modals enter on the
 * house ease. Delete confirms happen in-app (AlertDialog), never a
 * native window.confirm.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BellRing,
  ListChecks,
  Pencil,
  Plus,
  Radar as RadarIcon,
  ScanLine,
  Settings2,
  Wallet,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import { useItems } from './useItems';
import { RadarChart } from './RadarChart';
import { ItemsView } from './ItemsView';
import { SettingsView } from './SavedSettings';
import { ItemDialog } from './ItemDialog';
import { KindGlyph } from './KindGlyph';
import { Logo } from './Logo';
import { ScanView } from './ScanView';
import { PaymentsView, SpendCard } from './PaymentsView';
import { InstallButton } from './InstallButton';
import { Welcome } from './Welcome';
import { useCountUp } from './motion';
import { useNativeStatus } from '@/lib/pocketveto/native';
import { toast } from '@/hooks/use-toast';
import { formatMoney } from '@/lib/pocketveto/risk';
import { countdownLabel, todayISO } from '@/lib/pocketveto/dates';
import { paymentToItemDraft } from '@/lib/pocketveto/payments';
import { KIND_META, type ItemStatus, type MoneyDateItem, type ItemView } from '@/lib/pocketveto/types';
import { permissionState, requestPermission } from '@/lib/pocketveto/notifications';

type Tab = 'radar' | 'items' | 'scan' | 'payments' | 'settings';

const TABS: { id: Tab; label: string; icon: typeof RadarIcon }[] = [
  { id: 'radar', label: 'Radar', icon: RadarIcon },
  { id: 'items', label: 'Items', icon: ListChecks },
  { id: 'scan', label: 'Scan', icon: ScanLine },
  { id: 'payments', label: 'Payments', icon: Wallet },
  { id: 'settings', label: 'Settings', icon: Settings2 },
];

export function PocketVetoApp({
  onExit,
  sharedText = '',
}: {
  onExit: () => void;
  /** Payment text shared into the app (Web Share Target) — opens pre-parsed. */
  sharedText?: string;
}) {
  const state = useItems();
  const native = useNativeStatus();
  /* True synchronously inside the APK (the bridge is injected before any
     page script runs; this component only ever mounts client-side, so the
     read needs no hydration story). It is what makes the shell feel native:
     no marketing footer, no “back to the site” — a phone app is the app. */
  const [isApp] = useState(() => typeof window !== 'undefined' && 'PocketVetoNative' in window);
  const [tab, setTab] = useState<Tab>(sharedText ? 'scan' : 'radar');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MoneyDateItem | null>(null);
  const [prefill, setPrefill] = useState<Partial<MoneyDateItem> | null>(null);
  /** Payee key of a single-charge prefill — links ledger payments on save. */
  const pendingLinkKey = useRef<string | null>(null);
  const [selectedBlip, setSelectedBlip] = useState<ItemView | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const atRiskDisplay = useCountUp(state.atRisk);
  const runRateDisplay = useCountUp(state.runRate);

  /* Inside the Android shell: when captures are waiting, the scan tab
     is where the money is — route there once per arrival (async gap,
     same client-only-data shape as the store load). First run is the
     tutorial's stage: the route still happens (a great post-tutorial
     landing), but the toast stays quiet — a snackbar shouting over the
     onboarding flow is the opposite of app-like. The Scan badge carries
     the signal until the tutorial is done. */
  const routedToCaptures = useRef(false);
  useEffect(() => {
    if (!native.available || native.pendingCount === 0) return;
    if (routedToCaptures.current) return;
    routedToCaptures.current = true;
    let alive = true;
    (async () => {
      await Promise.resolve();
      if (!alive) return;
      setTab((t) => (t === 'radar' ? 'scan' : t));
      let firstRun = false;
      try {
        firstRun = !localStorage.getItem('pv.native.welcomed.v1');
      } catch {
        /* storage blocked — the toast is the only signal, keep it */
      }
      if (!firstRun) {
        toast({
          title: 'Payments captured',
          description: `${native.pendingCount} payment notification${native.pendingCount === 1 ? '' : 's'} from your phone waiting in Scan.`,
        });
      }
    })();
    return () => {
      alive = false;
    };
  }, [native.available, native.pendingCount]);

  const lapsed = useMemo(
    () => state.views.filter((v) => v.lapsedCycles > 0),
    [state.views]
  );
  const needsPermission = state.ready && permissionState() === 'default' && !nudgeDismissed;
  const activeCount = state.views.filter((v) => v.status === 'active').length;

  /* Sliding tab indicator: measure the active tab, glide on change/resize. */
  const tabRefs = useRef<Partial<Record<Tab, HTMLButtonElement | null>>>({});
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });
  const measure = () => {
    const el = tabRefs.current[tab];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  };
  useLayoutEffect(measure, [tab, state.ready]);
  useEffect(() => {
    const onResize = () => measure();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [tab]);

  /* FAB etiquette (the phone pattern): the button gets out of the way
     while the user scrolls down into content and returns the moment they
     scroll up — a static FAB parked over text is a website tell. */
  const [fabAway, setFabAway] = useState(false);
  const lastScrollY = useRef(0);
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      const delta = y - lastScrollY.current;
      lastScrollY.current = y;
      if (y < 80) {
        setFabAway(false);
        return;
      }
      if (delta > 6) setFabAway(true);
      else if (delta < -6) setFabAway(false);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  function openAdd() {
    setEditing(null);
    setPrefill(null);
    setDialogOpen(true);
  }

  function openEdit(item: MoneyDateItem) {
    setPrefill(null);
    setEditing(item);
    setDialogOpen(true);
  }

  /** A shared single payment: fills the form, saves as a NEW item. The
   *  payee key rides along so the ledger entry links when it's saved. */
  function openPrefilled(draft: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>, key?: string) {
    setEditing(null);
    setPrefill(draft);
    pendingLinkKey.current = key ?? null;
    setDialogOpen(true);
  }

  async function handleSave(item: MoneyDateItem) {
    if (editing) {
      await state.updateItem(item);
    } else {
      const saved = await state.addItem(item);
      const linkKey = pendingLinkKey.current;
      if (linkKey) {
        await state.linkPaymentsToItem(linkKey, saved.id);
        pendingLinkKey.current = null;
      }
    }
  }

  function handleStatus(id: string, status: ItemStatus) {
    void state.setStatus(id, status);
  }

  function requestDelete(id: string) {
    const name = state.items.find((i) => i.id === id)?.name ?? 'this money date';
    setConfirmDelete({ id, name });
  }

  if (!state.ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-ink-950">
        <Logo className="h-10 w-10 animate-pulse text-signal-400" />
        <p className="pv-label">Scanning…</p>
      </div>
    );
  }

  const empty = state.items.length === 0;

  return (
    <div className="flex min-h-dvh flex-col bg-ink-950 text-mist-100">
      {/* App bar */}
      <header className="pv-chrome sticky top-0 z-30 border-b border-ink-800/70 bg-ink-950/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          {isApp ? (
            /* In the app there is no “site” to go back to — the brand is
               the app bar, not a navigation button. */
            <div className="flex items-center gap-2.5">
              <Logo className="h-8 w-8 text-signal-400" />
              <span className="font-display text-lg font-semibold tracking-tight">
                PocketVeto
              </span>
            </div>
          ) : (
            <button
              type="button"
              onClick={onExit}
              className="group flex items-center gap-2.5"
              aria-label="Back to PocketVeto home"
            >
              <Logo className="h-8 w-8 text-signal-400 transition-transform duration-300 group-hover:rotate-90" />
              <span className="hidden font-display text-lg font-semibold tracking-tight sm:block">
                PocketVeto
              </span>
            </button>
          )}

          <div className="ml-auto flex items-center gap-2">
            <span
              className={`pv-num rounded-full px-3 py-1 text-[13px] font-semibold transition-colors ${
                state.atRisk > 0
                  ? 'bg-cliff-400/15 text-cliff-300'
                  : 'bg-signal-400/10 text-signal-400'
              }`}
            >
              {state.atRisk > 0 ? `${formatMoney(atRiskDisplay)} at risk` : 'Nothing at risk'}
            </span>
            {state.saved > 0 && (
              <span className="pv-num hidden rounded-full bg-signal-400/10 px-3 py-1 text-[13px] font-semibold text-signal-400 sm:block">
                {formatMoney(state.saved)} saved
              </span>
            )}
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <InstallButton size="sm" />
          </div>
          <Button
            onClick={openAdd}
            size="sm"
            className="hidden bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300 md:inline-flex"
          >
            <Plus className="h-4 w-4" aria-hidden /> Add
          </Button>
        </div>

        {/* Top tabs — desktop pattern. On phones the bottom nav below is
            the navigation; the indicator still measures these (md+). */}
        <nav
          className="pv-chrome relative mx-auto hidden max-w-6xl gap-1 overflow-x-auto px-4 md:flex"
          aria-label="App sections"
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              ref={(el) => {
                tabRefs.current[t.id] = el;
              }}
              type="button"
              aria-label={t.label}
              onClick={() => setTab(t.id)}
              className={`relative flex shrink-0 items-center gap-1.5 px-3 py-2.5 text-sm transition-colors duration-200 ${
                tab === t.id ? 'text-mist-100' : 'text-mist-500 hover:text-mist-300'
              }`}
              aria-current={tab === t.id ? 'page' : undefined}
            >
              <t.icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
              <span>{t.label}</span>
              {/* Desktop tab badges: saved count rides the Items tab,
                  today's payments ride the Payments tab. */}
              {t.id === 'items' && state.saved > 0 && (
                <span className="pv-num rounded-full bg-signal-400/15 px-1.5 text-[10px] font-semibold text-signal-400">
                  {state.items.filter((i) => i.status === 'vetoed' || i.status === 'used').length}
                </span>
              )}
              {t.id === 'payments' && state.spend.today.count > 0 && (
                <span className="pv-num rounded-full bg-signal-400/15 px-1.5 text-[10px] font-semibold text-signal-400">
                  {state.spend.today.count}
                </span>
              )}
            </button>
          ))}
          <span
            className="pv-indicator absolute bottom-0 h-0.5 rounded-full bg-signal-400"
            style={{ left: indicator.left + 16, width: Math.max(0, indicator.width - 32) }}
            aria-hidden
          />
        </nav>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-[9rem] md:pb-6">
        {/* Notification nudge */}
        {needsPermission && tab === 'radar' && (
          <div className="pv-rise mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-signal-500/30 bg-signal-400/10 p-4">
            <p className="flex items-center gap-2.5 text-sm text-signal-300">
              <BellRing className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              Turn on alerts — T-7, T-2 and day-of warnings while PocketVeto can run.
            </p>
            <div className="flex gap-2">
              <Button
                size="sm"
                className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
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
                className="text-mist-400"
                onClick={() => setNudgeDismissed(true)}
              >
                Later
              </Button>
            </div>
          </div>
        )}

        {/* Threshold crossings — the alert banner */}
        {state.pendingAlerts.length > 0 && (
          <div className="pv-rise mb-5 rounded-xl border border-warn-400/40 bg-warn-400/10 p-4">
            <div className="mb-2 flex items-start justify-between gap-3">
              <p className="flex items-center gap-2.5 text-sm font-semibold text-warn-300">
                <BellRing className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
                {state.pendingAlerts.length} date{state.pendingAlerts.length > 1 ? 's' : ''} crossed
                an alert threshold:
              </p>
              <button
                type="button"
                onClick={state.dismissAlerts}
                className="rounded-md p-1 text-warn-400/70 transition-colors hover:bg-warn-400/10 hover:text-warn-300"
                aria-label="Dismiss alerts"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <ul className="space-y-1.5 text-xs text-warn-300/80">
              {state.pendingAlerts.slice(0, 5).map((a) => (
                <li key={`${a.item.id}-${a.threshold}`} className="flex items-center gap-2">
                  <KindGlyph kind={a.item.kind} className="h-3.5 w-3.5 shrink-0 text-warn-400" />
                  <span className="truncate">{a.item.name}</span>
                  <span className="pv-num shrink-0 text-warn-400">
                    {countdownLabel(a.item.daysLeft)} · {formatMoney(a.item.costAtStake)}
                  </span>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-warn-400/40 bg-transparent text-warn-300 hover:bg-warn-400/10"
              onClick={() => setTab('items')}
            >
              Review now
            </Button>
          </div>
        )}

        {/* While-you-were-away */}
        {lapsed.length > 0 && (
          <div className="pv-rise mb-5 rounded-xl border border-cliff-400/40 bg-cliff-400/10 p-4">
            <p className="mb-2 flex items-center gap-2.5 text-sm font-semibold text-cliff-300">
              <AlertTriangle className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
              {lapsed.length} renewal{lapsed.length > 1 ? 's' : ''} fired while you were away:
            </p>
            <ul className="space-y-1.5 text-xs text-cliff-300/80">
              {lapsed.map((v) => (
                <li key={v.id} className="flex items-center gap-2">
                  <KindGlyph kind={v.kind} className="h-3.5 w-3.5 shrink-0 text-cliff-400" />
                  <span className="truncate">
                    {v.name} — {v.lapsedCycles} cycle{v.lapsedCycles > 1 ? 's' : ''} passed
                  </span>
                  <span className="pv-num shrink-0 text-cliff-400">
                    {formatMoney(v.costAtStake * v.lapsedCycles)} billed
                  </span>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="outline"
              className="mt-3 border-cliff-400/40 bg-transparent text-cliff-300 hover:bg-cliff-400/10"
              onClick={() => setTab('items')}
            >
              Review now
            </Button>
          </div>
        )}

        <div key={tab} className="pv-rise">
          {tab === 'radar' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,460px)_1fr]">
              <div className="rounded-2xl border border-ink-800 bg-ink-925 p-4">
                <div className="relative">
                  <div className="pv-grid pv-grid-fade absolute inset-0" aria-hidden />
                  <RadarChart views={state.views} onSelect={(v) => setSelectedBlip(v)} />
                </div>
                <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-[11px] text-mist-500">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-cliff-400" aria-hidden /> ≤2 days / overdue
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-warn-400" aria-hidden /> ≤7 days
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-signal-400" aria-hidden /> ≤30 days
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full bg-mist-400" aria-hidden /> beyond
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 content-start gap-4 min-w-0">
                {/* Total spent — the ledger's headline, one tap from the
                    full Payments section. Split autopay vs one-off so the
                    number can be read, not just seen. */}
                <SpendCard spend={state.spend} onOpen={() => setTab('payments')} />

                <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
                  <div className="rounded-2xl border border-ink-800 bg-ink-925 p-5">
                    <p className="pv-num text-3xl font-semibold tracking-tight text-cliff-300">
                      {formatMoney(atRiskDisplay)}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-mist-500">
                      at stake across {activeCount} active date{activeCount === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-ink-800 bg-ink-925 p-5">
                    <p className="pv-num text-3xl font-semibold tracking-tight text-mist-100">
                      {formatMoney(runRateDisplay)}
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-mist-500">
                      annualized run-rate if all renew
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-ink-800 bg-ink-925 p-5">
                  <h3 className="pv-label mb-4">Next 7 days</h3>
                  {state.weekItems.length === 0 ? (
                    <p className="text-sm leading-relaxed text-mist-500">
                      Nothing fires this week. The quiet weeks are for checking the radar.
                    </p>
                  ) : (
                    <ul className="grid grid-cols-1 gap-2">
                      {state.weekItems.map((v) => (
                        <li
                          key={v.id}
                          className="flex items-center justify-between gap-3 rounded-lg border border-ink-800/80 bg-ink-950/60 px-3 py-2 transition-colors hover:border-ink-700"
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <KindGlyph kind={v.kind} className="h-4 w-4 shrink-0 text-mist-400" />
                            <span className="truncate text-sm text-mist-300">{v.name}</span>
                          </span>
                          <span
                            className={`pv-num shrink-0 text-xs font-semibold ${
                              v.daysLeft <= 2 ? 'text-cliff-300' : 'text-warn-300'
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
                  <div className="rounded-2xl border border-dashed border-ink-700 p-8 text-center">
                    <p className="text-sm leading-relaxed text-mist-300">
                      Your radar is empty. Add the subscription you keep forgetting, or load a
                      sample set to see how this works.
                    </p>
                    <div className="mt-5 flex flex-wrap justify-center gap-2">
                      <Button
                        className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                        onClick={openAdd}
                      >
                        <Plus className="h-4 w-4" aria-hidden /> Add first date
                      </Button>
                      <Button
                        variant="outline"
                        className="border-ink-700 hover:bg-ink-900"
                        onClick={() => setTab('scan')}
                      >
                        <ScanLine className="h-4 w-4" aria-hidden /> Scan a statement
                      </Button>
                      <Button
                        variant="outline"
                        className="border-ink-700 hover:bg-ink-900"
                        onClick={() => void state.loadSample()}
                      >
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
              onDelete={requestDelete}
            />
          )}

          {tab === 'scan' && (
            <ScanView
              items={state.items}
              initialText={sharedText}
              autoScan={Boolean(sharedText)}
              native={native}
              onAddSingle={openPrefilled}
              onTrack={(draft, key) => {
                void (async () => {
                  const saved = await state.addItem(draft);
                  await state.linkPaymentsToItem(key, saved.id);
                })();
                toast({
                  title: 'On your radar',
                  description: `${draft.name} is being tracked — you'll get T-7, T-2 and day-of alerts.`,
                });
              }}
              onRecordCharges={state.recordCharges}
              onGoPayments={() => setTab('payments')}
            />
          )}

          {tab === 'payments' && (
            <PaymentsView
              payments={state.payments}
              spend={state.spend}
              items={state.items}
              onTrack={(p) => {
                void (async () => {
                  const saved = await state.addItem(paymentToItemDraft(p, todayISO()));
                  await state.linkPaymentsToItem(p.key, saved.id);
                })();
                toast({
                  title: 'On your radar',
                  description: `${p.merchant} is being tracked — you'll get T-7, T-2 and day-of alerts.`,
                });
              }}
              onDelete={(id) => void state.deletePayment(id)}
              onAddManual={state.addManualPayment}
              onGoScan={() => setTab('scan')}
            />
          )}

          {tab === 'settings' && (
            <SettingsView
              items={state.items}
              paymentsCount={state.payments.length}
              native={native}
              onExport={state.exportJSON}
              onImport={state.importJSON}
              onClearAll={() => void state.clearAll()}
              onLoadSample={() => void state.loadSample()}
              onGoScan={() => setTab('scan')}
            />
          )}
        </div>
      </main>

      {/* Bottom navigation — the phone pattern (md and below). Five equal
          1fr cells, icons dead-center of each: a phone app's navigation is
          evenly distributed across the width, never left-packed. */}
      <nav
        aria-label="App sections"
        className="pv-chrome fixed inset-x-0 bottom-0 z-30 border-t border-ink-800/80 bg-ink-950/95 backdrop-blur md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((t) => {
            const active = tab === t.id;
            const savedCount =
              t.id === 'items' && state.saved > 0
                ? state.items.filter((i) => i.status === 'vetoed' || i.status === 'used').length
                : 0;
            const todayCount = t.id === 'payments' ? state.spend.today.count : 0;
            return (
              <button
                key={t.id}
                type="button"
                aria-label={t.label}
                aria-current={active ? 'page' : undefined}
                onClick={() => setTab(t.id)}
                className="relative flex flex-col items-center justify-center gap-1 pt-2.5 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
              >
                {active && (
                  <span
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-signal-400"
                    aria-hidden
                  />
                )}
                <span className="relative flex h-5 w-5 items-center justify-center">
                  <t.icon
                    className={`h-5 w-5 transition-colors duration-200 ${
                      active ? 'text-signal-400' : 'text-mist-500'
                    }`}
                    strokeWidth={active ? 2 : 1.75}
                    aria-hidden
                  />
                  {t.id === 'scan' && native.pendingCount > 0 && (
                    <span
                      className="absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-cliff-400 ring-2 ring-ink-950"
                      aria-hidden
                    />
                  )}
                  {savedCount > 0 && (
                    <span
                      className="pv-num absolute -right-2.5 -top-1.5 rounded-full bg-signal-400 px-1 text-[9px] font-bold text-ink-950"
                      aria-hidden
                    >
                      {savedCount}
                    </span>
                  )}
                  {todayCount > 0 && (
                    <span
                      className="pv-num absolute -right-2.5 -top-1.5 rounded-full bg-cliff-400 px-1 text-[9px] font-bold text-ink-950"
                      aria-hidden
                    >
                      {todayCount}
                    </span>
                  )}
                </span>
                <span
                  className={`text-[10px] font-medium leading-none transition-colors duration-200 ${
                    active ? 'text-mist-100' : 'text-mist-500'
                  }`}
                >
                  {t.label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* FAB — the phone pattern for the primary action (md and below;
          desktop keeps the header Add button). Sits above the bottom nav,
          ducks out of the way on scroll-down. */}
      <Button
        onClick={openAdd}
        size="icon"
        aria-label="Add a money date"
        aria-hidden={fabAway}
        className={`pv-chrome fixed right-4 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-30 h-14 w-14 rounded-full bg-signal-400 text-ink-950 shadow-xl shadow-black/40 transition-all duration-300 hover:scale-105 hover:bg-signal-300 active:scale-95 md:hidden ${
          fabAway ? 'pointer-events-none translate-y-24 opacity-0' : ''
        }`}
      >
        <Plus className="h-6 w-6" aria-hidden />
      </Button>

      {/* Site furniture — a phone app has no marketing footer. Web keeps it. */}
      {!isApp && (
        <footer className="mt-auto border-t border-ink-800/70 bg-ink-950">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-mist-500">
            <p className="flex items-center gap-2">
              <Logo className="h-4 w-4 text-mist-500" />
              PocketVeto — local-first. Nothing leaves this device.
            </p>
            <div className="flex gap-4">
              <a
                href="https://github.com/srivtx/pocketveto"
                target="_blank"
                rel="noreferrer"
                className="transition-colors hover:text-mist-300"
              >
                GitHub
              </a>
              <button onClick={onExit} className="transition-colors hover:text-mist-300">
                About the project
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* First-run tutorial (native shell only, skippable, once) */}
      <Welcome />

      <ItemDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        prefill={prefill}
        onSave={handleSave}
        onDelete={requestDelete}
      />

      {/* Delete confirmation — in-app, never window.confirm */}
      <AlertDialog open={confirmDelete !== null} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent className="border-ink-800 bg-ink-925 sm:max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-display tracking-tight text-mist-100">
              Remove {confirmDelete?.name ?? 'this item'}?
            </AlertDialogTitle>
            <AlertDialogDescription className="leading-relaxed text-mist-400">
              This deletes it from this device. There is no cloud copy — that&apos;s the point.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-ink-800 bg-transparent text-mist-300 hover:bg-ink-900 hover:text-mist-100">
              Keep it
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-cliff-400 font-semibold text-ink-950 hover:bg-cliff-300"
              onClick={() => {
                if (confirmDelete) void state.deleteItem(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Blip quick view. Backdrop recipe (empirically pinned, v1.4.1 —
          see the note in globals.css): the blur lives inside its own
          isolated stacking subtree; the card is a sibling fixed element
          OUTSIDE that subtree, never a normal-flow child of a full-screen
          wrapper — that combo blurs the card into the backdrop in Chromium
          (black frame). */}
      {selectedBlip && (
        <>
          <div className="fixed inset-0 z-40 isolate" aria-hidden>
            <div className="absolute inset-0 bg-ink-950/70 backdrop-blur-sm" />
          </div>
          {/* transparent click-catcher (below the card, above the blur) */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSelectedBlip(null)}
            aria-hidden
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={selectedBlip.name}
            className="pv-pop fixed left-1/2 top-1/2 z-40 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-ink-800 bg-ink-925 p-5 shadow-2xl shadow-black/50"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-ink-800 bg-ink-950 text-signal-400">
                  <KindGlyph kind={selectedBlip.kind} className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="pv-label">{KIND_META[selectedBlip.kind].label}</p>
                  <h3 className="font-display text-lg font-semibold tracking-tight text-mist-100">
                    {selectedBlip.name}
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBlip(null)}
                className="rounded-md p-1 text-mist-500 transition-colors hover:bg-ink-900 hover:text-mist-200"
                aria-label="Close"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="mb-4 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-lg border border-ink-800 bg-ink-950/70 p-3">
                <p
                  className={`pv-num text-xl font-semibold ${
                    selectedBlip.daysLeft <= 2
                      ? 'text-cliff-300'
                      : selectedBlip.daysLeft <= 7
                        ? 'text-warn-300'
                        : 'text-mist-100'
                  }`}
                >
                  {countdownLabel(selectedBlip.daysLeft)}
                </p>
                <p className="pv-num mt-0.5 text-[11px] text-mist-500">{selectedBlip.end}</p>
              </div>
              <div className="rounded-lg border border-ink-800 bg-ink-950/70 p-3">
                <p className="pv-num text-xl font-semibold text-cliff-300">
                  {formatMoney(selectedBlip.costAtStake)}
                </p>
                <p className="mt-0.5 text-[11px] text-mist-500">at stake</p>
              </div>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-mist-400">
              {KIND_META[selectedBlip.kind].verb}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                className="bg-signal-400 font-semibold text-ink-950 hover:bg-signal-300"
                onClick={() => {
                  const target = state.items.find((i) => i.id === selectedBlip.id);
                  if (target) openEdit(target);
                  setSelectedBlip(null);
                }}
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden /> Open / edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-ink-800 hover:bg-ink-900"
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
                className="ml-auto text-mist-500"
                onClick={() => setSelectedBlip(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
