/**
 * PocketVeto — alerts.
 *
 * Honesty model (stated in-app): notifications fire while PocketVeto is
 * open or its service worker can run (Android/desktop installed PWA).
 * v1 has no push server — by design, since nothing should leave the
 * device. Thresholds: T-7d, T-2d, T-0.
 *
 * v1.4.4 — two worlds, one vocabulary. Inside the Android APK the Web
 * Notification API is a dead end (a bare WebView has no permission UI;
 * Chromium auto-denies), so every function below is bridge-first:
 * permissionState reads the native POST_NOTIFICATIONS state, requestAlerts
 * fires the real Android runtime prompt, and fireNotification posts a real
 * system notification on the "alerts" channel. In browsers and installed
 * PWAs the plain Web Notification path still applies, unchanged.
 */

import type { ItemView } from './types';
import { getNativeBridge } from './native';

export const ALERT_THRESHOLDS = [7, 2, 0] as const;

export function notificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('Notification' in window || getNativeBridge() !== null)
  );
}

export function permissionState(): NotificationPermission | 'unsupported' {
  const bridge = getNativeBridge();
  if (bridge) {
    // Native world: "default" = not yet granted (the nudge/settings offer
    // to enable), "granted" = the OS will let reminders post.
    try {
      return typeof bridge.alertsEnabled === 'function' && bridge.alertsEnabled()
        ? 'granted'
        : 'default';
    } catch {
      return 'default';
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  const bridge = getNativeBridge();
  if (bridge) {
    // Fires the Android runtime prompt. The answer arrives later — the
    // caller re-reads state on window focus (the useNativeStatus pattern);
    // we return the current snapshot so the UI has something to hold.
    try {
      if (typeof bridge.requestAlerts === 'function') bridge.requestAlerts();
    } catch {
      /* bridge hiccups read as still-off; the settings row stays honest */
    }
    return permissionState();
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export interface FiredAlert {
  item: ItemView;
  threshold: (typeof ALERT_THRESHOLDS)[number];
}

/**
 * Which items cross an un-alerted threshold right now.
 * `notified` stores keys like "cycleEndISO#7" so a new cycle re-alerts.
 */
export function dueAlerts(items: ItemView[]): FiredAlert[] {
  const out: FiredAlert[] = [];
  for (const item of items) {
    if (item.status !== 'active') continue;
    const notified = new Set(item.notified ?? []);
    for (const t of ALERT_THRESHOLDS) {
      if (item.daysLeft <= t && !notified.has(alertKey(item.end, t))) {
        out.push({ item, threshold: t });
      }
    }
  }
  return out;
}

export function alertKey(cycleEndISO: string, threshold: number): string {
  return `${cycleEndISO}#${threshold}`;
}

/** Mark thresholds as fired (persisted by caller via the store). */
export function markAlerted(item: ItemView, thresholds: number[]): string[] {
  const notified = new Set(item.notified ?? []);
  for (const t of thresholds) notified.add(alertKey(item.end, t));
  // keep only current-cycle keys
  return [...notified].filter((k) => k.startsWith(`${item.end}#`));
}

export function fireNotification(title: string, body: string): void {
  // Native first: a real system notification through the bridge.
  const bridge = getNativeBridge();
  if (bridge) {
    try {
      if (typeof bridge.postAlert === 'function' && bridge.postAlert(title, body)) return;
    } catch {
      /* fall through to the web path — fail soft, never throw at callers */
    }
  }
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, {
      body,
      tag: `pocketveto-${title}`,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
    });
  } catch {
    /* some platforms require a service-worker registration to notify — fail soft */
  }
}
