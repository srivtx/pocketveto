'use client';

/**
 * PocketVeto — the app state hook. One source of truth over local storage:
 * the radar items AND the payments ledger (v1.5.0).
 *
 * The two stores obey the split payments.ts enforces: captured charges
 * land in the ledger (autopay-flagged), only autopays feed the radar,
 * and totals are computed from the ledger alone — so the radar, the
 * ledger and the totals can never disagree.
 *
 * Alert model: thresholds crossed between visits are surfaced at load
 * ("while you were away") and persisted as notified; while the app is
 * open, a 60s ticker checks for new crossings and fires OS notifications
 * when permission has been granted.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ItemStatus, MoneyDateItem, PaymentRecord, PaymentSource } from '@/lib/pocketveto/types';
import { toView, todayISO } from '@/lib/pocketveto/dates';
import {
  atRiskSum,
  annualRunRate,
  atRiskWithin,
  savedSum,
  urgencyCounts,
} from '@/lib/pocketveto/risk';
import {
  chargesToPayments,
  manualPayment,
  spendSummary,
  type RecordOutcome,
  type SpendSummary,
} from '@/lib/pocketveto/payments';
import type { ParsedCharge } from '@/lib/pocketveto/scan';
import {
  exportAll,
  importData,
  loadItems,
  loadPayments,
  removeItem,
  removePayment,
  saveAll,
  saveAllPayments,
  upsertItem,
} from '@/lib/pocketveto/store';
import { sampleItems, samplePayments } from '@/lib/pocketveto/seed';
import {
  dueAlerts,
  fireNotification,
  markAlerted,
  type FiredAlert,
} from '@/lib/pocketveto/notifications';

export interface RecordChargeOptions {
  source: PaymentSource;
  via: string;
}

export interface ItemsState {
  ready: boolean;
  items: MoneyDateItem[];
  views: ReturnType<typeof toView>[];
  /** The payments ledger — every recorded payment, newest last. */
  payments: PaymentRecord[];
  /** Today / this-month totals computed from the ledger. */
  spend: SpendSummary;
  atRisk: number;
  saved: number;
  runRate: number;
  weekItems: ReturnType<typeof toView>[];
  counts: Record<string, number>;
  pendingAlerts: FiredAlert[];
  dismissAlerts: () => void;
  addItem: (item: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>) => Promise<MoneyDateItem>;
  updateItem: (item: MoneyDateItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setStatus: (id: string, status: ItemStatus) => Promise<void>;
  /** Parse-result charges → ledger records (classified + deduped). */
  recordCharges: (charges: ParsedCharge[], opts: RecordChargeOptions) => RecordOutcome;
  /** One manual ledger entry (the Payments add dialog). */
  addManualPayment: (merchant: string, amount: number, date: string) => PaymentRecord | null;
  deletePayment: (id: string) => Promise<void>;
  /** Mark unlinked ledger payments of this payee as this item's renewals. */
  linkPaymentsToItem: (key: string, itemId: string) => Promise<void>;
  loadSample: () => Promise<void>;
  clearAll: () => Promise<void>;
  importJSON: (raw: string) => { imported: number; skipped: number };
  exportJSON: () => string;
}

export function useItems(): ItemsState {
  const [items, setItems] = useState<MoneyDateItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [ready, setReady] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState<FiredAlert[]>([]);
  const itemsRef = useRef<MoneyDateItem[]>([]);
  const paymentsRef = useRef<PaymentRecord[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(() => {
    paymentsRef.current = payments;
  }, [payments]);

  // Load once: apply auto-advance, mark crossed thresholds, surface the away-report.
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await loadItems();
      const storedPayments = await loadPayments();
      let advanced = stored.map((i) => {
        const v = toView(i);
        if (v.lapsedCycles > 0) {
          return { ...i, end: v.end, notified: [], updatedAt: new Date().toISOString() };
        }
        return i;
      });
      const due = dueAlerts(advanced.map((i) => toView(i)));
      if (due.length > 0) {
        const dueIds = new Set(due.map((d) => d.item.id));
        advanced = advanced.map((i) => {
          if (!dueIds.has(i.id)) return i;
          const view = due.find((d) => d.item.id === i.id)!.item;
          return {
            ...i,
            notified: markAlerted(view, [7, 2, 0]),
            updatedAt: new Date().toISOString(),
          };
        });
      }
      const changed =
        advanced.some((i) => toView(i).lapsedCycles > 0) || due.length > 0;
      if (changed) await saveAll(advanced);
      if (!alive) return;
      setItems(advanced);
      setPayments(storedPayments);
      setPendingAlerts(due);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // While-open ticker: every 60s, detect + persist + notify new crossings.
  useEffect(() => {
    if (!ready) return;
    const id = window.setInterval(() => {
      (async () => {
        const current = itemsRef.current;
        const due = dueAlerts(current.map((i) => toView(i)));
        if (due.length === 0) return;
        const dueIds = new Set(due.map((d) => d.item.id));
        const updated = current.map((i) => {
          if (!dueIds.has(i.id)) return i;
          const view = due.find((d) => d.item.id === i.id)!.item;
          return {
            ...i,
            notified: markAlerted(view, [7, 2, 0]),
            updatedAt: new Date().toISOString(),
          };
        });
        await saveAll(updated);
        setItems(updated);
        setPendingAlerts((prev) => [
          ...prev,
          ...due.filter((d) => !prev.some((p) => p.item.id === d.item.id && p.threshold === d.threshold)),
        ]);
        for (const d of due) {
          fireNotification(
            `${d.item.name} — ${d.threshold === 0 ? 'money moves today' : `${d.item.daysLeft} days left`}`,
            `${d.threshold === 0 ? 'Act now' : 'Decide now'}: ${d.item.kind === 'promo' ? 'payoff cliff approaching' : 'veto, claim or let it fire'}.`
          );
        }
      })();
    }, 60_000);
    return () => window.clearInterval(id);
  }, [ready]);

  const views = useMemo(() => items.map((i) => toView(i)), [items]);

  const spend = useMemo(
    () => spendSummary(payments, todayISO()),
    [payments]
  );

  const addItem = useCallback(async (draft: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: MoneyDateItem = { ...draft, createdAt: now, updatedAt: now };
    const next = [...itemsRef.current, item];
    itemsRef.current = next;
    setItems(next);
    await upsertItem(item, next);
    return item;
  }, []);

  const updateItem = useCallback(async (item: MoneyDateItem) => {
    const next: MoneyDateItem = { ...item, updatedAt: new Date().toISOString() };
    const updated = itemsRef.current.map((i) => (i.id === next.id ? next : i));
    itemsRef.current = updated;
    setItems(updated);
    await upsertItem(next, updated);
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    const remaining = itemsRef.current.filter((i) => i.id !== id);
    itemsRef.current = remaining;
    setItems(remaining);
    // Payments linked to a deleted item keep their history — the link
    // is dropped, the ledger entry stays.
    const paymentsNext = paymentsRef.current.map((p) =>
      p.linkedItemId === id ? { ...p, linkedItemId: undefined } : p
    );
    if (paymentsNext.some((p, i) => p !== paymentsRef.current[i])) {
      paymentsRef.current = paymentsNext;
      setPayments(paymentsNext);
      await saveAllPayments(paymentsNext);
    }
    await removeItem(id, remaining);
  }, []);

  const setStatus = useCallback(async (id: string, status: ItemStatus) => {
    const target = itemsRef.current.find((i) => i.id === id);
    if (!target) return;
    const savedAmount =
      status === 'vetoed' || status === 'used' ? target.costAtStake : target.savedAmount;
    const next: MoneyDateItem = {
      ...target,
      status,
      savedAmount,
      updatedAt: new Date().toISOString(),
    };
    const updated = itemsRef.current.map((i) => (i.id === id ? next : i));
    itemsRef.current = updated;
    setItems(updated);
    await upsertItem(next, updated);
  }, []);

  const recordCharges = useCallback(
    (charges: ParsedCharge[], opts: RecordChargeOptions): RecordOutcome => {
      const outcome = chargesToPayments(
        charges,
        {
          payments: paymentsRef.current,
          items: itemsRef.current,
          today: todayISO(),
        },
        { source: opts.source, via: opts.via }
      );
      if (outcome.added.length > 0) {
        const next = [...paymentsRef.current, ...outcome.added];
        paymentsRef.current = next;
        setPayments(next);
        void saveAllPayments(next);
      }
      return outcome;
    },
    []
  );

  const addManualPayment = useCallback(
    (merchant: string, amount: number, date: string): PaymentRecord | null => {
      if (!merchant.trim() || !Number.isFinite(amount) || amount <= 0) return null;
      const record = manualPayment(merchant.trim(), amount, date, {
        payments: paymentsRef.current,
        items: itemsRef.current,
        today: todayISO(),
      });
      const next = [...paymentsRef.current, record];
      paymentsRef.current = next;
      setPayments(next);
      void saveAllPayments(next);
      return record;
    },
    []
  );

  const deletePayment = useCallback(async (id: string) => {
    const remaining = paymentsRef.current.filter((p) => p.id !== id);
    paymentsRef.current = remaining;
    setPayments(remaining);
    await removePayment(id, remaining);
  }, []);

  const linkPaymentsToItem = useCallback(async (key: string, itemId: string) => {
    const current = paymentsRef.current;
    const next = current.map((p) =>
      p.key === key && !p.linkedItemId ? { ...p, linkedItemId: itemId } : p
    );
    if (next.every((p, i) => p === current[i])) return;
    paymentsRef.current = next;
    setPayments(next);
    await saveAllPayments(next);
  }, []);

  const loadSample = useCallback(async () => {
    // Demo action: replace, never append — the sample set is the demo
    // state, and stacking it (each load mints fresh ids) duplicates items.
    const next = sampleItems();
    itemsRef.current = next;
    setItems(next);
    const nextPayments = samplePayments();
    paymentsRef.current = nextPayments;
    setPayments(nextPayments);
    await saveAll(next);
    await saveAllPayments(nextPayments);
  }, []);

  const clearAll = useCallback(async () => {
    itemsRef.current = [];
    setItems([]);
    paymentsRef.current = [];
    setPayments([]);
    setPendingAlerts([]);
    await saveAll([]);
    await saveAllPayments([]);
  }, []);

  const importJSON = useCallback((raw: string) => {
    const result = importData(raw, itemsRef.current, paymentsRef.current);
    itemsRef.current = result.items;
    setItems(result.items);
    paymentsRef.current = result.payments;
    setPayments(result.payments);
    void saveAll(result.items);
    void saveAllPayments(result.payments);
    return { imported: result.imported, skipped: result.skipped };
  }, []);

  const exportJSON = useCallback(() => {
    return exportAll(itemsRef.current, paymentsRef.current);
  }, []);

  const dismissAlerts = useCallback(() => setPendingAlerts([]), []);

  return {
    ready,
    items,
    payments,
    spend,
    views,
    atRisk: atRiskSum(views),
    saved: savedSum(items),
    runRate: annualRunRate(views),
    weekItems: atRiskWithin(views, 7),
    counts: urgencyCounts(views),
    pendingAlerts,
    dismissAlerts,
    addItem,
    updateItem,
    deleteItem,
    setStatus,
    recordCharges,
    addManualPayment,
    deletePayment,
    linkPaymentsToItem,
    loadSample,
    clearAll,
    importJSON,
    exportJSON,
  };
}
