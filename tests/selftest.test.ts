/**
 * PocketVeto — detection self-test coverage (bun test).
 *
 * Pins the exact pipeline the Settings "Run detection self-test" button
 * runs: canned captures shaped like PaymentListenerService's real output
 * → capturesToText → scanSharedText → detectedToItem. If the detector
 * regresses, this fails before an APK ever ships.
 */

import { describe, expect, test } from 'bun:test';
import {
  runDetectionSelfTest,
  SELF_TEST_CAPTURES,
} from '@/lib/pocketveto/selftest';
import { capturesToText } from '@/lib/pocketveto/native';
import { scanSharedText } from '@/lib/pocketveto/scan';

describe('detection self-test', () => {
  test('every check passes on the canned capture set', () => {
    const result = runDetectionSelfTest();
    for (const c of result.checks) {
      expect(c.passed).toBe(true);
    }
    expect(result.passed).toBe(true);
  });

  test('the canned set really exercises the capture shapes', () => {
    // PhonePe-style dated notification, Paytm single, bank SMS, promo, OTP
    const sources = SELF_TEST_CAPTURES.map((c) => c.source);
    expect(sources).toContain('com.phonepe.app');
    expect(sources).toContain('net.one97.paytm');
    expect(sources).toContain('sms');
    expect(SELF_TEST_CAPTURES.length).toBeGreaterThanOrEqual(8);
  });

  test('junk never becomes a charge in the raw pipeline', () => {
    const text = capturesToText(SELF_TEST_CAPTURES);
    const { parse } = scanSharedText(text, '2026-10-06');
    for (const c of parse.charges) {
      expect(/cashback|otp/i.test(c.raw)).toBe(false);
    }
    // the promo line was seen (money + no verb → unparsed, not a charge)
    expect(parse.unparsed).toBeGreaterThanOrEqual(1);
  });
});
