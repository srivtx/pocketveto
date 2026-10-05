/**
 * PocketVeto — local-first storage.
 *
 * IndexedDB is the primary store (async, large, robust); localStorage is
 * the fallback for locked-down browsers. There is NO server. The only
 * way data leaves the device is the user's own Export button.
 */

import type { MoneyDateItem } from './types';

const DB_NAME = 'pocketveto';
const DB_VERSION = 1;
const STORE = 'items';
const LS_KEY = 'pocketveto.items.v1';

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

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `pv-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

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
  imported: number;
  skipped: number;
}

/** Merge-import: keeps existing ids, validates shape, never destructive. */
export function importItems(
  raw: string,
  current: MoneyDateItem[]
): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { items: current, imported: 0, skipped: 0 };
  }
  const candidate = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { items?: unknown[] })?.items)
      ? (parsed as { items: unknown[] }).items
      : [];
  const ok: MoneyDateItem[] = [];
  let skipped = 0;
  for (const c of candidate) {
    const it = c as Partial<MoneyDateItem>;
    if (
      typeof it.id === 'string' &&
      typeof it.name === 'string' &&
      typeof it.end === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(it.end)
    ) {
      ok.push(it as MoneyDateItem);
    } else {
      skipped += 1;
    }
  }
  const existing = new Set(current.map((i) => i.id));
  const merged = [...current];
  let imported = 0;
  for (const item of ok) {
    if (existing.has(item.id)) continue;
    merged.push(item);
    imported += 1;
  }
  return { items: merged, imported, skipped };
}
