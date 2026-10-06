/**
 * PocketVeto — Android bridge adapter tests (bun test).
 * The bridge is injected as window.PocketVetoNative, exactly how the
 * Android shell provides it; in every other environment the adapter
 * must stay inert.
 */

import { afterEach, describe, expect, test } from 'bun:test';
import {
  getNativeBridge,
  pullCaptures,
  capturesToText,
  sourceLabel,
  readNativeStatus,
  requestListenerRebind,
} from '@/lib/pocketveto/native';
import { scanSharedText } from '@/lib/pocketveto/scan';

const g = globalThis as unknown as { window?: unknown };

afterEach(() => {
  delete g.window;
});

function installBridge(impl: Record<string, unknown>) {
  g.window = { PocketVetoNative: impl };
}

describe('native bridge detection', () => {
  test('no window → no bridge, nothing throws', () => {
    expect(getNativeBridge()).toBeNull();
    expect(pullCaptures()).toEqual([]);
  });

  test('window without the bridge object → still inert', () => {
    g.window = {};
    expect(getNativeBridge()).toBeNull();
  });
});

describe('pullCaptures', () => {
  test('drains and validates a well-formed queue', () => {
    const drained: string[] = [];
    installBridge({
      takeCaptured: () => {
        drained.push('called');
        return JSON.stringify([
          { source: 'com.phonepe.app', title: 'PhonePe', text: 'Paid ₹349 to Netflix', ts: 1_700_000_000_000 },
          { source: 'sms', title: 'HDFC', text: 'Rs. 1,200.50 debited towards SonyLIV', ts: 1_700_000_060_000 },
        ]);
      },
    });
    const caps = pullCaptures();
    expect(caps).toHaveLength(2);
    expect(caps[0].source).toBe('com.phonepe.app');
    expect(caps[1].text).toContain('SonyLIV');
    expect(drained).toHaveLength(1); // exactly one drain
  });

  test('malformed entries are skipped, not thrown', () => {
    installBridge({
      takeCaptured: () =>
        JSON.stringify([
          { source: 'x', title: 'y', text: '   ' }, // blank text
          { source: 'x', ts: 5 }, // no text field
          'not-an-object',
          null,
          { source: 'ok', title: 'ok', text: '₹99 paid', ts: 1 }, // the one good egg
        ]),
    });
    expect(pullCaptures()).toHaveLength(1);
  });

  test('bridge JSON that throws degrades to empty', () => {
    installBridge({
      takeCaptured: () => {
        throw new Error('native hiccup');
      },
    });
    expect(pullCaptures()).toEqual([]);
  });

  test('non-array payload degrades to empty', () => {
    installBridge({ takeCaptured: () => '{"oops":true}' });
    expect(pullCaptures()).toEqual([]);
  });
});

describe('captures → parser round trip', () => {
  test('captured texts flow through the shared-payment detector', () => {
    const caps = pullCapturesFromBridge([
      { source: 'sms', title: 'HDFC', text: 'Rs. 649.00 debited towards NETFLIX on 02-09-26', ts: 1_700_000_000_000 },
      { source: 'sms', title: 'HDFC', text: 'Rs. 649.00 debited towards NETFLIX on 02-10-26', ts: 1_700_086_400_000 },
    ]);
    const text = capturesToText(caps);
    const { parse, detected } = scanSharedText(text);
    expect(parse.charges.length).toBeGreaterThanOrEqual(2);
    // two same-amount debits a month apart → cadence detection engages
    expect(detected.length).toBeGreaterThanOrEqual(1);
    expect(detected[0].cadence).toBe('monthly');
  });
});

describe('listener lifecycle — v1.5.3 (the OS-unbind fix)', () => {
  test('readNativeStatus: the silent unbind reads enabled-but-not-alive', () => {
    // The exact state Android leaves behind after an app update: the
    // settings toggle still on, the listener never bound again.
    installBridge({
      notifEnabled: () => true,
      notifAlive: () => false,
      captureCount: () => 3,
    });
    expect(readNativeStatus(getNativeBridge()!)).toMatchObject({
      available: true,
      notifEnabled: true,
      notifAlive: false,
      pendingCount: 3,
    });
  });

  test('readNativeStatus: healthy listener reads alive', () => {
    installBridge({
      notifEnabled: () => true,
      notifAlive: () => true,
      captureCount: () => 0,
    });
    const s = readNativeStatus(getNativeBridge()!);
    expect(s.notifEnabled).toBe(true);
    expect(s.notifAlive).toBe(true);
  });

  test('readNativeStatus: old bridges (≤ v1.5.2) degrade notifAlive to the toggle reading', () => {
    installBridge({ notifEnabled: () => true, captureCount: () => 1 });
    expect(readNativeStatus(getNativeBridge()!).notifAlive).toBe(true);
  });

  test('readNativeStatus: a bridge throwing mid-read propagates (hook keeps last snapshot)', () => {
    installBridge({
      notifEnabled: () => {
        throw new Error('native hiccup');
      },
    });
    expect(() => readNativeStatus(getNativeBridge()!)).toThrow();
  });

  test('requestListenerRebind: requested when the grant is on record', () => {
    installBridge({ rebindCapture: () => true });
    expect(requestListenerRebind(getNativeBridge()!)).toBe('requested');
  });

  test('requestListenerRebind: switch-off when the grant itself is gone', () => {
    installBridge({ rebindCapture: () => false });
    expect(requestListenerRebind(getNativeBridge()!)).toBe('switch-off');
  });

  test('requestListenerRebind: old bridges land on the deep-link path, never throw', () => {
    installBridge({});
    expect(requestListenerRebind(getNativeBridge()!)).toBe('switch-off');
  });

  test('requestListenerRebind: a throwing bridge reads as switch-off', () => {
    installBridge({
      rebindCapture: () => {
        throw new Error('native hiccup');
      },
    });
    expect(requestListenerRebind(getNativeBridge()!)).toBe('switch-off');
  });
});

describe('sourceLabel', () => {
  test('known packages get friendly names', () => {
    expect(sourceLabel('com.phonepe.app')).toBe('PhonePe');
    expect(sourceLabel('com.google.android.apps.nbu.paisa.user')).toBe('Google Pay');
  });

  test('unknown packages degrade to a cleaned tail', () => {
    expect(sourceLabel('com.some.unknown.bank.app')).toBe('bank.app');
    expect(sourceLabel('')).toBe('app');
  });
});

/* helper: install a bridge holding these captures, drain them */
function pullCapturesFromBridge(caps: Array<{ source: string; title: string; text: string; ts: number }>) {
  installBridge({ takeCaptured: () => JSON.stringify(caps) });
  return pullCaptures();
}
