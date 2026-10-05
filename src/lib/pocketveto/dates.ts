/**
 * PocketVeto — date + urgency math. Pure functions, no DOM, fully testable.
 * All dates are treated as calendar days in the user's local timezone.
 */

import type { ItemView, MoneyDateItem, Recurrence, UrgencyTier } from './types';

export const MS_PER_DAY = 86_400_000;

/** Coerce an optional `from` into a real Date (protects against Array.map index leakage). */
function asDate(from: Date | undefined): Date {
  return from instanceof Date ? from : new Date();
}

/** Today at local midnight as an ISO yyyy-mm-dd string. */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  // Local midnight, so day counts line up with what the user sees.
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Whole calendar days from `from` (default today) until `iso`. Negative when past. */
export function daysUntil(iso: string, from?: Date): number {
  const diff = parseISO(iso).getTime() - parseISO(todayISO(asDate(from))).getTime();
  return Math.round(diff / MS_PER_DAY);
}

export function addDays(iso: string, days: number): string {
  const d = parseISO(iso);
  d.setDate(d.getDate() + days);
  return todayISO(d);
}

export function addMonths(iso: string, months: number): string {
  const d = parseISO(iso);
  const targetDay = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + months);
  // Clamp to end-of-month (Jan 31 + 1 month = Feb 28/29).
  const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(targetDay, lastDay));
  return todayISO(d);
}

export function addYears(iso: string, years: number): string {
  return addMonths(iso, years * 12);
}

function cycleDays(recurrence: Recurrence, customDays?: number): number {
  if (recurrence === 'monthly') return 30;
  if (recurrence === 'annual') return 365;
  if (recurrence === 'custom') return Math.max(1, customDays ?? 1);
  return Infinity;
}

/**
 * Advance a recurring end date until it is on/after today.
 * Returns the advanced date and how many cycles passed (money already spent).
 */
export function advanceRecurrence(
  end: string,
  recurrence: Recurrence,
  customDays: number | undefined,
  from?: Date
): { end: string; cycles: number } {
  const now = asDate(from);
  if (recurrence === 'once') return { end, cycles: 0 };
  let iso = end;
  let cycles = 0;
  // Hard cap protects against corrupted data loops.
  while (daysUntil(iso, now) < 0 && cycles < 500) {
    if (recurrence === 'monthly') iso = addMonths(iso, 1);
    else if (recurrence === 'annual') iso = addYears(iso, 1);
    else iso = addDays(iso, Math.max(1, customDays ?? 1));
    cycles += 1;
  }
  return { end: iso, cycles };
}

export function urgencyFor(daysLeft: number): UrgencyTier {
  if (daysLeft < 0) return 'overdue';
  if (daysLeft <= 2) return 'critical';
  if (daysLeft <= 7) return 'warning';
  if (daysLeft <= 30) return 'headsUp';
  return 'clear';
}

/** Annualized cost of a recurring item; 0 for one-shot kinds. */
export function annualizedCost(item: MoneyDateItem): number {
  if (item.recurrence === 'once') return 0;
  if (item.recurrence === 'monthly') return item.costAtStake * 12;
  if (item.recurrence === 'annual') return item.costAtStake;
  const days = Math.max(1, item.customDays ?? 1);
  return Math.round(item.costAtStake * (365 / days));
}

/**
 * Build the view model. Applies auto-advance for recurring items
 * (returning the *advanced* item plus lapse count) — the caller decides
 * whether to persist it.
 */
export function toView(item: MoneyDateItem, from?: Date): ItemView {
  const now = asDate(from);
  let end = item.end;
  let lapsedCycles = 0;
  if (
    item.status === 'active' &&
    item.autoAdvance &&
    item.recurrence !== 'once'
  ) {
    const adv = advanceRecurrence(item.end, item.recurrence, item.customDays, now);
    end = adv.end;
    lapsedCycles = adv.cycles;
  }
  const daysLeft = daysUntil(end, now);
  return {
    ...item,
    end,
    daysLeft,
    urgency: item.status === 'active' ? urgencyFor(daysLeft) : 'clear',
    lapsedCycles,
    annualized: annualizedCost(item),
  };
}

/** Human countdown: "in 12 days" / "today" / "3 days overdue". */
export function countdownLabel(daysLeft: number): string {
  if (daysLeft > 1) return `in ${daysLeft} days`;
  if (daysLeft === 1) return 'tomorrow';
  if (daysLeft === 0) return 'today';
  if (daysLeft === -1) return '1 day overdue';
  return `${-daysLeft} days overdue`;
}
