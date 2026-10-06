/**
 * PocketVeto — alerts routing tests (bun test).
 *
 * v1.4.4: inside the APK the Web Notification API is a dead end, so
 * permissionState / requestPermission / fireNotification must be
 * bridge-first — including the case of a v1.4.3-era bridge that lacks
 * the new methods entirely (upgrades in place, degrade honestly).
 */

import { afterEach, describe, expect, test } from 'bun:test';
import {
  permissionState,
  requestPermission,
  fireNotification,
} from '@/lib/pocketveto/notifications';
import { getNativeBridge } from '@/lib/pocketveto/native';

const g = globalThis as unknown as { window?: unknown };

afterEach(() => {
  delete g.window;
});

function installBridge(impl: Record<string, unknown>) {
  g.window = { PocketVetoNative: impl };
}

describe('permissionState — native first', () => {
  test('bridge with alerts granted → granted', () => {
    installBridge({ alertsEnabled: () => true });
    expect(permissionState()).toBe('granted');
  });

  test('bridge with alerts off → default (the enable path shows)', () => {
    installBridge({ alertsEnabled: () => false });
    expect(permissionState()).toBe('default');
  });

  test('v1.4.3 bridge without the method → default, no throw', () => {
    installBridge({ version: () => '1.4.3' });
    expect(permissionState()).toBe('default');
  });

  test('bridge that throws → default (row stays honest)', () => {
    installBridge({
      alertsEnabled: () => {
        throw new Error('dead');
      },
    });
    expect(permissionState()).toBe('default');
  });

  test('no window at all → unsupported', () => {
    expect(permissionState()).toBe('unsupported');
  });
});

describe('requestPermission — native prompt, never web', () => {
  test('calls requestAlerts on the bridge and returns the snapshot', async () => {
    const calls: string[] = [];
    installBridge({
      alertsEnabled: () => false,
      requestAlerts: () => calls.push('asked'),
    });
    const result = await requestPermission();
    expect(calls).toEqual(['asked']);
    expect(result).toBe('default');
  });

  test('v1.4.3 bridge without requestAlerts → no throw, still default', async () => {
    installBridge({ version: () => '1.4.3' });
    const result = await requestPermission();
    expect(result).toBe('default');
  });
});

describe('fireNotification — routed through postAlert', () => {
  test('native post wins and short-circuits', () => {
    const posted: Array<[string, string]> = [];
    installBridge({
      alertsEnabled: () => true,
      postAlert: (t: string, b: string) => {
        posted.push([t, b]);
        return true;
      },
    });
    expect(() => fireNotification('T-7', 'Netflix renews')).not.toThrow();
    expect(posted).toEqual([['T-7', 'Netflix renews']]);
  });

  test('blocked native post degrades silently (no web Notification to catch)', () => {
    installBridge({ postAlert: () => false });
    expect(() => fireNotification('T-7', 'blocked')).not.toThrow();
  });

  test('v1.4.3 bridge without postAlert → no throw', () => {
    installBridge({ version: () => '1.4.3' });
    expect(() => fireNotification('T-7', 'legacy bridge')).not.toThrow();
  });
});

describe('bridge presence', () => {
  test('the installed bridge is discoverable', () => {
    installBridge({ alertsEnabled: () => true });
    expect(getNativeBridge()).not.toBeNull();
  });
});
