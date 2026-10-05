/**
 * native.ts — the Android bridge adapter.
 *
 * The Android APK ships this web app with a headless native capture
 * engine (NotificationListenerService). It exposes itself as
 * `window.PocketVetoNative`; in every other context (browser, installed
 * PWA, iOS) that object does not exist and this module is inert — the
 * app degrades to share/paste, exactly as before.
 *
 * v1.4.1 note: the optional SMS receiver is gone (its permission group
 * made Play Protect hard-block installs); notifications cover the
 * payment feeds, and the bridge no longer carries SMS plumbing.
 *
 * Rules the whole bridge obeys:
 *  - Server renders never touch it (hydration stays deterministic).
 *  - Every read is defensive — a malformed entry is skipped, never thrown.
 *  - Native captures RAW text only; parsing stays in this codebase,
 *    where the detector and its tests live.
 */

import { useCallback, useEffect, useState } from 'react';

export interface NativeCapture {
  /** Android package ("com.phonepe.app"). */
  source: string;
  /** Notification title — evidence, shown to the user. */
  title: string;
  /** Raw body text — the parser's input. */
  text: string;
  /** Epoch ms when captured. */
  ts: number;
}

interface NativeBridgeShape {
  version(): string;
  captureCount(): number;
  /** JSON array of captures; drains the native queue. */
  takeCaptured(): string;
  notifEnabled(): boolean;
  openNotifAccess(): void;
}

/** Friendly labels for known capture sources. Unknowns get a cleaned tail. */
const APP_LABELS: Record<string, string> = {
  'com.phonepe.app': 'PhonePe',
  'com.google.android.apps.nbu.paisa.user': 'Google Pay',
  'net.one97.paytm': 'Paytm',
  'com.paypal.android.p2pmobile': 'PayPal',
  'com.amazon.mShop.android.shopping': 'Amazon',
  'com.flipkart.android': 'Flipkart',
};

export function sourceLabel(source: string): string {
  if (APP_LABELS[source]) return APP_LABELS[source];
  const tail = source.split('.').filter(Boolean).slice(-2).join('.');
  return tail || source || 'app';
}

export function getNativeBridge(): NativeBridgeShape | null {
  if (typeof window === 'undefined') return null;
  const b = (window as unknown as { PocketVetoNative?: NativeBridgeShape }).PocketVetoNative;
  return b ?? null;
}

/** Drain and validate. Malformed entries are skipped, never thrown. */
export function pullCaptures(): NativeCapture[] {
  const b = getNativeBridge();
  if (!b) return [];
  try {
    const raw: unknown = JSON.parse(b.takeCaptured());
    if (!Array.isArray(raw)) return [];
    return raw.flatMap((e) => {
      if (typeof e !== 'object' || e === null) return [];
      const o = e as Record<string, unknown>;
      if (typeof o.text !== 'string' || o.text.trim().length === 0) return [];
      return [
        {
          source: typeof o.source === 'string' ? o.source : 'unknown',
          title: typeof o.title === 'string' ? o.title : '',
          text: o.text,
          ts: typeof o.ts === 'number' ? o.ts : 0,
        } satisfies NativeCapture,
      ];
    });
  } catch {
    return [];
  }
}

/** Captures → the multi-message text the shared-payment parser reads. */
export function capturesToText(captures: NativeCapture[]): string {
  return captures.map((c) => c.text).join('\n\n');
}

/* ------------------------------------------------------------------ */
/* Status hook — the app's client-only-data pattern (async load + alive
   guard, refresh on window focus, i.e. when the user returns from the
   system permission screens). Server snapshot: not available. */

export interface NativeStatus {
  /** True only inside the Android shell. */
  available: boolean;
  notifEnabled: boolean;
  pendingCount: number;
}

/** What the hook hands back — status plus the manual refresh trigger. */
export type NativeStatusLive = NativeStatus & { refresh: () => void };

const NATIVE_IDLE: NativeStatus = {
  available: false,
  notifEnabled: false,
  pendingCount: 0,
};

export function useNativeStatus() {
  const [status, setStatus] = useState<NativeStatus>(NATIVE_IDLE);

  const refresh = useCallback(() => {
    const b = getNativeBridge();
    if (!b) return;
    try {
      setStatus({
        available: true,
        notifEnabled: b.notifEnabled(),
        pendingCount: b.captureCount(),
      });
    } catch {
      /* a bridge that throws mid-read stays at its last known state */
    }
  }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      // leave the synchronous effect scope before any state lands —
      // same shape as the store's async load.
      await Promise.resolve();
      if (!alive) return;
      refresh();
    })();
    const onWake = () => refresh();
    // Returning from the notification-access settings screen is
    // the moment these values actually change.
    window.addEventListener('focus', onWake);
    document.addEventListener('visibilitychange', onWake);
    return () => {
      alive = false;
      window.removeEventListener('focus', onWake);
      document.removeEventListener('visibilitychange', onWake);
    };
  }, [refresh]);

  return { ...status, refresh };
}
