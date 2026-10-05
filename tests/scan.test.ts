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
  parsePaymentText,
  scanSharedText,
  paymentDraft,
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

  test('known subscription brand: two samples survive a plan-price change', () => {
    // 649 → 799 is a ~21% spread — past the unknown gate, fine for a
    // recognized subscription brand (Netflix plan change).
    const { detected } = scanStatement(
      ['2026-07-02 NETFLIX.COM -649.00', '2026-08-02 NETFLIX.COM -799.00'].join('\n')
    );
    const nf = detected.find((d) => d.merchant === 'Netflix');
    expect(nf).toBeDefined();
    expect(nf!.known).toBe(true);
    expect(nf!.confidence).toBeGreaterThanOrEqual(0.85);
    expect(nf!.amount).toBe(799);
    expect(nf!.cadence).toBe('monthly');
  });

  test('unknown merchant with the same two-sample spread stays out', () => {
    const { detected } = scanStatement(
      ['2026-07-02 LOCAL ROASTERY -649.00', '2026-08-02 LOCAL ROASTERY -799.00'].join('\n')
    );
    expect(detected.find((d) => d.key.includes('LOCAL'))).toBeUndefined();
  });

  test('recognized brands across the statement are flagged known', () => {
    const { detected } = scanStatement(SAMPLE_STATEMENT);
    const netflix = detected.find((d) => d.merchant === 'Netflix');
    expect(netflix?.known).toBe(true);
    // and every detected known-brand entry carries the confidence floor
    for (const d of detected.filter((x) => x.known)) {
      expect(d.confidence).toBeGreaterThanOrEqual(0.85);
    }
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

/* ------------------------------------------------------------------ */
/* Shared payment text (Web Share Target)                              */
/* ------------------------------------------------------------------ */

describe('parsePaymentText — notification formats', () => {
  test('GPay-style notification: amount + payee, date assumed today', () => {
    const r = parsePaymentText('Paid ₹349.00 to Netflix', '2026-10-05');
    expect(r.charges).toHaveLength(1);
    expect(r.charges[0].merchant).toBe('Netflix');
    expect(r.charges[0].amount).toBe(349);
    expect(r.charges[0].date).toBe('2026-10-05');
    expect(r.charges[0].dateAssumed).toBe(true);
    expect(r.assumed).toBe(1);
  });

  test('bank SMS: Rs with decimals, DD-MM-YY date, "towards" payee, bank tail stripped', () => {
    const r = parsePaymentText(
      'Rs.349.00 debited from A/c XX1234 on 01-10-26 towards Netflix India ref 500012345678. -HDFC Bank',
      '2026-10-05'
    );
    expect(r.charges).toHaveLength(1);
    expect(r.charges[0].date).toBe('2026-10-01');
    expect(r.charges[0].dateAssumed).toBe(false);
    expect(r.charges[0].merchant).toBe('Netflix');
    expect(r.charges[0].amount).toBe(349);
  });

  test('UPI VPA payee resolves through the brand map', () => {
    const r = parsePaymentText('₹149.00 paid to sonyliv@okhdfcbank via PhonePe', '2026-10-05');
    expect(r.charges[0].merchant).toBe('SonyLIV');
    expect(r.charges[0].amount).toBe(149);
  });

  test('PhonePe-style with "via" terminator and INR words', () => {
    const r = parsePaymentText('You paid INR 149 to Jio Cinema via PhonePe', '2026-10-05');
    expect(r.charges).toHaveLength(1);
    expect(r.charges[0].merchant).toBe('Jio');
    expect(r.charges[0].amount).toBe(149);
  });

  test('promo and OTP SMS never become charges', () => {
    const r = parsePaymentText(
      [
        'Get flat ₹100 cashback on your next order. Shop now!',
        'Your OTP is 4821. Do not share with anyone.',
        'Paid ₹349.00 to Netflix',
      ].join('\n'),
      '2026-10-05'
    );
    expect(r.charges).toHaveLength(1);
    expect(r.charges[0].merchant).toBe('Netflix');
    expect(r.unparsed).toBeGreaterThanOrEqual(1);
  });

  test('money inside words does not parse (Cars 349 is not Rs 349)', () => {
    const r = parsePaymentText('paid for my Cars 349 subscription this month', '2026-10-05');
    expect(r.charges).toHaveLength(0);
  });
});

describe('scanSharedText — recurrence from SMS history', () => {
  test('three monthly bank SMS lines detect as monthly', () => {
    const sms = [
      'Rs 149.00 debited from A/c XX1234 on 03-08-26 towards Spotify India ref 500012345678. -HDFC Bank',
      'Rs 149.00 debited from A/c XX1234 on 03-09-26 towards Spotify India ref 500012345679. -HDFC Bank',
      'Rs 149.00 debited from A/c XX1234 on 03-10-26 towards Spotify India ref 500012345680. -HDFC Bank',
    ].join('\n');
    const { detected } = scanSharedText(sms, '2026-10-05');
    const sp = detected.find((d) => d.merchant === 'Spotify');
    expect(sp).toBeDefined();
    expect(sp!.cadence).toBe('monthly');
    expect(sp!.nextDate).toBe('2026-11-03');
  });

  test('single just-paid notification produces no false recurrence', () => {
    const { detected, parse } = scanSharedText('Paid ₹349.00 to Netflix', '2026-10-05');
    expect(detected).toHaveLength(0);
    expect(parse.charges).toHaveLength(1);
  });
});

describe('paymentDraft — shared payment to item', () => {
  test('known brand → subscription kind, monthly guess, evidence in notes', () => {
    const r = parsePaymentText('Paid ₹349.00 to Netflix', '2026-10-05');
    const item = paymentDraft(r.charges[0], '2026-10-05');
    expect(item.name).toBe('Netflix');
    expect(item.kind).toBe('subscription');
    expect(item.costAtStake).toBe(349);
    expect(item.recurrence).toBe('monthly');
    expect(item.start).toBe('2026-10-05');
    expect(item.end).toBe('2026-11-04');
    expect(item.notes).toContain('Paid ₹349.00 to Netflix');
  });

  test('unknown payee lands as a once-off draft for the user to finish', () => {
    const r = parsePaymentText('Paid ₹60 to Krish Coffee Roasters', '2026-10-05');
    const item = paymentDraft(r.charges[0], '2026-10-05');
    expect(item.recurrence).toBe('once');
    expect(item.name).toMatch(/Krish/i);
  });
});
