/**
 * PocketVeto — local-first storage.
 *
 * IndexedDB is the primary store (async, large, robust); localStorage is
 * the fallback for locked-down browsers. There is NO server. The only
 * way data leaves the device is the user's own Export button.
 *
 * v1.5.0 (schema 2): a second object store, `payments` — the spend
 * ledger every captured payment lands in. Schema upgrades from v1
 * databases create it on open; exports move to format version 2
 * (items + payments) and still import every v1 file ever exported.
 */

import type { MoneyDateItem, PaymentRecord } from './types';

const DB_NAME = 'pocketveto';
const DB_VERSION = 2;
const STORE = 'items';
const PAYMENTS_STORE = 'payments';
const LS_KEY = 'pocketveto.items.v1';
const LS_PAYMENTS_KEY = 'pocketveto.payments.v1';

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
        // Schema 2: the payments ledger (v1 databases upgrade in place).
        if (!db.objectStoreNames.contains(PAYMENTS_STORE)) {
          db.createObjectStore(PAYMENTS_STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

function lsRead(): MoneyDateItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as MoneyDateItem[]) : [];
  } catch {
    return [];
  }
}

function lsWrite(items: MoneyDateItem[]): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(items));
  } catch {
    /* storage full or blocked — fail soft, the app still works in-session */
  }
}

function lsReadPayments(): PaymentRecord[] {
  try {
    const raw = localStorage.getItem(LS_PAYMENTS_KEY);
    return raw ? (JSON.parse(raw) as PaymentRecord[]) : [];
  } catch {
    return [];
  }
}

function lsWritePayments(payments: PaymentRecord[]): void {
  try {
    localStorage.setItem(LS_PAYMENTS_KEY, JSON.stringify(payments));
  } catch {
    /* same fail-soft contract as the items mirror */
  }
}

export async function loadItems(): Promise<MoneyDateItem[]> {
  const db = await openDB();
  if (!db) return lsRead();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve((req.result ?? []) as MoneyDateItem[]);
      req.onerror = () => resolve(lsRead());
    } catch {
      resolve(lsRead());
    }
  });
}

export async function saveAll(items: MoneyDateItem[]): Promise<void> {
  lsWrite(items); // mirror so the fallback never loses the latest state
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, 'readwrite');
      const os = tx.objectStore(STORE);
      os.clear();
      for (const item of items) os.put(item);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

export async function upsertItem(item: MoneyDateItem, all: MoneyDateItem[]): Promise<MoneyDateItem[]> {
  const idx = all.findIndex((i) => i.id === item.id);
  const next = idx >= 0
    ? all.map((i) => (i.id === item.id ? item : i))
    : [...all, item];
  await saveAll(next);
  return next;
}

export async function removeItem(id: string, all: MoneyDateItem[]): Promise<MoneyDateItem[]> {
  const next = all.filter((i) => i.id !== id);
  await saveAll(next);
  return next;
}

/* ------------------------------------------------------------------ */
/* Payments ledger — same contract as the items store                   */
/* ------------------------------------------------------------------ */

export async function loadPayments(): Promise<PaymentRecord[]> {
  const db = await openDB();
  if (!db) return lsReadPayments();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(PAYMENTS_STORE, 'readonly');
      const req = tx.objectStore(PAYMENTS_STORE).getAll();
      req.onsuccess = () => resolve((req.result ?? []) as PaymentRecord[]);
      req.onerror = () => resolve(lsReadPayments());
    } catch {
      resolve(lsReadPayments());
    }
  });
}

export async function saveAllPayments(payments: PaymentRecord[]): Promise<void> {
  lsWritePayments(payments);
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(PAYMENTS_STORE, 'readwrite');
      const os = tx.objectStore(PAYMENTS_STORE);
      os.clear();
      for (const p of payments) os.put(p);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** Save the next full ledger state (payments + any record updates).
 *  saveAllPayments clears and rewrites the store, so removals land too. */
export async function setPayments(
  next: PaymentRecord[],
  _current: PaymentRecord[]
): Promise<PaymentRecord[]> {
  await saveAllPayments(next);
  return next;
}

export async function removePayment(id: string, all: PaymentRecord[]): Promise<PaymentRecord[]> {
  const next = all.filter((p) => p.id !== id);
  await setPayments(next, all);
  return next;
}

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `pv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/* ------------------------------------------------------------------ */
/* Export / import                                                      */
/* ------------------------------------------------------------------ */

export interface ExportV2 {
  app: 'pocketveto';
  version: 2;
  exportedAt: string;
  items: MoneyDateItem[];
  payments: PaymentRecord[];
}

/** Full export: items + the payments ledger (format version 2). */
export function exportAll(items: MoneyDateItem[], payments: PaymentRecord[]): string {
  return JSON.stringify(
    {
      app: 'pocketveto',
      version: 2,
      exportedAt: new Date().toISOString(),
      items,
      payments,
    } satisfies ExportV2,
    null,
    2
  );
}

/** Items-only export (v1 shape) — kept for tests and narrow use. */
export function exportItems(items: MoneyDateItem[]): string {
  return JSON.stringify(
    {
      app: 'pocketveto',
      version: 1,
      exportedAt: new Date().toISOString(),
      items,
    },
    null,
    2
  );
}

export interface ImportResult {
  items: MoneyDateItem[];
  payments: PaymentRecord[];
  imported: number;
  skipped: number;
}

function validItem(c: unknown): c is MoneyDateItem {
  const it = c as Partial<MoneyDateItem>;
  return (
    typeof it.id === 'string' &&
    typeof it.name === 'string' &&
    typeof it.end === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(it.end)
  );
}

function validPayment(c: unknown): c is PaymentRecord {
  const p = c as Partial<PaymentRecord>;
  return (
    typeof p.id === 'string' &&
    typeof p.merchant === 'string' &&
    typeof p.amount === 'number' &&
    typeof p.date === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(p.date)
  );
}

/**
 * Merge-import (format v2: items + payments; v1: items only; bare arrays
 * also accepted). Keeps existing ids, validates shape, never destructive.
 */
export function importData(
  raw: string,
  currentItems: MoneyDateItem[],
  currentPayments: PaymentRecord[]
): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { items: currentItems, payments: currentPayments, imported: 0, skipped: 0 };
  }
  const obj = (parsed ?? {}) as { items?: unknown; payments?: unknown };
  const candidateItems = Array.isArray(parsed)
    ? parsed
    : Array.isArray(obj.items)
      ? obj.items
      : [];
  const candidatePayments = Array.isArray(obj.payments) ? obj.payments : [];

  const itemIds = new Set(currentItems.map((i) => i.id));
  const paymentIds = new Set(currentPayments.map((p) => p.id));
  const mergedItems = [...currentItems];
  const mergedPayments = [...currentPayments];
  let imported = 0;
  let skipped = 0;

  for (const c of candidateItems) {
    if (validItem(c)) {
      if (!itemIds.has(c.id)) {
        mergedItems.push(c);
        itemIds.add(c.id);
        imported++;
      }
    } else {
      skipped++;
    }
  }
  for (const c of candidatePayments) {
    if (validPayment(c)) {
      if (!paymentIds.has(c.id)) {
        mergedPayments.push(c);
        paymentIds.add(c.id);
        imported++;
      }
    } else {
      skipped++;
    }
  }
  return { items: mergedItems, payments: mergedPayments, imported, skipped };
}

/** v1-compatible items-only import (tests pin this shape). */
export function importItems(
  raw: string,
  current: MoneyDateItem[]
): { items: MoneyDateItem[]; imported: number; skipped: number } {
  const r = importData(raw, current, []);
  return { items: r.items, imported: r.imported, skipped: r.skipped };
}
