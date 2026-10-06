/**
 * PocketVeto — detection self-test (v1.4.3).
 *
 * "How do I know autopay detection actually works?" — by proving it, in
 * the app, on the phone, without waiting for a real payment. This module
 * runs the EXACT production pipeline (capturesToText → scanSharedText →
 * detectedToItem) over canned captures shaped like what
 * PaymentListenerService really stores: PhonePe-style notifications with
 * dates, a Paytm single payment, bank-SMS debits, and the junk the
 * pre-filter is supposed to reject (cashback promo, OTP).
 *
 * Pure and local: no bridge, no network, nothing persisted. The Settings
 * screen surfaces it; tests/selftest.test.ts pins it in CI.
 */

import { scanSharedText, detectedToItem, type DetectedRecurring } from './scan';
import { capturesToText, type NativeCapture } from './native';

export interface SelfTestCheck {
  name: string;
  passed: boolean;
  detail: string;
}

export interface SelfTestResult {
  passed: boolean;
  checks: SelfTestCheck[];
  /** Human summary line for the toast. */
  summary: string;
}

/** Deterministic "today" so the undated single charge is stable. */
const TODAY = '2026-10-06';

/**
 * Canned captures — the shapes the Kotlin capture head stores. Fixed
 * dates make recurrence detection deterministic.
 */
export const SELF_TEST_CAPTURES: NativeCapture[] = [
  {
    source: 'com.phonepe.app',
    title: 'PhonePe',
    text: 'Paid ₹649.00 to Netflix on 04-08-26',
    ts: 1_785_820_800_000,
  },
  {
    source: 'com.phonepe.app',
    title: 'PhonePe',
    text: 'Paid ₹649.00 to Netflix on 04-09-26',
    ts: 1_788_410_400_000,
  },
  {
    source: 'com.phonepe.app',
    title: 'PhonePe',
    text: 'Paid ₹649.00 to Netflix on 04-10-26',
    ts: 1_791_000_000_000,
  },
  {
    source: 'net.one97.paytm',
    title: 'Paytm',
    text: 'Paid Rs 299 to Hotstar',
    ts: 1_791_086_400_000,
  },
  {
    source: 'sms',
    title: 'HDFC Bank',
    text: 'Rs. 1200.50 debited towards SONYLIV on 12-08-26',
    ts: 1_786_339_200_000,
  },
  {
    source: 'sms',
    title: 'HDFC Bank',
    text: 'Rs. 1200.50 debited towards SONYLIV on 12-09-26',
    ts: 1_788_928_800_000,
  },
  {
    source: 'sms',
    title: 'AD-SWIGGY',
    text: 'Get flat ₹100 cashback on your next order! Order now.',
    ts: 1_791_100_000_000,
  },
  {
    source: 'sms',
    title: 'HDFC Bank',
    text: 'Your OTP is 4821. Do not share it with anyone.',
    ts: 1_791_100_600_000,
  },
];

/** Run the pipeline over the canned set — the detector's proof of life. */
export function runDetectionSelfTest(): SelfTestResult {
  const text = capturesToText(SELF_TEST_CAPTURES);
  const { parse, detected } = scanSharedText(text, TODAY);

  const junkRejected = !parse.charges.some((c) => /cashback|otp/i.test(c.raw));
  const netflix = detected.find((d) => /netflix/i.test(d.merchant));
  const hotstarSingle = parse.charges.find((c) => /hotstar/i.test(c.merchant));
  const draft = netflix ? detectedToItem(netflix, TODAY) : null;

  const checks: SelfTestCheck[] = [
    {
      name: 'Notifications read as payments',
      passed: parse.charges.length >= 6,
      detail: `${parse.charges.length} payment${parse.charges.length === 1 ? '' : 's'} read from ${SELF_TEST_CAPTURES.length} notifications`,
    },
    {
      name: 'Promo and OTP junk rejected',
      passed: junkRejected,
      detail: junkRejected
        ? 'cashback promo and OTP kept out of the ledger'
        : 'junk leaked into the parsed charges',
    },
    {
      name: 'Recurring autopays detected',
      passed: detected.length >= 2,
      detail: `${detected.length} recurring autopay${detected.length === 1 ? '' : 's'} found (Netflix, SonyLIV)`,
    },
    {
      name: 'Netflix caught as a monthly known brand',
      passed: Boolean(
        netflix && netflix.cadence === 'monthly' && netflix.count === 3 && netflix.known
      ),
      detail: netflix
        ? `${netflix.count} charges · ${netflix.cadence} · known brand: ${netflix.known ? 'yes' : 'no'}`
        : 'Netflix not detected',
    },
    {
      name: 'Single payments kept for review',
      passed: Boolean(hotstarSingle && hotstarSingle.amount === 299),
      detail: hotstarSingle
        ? `Hotstar ₹${hotstarSingle.amount} waiting as a one-off card`
        : 'single payment lost',
    },
    {
      name: 'Track-ready item built',
      passed: Boolean(
        draft && draft.costAtStake === 649 && draft.recurrence === 'monthly' && draft.status === 'active'
      ),
      detail: draft
        ? `draft: ${draft.name} · ${draft.recurrence} · ${draft.costAtStake}`
        : 'no draft item produced',
    },
  ];

  const passed = checks.every((c) => c.passed);
  return {
    passed,
    checks,
    summary: passed
      ? `All ${checks.length} checks passed — detection is working on this device.`
      : 'A check failed — the detector is not behaving as designed.',
  };
}
