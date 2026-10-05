/**
 * PocketVeto — deferred-interest (0% APR) cliff math.
 *
 * The trap: 80% of store cards with 0% APR offers use DEFERRED interest.
 * If the balance is not paid IN FULL by the promo end, interest is charged
 * retroactively on the original purchase amount — often from day one.
 * Source: WalletHub 2026 Deferred Interest Study (via CNBC, Dec 2025).
 *
 * The estimate below is deliberately conservative and clearly labeled:
 * simple interest on the original balance across the promo window.
 * Real card agreements use average-daily-balance methods that can land
 * higher; we show a floor, not a ceiling.
 */

export interface PayoffPlan {
  /** Days remaining in the promo window. */
  daysLeft: number;
  /** Months remaining, rounded up — the payment cadence people plan by. */
  monthsLeft: number;
  /** Equal monthly payment that clears the balance exactly at promo end. */
  monthlyPayment: number;
  /** Estimated retroactive interest if the balance survives the cliff. */
  estimatedCliffInterest: number;
  /** True when the current payoff pace (given `plannedMonthly`) misses. */
  onPaceForCliff: boolean;
}

const MS_PER_DAY = 86_400_000;

function daysBetween(fromISO: string, toISO: string): number {
  const p = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  };
  return Math.round((p(toISO) - p(fromISO)) / MS_PER_DAY);
}

export function payoffPlan(
  promoEndISO: string,
  balance: number,
  aprPercent: number,
  promoMonths: number,
  plannedMonthly?: number,
  todayISOStr?: string
): PayoffPlan {
  const today = todayISOStr ?? new Date().toISOString().slice(0, 10);
  const daysLeft = daysBetween(today, promoEndISO);
  const monthsLeft = Math.max(1, Math.ceil(Math.max(daysLeft, 0) / 30.44));
  const safeBalance = Math.max(0, balance);
  const monthlyPayment = safeBalance / monthsLeft;

  // Interest floor: original balance x APR across the promo window.
  const years = Math.max(promoMonths, 1) / 12;
  const estimatedCliffInterest = safeBalance * (aprPercent / 100) * years;

  const pace = plannedMonthly ?? monthlyPayment;
  const payoffMonths = pace > 0 ? safeBalance / pace : Infinity;
  const onPaceForCliff = daysLeft >= 0 && payoffMonths > monthsLeft;

  return {
    daysLeft,
    monthsLeft,
    monthlyPayment: round2(monthlyPayment),
    estimatedCliffInterest: round2(estimatedCliffInterest),
    onPaceForCliff,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
