/**
 * PocketVeto — action playbooks.
 *
 * Design rule (honesty): steps must be DURABLE, not screenshots of UI
 * that changes quarterly. Every playbook names the official path,
 * what to watch out for (dark patterns), and what proof to keep.
 * Curated service entries cover the most common charges; the generic
 * per-kind playbook is the fallback for everything else.
 */

import type { ItemKind } from './types';

export interface Playbook {
  title: string;
  /** Official place to act — durable vendor URLs only. */
  where: string;
  steps: string[];
  watchOut?: string[];
}

export interface ServicePlaybook extends Playbook {
  /** Lowercase service name fragments this playbook matches. */
  matches: string[];
}

const SERVICES: ServicePlaybook[] = [
  {
    matches: ['netflix'],
    title: 'Cancel Netflix',
    where: 'netflix.com/cancelplan (web) — the only place cancellation works',
    steps: [
      'Open Netflix in a browser (not the TV app) and sign in.',
      'Go to netflix.com/cancelplan directly — the mobile app redirects to the web flow.',
      'Finish the cancellation; keep the on-screen confirmation with the date.',
    ],
    watchOut: [
      'The mobile app funnels you toward plan downgrades — the web page is the real exit.',
      'On paid tiers you keep access until the end of the current billing period.',
    ],
  },
  {
    matches: ['spotify'],
    title: 'Cancel Spotify Premium',
    where: 'spotify.com/account → "Manage plan" → "Change plan" → Cancel Premium',
    steps: [
      'Cancel at spotify.com/account — the account page, not the app settings.',
      'Scroll to Your plan → Change plan → scroll again → Cancel Premium.',
      'Premium stays live until the paid period ends; then it drops to Free.',
    ],
    watchOut: ['If you signed up through a phone carrier or iTunes, you must cancel there instead.'],
  },
  {
    matches: ['adobe'],
    title: 'Cancel Adobe (Creative Cloud)',
    where: 'account.adobe.com → Plans → Manage plan → Cancel plan',
    steps: [
      'Sign in at account.adobe.com and open Plans.',
      'Manage plan → Cancel plan → pick a reason and continue.',
      'Screenshot the confirmation — Adobe disputes "I cancelled" claims often.',
    ],
    watchOut: [
      'Annual plans paid monthly charge an early-termination fee (~50% of remaining months) — cancelling right after a renewal costs least.',
      'Retention offers appear mid-flow; only continue if you actually want them.',
    ],
  },
  {
    matches: ['nytimes', 'new york times'],
    title: 'Cancel NYT subscription',
    where: 'nytimes.com → account → "Cancel subscription" (or chat)',
    steps: [
      'Sign in and open your account page; the cancel option lives under Manage subscription.',
      'The flow offers a pause first; decline unless a pause actually helps.',
      'Save the confirmation email — billing disputes need it.',
    ],
    watchOut: ['NYT keeps news access through the paid period; the charge stops next cycle.'],
  },
  {
    matches: ['prime', 'amazon'],
    title: 'Cancel Amazon Prime',
    where: 'amazon.com → Prime membership → Update, cancel and more → End membership',
    steps: [
      'Open Your Account → Prime Membership → "Update, cancel and more".',
      'Choose End membership. Unused full months of an annual plan are refunded.',
      'If you used benefits this cycle, expect a partial-refund offer instead — accept only if the math favors you.',
    ],
    watchOut: ['The cancel flow is intentionally deep — keep clicking "End membership", not "Remind me later".'],
  },
  {
    matches: ['costco'],
    title: 'Cancel / refund Costco membership',
    where: 'membership desk at any warehouse, or costco.com → Customer Service',
    steps: [
      'Costco refunds the FULL membership fee at any time if dissatisfied — just do not wait past the renewal grace window.',
      'Cancel at the membership desk before the renewal date; auto-renew on a card still standing is the default.',
      'Turn off auto-renew in your online account or remove the stored card.',
    ],
  },
  {
    matches: ['gym', 'planet fitness', 'la fitness', 'crunch', 'equinox'],
    title: 'Cancel a gym membership',
    where: 'Written cancellation per your contract — in person AND in writing',
    steps: [
      'Check the contract for the notice window (30–45 days is common; the renewal you are cancelling may already be committed).',
      'Cancel in writing (letter + email) and get a signed/stamped copy — verbal cancellations vanish.',
      'Cancel the card-on-file authorization in writing to the gym if they keep charging.',
    ],
    watchOut: [
      'Gyms are the worst actors in the renewal economy: "cancellation fees", "processing windows", and continuing charges after quitting are common.',
      'Card networks (Visa/Mastercard rules) let your bank stop recurring gym charges on request — cite that if needed.',
    ],
  },
  {
    matches: ['godaddy', 'namecheap', 'cloudflare', 'google domains', 'dynadot', 'porkbun'],
    title: 'Protect a domain before renewal',
    where: 'Your registrar\'s domain manager — renewal + contact settings',
    steps: [
      'Confirm auto-renew is ON and the payment card is current — expiring by accident is the expensive path.',
      'Verify the registrar email on file is one you actually read: expiry notices go there.',
      'If you are done with the domain, plan the transfer/sale BEFORE expiry — after expiry it enters auction/pendrop within days.',
    ],
    watchOut: [
      'Expiring domains are harvested by watchers within hours; the email address tied to the domain stops working too.',
      'Recovering an expired domain often costs a redemption fee ($80–150+) or an auction fight.',
    ],
  },
  {
    matches: ['apple', 'icloud'],
    title: 'Cancel Apple subscriptions (App Store / iCloud)',
    where: 'Settings → your name → Subscriptions (iOS) / App Store settings (Mac)',
    steps: [
      'iPhone/iPad: Settings → [your name] → Subscriptions → select the sub → Cancel.',
      'Apple TV box: Settings → Users and Accounts → [your account] → Subscriptions.',
      'Cancelling stops future charges only; access continues to period end.',
    ],
    watchOut: ['Subscriptions billed through Apple cannot be cancelled from the vendor app — only from Apple\'s Subscriptions page.'],
  },
  {
    matches: ['google', 'youtube', 'google one'],
    title: 'Cancel Google / YouTube subscriptions',
    where: 'play.google.com/store/account (or youtube.com/paid_memberships)',
    steps: [
      'Google One / Play: play.google.com → profile → Payments & subscriptions → your sub → Cancel.',
      'YouTube Premium: youtube.com/paid_memberships → manage → Cancel membership.',
      'Confirm the cancellation email from Google arrives.',
    ],
  },
  {
    matches: ['microsoft', 'xbox', 'office'],
    title: 'Cancel Microsoft / Xbox subscriptions',
    where: 'account.microsoft.com/services → your subscription → Cancel',
    steps: [
      'Sign in at account.microsoft.com/services.',
      'Pick the subscription → Manage → Cancel subscription.',
      'Xbox Game Pass follows the same path; recurring billing toggle off also works.',
    ],
  },
];

export function servicePlaybook(name: string): ServicePlaybook | null {
  const n = name.trim().toLowerCase();
  if (!n) return null;
  return SERVICES.find((s) => s.matches.some((m) => n.includes(m))) ?? null;
}

const GENERIC: Record<ItemKind, Playbook> = {
  trial: {
    title: 'Veto the trial before it converts',
    where: 'The service\'s own account/billing page',
    steps: [
      'Cancel on the service\'s website — not just delete the app (deleting an app never cancels anything).',
      'Do it ≥24h before the trial end: some services process cancellations at end of day.',
      'Screenshot the confirmation with the date visible.',
      'If a card was required, check the statement for the trial charge anyway — charge-then-refund patterns exist.',
    ],
    watchOut: [
      '"Cancel" screens offer pause/downgrade/reminder options first — the real exit is usually the least prominent button.',
      'Some trials convert EARLY on the last day; cancel one day earlier than you think you need to.',
    ],
  },
  subscription: {
    title: 'Renew or veto before it bills',
    where: 'The service\'s billing page (bookmark it in the item\'s link field)',
    steps: [
      'Decide keep-or-veto at least 3 days before renewal — near the charge date the current cycle may already be committed.',
      'Cancel via the official billing page; if no cancel option exists, email support and require written confirmation.',
      'Annual subs: calendar-check the whole next year of charges when you cancel — one refund window closes fast.',
      'If they keep charging after cancellation: the confirmation screenshot is your dispute evidence at the bank.',
    ],
    watchOut: [
      'Card-network rules let your bank reverse unauthorized recurring charges — "I cancelled on <date>" plus proof wins.',
      'Watch for the "we will keep billing you until the end of the paid period" pattern — that is normal; double charges are not.',
    ],
  },
  membership: {
    title: 'Renew or veto the membership',
    where: 'The member services desk / your account page',
    steps: [
      'Memberships (gyms, clubs, associations) often renew by CONTRACT, not by card — cancelling the card may not stop the invoice; cancel the contract.',
      'Put the cancellation in writing and keep a copy with a date.',
      'Ask for written confirmation of the last billing date.',
    ],
    watchOut: ['Notice windows of 30–45 days are standard: by the renewal date, next year may already be committed.'],
  },
  warranty: {
    title: 'Claim before it lapses',
    where: 'Manufacturer support portal (or the retailer\'s plan administrator)',
    steps: [
      'Before the end date: register the product now if you never did — late registration kills claims.',
      'Find the receipt (order email, bank statement line) and store it with the item notes.',
      'A failure you noticed inside the window but did NOT report is usually not covered after it ends — report in writing before expiry.',
      'Coverage often transfers with the product — a resellable warranty adds resale value.',
    ],
    watchOut: ['Credit cards frequently DOUBLE manufacturer warranties (90 days to +1 year) — check the card benefit guide before paying for repairs.'],
  },
  giftcard: {
    title: 'Redeem before it decays',
    where: 'The retailer — online balance check first',
    steps: [
      'Check the balance now (retailer balance page) — inactive-card fees eat $ value monthly in some US states after 12+ months of inactivity.',
      'Spend or consolidate: use the card for a needed purchase, or convert to the retailer\'s online credit so the balance is visible.',
      'Regifting/transferring? Do it while the card still scans — damaged/magnetic-dead cards need manual balance transfer at the store.',
    ],
    watchOut: ['Cards issued before the 2010 US CARD Act reforms, and store-credit-only vouchers, can carry expiry terms — read the back of the card.'],
  },
  promo: {
    title: 'Pay off before the deferred-interest cliff',
    where: 'Your card\'s statement/promotional-balance page',
    steps: [
      'Find the "promotional balance" line — it is separate from regular purchases on the same card.',
      'Payments usually apply to promo balances LAST (per CARD Act, above-minimum payments go to highest APR first — which is NOT the 0% promo). Pay the promo balance with a dedicated lump sum if possible.',
      'Set every paycheck to knock it down; the cliff charges retroactive interest on the ORIGINAL amount.',
      'One month before the cliff: if you cannot clear it, a balance-transfer card or small loan at a lower rate beats the retroactive hit.',
    ],
    watchOut: ['Missing the full payoff by even $1 can trigger interest on the entire original purchase — the "all or nothing" clause is the trap.'],
  },
  document: {
    title: 'Renew before it blocks you',
    where: 'The issuing government portal (start there — never a third-party "expediter" site)',
    steps: [
      'Passport: many countries require 6 months validity beyond travel dates — set this item\'s end date to "expiry minus 6 months", not the printed date.',
      'Renewal processing routinely runs longer than posted times in surge seasons — apply at the 9-month mark before any trip.',
      'Driver\'s license/ID: check your country\'s grace rules — some require a vision test or in-person visit that needs an appointment booked weeks out.',
    ],
    watchOut: ['Third-party sites charging "fees" for government forms are a known scam pattern — the .gov portal is the only real one.'],
  },
  domain: {
    title: 'Renew (or retire deliberately) before it drops',
    where: 'Your registrar\'s domain manager',
    steps: [
      'Auto-renew ON + current card is the safe default for domains you keep.',
      'Keep the registrar account email readable — ALL expiry warnings go there.',
      'Retiring a domain? Export/take over any email or DNS still pointing at it first — losing mail costs more than the renewal.',
    ],
    watchOut: ['Post-expiry: a short redemption window (fee $80–150), then auction, then drop-catch watchers. Hours matter.'],
  },
  custom: {
    title: 'Act before the date',
    where: 'Wherever this obligation lives',
    steps: [
      'Name the action owner (you) and the exact step to take.',
      'Set the link field to the page where the action happens.',
      'Do it before the date — after it, options shrink to disputes and fees.',
    ],
  },
};

export function genericPlaybook(kind: ItemKind): Playbook {
  return GENERIC[kind];
}

/** Drafts a cancellation email — many services only accept cancellations in writing. */
export function cancelEmailDraft(
  name: string,
  accountEmail: string,
  accountRef: string,
  todayStr: string
): string {
  return [
    `Subject: Cancellation request — ${name} (${accountRef})`,
    '',
    `To whom it may concern,`,
    '',
    `I am requesting cancellation of my ${name} subscription/service effective immediately (or at the end of the current paid period, whichever you apply).`,
    '',
    `Account: ${accountEmail}`,
    `Reference: ${accountRef}`,
    `Date of this request: ${todayStr}`,
    '',
    'Please confirm in writing: (1) that no further charges will occur, and (2) the date through which service remains active.',
    '',
    'If any cancellation fee or retention offer applies, state it plainly in your reply before processing anything.',
    '',
    'Regards,',
  ].join('\n');
}
