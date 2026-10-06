/**
 * PocketVeto — the payments ledger: spend classification + totals.
 *
 * The split the whole app obeys, in one paragraph: every payment the
 * capture engine reads (notifications, shares) lands HERE as a
 * PaymentRecord — the ledger of money that already moved. The
 * classifier then decides autopay vs one-off. Only autopays feed the
 * subscription radar; a one-off payment never becomes a tracked item
 * unless the user promotes it by hand. Totals (today / this month) sum
 * the ledger and split by that same flag, so "total spent" counts
 * everything while the radar stays clean.
 *
 * Pure functions only — storage lives in store.ts, UI state in useItems.
 * Pinned by tests/payments.test.ts and exercised live by selftest.ts.
 */

import { addDays } from './dates';
import {
  brandForKey,
  normalizeMerchantKey,
  paymentDraft,
  type ParsedCharge,
} from './scan';
import { newId } from './store';
import type { MoneyDateItem, PaymentRecord, PaymentSource } from './types';

/* ------------------------------------------------------------------ */
/* Classification                                                       */
/* ------------------------------------------------------------------ */

/**
 * Words that say "this charge repeats" in Indian payment texts —
 * UPI Autopay / e-mandate / NACH / standing instructions, renewals,
 * subscriptions and EMIs.
 */
const AUTOPAY_HINT =
  /\b(auto\s?-?\s?pay|autopay|auto\s?-?\s?debit|autodebit|mandate|e-?mandate|nach|standing\s+instruction|recurring|renew(?:al|ed|s)?|subscription|e-?mandate\s+executed|si-?honoured|emi)\b/i;

/** Words that make a tracked-item match lenient: locations/tails. */
function samePayee(aKey: string, bKey: string): boolean {
  if (!aKey || !bKey) return false;
  if (aKey === bKey) return true;
  // word-boundary containment: "NETFLIX" matches "NETFLIX INDIA"
  const words = (k: string) => k.split(/\s+/).filter(Boolean);
  const aw = words(aKey);
  const bw = words(bKey);
  return aw.some((w) => bw.includes(w)) || bw.some((w) => aw.includes(w));
}

function dayGap(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00`);
  const b = new Date(`${bIso}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return NaN;
  return Math.round(Math.abs(b.getTime() - a.getTime()) / 86_400_000);
}

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** "2026-10-04" → "Oct 4" (locale-free, deterministic in tests). */
export function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const mon = MONTHS_SHORT[Number(m[2]) - 1] ?? '';
  const day = Number(m[3]);
  return `${mon} ${day}`;
}

export interface ClassifyContext {
  /** The existing ledger — powers the repeat-pattern rule and linking. */
  payments: PaymentRecord[];
  /** Tracked radar items — a charge matching one is its renewal. */
  items: MoneyDateItem[];
  /** ISO date the classification runs at. */
  today: string;
}

export interface ChargeClass {
  autopay: boolean;
  reason: string;
  linkedItemId?: string;
}

/**
 * Classify one parsed charge: autopay (feed the radar) or one-off
 * (ledger only). Rules run in priority order, most specific first —
 * and ambiguity falls to one-off, never to the subscription tracker:
 * that bias is the entire value of the split.
 */
export function classifyCharge(c: ParsedCharge, ctx: ClassifyContext): ChargeClass {
  // 1. A charge that matches a tracked recurring item is its renewal.
  const chargeKey = c.key;
  for (const item of ctx.items) {
    if (item.status !== 'active') continue;
    if (item.recurrence === 'once') continue;
    const itemKey = normalizeMerchantKey(item.name);
    const nameKey = normalizeMerchantKey(c.merchant);
    if (
      (samePayee(itemKey, chargeKey) || samePayee(itemKey, nameKey)) &&
      itemKey !== 'UNKNOWN'
    ) {
      return {
        autopay: true,
        reason: `matches ${item.name} on your radar`,
        linkedItemId: item.id,
      };
    }
  }

  // 2. The text itself says it repeats (UPI Autopay / mandate / EMI...).
  if (AUTOPAY_HINT.test(c.raw)) {
    return { autopay: true, reason: 'the notification says autopay / mandate / EMI' };
  }

  // 3. The payee is a recognized subscription brand — the local catalog
  //    is the evidence (no server, no lookup).
  const brand = brandForKey(chargeKey) ?? brandForKey(normalizeMerchantKey(c.merchant));
  if (brand) {
    return { autopay: true, reason: `${brand.name} is a known subscription brand` };
  }

  // 4. Same payee, near-same amount, a steady gap ago — the ledger
  //    itself is the recurrence evidence.
  const prior = ctx.payments.find((p) => {
    if (p.key !== chargeKey) return false;
    const gap = dayGap(p.date, c.date);
    if (!Number.isFinite(gap) || gap < 18 || gap > 400) return false;
    const spread = Math.abs(p.amount - c.amount) / Math.max(p.amount, c.amount, 0.01);
    return spread <= 0.1;
  });
  if (prior) {
    return { autopay: true, reason: `same amount charged before (${shortDate(prior.date)})` };
  }

  // 5. Default: a one-off payment — ledger only, never the radar.
  return { autopay: false, reason: 'paid once — nothing says it repeats' };
}

/* ------------------------------------------------------------------ */
/* Recording (parse → ledger)                                           */
/* ------------------------------------------------------------------ */

export interface RecordOptions {
  source: PaymentSource;
  via: string;
  /** ISO timestamp (tests pin it; runtime stamps now). */
  now?: string;
}

export interface RecordOutcome {
  added: PaymentRecord[];
  /** Charges skipped because the ledger already had them. */
  duplicates: number;
}

/**
 * A charge is a duplicate when the ledger already holds the exact
 * payment (same payee + amount + date), or — only for charges whose
 * date was assumed "today" — the same payee + amount inside the last
 * 3 days: that is a notification re-posting a payment already kept,
 * not a second payment.
 */
function isDuplicate(c: ParsedCharge, ledger: PaymentRecord[]): boolean {
  return ledger.some((p) => {
    if (p.key !== c.key) return false;
    if (Math.abs(p.amount - c.amount) > 0.004) return false;
    if (p.date === c.date) return true;
    if (!c.dateAssumed) return false;
    const gap = dayGap(p.date, c.date);
    return Number.isFinite(gap) && gap <= 3;
  });
}

/**
 * Turn parsed charges into ledger records: classify each, drop
 * duplicates (against the ledger AND within the batch), and link any
 * charge that belongs to a tracked item. Pure — the caller persists.
 */
export function chargesToPayments(
  charges: ParsedCharge[],
  ctx: ClassifyContext,
  opts: RecordOptions
): RecordOutcome {
  const now = opts.now ?? new Date().toISOString();
  const added: PaymentRecord[] = [];
  let duplicates = 0;

  for (const c of charges) {
    if (isDuplicate(c, [...ctx.payments, ...added])) {
      duplicates++;
      continue;
    }
    const cls = classifyCharge(c, { ...ctx, payments: [...ctx.payments, ...added] });
    added.push({
      id: newId(),
      merchant: c.merchant,
      key: c.key,
      amount: Math.round(c.amount * 100) / 100,
      date: c.date,
      createdAt: now,
      source: opts.source,
      via: opts.via,
      autopay: cls.autopay,
      reason: cls.reason,
      linkedItemId: cls.linkedItemId,
      raw: c.raw.trim().slice(0, 160),
    });
  }

  return { added, duplicates };
}

/** Build a ledger record by hand (the manual add dialog). */
export function manualPayment(
  merchant: string,
  amount: number,
  date: string,
  ctx: ClassifyContext,
  now: string = new Date().toISOString()
): PaymentRecord {
  const charge: ParsedCharge = {
    amount,
    merchant,
    key: normalizeMerchantKey(merchant),
    date,
    dateAssumed: false,
    raw: 'Added by you',
  };
  const cls = classifyCharge(charge, ctx);
  return {
    id: newId(),
    merchant: merchant.trim() || 'Payment',
    key: charge.key,
    amount: Math.round(amount * 100) / 100,
    date,
    createdAt: now,
    source: 'manual',
    via: 'Added by you',
    autopay: cls.autopay,
    reason: cls.reason,
    linkedItemId: cls.linkedItemId,
  };
}

/* ------------------------------------------------------------------ */
/* Totals                                                               */
/* ------------------------------------------------------------------ */

export interface SpendWindow {
  total: number;
  autopay: number;
  oneoff: number;
  count: number;
}

export interface SpendSummary {
  today: SpendWindow;
  month: SpendWindow;
  /** "October 2026" — the calendar month the month window means. */
  monthLabel: string;
}

const MONTHS_LONG = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * The "total spent" math: today and this calendar month, each split
 * into autopays vs one-off payments. Sum of both windows is every
 * recorded payment — nothing is double-counted because the ledger
 * dedupes on the way in.
 */
export function spendSummary(payments: PaymentRecord[], today: string): SpendSummary {
  const monthKey = today.slice(0, 7);
  const m = Number(today.slice(5, 7)) - 1;
  const y = Number(today.slice(0, 4));
  const monthLabel = `${MONTHS_LONG[m] ?? ''} ${y}`;

  const todayW: SpendWindow = { total: 0, autopay: 0, oneoff: 0, count: 0 };
  const monthW: SpendWindow = { total: 0, autopay: 0, oneoff: 0, count: 0 };

  for (const p of payments) {
    const amt = Number.isFinite(p.amount) ? p.amount : 0;
    // This calendar month only — the loop is the single source of math,
    // no post-subtraction to get wrong.
    if (p.date.slice(0, 7) === monthKey) {
      monthW.count++;
      monthW.total += amt;
      if (p.autopay) monthW.autopay += amt;
      else monthW.oneoff += amt;
    }
    if (p.date === today) {
      todayW.count++;
      todayW.total += amt;
      if (p.autopay) todayW.autopay += amt;
      else todayW.oneoff += amt;
    }
  }

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    today: {
      total: round(todayW.total),
      autopay: round(todayW.autopay),
      oneoff: round(todayW.oneoff),
      count: todayW.count,
    },
    month: {
      total: round(monthW.total),
      autopay: round(monthW.autopay),
      oneoff: round(monthW.oneoff),
      count: monthW.count,
    },
    monthLabel,
  };
}

/* ------------------------------------------------------------------ */
/* Ledger list shape                                                    */
/* ------------------------------------------------------------------ */

export interface PaymentDay {
  date: string;
  label: string;
  payments: PaymentRecord[];
  total: number;
}

/** Group the ledger by day, newest first — the Payments list shape. */
export function groupPaymentsByDay(payments: PaymentRecord[], today: string): PaymentDay[] {
  const sorted = [...payments].sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.createdAt.localeCompare(a.createdAt);
  });
  const days: PaymentDay[] = [];
  const yesterday = (() => {
    const t = new Date(`${today}T00:00:00`);
    if (Number.isNaN(t.getTime())) return today;
    t.setDate(t.getDate() - 1);
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(
      t.getDate()
    ).padStart(2, '0')}`;
  })();

  for (const p of sorted) {
    const label =
      p.date === today ? 'Today' : p.date === yesterday ? 'Yesterday' : shortDate(p.date);
    const last = days[days.length - 1];
    if (last && last.date === p.date) {
      last.payments.push(p);
      last.total += p.amount;
    } else {
      days.push({ date: p.date, label, payments: [p], total: p.amount });
    }
  }
  return days;
}

/* ------------------------------------------------------------------ */
/* Promote: a one-off payment that turns out to repeat                 */
/* ------------------------------------------------------------------ */

/**
 * Ledger entry → a trackable item draft. Only reached when the user
 * asks for it (the promote button) — the classifier never does this
 * on its own.
 */
export function paymentToItemDraft(
  p: PaymentRecord,
  today: string
): Omit<MoneyDateItem, 'createdAt' | 'updatedAt'> {
  const draft = paymentDraft(
    {
      amount: p.amount,
      merchant: p.merchant,
      key: p.key,
      date: p.date,
      dateAssumed: false,
      raw: p.raw ?? `From the Payments ledger (${p.via})`,
    },
    today
  );
  return {
    ...draft,
    notes: `Promoted from the Payments ledger (${p.via}, ${p.date}). ${
      p.raw ? `Evidence: "${p.raw.slice(0, 100)}".` : ''
    }`,
  };
}
