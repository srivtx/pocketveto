/**
 * PocketVeto — the money math behind the "$ at risk" ticker.
 * The whole product is loss-aversion-native: we surface what the user
 * is about to LOSE, not what they might save.
 */

import type { ItemView, MoneyDateItem } from './types';

/** Sum of cost-at-stake across active items. The headline number. */
export function atRiskSum(items: ItemView[]): number {
  return items
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + (Number.isFinite(i.costAtStake) ? i.costAtStake : 0), 0);
}

/** Total recorded savings from vetoed/redeemed items. The victory lap number. */
export function savedSum(items: MoneyDateItem[]): number {
  return items.reduce(
    (sum, i) =>
      sum +
      (i.status === 'vetoed' || i.status === 'used' ? i.savedAmount ?? 0 : 0),
    0
  );
}

/** Annualized outflow across recurring active items. */
export function annualRunRate(items: ItemView[]): number {
  return items
    .filter((i) => i.status === 'active')
    .reduce((sum, i) => sum + i.annualized, 0);
}

/** Risk inside the next `days` window — powers the "this week" strip. */
export function atRiskWithin(items: ItemView[], days: number): ItemView[] {
  return items
    .filter((i) => i.status === 'active' && i.daysLeft <= days)
    .sort((a, b) => a.daysLeft - b.daysLeft);
}

/** Count by urgency tier for the header badges. */
export function urgencyCounts(items: ItemView[]): Record<string, number> {
  const counts: Record<string, number> = {
    overdue: 0,
    critical: 0,
    warning: 0,
    headsUp: 0,
    clear: 0,
  };
  for (const i of items) {
    if (i.status === 'active') counts[i.urgency] = (counts[i.urgency] ?? 0) + 1;
  }
  return counts;
}

export function formatMoney(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return `$${rounded.toLocaleString(undefined, {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}
