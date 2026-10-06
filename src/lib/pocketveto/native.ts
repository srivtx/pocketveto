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
 * v1.4.4: the bridge grew the alerts half. The Web Notification API
 * cannot be granted inside a bare WebView (no browser permission UI —
 * Chromium auto-denies), so the app's own reminders now route through
 * native: alertsEnabled/requestAlerts/postAlert/openAlertSettings,
 * backed by the POST_NOTIFICATIONS runtime prompt and a real "alerts"
 * notification channel. The web layer keeps the same permission-state
 * vocabulary, so every consumer (nudge banner, settings, reminders)
 * works unchanged in both worlds.
 *
 * v1.5.3: the bridge grew the listener-lifecycle half. Android
 * documents that updating an app silently unbinds a granted
 * NotificationListenerService (force-stops and OEM battery policies do
 * the same), so "the toggle is on" stopped being an honest definition
 * of "captures are flowing": notifAlive() tells the web layer whether
 * the listener has actually been bound since this app version was
 * installed, and rebindCapture() wakes it with one tap. MainActivity
 * also re-requests the binding on its own every time the app comes to
 * the front — the user should rarely ever see the wake state at all.
 * Bridges from v1.5.2 and earlier lack both methods and keep working:
 * missing notifAlive degrades to the old toggle-only reading.
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
  /** v1.5.3: the grant exists AND the listener has been bound since this
   *  app version was installed (false = the OS silently unbound it). */
  notifAlive(): boolean;
  /** v1.5.3: one-tap wake of a granted-but-dead listener. False = the
   *  switch itself is off — the settings deep-link is the only fix. */
  rebindCapture(): boolean;
  openNotifAccess(): void;
  /** True when this app's own reminders can post (Android 13+ runtime grant
   *  or the per-app notification toggle). */
  alertsEnabled(): boolean;
  /** Fires the POST_NOTIFICATIONS runtime prompt (native replacement for
   *  the Web Notification permission dialog that WebViews can't show). */
  requestAlerts(): void;
  /** Posts one real system notification; false when blocked. */
  postAlert(title: string, body: string): boolean;
  /** Deep-link to this app's own notification settings (channel list). */
  openAlertSettings(): void;
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
/* Listener lifecycle — v1.5.3. Android silently unbinds a granted
   NotificationListenerService after app updates (force-stops and OEM
   battery sweeps do the same), so "the toggle is on" stopped being
   honest proof that captures are flowing. The pure helpers below are
   shared by the status hook and every wake button, and pinned by tests. */

/** Snapshot the bridge state. Bridges from v1.5.2 and earlier lack
 *  notifAlive — it degrades to the toggle reading so older installs
 *  keep working unchanged. Throws only when the bridge throws; callers
 *  then keep their last snapshot. */
export function readNativeStatus(b: NativeBridgeShape): NativeStatus {
  return {
    available: true,
    notifEnabled: b.notifEnabled(),
    notifAlive: typeof b.notifAlive === 'function' ? b.notifAlive() : b.notifEnabled(),
    pendingCount: b.captureCount(),
    alertsEnabled: typeof b.alertsEnabled === 'function' ? b.alertsEnabled() : false,
  };
}

/** Ask the system to re-bind a granted-but-dead listener.
 *  'requested' = the grant is on record and a rebind was asked for
 *  (it settles asynchronously — poll after a beat);
 *  'switch-off' = the toggle itself is off, or the bridge predates
 *  rebindCapture — the system settings screen is the only honest fix. */
export function requestListenerRebind(
  b: NativeBridgeShape
): 'requested' | 'switch-off' {
  try {
    if (typeof b.rebindCapture === 'function' && b.rebindCapture()) return 'requested';
  } catch {
    /* fall through — a throwing bridge reads as switch-off */
  }
  return 'switch-off';
}

/* ------------------------------------------------------------------ */
/* Status hook — the app's client-only-data pattern (async load + alive
   guard, refresh on window focus, i.e. when the user returns from the
   system permission screens). Server snapshot: not available. */

export interface NativeStatus {
  /** True only inside the Android shell. */
  available: boolean;
  notifEnabled: boolean;
  /** v1.5.3: grant on AND listener actually bound since this app version
   *  was installed — the honest "captures are flowing" bit. */
  notifAlive: boolean;
  pendingCount: number;
  /** True when the app's own reminder alerts can post (native bridge). */
  alertsEnabled: boolean;
}

/** What the hook hands back — status plus the manual refresh trigger. */
export type NativeStatusLive = NativeStatus & { refresh: () => void };

const NATIVE_IDLE: NativeStatus = {
  available: false,
  notifEnabled: false,
  notifAlive: false,
  pendingCount: 0,
  alertsEnabled: false,
};

export function useNativeStatus() {
  const [status, setStatus] = useState<NativeStatus>(NATIVE_IDLE);

  const refresh = useCallback(() => {
    const b = getNativeBridge();
    if (!b) return;
    try {
      setStatus(readNativeStatus(b));
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
