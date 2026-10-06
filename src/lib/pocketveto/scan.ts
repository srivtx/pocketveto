/**
 * PocketVeto — statement scan: local autopay detection.
 *
 * Paste (or drop) a bank/card activity export and this finds the recurring
 * charges on it — the subscriptions you forgot you were paying. Everything
 * runs on-device: the text never leaves the browser.
 *
 * Three pure stages:
 *   parseStatement()   text → dated charges (CSV or pasted lines)
 *   detectRecurring()  charges → recurring patterns with confidence
 *   detectedToItem()   pattern → a PocketVeto item ready to track
 */

import { addDays, addMonths, addYears, todayISO } from './dates';
import { BRANDS as BRAND_REGISTRY } from './brands';
import { servicePlaybook } from './playbooks';
import type { ItemKind, MoneyDateItem, Recurrence } from './types';
import { newId } from './store';

/* ------------------------------------------------------------------ */
/* Parsing                                                              */
/* ------------------------------------------------------------------ */

export interface ScannedTransaction {
  /** ISO yyyy-mm-dd */
  date: string;
  /** Absolute charge amount. */
  amount: number;
  /** Raw description as it appeared. */
  merchant: string;
  line: number;
}

export interface ParseResult {
  transactions: ScannedTransaction[];
  /** Lines that looked like activity but had no readable date/amount. */
  skipped: number;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoOf(y: number, m: number, d: number): string | null {
  if (y < 100) y += 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1990 || y > 2099) return null;
  return `${y}-${pad2(m)}-${pad2(d)}`;
}

/** Find a date token in a string: ISO, M/D/YYYY, M/D/YY, "Sep 5, 2026",
 *  and D-M-YY[YY] (the dash convention — Indian bank SMS read day-first). */
function findDate(s: string): { iso: string; rest: string } | null {
  let m = s.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    const iso = isoOf(+m[1], +m[2], +m[3]);
    if (iso) return { iso, rest: s.replace(m[0], ' ') };
  }
  m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/);
  if (m) {
    const iso = isoOf(+m[3], +m[1], +m[2]);
    if (iso) return { iso, rest: s.replace(m[0], ' ') };
  }
  m = s.match(/\b(\d{1,2})-(\d{1,2})-(\d{2,4})\b/);
  if (m) {
    const iso = isoOf(+m[3], +m[2], +m[1]); // day-first (bank SMS convention)
    if (iso) return { iso, rest: s.replace(m[0], ' ') };
  }
  m = s.match(/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo) {
      const iso = isoOf(+m[3], mo, +m[2]);
      if (iso) return { iso, rest: s.replace(m[0], ' ') };
    }
  }
  return null;
}

/** Parse a money token: "$12.99", "-₹349", "Rs. 1,200.50", "INR 99".
 *  Symbol-prefixed amounts may omit decimals (₹349); bare numbers still
 *  require them, so refs and card numbers never read as money. */
const SYMBOL_AMOUNT = /(?:₹|\$|\brs\.?|\binr\b)\s?(\d{1,3}(?:,\d{3})+|\d+)(?:\.(\d{1,2}))?/gi;

function findAmount(s: string): { value: number; rest: string } | null {
  let best: { value: number; rest: string } | null = null;
  let mm: RegExpExecArray | null;
  SYMBOL_AMOUNT.lastIndex = 0;
  while ((mm = SYMBOL_AMOUNT.exec(s))) {
    const value = Number(`${mm[1]}.${mm[2] ?? '00'}`);
    if (Number.isFinite(value) && value !== 0) {
      best = { value, rest: s.replace(mm[0], ' ') };
    }
  }
  if (best) return best;
  const re = /\(?-?\s?\$?\s?-?(\d{1,3}(?:,\d{3})+|\d+)\.(\d{2})\)?/g;
  while ((mm = re.exec(s))) {
    const negative = mm[0].includes('(') || mm[0].includes('-');
    const value = Number(`${mm[1]}.${mm[2]}`);
    if (!Number.isFinite(value) || value === 0) continue;
    // keep the LAST money token on the line (CSV: balance column comes last)
    best = { value: negative ? -value : value, rest: s.replace(mm[0], ' ') };
  }
  return best;
}

function stripQuotes(s: string): string {
  return s.startsWith('"') && s.endsWith('"') && s.length > 1 ? s.slice(1, -1) : s;
}

function looksLikeHeader(line: string): boolean {
  const h = line.toLowerCase();
  return (
    (h.includes('date') || h.includes('posted')) &&
    (h.includes('amount') || h.includes('description') || h.includes('debit'))
  );
}

/**
 * Parse statement text — accepts CSV exports (comma/semicolon/tab, with or
 * without a header) and pasted activity lines. Deposits are separated from
 * charges by the dominant-sign convention of the source.
 */
export function parseStatement(text: string): ParseResult {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim());
  let skipped = 0;
  const parsed: (ScannedTransaction & { negative: boolean })[] = [];

  for (let i = 0; i < rawLines.length; i++) {
    const raw = rawLines[i];
    if (!raw) continue;
    if (parsed.length === 0 && looksLikeHeader(raw)) continue;

    const delim = raw.includes('\t') ? '\t' : raw.includes(';') ? ';' : raw.includes(',') ? ',' : null;
    if (delim) {
      const cells = raw.split(delim).map(stripQuotes).map((c) => c.trim());
      const dateCell = cells.findIndex((c) => findDate(c)?.iso === c.trim() || findDate(c));
      const d = dateCell >= 0 ? findDate(cells[dateCell]) : findDate(raw);
      if (!d) {
        skipped++;
        continue;
      }
      // amount: prefer a dedicated money cell (with decimals), else the line
      const amountCell = cells.map((c) => findAmount(c)).findIndex((a) => a !== null);
      const a = amountCell >= 0 ? findAmount(cells[amountCell]) : findAmount(raw);
      if (!a) {
        skipped++;
        continue;
      }
      const merchant =
        cells
          .filter((_, idx) => idx !== dateCell && idx !== amountCell)
          .join(' ')
          .replace(/\s{2,}/g, ' ')
          .trim() || d.rest.trim() || 'Unknown';
      parsed.push({
        date: d.iso,
        amount: Math.abs(a.value),
        negative: a.value < 0,
        merchant: merchant.replace(/\s{2,}/g, ' ').trim(),
        line: i + 1,
      });
    } else {
      const d = findDate(raw);
      const a = d ? findAmount(d.rest) : null;
      if (!d || !a) {
        if (/[a-z]/i.test(raw)) skipped++;
        continue;
      }
      parsed.push({
        date: d.iso,
        amount: Math.abs(a.value),
        negative: a.value < 0,
        merchant: a.rest.replace(/\s{2,}/g, ' ').trim() || 'Unknown',
        line: i + 1,
      });
    }
  }

  // Dominant-sign convention: banks show charges negative; card statements
  // usually show charges positive. Ignore the minority direction (deposits).
  const negatives = parsed.filter((p) => p.negative).length;
  const charges =
    parsed.length === 0
      ? []
      : negatives / parsed.length >= 0.6
        ? parsed.filter((p) => p.negative)
        : parsed.filter((p) => !p.negative).length / parsed.length >= 0.6
          ? parsed.filter((p) => !p.negative)
          : parsed;

  return {
    transactions: charges.map(({ date, amount, merchant, line }) => ({
      date,
      amount,
      merchant,
      line,
    })),
    skipped,
  };
}

/* ------------------------------------------------------------------ */
/* Merchant normalization                                               */
/* ------------------------------------------------------------------ */

const NOISE_TOKENS = new Set([
  'POS', 'DEP', 'DEBIT', 'CREDIT', 'ACH', 'WEB', 'ONLINE', 'ECOM', 'REC',
  'RECURRING', 'AUTOPAY', 'AUTOMATED', 'PAYMENT', 'PMT', 'PURCHASE',
  'AUTHORIZED', 'AUTH', 'CARD', 'VISA', 'VISA/CARD', 'MASTERCARD', 'MC',
  'XX', 'XXX', 'COM', 'INC', 'LLC', 'SUBSCRIPTION', 'MONTHLY', 'ANNUAL',
  'BILLING', 'BILL', 'TXN', 'ID', 'REF', 'TRACE', 'DATE', 'ON', 'AT', 'TO',
  'FROM', 'THE', 'AND', 'PUR', 'REPEAT', 'REOCCURRING', 'REOCCURING',
  // UPI / notification noise
  'UPI', 'IMPS', 'NEFT', 'VPA', 'A/C', 'AC', 'ACCT', 'PAID', 'DEBITED',
  'CREDITED', 'SPENT', 'INR', 'RS',
]);

/** Known brand fragments + display names live in the brand registry
 *  (brands.ts) — one place for the parser's catalog and the card logos.
 *  Parse behavior is unchanged: same fragments, names, kinds, order. */
const BRANDS = BRAND_REGISTRY.filter((b) => !b.logoOnly);

function normalizeMerchant(raw: string): string {
  let s = raw.toUpperCase();
  // card chunks, ref numbers, dates, times, trailing digits
  s = s.replace(/X{0,4}\d{4,}/g, ' ');
  s = s.replace(/\b\d{1,2}\/\d{1,2}(\d{2,4})?\b/g, ' ');
  s = s.replace(/\b\d{1,2}:\d{2}\b/g, ' ');
  s = s.replace(/#\d+/g, ' ');
  s = s.replace(/\b\d{5,}\b/g, ' ');
  // strip service marks and separators
  s = s.replace(/[*.|]/g, ' ');
  // drop bank-noise words
  s = s
    .split(/\s+/)
    .filter((t) => t && !NOISE_TOKENS.has(t) && !/^\d+$/.test(t))
    .join(' ')
    .trim();
  if (!s) s = raw.toUpperCase().replace(/[^A-Z ]/g, '').trim() || 'UNKNOWN';
  // Keep the first two clean tokens: statements describe the merchant
  // first, then locations/refs — two tokens groups the same merchant across
  // line variants ("CRUNCH FITNESS ... BROOKLYN NY" vs "CRUNCH FITNESS 1234").
  return s.split(/\s+/).slice(0, 2).join(' ').slice(0, 28);
}

function brandFor(key: string): { name: string; kind?: ItemKind } | null {
  for (const b of BRANDS) {
    if (b.fragments.some((f) => key.includes(f))) return { name: b.name, kind: b.kind };
  }
  return null;
}

/** Cleanest raw variant as the display name: shortest with letters. */
function displayMerchant(raws: string[], key: string): string {
  const brand = brandFor(key);
  if (brand) return brand.name;
  const withLetters = raws.filter((r) => /[A-Za-z]/.test(r));
  const pool = withLetters.length ? withLetters : raws;
  return pool.reduce((a, b) => (b.length < a.length ? b : a)).trim().slice(0, 40) || 'Unknown charge';
}

/* ------------------------------------------------------------------ */
/* Recurring detection                                                  */
/* ------------------------------------------------------------------ */

export type Cadence = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'annual';

const CADENCES: { name: Cadence; days: number; tol: number }[] = [
  { name: 'weekly', days: 7, tol: 3 },
  { name: 'biweekly', days: 14, tol: 4 },
  { name: 'monthly', days: 30.44, tol: 6 },
  { name: 'quarterly', days: 91.31, tol: 14 },
  { name: 'annual', days: 365.25, tol: 20 },
];

export interface DetectedRecurring {
  key: string;
  merchant: string;
  cadence: Cadence;
  medianGapDays: number;
  /** Most recent charge amount — what the next one will likely be. */
  amount: number;
  /** Spread of observed amounts (max−min)/median. */
  amountSpread: number;
  charges: ScannedTransaction[];
  count: number;
  /** ISO date the next charge is expected. */
  nextDate: string;
  monthlyCost: number;
  /** 0..1 — how sure the detector is. */
  confidence: number;
  /** True when the merchant is a recognized subscription brand — a
   *  local catalog, no server: the brand itself is the evidence. */
  known?: boolean;
  /** Playbook service title when the merchant is recognized. */
  playbookTitle?: string;
  kind: ItemKind;
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(`${aIso}T00:00:00`);
  const b = new Date(`${bIso}T00:00:00`);
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

function nextDateFor(lastIso: string, cadence: Cadence): string {
  switch (cadence) {
    case 'weekly':
      return addDays(lastIso, 7);
    case 'biweekly':
      return addDays(lastIso, 14);
    case 'monthly':
      return addMonths(lastIso, 1);
    case 'quarterly':
      return addMonths(lastIso, 3);
    case 'annual':
      return addYears(lastIso, 1);
  }
}

function cadenceStepDays(c: Cadence): number {
  return { weekly: 7, biweekly: 14, monthly: 30.44, quarterly: 91.31, annual: 365.25 }[c];
}

/**
 * Group charges by normalized merchant and keep the groups whose dates fit
 * a weekly/biweekly/monthly/quarterly/annual rhythm with consistent-enough
 * amounts. Returns them sorted by confidence, then monthly cost.
 */
export function detectRecurring(txs: ScannedTransaction[]): DetectedRecurring[] {
  // group by merchant key; dedupe same-day repeats (auth + settle)
  const groups = new Map<string, ScannedTransaction[]>();
  for (const t of txs) {
    const key = normalizeMerchant(t.merchant);
    if (key === 'UNKNOWN') continue;
    const list = groups.get(key) ?? [];
    if (list.some((x) => x.date === t.date && x.amount === t.amount)) continue;
    list.push(t);
    groups.set(key, list);
  }

  const found: DetectedRecurring[] = [];
  for (const [key, list] of groups) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.date.localeCompare(b.date));
    // ignore noise micro-charges
    if (sorted.every((t) => t.amount < 0.99)) continue;
    const amounts = sorted.map((t) => t.amount);
    const gaps: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const g = daysBetween(sorted[i - 1].date, sorted[i].date);
      if (g < 2 || g > 400) {
        gaps.length = 0;
        break;
      }
      gaps.push(g);
    }
    if (gaps.length === 0) continue;

    const fit = CADENCES.find((c) => gaps.every((g) => Math.abs(g - c.days) <= c.tol));
    if (!fit) continue;

    const amount = amounts[amounts.length - 1];
    const medAmount = median(amounts);
    const amountSpread = medAmount > 0 ? (Math.max(...amounts) - Math.min(...amounts)) / medAmount : 0;
    const brand = brandFor(key);

    // A recognized subscription brand changes the math: the rhythm fit plus
    // the catalog is strong evidence on its own, so two samples survive a
    // plan-price change (Netflix 649 → 799), and confidence floors at 0.85.
    const twoSampleGate = brand ? 0.4 : 0.15;
    if (sorted.length === 2 && amountSpread > twoSampleGate) continue;

    const countFactor = { 2: 0.5, 3: 0.72, 4: 0.84 }[sorted.length] ?? 0.92;
    const amountFactor = amountSpread <= 0.02 ? 1 : amountSpread <= 0.15 ? 0.92 : amountSpread <= 0.4 ? 0.8 : 0.62;
    const playbook = servicePlaybook(displayMerchant(sorted.map((t) => t.merchant), key));
    const confidence = brand
      ? Math.max(0.85, countFactor * amountFactor)
      : Math.min(0.97, countFactor * amountFactor);

    found.push({
      key,
      merchant: displayMerchant(sorted.map((t) => t.merchant), key),
      cadence: fit.name,
      medianGapDays: Math.round(median(gaps)),
      amount,
      amountSpread,
      charges: sorted,
      count: sorted.length,
      nextDate: nextDateFor(sorted[sorted.length - 1].date, fit.name),
      monthlyCost: (medAmount * 30.44) / cadenceStepDays(fit.name),
      confidence,
      known: Boolean(brand),
      playbookTitle: playbook?.title,
      kind: brand?.kind ?? 'subscription',
    });
  }

  return found.sort(
    (a, b) => b.confidence - a.confidence || b.monthlyCost - a.monthlyCost
  );
}

/** Parse + detect in one call. */
export function scanStatement(text: string): { parse: ParseResult; detected: DetectedRecurring[] } {
  const parse = parseStatement(text);
  return { parse, detected: detectRecurring(parse.transactions) };
}

/** Convert a detected pattern into a trackable item. */
export function detectedToItem(d: DetectedRecurring, today: string = todayISO()): Omit<MoneyDateItem, 'createdAt' | 'updatedAt'> {
  const recurrence: Recurrence =
    d.cadence === 'monthly' ? 'monthly' : d.cadence === 'annual' ? 'annual' : 'custom';
  const customDays =
    d.cadence === 'weekly' ? 7 : d.cadence === 'biweekly' ? 14 : d.cadence === 'quarterly' ? 91 : undefined;
  const last = d.charges[d.charges.length - 1];
  const end = d.nextDate > today ? d.nextDate : nextDateFor(today, d.cadence);
  return {
    id: newId(),
    kind: d.kind,
    name: d.merchant,
    costAtStake: Math.round(d.amount * 100) / 100,
    start: d.charges[0].date,
    end,
    recurrence,
    customDays,
    autoAdvance: true,
    status: 'active',
    notes: `Detected from statement: ${d.count} charges, every ~${d.medianGapDays} days (last: ${last.date}, ${last.merchant.trim().slice(0, 60)}).`,
  };
}

/* ------------------------------------------------------------------ */
/* Shared payment text (Web Share Target)                              */
/*                                                                     */
/* When PocketVeto is installed, Android's share sheet can send it     */
/* text from ANY app: a GPay/PhonePe notification, a bank SMS, an      */
/* emailed receipt. This section parses that text — on-device, same    */
/* as statements. The OS keeps web apps out of notifications/SMS       */
/* directly (that boundary is a feature); the share sheet is the       */
/* user-driven bridge that needs no permissions at all.                */
/* ------------------------------------------------------------------ */

export interface ParsedCharge {
  /** Absolute payment amount. */
  amount: number;
  /** Display-ready payee name. */
  merchant: string;
  /** Normalized grouping key (same space as DetectedRecurring.key). */
  key: string;
  /** ISO yyyy-mm-dd — `today` when the line carried no date. */
  date: string;
  /** True when the date was assumed (a just-now notification). */
  dateAssumed: boolean;
  /** The original line, for evidence in the item notes. */
  raw: string;
}

export interface PaymentParseResult {
  charges: ParsedCharge[];
  /** Lines that looked like payment activity but read neither date nor amount. */
  unparsed: number;
  /** How many charges carry an assumed date. */
  assumed: number;
}

/** Payee prepositions, most specific first ("towards" is bank-SMS for payee). */
const PAYEE_PREPOSITIONS = ['towards', 'to', 'for', 'at', 'by', 'from'] as const;

const BANK_TAILS =
  /[\s-]*(?:hdfc|icici|icicibank|sbi|axis|kotak|yes\s?bank|idfc|idfc\s?first|pnb|bob|bank\s+of\s+(?:baroda|india)|indusind|federal|canara|union\s+bank|central\s+bank|paytm\s+payments\s+bank|phonepe|gpay|google\s+pay|amazon\s+pay|paytm|bhim)\s*(?:bank)?\b.*$/i;

/** Extract the payee from a notification body (date + amount removed). */
function extractPayee(rest: string): string | null {
  for (const prep of PAYEE_PREPOSITIONS) {
    const re = new RegExp(`\\b${prep}\\s+([A-Za-z][A-Za-z0-9 &.'@_-]{1,40}?)(?=\\s+(?:via|using|through|on|ref|no\\.?|dated?)\\b|\\s*[-–|,.:;]|\\s*$|,)`, 'i');
    const m = rest.match(re);
    if (m?.[1]) {
      let name = m[1].trim();
      name = name.replace(BANK_TAILS, '').trim();
      // VPA-style payees: netflix@ybl → netflix
      if (name.includes('@')) name = name.split('@')[0] ?? name;
      if (name.length >= 2) return name;
    }
  }
  return null;
}

function prettyPayee(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => (w.length > 3 ? w[0]!.toUpperCase() + w.slice(1).toLowerCase() : w.toUpperCase()))
    .join(' ')
    .slice(0, 40);
}

/** A line only counts as a payment when it says one of these — promo
 *  SMS ("Get flat ₹100 cashback") and OTP texts never become charges. */
const CHARGE_VERB = /\b(paid|pay|debited|spent|charged|purchase[d]?|billed|sent|bought)\b/i;

/**
 * Parse payment text — notification bodies, bank SMS, receipt lines.
 * Falls back to "today" for lines with an amount but no date (the shared
 * notification of a payment that just happened). Pure and local.
 */
export function parsePaymentText(text: string, today: string = todayISO()): PaymentParseResult {
  const rawLines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const charges: ParsedCharge[] = [];
  let unparsed = 0;
  let assumed = 0;

  for (const raw of rawLines) {
    if (!CHARGE_VERB.test(raw)) {
      // no payment verb → promo SMS, OTP, marketing — not a charge
      if (/₹|rs\.?\s?\d|inr\s?\d|\$\s?\d/i.test(raw)) unparsed++;
      continue;
    }
    const dateHit = findDate(raw);
    const amountHit = findAmount(dateHit ? dateHit.rest : raw);
    if (!amountHit) {
      unparsed++;
      continue;
    }
    const rest = amountHit.rest;
    const dateAssumed = !dateHit;
    const payee = extractPayee(rest) ?? rest.replace(/\s{2,}/g, ' ').trim();
    const key = normalizeMerchant(payee);
    if (key === 'UNKNOWN') {
      unparsed++;
      continue;
    }
    const brand = brandFor(key);
    if (dateAssumed) assumed++;
    charges.push({
      amount: Math.abs(amountHit.value),
      merchant: brand?.name ?? prettyPayee(payee),
      key,
      date: dateHit ? dateHit.iso : today,
      dateAssumed,
      raw,
    });
  }

  return { charges, unparsed, assumed };
}

/** Parse shared text and run recurrence detection over the real-dated charges. */
export function scanSharedText(text: string, today: string = todayISO()) {
  const parse = parsePaymentText(text, today);
  const dated: ScannedTransaction[] = parse.charges
    .filter((c) => !c.dateAssumed)
    .map((c) => ({ date: c.date, amount: c.amount, merchant: c.merchant, line: 0 }));
  return { parse, detected: detectRecurring(dated) };
}

/** One shared payment → a draft item, ready for the add dialog. */
export function paymentDraft(c: ParsedCharge, today: string = todayISO()): Omit<MoneyDateItem, 'createdAt' | 'updatedAt'> {
  const brand = brandFor(c.key);
  return {
    id: newId(),
    kind: brand?.kind ?? 'subscription',
    name: c.merchant,
    costAtStake: Math.round(c.amount * 100) / 100,
    start: c.date,
    end: addDays(today, 30),
    recurrence: brand ? 'monthly' : 'once',
    customDays: undefined,
    autoAdvance: true,
    status: 'active',
    notes: `From a shared payment${c.dateAssumed ? ' notification' : ` dated ${c.date}`}: "${c.raw.trim().slice(0, 120)}"`,
  };
}

/* ------------------------------------------------------------------ */
/* Demo statement (sample button + tests)                               */
/* ------------------------------------------------------------------ */

export const SAMPLE_STATEMENT = [
  'Date,Description,Amount',
  '2026-04-03,"NETFLIX.COM 4085551239",-15.49',
  '2026-05-03,"NETFLIX.COM 4085551239",-15.49',
  '2026-06-03,"NETFLIX.COM 4085551239",-15.49',
  '2026-07-03,"NETFLIX.COM 4085551239",-15.49',
  '2026-08-03,"NETFLIX.COM 4085551239",-16.49',
  '2026-08-04,"SPOTIFY USA  NY NYPAY",-11.99',
  '2026-09-04,"SPOTIFY USA  NY NYPAY",-11.99',
  '2026-08-09,"POS DEBIT CRUNCH FITNESS 1234 NEW YORK NY",-9.99',
  '2026-09-09,"POS DEBIT CRUNCH FITNESS 1234 NEW YORK NY",-9.99',
  '2026-05-17,"ADOBE 8013698600 ADOBE.COM",-22.99',
  '2026-06-17,"ADOBE 8013698600 ADOBE.COM",-22.99',
  '2026-07-17,"ADOBE 8013698600 ADOBE.COM",-22.99',
  '2026-08-17,"ADOBE 8013698600 ADOBE.COM",-22.99',
  '2026-02-05,"AUDIBLE 4023444000 AUDIOBOOKS",-14.95',
  '2026-08-05,"AUDIBLE 4023444000 AUDIOBOOKS",-14.95',
  '2025-03-22,"GO DADDY COM 4805058877 AZ DOMAIN RENEWAL",-21.99',
  '2026-03-22,"GO DADDY COM 4805058877 AZ DOMAIN RENEWAL",-21.99',
  '2026-06-11,"WHOLE FOODS MARKET #10142",-86.20',
  '2026-07-02,"WHOLE FOODS MARKET #10142",-54.07',
  '2026-08-19,"WHOLE FOODS MARKET #10142",-112.44',
  '2026-08-05,"SHELL OIL 57473302 FUEL",-43.18',
  '2026-08-28,"SHELL OIL 57473302 FUEL",-48.55',
  '2026-08-31,"DIRECT DEPOSIT ACME PAYROLL",2411.00',
  '2026-09-15,"DIRECT DEPOSIT ACME PAYROLL",2411.00',
].join('\n');
