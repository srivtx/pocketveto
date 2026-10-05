/**
 * PocketVeto — statement-scan tests (bun test).
 * Covers: parsing (CSV/text, sign conventions), merchant normalization,
 * recurring detection, item conversion, and the demo statement.
 */

import { describe, expect, test } from 'bun:test';
import {
  parseStatement,
  detectRecurring,
  scanStatement,
  detectedToItem,
  SAMPLE_STATEMENT,
} from '@/lib/pocketveto/scan';

describe('parseStatement', () => {
  test('parses CSV with header', () => {
    const r = parseStatement('Date,Description,Amount\n2026-08-01,"NETFLIX.COM",-15.49');
    expect(r.transactions).toHaveLength(1);
    expect(r.transactions[0].date).toBe('2026-08-01');
    expect(r.transactions[0].amount).toBe(15.49);
    expect(r.transactions[0].merchant).toContain('NETFLIX');
  });

  test('parses pasted text with US dates and $ amounts', () => {
    const r = parseStatement('08/01/2026 Spotify USA NY $11.99\n08/15/2026 GROCERY MART $55.20');
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0].date).toBe('2026-08-01');
    expect(r.transactions[0].amount).toBe(11.99);
  });

  test('dominant-negative convention filters deposits (paycheck stays out)', () => {
    const r = parseStatement(
      [
        '2026-08-31 NETFLIX -15.49',
        '2026-09-15 NETFLIX -15.49',
        '2026-09-30 NETFLIX -15.49',
        '2026-08-31 PAYROLL DEP 2411.00',
        '2026-09-15 PAYROLL DEP 2411.00',
      ].join('\n')
    );
    expect(r.transactions.every((t) => t.merchant.includes('NETFLIX'))).toBe(true);
    expect(r.transactions.some((t) => t.merchant.includes('PAYROLL'))).toBe(false);
  });

  test('positive-majority (card style) keeps positive charges', () => {
    const r = parseStatement('09/01/2026 HULU 17.99\n09/02/2026 COFFEE 6.50');
    expect(r.transactions).toHaveLength(2);
    expect(r.transactions[0].amount).toBe(17.99);
  });

  test('month-name dates parse', () => {
    const r = parseStatement('Sep 5, 2026  NYTIMES  $25.00');
    expect(r.transactions[0]?.date).toBe('2026-09-05');
  });

  test('skips non-activity lines', () => {
    const r = parseStatement('Account summary\n2026-08-01 HULU 17.99\ntotals may not include pending items');
    expect(r.transactions).toHaveLength(1);
    expect(r.skipped).toBeGreaterThan(0);
  });
});

describe('detectRecurring', () => {
  test('monthly subscription with one price bump', () => {
    const { detected } = scanStatement(
      [
        '2026-04-03 NETFLIX.COM 4085551239 -15.49',
        '2026-05-03 NETFLIX.COM 4085551239 -15.49',
        '2026-06-03 NETFLIX.COM 4085551239 -15.49',
        '2026-07-03 NETFLIX.COM 4085551239 -15.49',
        '2026-08-03 NETFLIX.COM 4085551239 -16.49',
      ].join('\n')
    );
    expect(detected.length).toBeGreaterThanOrEqual(1);
    const nf = detected.find((d) => d.merchant === 'Netflix');
    expect(nf).toBeDefined();
    expect(nf!.cadence).toBe('monthly');
    expect(nf!.count).toBe(5);
    expect(nf!.confidence).toBeGreaterThan(0.8);
    expect(nf!.nextDate).toBe('2026-09-03');
    expect(nf!.playbookTitle).toContain('Netflix');
  });

  test('bank-noise prefixes normalize to the same merchant', () => {
    const { detected } = scanStatement(
      [
        '2026-08-09 POS DEBIT CRUNCH FITNESS 1234 BROOKLYN NY -9.99',
        '2026-09-09 POS DEBIT CRUNCH FITNESS 1234 BROOKLYN NY -9.99',
        '2026-10-09 CRUNCH FITNESS 1234 AUTOPAY -9.99',
      ].join('\n')
    );
    const gym = detected.find((d) => d.key.includes('CRUNCH'));
    expect(gym).toBeDefined();
    expect(gym!.count).toBe(3);
    expect(gym!.kind).toBe('membership');
  });

  test('annual charge detected with two samples', () => {
    const { detected } = scanStatement(
      ['2025-03-22 GO DADDY COM 4805058877 AZ -21.99', '2026-03-22 GO DADDY COM 4805058877 AZ -21.99'].join('\n')
    );
    const gd = detected.find((d) => d.key.includes('GO DADDY'));
    expect(gd).toBeDefined();
    expect(gd!.cadence).toBe('annual');
    expect(gd!.kind).toBe('domain');
    expect(gd!.nextDate).toBe('2027-03-22');
  });

  test('irregular grocery trips are not flagged', () => {
    const { detected } = scanStatement(
      [
        '2026-06-11 WHOLE FOODS MARKET #10142 -86.20',
        '2026-07-02 WHOLE FOODS MARKET #10142 -54.07',
        '2026-08-19 WHOLE FOODS MARKET #10142 -112.44',
      ].join('\n')
    );
    expect(detected.find((d) => d.key.includes('WHOLE'))).toBeUndefined();
  });

  test('same-day duplicate (auth + settle) counts once', () => {
    const txs = parseStatement(
      [
        '2026-08-04 SPOTIFY -11.99',
        '2026-08-04 SPOTIFY -11.99',
        '2026-09-04 SPOTIFY -11.99',
      ].join('\n')
    ).transactions;
    const detected = detectRecurring(txs);
    const sp = detected.find((d) => d.merchant === 'Spotify');
    expect(sp?.count).toBe(2);
  });

  test('two-sample detection requires matching amounts', () => {
    const { detected } = scanStatement(
      ['2026-07-01 AMAZON MKTPLACE -22.10', '2026-08-01 AMAZON MKTPLACE -61.85'].join('\n')
    );
    expect(detected.find((d) => d.key.includes('AMAZON'))).toBeUndefined();
  });

  test('weekly cadence maps to custom recurrence with 7 days', () => {
    const item = detectedToItem({
      key: 'CSA FARM',
      merchant: 'CSA Farm Box',
      cadence: 'weekly',
      medianGapDays: 7,
      amount: 32,
      amountSpread: 0,
      count: 4,
      charges: [
        { date: '2026-08-07', amount: 32, merchant: 'CSA FARM BOX', line: 1 },
        { date: '2026-08-14', amount: 32, merchant: 'CSA FARM BOX', line: 2 },
        { date: '2026-08-21', amount: 32, merchant: 'CSA FARM BOX', line: 3 },
        { date: '2026-08-28', amount: 32, merchant: 'CSA FARM BOX', line: 4 },
      ],
      nextDate: '2026-09-04',
      monthlyCost: 137.4,
      confidence: 0.84,
      kind: 'subscription',
    }, '2026-09-01');
    expect(item.recurrence).toBe('custom');
    expect(item.customDays).toBe(7);
    expect(item.autoAdvance).toBe(true);
    expect(item.end).toBe('2026-09-04');
  });
});

describe('sample statement (the demo path)', () => {
  test('finds Netflix, Spotify, Adobe, Crunch, GoDaddy; not groceries/payroll', () => {
    const { parse, detected } = scanStatement(SAMPLE_STATEMENT);
    expect(parse.transactions.length).toBeGreaterThanOrEqual(15);
    const names = detected.map((d) => d.merchant);
    expect(names).toContain('Netflix');
    expect(names).toContain('Spotify');
    expect(names).toContain('Adobe');
    expect(names).toContain('Gym membership');
    expect(names).toContain('Domain renewal');
    expect(names).not.toContain('DIRECT DEPOSIT ACME PAYROLL');
    const totalMonthly = detected.reduce((s, d) => s + d.monthlyCost, 0);
    expect(totalMonthly).toBeGreaterThan(50);
  });

  test('detected items convert cleanly', () => {
    const { detected } = scanStatement(SAMPLE_STATEMENT);
    const netflix = detected.find((d) => d.merchant === 'Netflix')!;
    const item = detectedToItem(netflix, '2026-09-20');
    expect(item.kind).toBe('subscription');
    expect(item.recurrence).toBe('monthly');
    expect(item.costAtStake).toBe(16.49); // latest amount
    expect(item.name).toBe('Netflix');
    expect(item.notes).toContain('5 charges');
  });
});
