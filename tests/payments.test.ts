/**
 * PocketVeto — payments ledger tests (bun test).
 *
 * Pins the v1.5.0 split end-to-end: the classifier (autopay vs one-off),
 * the dedupe that keeps totals honest, the today/this-month math, day
 * grouping, and the promote path. If any of these regress, the ledger
 * and the radar silently disagree — this file is the tripwire.
 */

import { describe, expect, test } from 'bun:test';
import {
  classifyCharge,
  chargesToPayments,
  manualPayment,
  spendSummary,
  groupPaymentsByDay,
  shortDate,
  paymentToItemDraft,
  type ClassifyContext,
} from '@/lib/pocketveto/payments';
import { scanSharedText, type ParsedCharge } from '@/lib/pocketveto/scan';
import type { MoneyDateItem, PaymentRecord } from '@/lib/pocketveto/types';
import { exportAll, importData } from '@/lib/pocketveto/store';

const TODAY = '2026-10-06';
const EMPTY: ClassifyContext = { payments: [], items: [], today: TODAY };

const charge = (over: Partial<ParsedCharge>): ParsedCharge => ({
  amount: 149,
  merchant: 'Netflix',
  key: 'NETFLIX',
  date: TODAY,
  dateAssumed: true,
  raw: 'Paid ₹149.00 to Netflix',
  ...over,
});

const pay = (over: Partial<PaymentRecord>): PaymentRecord => ({
  id: `p-${Math.random().toString(36).slice(2, 8)}`,
  merchant: 'X',
  key: 'X',
  amount: 10,
  date: TODAY,
  createdAt: '2026-10-06T09:00:00.000Z',
  source: 'notification',
  via: 'PhonePe',
  autopay: false,
  reason: '',
  ...over,
});

const item = (over: Partial<MoneyDateItem>): MoneyDateItem => ({
  id: over.id ?? 'i-1',
  kind: 'subscription',
  name: 'Netflix',
  costAtStake: 149,
  start: '2026-01-01',
  end: '2026-11-01',
  recurrence: 'monthly',
  autoAdvance: true,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...over,
});

describe('classifier — autopay vs one-off', () => {
  test('known subscription brand → autopay', () => {
    const c = classifyCharge(charge({ raw: 'Paid ₹649.00 to Netflix' }), EMPTY);
    expect(c.autopay).toBe(true);
    expect(c.reason).toContain('known subscription brand');
  });

  test('UPI mandate / autopay / EMI wording → autopay even for unknown payees', () => {
    const mandate = classifyCharge(
      charge({ merchant: 'Gym EMI', key: 'GYM EMI', raw: '₹5,432 EMI debited towards Gym EMI' }),
      EMPTY
    );
    const autopay = classifyCharge(
      charge({ merchant: 'Broadlink', key: 'BROADLINK', raw: 'UPI Autopay ₹799 debited for Broadlink broadband' }),
      EMPTY
    );
    expect(mandate.autopay).toBe(true);
    expect(autopay.autopay).toBe(true);
  });

  test('plain transfer to a person → one-off, never the radar', () => {
    const c = classifyCharge(
      charge({ merchant: 'Ravi Sharma', key: 'RAVI', raw: 'Paid ₹350.00 to Ravi Sharma via UPI' }),
      EMPTY
    );
    expect(c.autopay).toBe(false);
    expect(c.reason).toContain('paid once');
  });

  test('a charge matching a tracked recurring item is its renewal (linked)', () => {
    const c = classifyCharge(
      charge({ raw: 'Paid ₹649.00 to Netflix', date: '2026-10-04', dateAssumed: false }),
      { ...EMPTY, items: [item({ name: 'Netflix', id: 'i-9' })] }
    );
    expect(c.autopay).toBe(true);
    expect(c.linkedItemId).toBe('i-9');
  });

  test('the ledger itself is recurrence evidence: same payee + amount a month apart', () => {
    const history = [pay({ key: 'BLUE GYM', amount: 1200, date: '2026-09-04' })];
    const c = classifyCharge(
      charge({
        merchant: 'Blue Gym',
        key: 'BLUE GYM',
        amount: 1200,
        raw: 'Paid ₹1200 to Blue Gym',
        date: '2026-10-04',
        dateAssumed: false,
      }),
      { ...EMPTY, payments: history }
    );
    expect(c.autopay).toBe(true);
    expect(c.reason).toContain('charged before');
  });

  test('same payee a couple of days ago is NOT evidence of recurrence', () => {
    // Uber is not in the brand catalog — a ride yesterday and a ride today
    // are two one-offs, not a subscription (Swiggy/known brands WOULD be).
    const history = [pay({ key: 'UBER', amount: 240, date: '2026-10-04' })];
    const c = classifyCharge(
      charge({
        merchant: 'Uber',
        key: 'UBER',
        amount: 240,
        raw: 'Paid ₹240 to Uber',
        date: '2026-10-06',
        dateAssumed: true,
      }),
      { ...EMPTY, payments: history }
    );
    expect(c.autopay).toBe(false);
  });
});

describe('recording — parse → ledger', () => {
  test('every parsed charge becomes a ledger record with evidence', () => {
    const { parse } = scanSharedText('Paid ₹649.00 to Netflix on 04-10-26\nPaid ₹350.00 to Ravi Sharma', TODAY);
    const out = chargesToPayments(parse.charges, EMPTY, {
      source: 'notification',
      via: 'Phone capture',
      now: '2026-10-06T09:15:00.000Z',
    });
    expect(out.added).toHaveLength(2);
    expect(out.added.find((p) => /netflix/i.test(p.merchant))?.autopay).toBe(true);
    expect(out.added.find((p) => /ravi/i.test(p.merchant))?.autopay).toBe(false);
    expect(out.added.every((p) => p.raw && p.createdAt)).toBe(true);
  });

  test('exact duplicates are skipped, not re-counted', () => {
    const c = charge({ date: '2026-10-04', dateAssumed: false });
    const first = chargesToPayments([c], EMPTY, { source: 'notification', via: 'x' });
    const second = chargesToPayments(
      [c],
      { ...EMPTY, payments: first.added },
      { source: 'notification', via: 'x' }
    );
    expect(second.added).toHaveLength(0);
    expect(second.duplicates).toBe(1);
  });

  test('a re-posted undated notification (same payee, last 3 days) is one payment', () => {
    const first = chargesToPayments(
      [charge({ merchant: 'Hotstar', key: 'HOTSTAR', amount: 299 })],
      EMPTY,
      { source: 'notification', via: 'Paytm' }
    );
    // same payment, notification re-posted a day later, still undated
    const second = chargesToPayments(
      [charge({ merchant: 'Hotstar', key: 'HOTSTAR', amount: 299, date: '2026-10-07' })],
      { ...EMPTY, payments: first.added },
      { source: 'notification', via: 'Paytm' }
    );
    expect(second.added).toHaveLength(0);
    expect(second.duplicates).toBe(1);
  });

  test('dedupe also works inside one batch', () => {
    const c = charge({ date: '2026-10-04', dateAssumed: false });
    const out = chargesToPayments([c, c], EMPTY, { source: 'share', via: 'Shared text' });
    expect(out.added).toHaveLength(1);
    expect(out.duplicates).toBe(1);
  });

  test('manual payment classifies like a captured one', () => {
    const rec = manualPayment('Netflix', 649, TODAY, EMPTY, '2026-10-06T10:00:00.000Z');
    expect(rec.autopay).toBe(true);
    expect(rec.source).toBe('manual');
    expect(rec.via).toBe('Added by you');
  });
});

describe('totals — today & this month', () => {
  const ledger = [
    pay({ key: 'N', amount: 649, autopay: true, date: '2026-10-06' }),
    pay({ key: 'H', amount: 299, autopay: true, date: '2026-10-04' }),
    pay({ key: 'R', amount: 350, autopay: false, date: '2026-10-06' }),
    pay({ key: 'S', amount: 1200.5, autopay: true, date: '2026-09-12' }),
    pay({ key: 'W', amount: 62.35, autopay: false, date: '2026-09-28' }),
  ];

  test('today sums only today, split by flag', () => {
    const s = spendSummary(ledger, TODAY);
    expect(s.today.total).toBe(999);
    expect(s.today.autopay).toBe(649);
    expect(s.today.oneoff).toBe(350);
    expect(s.today.count).toBe(2);
  });

  test('this month sums the calendar month, split by flag', () => {
    const s = spendSummary(ledger, TODAY);
    expect(s.month.total).toBe(1298);
    expect(s.month.autopay).toBe(948);
    expect(s.month.oneoff).toBe(350);
    expect(s.month.count).toBe(3);
    expect(s.monthLabel).toBe('October 2026');
  });

  test('empty ledger stays zero, never NaN', () => {
    const s = spendSummary([], TODAY);
    expect(s.today.total).toBe(0);
    expect(s.month.total).toBe(0);
    expect(s.month.autopay).toBe(0);
    expect(s.monthLabel).toBe('October 2026');
  });

  test('ledger amounts with junk never poison the sums', () => {
    const s = spendSummary(
      [pay({ amount: Number.NaN, date: TODAY }), pay({ amount: 10, date: TODAY })],
      TODAY
    );
    expect(s.today.total).toBe(10);
  });
});

describe('day grouping + promote', () => {
  test('groups newest first with Today/Yesterday labels', () => {
    const days = groupPaymentsByDay(
      [
        pay({ id: 'a', date: '2026-10-06' }),
        pay({ id: 'b', date: '2026-10-05' }),
        pay({ id: 'c', date: '2026-10-06' }),
        pay({ id: 'd', date: '2026-09-30' }),
      ],
      TODAY
    );
    expect(days.map((d) => d.label)).toEqual(['Today', 'Yesterday', 'Sep 30']);
    expect(days[0].payments).toHaveLength(2);
    expect(days[0].total).toBe(20);
    expect(shortDate('2026-09-30')).toBe('Sep 30');
  });

  test('promote builds a trackable draft with evidence in the notes', () => {
    const p = pay({ merchant: 'Ravi Sharma', key: 'RAVI', amount: 350, date: '2026-10-06', raw: 'Paid ₹350 to Ravi Sharma' });
    const draft = paymentToItemDraft(p, TODAY);
    expect(draft.costAtStake).toBe(350);
    expect(draft.name).toBe('Ravi Sharma');
    expect(draft.notes).toContain('Promoted from the Payments ledger');
  });
});

describe('export / import round trip', () => {
  test('v2 export carries both stores and merges back by id', () => {
    const items = [item({ id: 'i-keep' })];
    const payments = [pay({ id: 'p-keep', key: 'NETFLIX', autopay: true })];
    const raw = exportAll(items, payments);
    const parsed = JSON.parse(raw) as { version: number; payments: PaymentRecord[] };
    expect(parsed.version).toBe(2);
    expect(parsed.payments).toHaveLength(1);

    // merge-import keeps existing ids
    const result = importData(raw, items, payments);
    expect(result.imported).toBe(0);
    expect(result.items).toHaveLength(1);
    expect(result.payments).toHaveLength(1);

    // and imports into an empty store cleanly
    const fresh = importData(raw, [], []);
    expect(fresh.imported).toBe(2);
    expect(fresh.items[0]?.id).toBe('i-keep');
    expect(fresh.payments[0]?.id).toBe('p-keep');
  });

  test('v1 files (items only) still import', () => {
    const v1 = JSON.stringify({
      app: 'pocketveto',
      version: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      items: [item({ id: 'i-old' })],
    });
    const result = importData(v1, [], []);
    expect(result.imported).toBe(1);
    expect(result.items[0]?.id).toBe('i-old');
    expect(result.payments).toHaveLength(0);
  });
});
