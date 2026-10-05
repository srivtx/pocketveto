'use client';

/**
 * PocketVeto — the app state hook. One source of truth over local storage.
 *
 * Alert model: thresholds crossed between visits are surfaced at load
 * ("while you were away") and persisted as notified; while the app is
 * open, a 60s ticker checks for new crossings and fires OS notifications
 * when permission has been granted.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ItemStatus, MoneyDateItem } from '@/lib/pocketveto/types';
import { toView } from '@/lib/pocketveto/dates';
import {
  atRiskSum,
  annualRunRate,
  atRiskWithin,
  savedSum,
  urgencyCounts,
} from '@/lib/pocketveto/risk';
import {
  importItems,
  loadItems,
  removeItem,
  saveAll,
  upsertItem,
} from '@/lib/pocketveto/store';
import { sampleItems } from '@/lib/pocketveto/seed';
import {
  dueAlerts,
  fireNotification,
  markAlerted,
  type FiredAlert,
} from '@/lib/pocketveto/notifications';

export interface ItemsState {
  ready: boolean;
  items: MoneyDateItem[];
  views: ReturnType<typeof toView>[];
  atRisk: number;
  saved: number;
  runRate: number;
  weekItems: ReturnType<typeof toView>[];
  counts: Record<string, number>;
  pendingAlerts: FiredAlert[];
  dismissAlerts: () => void;
  addItem: (item: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateItem: (item: MoneyDateItem) => Promise<void>;
  deleteItem: (id: string) => Promise<void>;
  setStatus: (id: string, status: ItemStatus) => Promise<void>;
  loadSample: () => Promise<void>;
  clearAll: () => Promise<void>;
  importJSON: (raw: string) => { imported: number; skipped: number };
  exportJSON: () => string;
}

export function useItems(): ItemsState {
  const [items, setItems] = useState<MoneyDateItem[]>([]);
  const [ready, setReady] = useState(false);
  const [pendingAlerts, setPendingAlerts] = useState<FiredAlert[]>([]);
  const itemsRef = useRef<MoneyDateItem[]>([]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Load once: apply auto-advance, mark crossed thresholds, surface the away-report.
  useEffect(() => {
    let alive = true;
    (async () => {
      const stored = await loadItems();
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

  const addItem = useCallback(async (draft: Omit<MoneyDateItem, 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const item: MoneyDateItem = { ...draft, createdAt: now, updatedAt: now };
    const next = [...itemsRef.current, item];
    itemsRef.current = next;
    setItems(next);
    await upsertItem(item, next);
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

  const loadSample = useCallback(async () => {
    const next = [...itemsRef.current, ...sampleItems()];
    itemsRef.current = next;
    setItems(next);
    await saveAll(next);
  }, []);

  const clearAll = useCallback(async () => {
    itemsRef.current = [];
    setItems([]);
    setPendingAlerts([]);
    await saveAll([]);
  }, []);

  const importJSON = useCallback((raw: string) => {
    const result = importItems(raw, itemsRef.current);
    itemsRef.current = result.items;
    setItems(result.items);
    void saveAll(result.items);
    return { imported: result.imported, skipped: result.skipped };
  }, []);

  const exportJSON = useCallback(() => {
    return JSON.stringify(
      { app: 'pocketveto', version: 1, exportedAt: new Date().toISOString(), items: itemsRef.current },
      null,
      2
    );
  }, []);

  const dismissAlerts = useCallback(() => setPendingAlerts([]), []);

  return {
    ready,
    items,
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
    loadSample,
    clearAll,
    importJSON,
    exportJSON,
  };
}
