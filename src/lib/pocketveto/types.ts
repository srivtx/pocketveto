/**
 * PocketVeto — domain types.
 * Everything lives on the user's device (IndexedDB). No accounts, no sync.
 */

export type ItemKind =
  | 'trial' // free trial that converts to paid
  | 'subscription' // recurring paid subscription
  | 'membership' // gym, Costco, AAA, associations
  | 'warranty' // product warranty / protection plan
  | 'giftcard' // stored value: gift cards, store credit, vouchers
  | 'promo' // deferred-interest financing window (0% APR cliff)
  | 'document' // passport, ID, license, visa, certification
  | 'domain' // domain names and certs
  | 'custom'; // anything else with a date and money at stake

export type Recurrence = 'once' | 'monthly' | 'annual' | 'custom';

export type ItemStatus = 'active' | 'vetoed' | 'used' | 'expired';

export interface MoneyDateItem {
  id: string;
  kind: ItemKind;
  name: string;
  /** Money at stake when this date fires or lapses, in whole currency units. */
  costAtStake: number;
  /** ISO date (yyyy-mm-dd) the window started (purchase, signup, issue). */
  start: string;
  /** ISO date (yyyy-mm-dd) the money moves or value lapses. */
  end: string;
  recurrence: Recurrence;
  /** For 'custom' recurrence — number of days between renewals. */
  customDays?: number;
  /** Advance the end date automatically when a renewal passes. */
  autoAdvance: boolean;
  status: ItemStatus;
  /** Recorded $ saved when the user vetoes or redeems. */
  savedAmount?: number;
  /** Free-form notes (order numbers, stores, anything). */
  notes?: string;
  /** Link to manage the thing (billing page, registrar, portal). */
  url?: string;
  /** Kind-specific extras, kept loose on purpose. */
  meta?: Record<string, string | number | undefined>;
  /** ISO timestamps of alerts already sent for the current cycle. */
  notified?: string[];
  createdAt: string;
  updatedAt: string;
}

export type UrgencyTier = 'overdue' | 'critical' | 'warning' | 'headsUp' | 'clear';

export interface ItemView extends MoneyDateItem {
  /** Whole days until `end` (negative when past). */
  daysLeft: number;
  urgency: UrgencyTier;
  /** Renewals that fired while the user was away (recurring, auto-advance on). */
  lapsedCycles: number;
  /** Annualized cost for recurring kinds (0 otherwise). */
  annualized: number;
}

export const KIND_META: Record<
  ItemKind,
  { label: string; plural: string; emoji: string; verb: string; hint: string }
> = {
  trial: {
    label: 'Free trial',
    plural: 'Trials',
    emoji: '⏳',
    verb: 'Cancel before it converts',
    hint: 'The date the trial ends and the charge starts.',
  },
  subscription: {
    label: 'Subscription',
    plural: 'Subscriptions',
    emoji: '🔁',
    verb: 'Renew or veto before it bills',
    hint: 'Netflix-style recurring charge. The annual ones are the killers.',
  },
  membership: {
    label: 'Membership',
    plural: 'Memberships',
    emoji: '🎟️',
    verb: 'Renew or veto before it bills',
    hint: 'Gym, warehouse club, auto club — the quiet annual renewals.',
  },
  warranty: {
    label: 'Warranty',
    plural: 'Warranties',
    emoji: '🛡️',
    verb: 'Claim before it lapses',
    hint: 'Once it lapses, a covered failure is 100% your bill.',
  },
  giftcard: {
    label: 'Gift card',
    plural: 'Gift cards',
    emoji: '🎁',
    verb: 'Redeem before it decays',
    hint: 'Stored value you already own. Unused cards average $175.',
  },
  promo: {
    label: '0% APR window',
    plural: 'APR windows',
    emoji: '⚡',
    verb: 'Pay off before the cliff',
    hint: 'Deferred interest: miss the payoff and interest is charged retroactively on the original balance.',
  },
  document: {
    label: 'Document',
    plural: 'Documents',
    emoji: '🛂',
    verb: 'Renew before it blocks you',
    hint: 'Passports often need 6 months validity to travel — set the alert for the rule, not the printed date.',
  },
  domain: {
    label: 'Domain',
    plural: 'Domains',
    emoji: '🌐',
    verb: 'Renew before squatters watch it drop',
    hint: 'Expiring domains are harvested within hours. The email you lose costs more than the domain.',
  },
  custom: {
    label: 'Custom',
    plural: 'Custom',
    emoji: '📌',
    verb: 'Act before the date',
    hint: 'Anything with a date and money on the line.',
  },
};

/* ------------------------------------------------------------------ */
/* Payments ledger                                                      */
/* ------------------------------------------------------------------ */

/** Where a ledger entry came from. */
export type PaymentSource = 'notification' | 'share' | 'manual';

/**
 * One real payment that already happened — the spend ledger.
 *
 * Architecture (the split the whole app obeys): every payment the
 * capture engine reads lands HERE first. The classifier then decides
 * autopay vs one-off. Only autopays feed the subscription radar — a
 * one-off payment NEVER becomes a MoneyDateItem unless the user
 * promotes it by hand. Totals sum the ledger; the radar stays clean.
 */
export interface PaymentRecord {
  id: string;
  /** Display-ready payee ("Netflix", "Ravi Sharma"). */
  merchant: string;
  /** Normalized grouping key — same space as DetectedRecurring.key. */
  key: string;
  /** Absolute amount in currency units. */
  amount: number;
  /** ISO yyyy-mm-dd of the payment. */
  date: string;
  /** ISO timestamp when the app recorded it. */
  createdAt: string;
  source: PaymentSource;
  /** Friendly origin: "PhonePe", "Google Pay", "Shared text", "Added by you". */
  via: string;
  /** True when the classifier says this is a recurring / autopay charge. */
  autopay: boolean;
  /** One human line — why it was classified that way. */
  reason: string;
  /** Set when this payment belongs to a tracked radar item. */
  linkedItemId?: string;
  /** Evidence: the notification line it came from (trimmed). */
  raw?: string;
}

export const KIND_ORDER: ItemKind[] = [
  'trial',
  'subscription',
  'membership',
  'warranty',
  'giftcard',
  'promo',
  'document',
  'domain',
  'custom',
];
