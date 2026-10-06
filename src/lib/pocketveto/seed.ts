/**
 * PocketVeto — sample data (opt-in, one click).
 * Dates are generated relative to today so the radar always demos well.
 */

import type { MoneyDateItem, PaymentRecord } from './types';
import { addDays, addMonths, todayISO } from './dates';
import { newId } from './store';

function item(partial: Omit<MoneyDateItem, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'autoAdvance'> & Partial<MoneyDateItem>): MoneyDateItem {
  const now = new Date().toISOString();
  return {
    status: 'active',
    autoAdvance: true,
    ...partial,
    id: newId(),
    createdAt: now,
    updatedAt: now,
  } as MoneyDateItem;
}

export function sampleItems(): MoneyDateItem[] {
  const t = todayISO();
  return [
    item({
      kind: 'trial',
      name: 'Adobe Creative Cloud (7-day trial)',
      costAtStake: 65.99,
      start: addDays(t, -10),
      end: addDays(t, 1),
      recurrence: 'once',
      notes: 'All-apps plan. Cancels only at account.adobe.com — screenshot the confirmation.',
      url: 'https://account.adobe.com',
    }),
    item({
      kind: 'promo',
      name: 'Furniture store card — 0% for 12 months',
      costAtStake: 1200,
      start: addMonths(t, -5),
      end: addMonths(t, 7),
      recurrence: 'once',
      meta: { balance: 1200, apr: 29.99, promoMonths: 12 },
      notes: 'Deferred interest: 29.99% APR hits the original $1,200 retroactively if not paid in full.',
    }),
    item({
      kind: 'subscription',
      name: 'NYT All Access',
      costAtStake: 25,
      start: addMonths(t, -14),
      end: addDays(t, 3),
      recurrence: 'monthly',
    }),
    item({
      kind: 'warranty',
      name: 'Dishwasher extended warranty',
      costAtStake: 899,
      start: addMonths(t, -34),
      end: addMonths(t, 1),
      recurrence: 'once',
      notes: 'Receipt in email from Best Buy. Card may double the manufacturer warranty — check before paying repairs.',
    }),
    item({
      kind: 'giftcard',
      name: 'Amazon gift card (from Grandma)',
      costAtStake: 75,
      start: addMonths(t, -20),
      end: addMonths(t, 4),
      recurrence: 'once',
      notes: 'Balance check: amazon.com/gc-balance',
    }),
    item({
      kind: 'document',
      name: 'Passport',
      costAtStake: 165,
      start: addMonths(t, -120),
      end: addMonths(t, 9),
      recurrence: 'once',
      meta: { rule: 'sixMonthRule' },
      notes: 'Alert set for expiry minus 6 months (the real travel deadline), not the printed date.',
    }),
    item({
      kind: 'membership',
      name: 'Costco Gold Star',
      costAtStake: 65,
      start: addMonths(t, -11),
      end: addMonths(t, 1),
      recurrence: 'annual',
    }),
    item({
      kind: 'domain',
      name: 'example-portfolio.com',
      costAtStake: 14,
      start: addMonths(t, -11),
      end: addDays(t, 18),
      recurrence: 'annual',
      notes: 'Email forwarding runs through this domain — losing it loses the mail too.',
    }),
  ];
}

function payment(
  partial: Omit<PaymentRecord, 'id' | 'createdAt' | 'source'> &
    Partial<Pick<PaymentRecord, 'source'>>
): PaymentRecord {
  return {
    source: 'notification',
    ...partial,
    id: newId(),
    createdAt: `${partial.date}T10:30:00.000Z`,
  } as PaymentRecord;
}

/**
 * A demo ledger for the Payments tab and the totals: recurring brand
 * charges (linked to tracked items on load — see linkPaymentsToItem),
 * day-to-day one-offs, and payments from earlier in the month so the
 * Today / This-month toggle shows real differences.
 */
export function samplePayments(): PaymentRecord[] {
  const t = todayISO();
  return [
    payment({
      merchant: 'NYT All Access',
      key: 'NYT ALL',
      amount: 25,
      date: addDays(t, -28),
      via: 'PhonePe',
      autopay: true,
      reason: 'NYT is a known subscription brand',
      raw: 'Paid $25.00 to NYT on the NYT All Access plan',
    }),
    payment({
      merchant: 'NYT All Access',
      key: 'NYT ALL',
      amount: 25,
      date: t,
      via: 'PhonePe',
      autopay: true,
      reason: 'matches NYT All Access on your radar',
      raw: 'Paid $25.00 to NYT — automatic renewal',
    }),
    payment({
      merchant: 'Spotify',
      key: 'SPOTIFY',
      amount: 11.99,
      date: addDays(t, -12),
      via: 'Google Pay',
      autopay: true,
      reason: 'Spotify is a known subscription brand',
      raw: 'Paid $11.99 to Spotify — monthly plan',
    }),
    payment({
      merchant: 'Swiggy',
      key: 'SWIGGY',
      amount: 9.4,
      date: addDays(t, -2),
      via: 'PhonePe',
      autopay: false,
      reason: 'paid once — nothing says it repeats',
      raw: 'Paid $9.40 to Swiggy on lunch order',
    }),
    payment({
      merchant: 'Whole Foods Market',
      key: 'WHOLE FOODS',
      amount: 62.35,
      date: addDays(t, -6),
      via: 'Added by you',
      source: 'manual',
      autopay: false,
      reason: 'paid once — nothing says it repeats',
      raw: 'Weekly groceries run',
    }),
    payment({
      merchant: 'Ravi Sharma',
      key: 'RAVI',
      amount: 40,
      date: t,
      via: 'PhonePe',
      autopay: false,
      reason: 'paid once — nothing says it repeats',
      raw: 'Paid $40.00 to Ravi Sharma via UPI',
    }),
  ];
}
