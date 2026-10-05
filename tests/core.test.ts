/**
 * PocketVeto — core math tests (bun test).
 * Run: bun test
 */

import { describe, expect, test } from 'bun:test';
import {
  addDays,
  addMonths,
  advanceRecurrence,
  countdownLabel,
  daysUntil,
  urgencyFor,
  annualizedCost,
  toView,
  todayISO,
} from '@/lib/pocketveto/dates';
import { atRiskSum, savedSum, annualRunRate, atRiskWithin, formatMoney } from '@/lib/pocketveto/risk';
import { payoffPlan } from '@/lib/pocketveto/interest';
import { servicePlaybook, genericPlaybook, cancelEmailDraft } from '@/lib/pocketveto/playbooks';
import { importItems, exportItems } from '@/lib/pocketveto/store';
import type { MoneyDateItem } from '@/lib/pocketveto/types';

const T = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12, 0, 0);
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

function item(over: Partial<MoneyDateItem>): MoneyDateItem {
  return {
    id: over.id ?? 'test-1',
    kind: over.kind ?? 'subscription',
    name: over.name ?? 'Test item',
    costAtStake: over.costAtStake ?? 10,
    start: over.start ?? iso(2026, 1, 1),
    end: over.end ?? iso(2026, 1, 15),
    recurrence: over.recurrence ?? 'once',
    autoAdvance: over.autoAdvance ?? false,
    status: over.status ?? 'active',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...over,
  } as MoneyDateItem;
}

describe('dates', () => {
  test('daysUntil counts whole calendar days', () => {
    expect(daysUntil(iso(2026, 3, 15), T(2026, 3, 10))).toBe(5);
    expect(daysUntil(iso(2026, 3, 10), T(2026, 3, 10))).toBe(0);
    expect(daysUntil(iso(2026, 3, 5), T(2026, 3, 10))).toBe(-5);
  });

  test('daysUntil crosses month and year boundaries', () => {
    expect(daysUntil(iso(2027, 1, 1), T(2026, 12, 31))).toBe(1);
    expect(daysUntil(iso(2026, 2, 1), T(2026, 1, 31))).toBe(1);
  });

  test('addDays rolls over months', () => {
    expect(addDays(iso(2026, 1, 30), 3)).toBe(iso(2026, 2, 2));
  });

  test('addMonths clamps to end of month (Jan 31 + 1mo = Feb 28)', () => {
    expect(addMonths(iso(2026, 1, 31), 1)).toBe(iso(2026, 2, 28));
    expect(addMonths(iso(2024, 1, 31), 1)).toBe(iso(2024, 2, 29)); // leap year
  });

  test('urgency tiers match the alert windows', () => {
    expect(urgencyFor(-1)).toBe('overdue');
    expect(urgencyFor(0)).toBe('critical');
    expect(urgencyFor(2)).toBe('critical');
    expect(urgencyFor(3)).toBe('warning');
    expect(urgencyFor(7)).toBe('warning');
    expect(urgencyFor(8)).toBe('headsUp');
    expect(urgencyFor(30)).toBe('headsUp');
    expect(urgencyFor(31)).toBe('clear');
  });

  test('advanceRecurrence rolls monthly dates forward and counts cycles', () => {
    const adv = advanceRecurrence(iso(2026, 1, 15), 'monthly', undefined, T(2026, 3, 20));
    expect(adv.end).toBe(iso(2026, 4, 15));
    expect(adv.cycles).toBe(3);
  });

  test('advanceRecurrence leaves once items alone', () => {
    const adv = advanceRecurrence(iso(2026, 1, 15), 'once', undefined, T(2027, 1, 1));
    expect(adv.cycles).toBe(0);
  });

  test('toView applies auto-advance and flags lapsed cycles', () => {
    const view = toView(
      item({ end: iso(2026, 1, 10), recurrence: 'monthly', autoAdvance: true }),
      T(2026, 2, 1)
    );
    expect(view.lapsedCycles).toBe(1);
    expect(view.end).toBe(iso(2026, 2, 10));
    expect(view.daysLeft).toBe(9);
    expect(view.annualized).toBe(120); // 10 * 12
  });

  test('regression: toView is Array.map-safe (index must not leak into `from`)', () => {
    // items.map(toView) passes (item, index, array) — toView must ignore the index.
    const views = [item({ id: 'i0' }), item({ id: 'i1' }), item({ id: 'i2' })].map(toView);
    expect(views).toHaveLength(3);
    expect(views.every((v) => Number.isInteger(v.daysLeft))).toBe(true);
    expect(views.every((v) => v.annualized === 0)).toBe(true); // 'once' recurrence
    // explicit date still wins over the map index
    expect(toView(item({ id: 'i9' }), T(2026, 1, 10)).daysLeft).toBe(5);
  });

  test('annualizedCost across recurrences', () => {
    expect(annualizedCost(item({ recurrence: 'once', costAtStake: 99 }))).toBe(0);
    expect(annualizedCost(item({ recurrence: 'monthly', costAtStake: 12 }))).toBe(144);
    expect(annualizedCost(item({ recurrence: 'annual', costAtStake: 65 }))).toBe(65);
    expect(
      annualizedCost(item({ recurrence: 'custom', customDays: 73, costAtStake: 10 }))
    ).toBe(50); // 10 * 365/73
  });

  test('countdownLabel phrasing', () => {
    expect(countdownLabel(0)).toBe('today');
    expect(countdownLabel(1)).toBe('tomorrow');
    expect(countdownLabel(12)).toBe('in 12 days');
    expect(countdownLabel(-3)).toBe('3 days overdue');
  });

  test('todayISO format is zero padded', () => {
    expect(todayISO(T(2026, 3, 7))).toBe('2026-03-07');
  });
});

describe('risk', () => {
  const views = [
    item({ id: 'a', status: 'active', costAtStake: 45 }),
    item({ id: 'b', status: 'active', costAtStake: 65.99 }),
    item({ id: 'c', status: 'vetoed', costAtStake: 30, savedAmount: 30 }),
    item({ id: 'd', status: 'used', costAtStake: 75, savedAmount: 75 }),
  ].map((i) => toView(i, T(2026, 1, 10)));

  test('atRiskSum counts active items only', () => {
    expect(atRiskSum(views)).toBe(110.99);
  });

  test('savedSum counts vetoed and used', () => {
    expect(savedSum(views)).toBe(105);
  });

  test('atRiskWithin filters by window and sorts by urgency', () => {
    const soon = atRiskWithin(views, 30);
    expect(soon.length).toBe(2); // all end 2026-01-15 → 5 days
    expect(soon[0].daysLeft).toBeLessThanOrEqual(soon[1].daysLeft);
  });

  test('annualRunRate sums annualized recurring only', () => {
    const recurring = [
      item({ id: 'm', recurrence: 'monthly', costAtStake: 25 }),
      item({ id: 'y', recurrence: 'annual', costAtStake: 50 }),
      item({ id: 'o', recurrence: 'once', costAtStake: 500 }),
    ].map((i) => toView(i, T(2026, 1, 10)));
    expect(annualRunRate(recurring)).toBe(350);
  });

  test('formatMoney renders plain dollars', () => {
    expect(formatMoney(2450)).toBe('$2,450');
    expect(formatMoney(66.5)).toBe('$66.50');
  });
});

describe('interest — the deferred-interest cliff', () => {
  test('monthly payment clears balance across remaining months', () => {
    const plan = payoffPlan('2026-07-01', 1200, 29.99, 12, undefined, '2026-01-01');
    expect(plan.daysLeft).toBe(181);
    expect(plan.monthsLeft).toBe(6);
    expect(plan.monthlyPayment).toBe(200);
  });

  test('retroactive interest floor uses the original balance and full window', () => {
    const plan = payoffPlan('2026-07-01', 1200, 30, 12, undefined, '2026-01-01');
    expect(plan.estimatedCliffInterest).toBe(360); // 1200 * 0.30 * 1
  });

  test('a slow pace is flagged as cliff-bound', () => {
    const slow = payoffPlan('2026-07-01', 1200, 29.99, 12, 100, '2026-01-01');
    expect(slow.onPaceForCliff).toBe(true); // 100/mo needs 12 months, only 6 left
    const fast = payoffPlan('2026-07-01', 1200, 29.99, 12, 250, '2026-01-01');
    expect(fast.onPaceForCliff).toBe(false);
  });

  test('past the cliff, no more pace warnings', () => {
    const late = payoffPlan('2025-12-01', 1200, 29.99, 12, 100, '2026-01-01');
    expect(late.daysLeft).toBeLessThan(0);
    expect(late.onPaceForCliff).toBe(false);
  });
});

describe('playbooks', () => {
  test('service playbooks match by name fragments', () => {
    expect(servicePlaybook('Netflix Premium')?.title).toContain('Netflix');
    expect(servicePlaybook('My Planet Fitness membership')?.title).toContain('gym');
    expect(servicePlaybook('totally unknown service')).toBeNull();
  });

  test('every kind has a generic playbook', () => {
    const kinds = ['trial', 'subscription', 'membership', 'warranty', 'giftcard', 'promo', 'document', 'domain', 'custom'] as const;
    for (const k of kinds) {
      expect(genericPlaybook(k).steps.length).toBeGreaterThan(0);
    }
  });

  test('cancel email draft includes the service name and date', () => {
    const draft = cancelEmailDraft('Acme Streaming', 'me@example.com', 'ACCT-42', '2026-10-05');
    expect(draft).toContain('Acme Streaming');
    expect(draft).toContain('ACCT-42');
    expect(draft).toContain('2026-10-05');
    expect(draft.toLowerCase()).toContain('confirm in writing');
  });
});

describe('storage — import/export round trip', () => {
  test('export then import is lossless', () => {
    const items = [item({ id: 'x1', name: 'Netflix' }), item({ id: 'x2', kind: 'giftcard', name: 'Card' })];
    const raw = exportItems(items);
    const result = importItems(raw, []);
    expect(result.imported).toBe(2);
    expect(result.items.map((i) => i.id).sort()).toEqual(['x1', 'x2']);
  });

  test('import skips malformed entries and keeps existing ids', () => {
    const current = [item({ id: 'x1', name: 'Existing' })];
    const raw = JSON.stringify([
      { id: 'x1', name: 'Duplicate should not replace', end: '2026-02-02' },
      { id: 'bad', name: 'no end date', end: 'not-a-date' },
      { id: 'x3', name: 'Fresh import', end: '2026-03-03', kind: 'trial', costAtStake: 5, start: '2026-01-01', recurrence: 'once', autoAdvance: false, status: 'active', createdAt: 'x', updatedAt: 'x' },
    ]);
    const result = importItems(raw, current);
    expect(result.imported).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.items.find((i) => i.id === 'x1')?.name).toBe('Existing');
    expect(result.items.find((i) => i.id === 'x3')).toBeDefined();
  });
});
