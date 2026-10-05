/**
 * PocketVeto — alerts.
 *
 * Honesty model (stated in-app): browser notifications fire while
 * PocketVeto is open or its service worker can run (Android/desktop
 * installed PWA). v1 has no push server — by design, since nothing
 * should leave the device. Thresholds: T-7d, T-2d, T-0.
 */

import type { ItemView } from './types';

export const ALERT_THRESHOLDS = [7, 2, 0] as const;

export function notificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function permissionState(): NotificationPermission | 'unsupported' {
  if (!notificationSupported()) return 'unsupported';
  return Notification.permission;
}

export async function requestPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationSupported()) return 'unsupported';
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
  if (!notificationSupported() || Notification.permission !== 'granted') return;
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
