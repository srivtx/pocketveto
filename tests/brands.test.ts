/**
 * Brand registry tests — the logo layer must never disturb parsing.
 */

import { describe, expect, test } from 'bun:test';
import { BRANDS, logoIdFor, logoById } from '../src/lib/pocketveto/brands';
import { scanStatement, SAMPLE_STATEMENT, scanSharedText } from '../src/lib/pocketveto/scan';

describe('the parse catalog is unchanged', () => {
  test('the v1.4.1 parse registry survives verbatim (order, names, kinds)', () => {
    const parse = BRANDS.filter((b) => !b.logoOnly);
    expect(parse.map((b) => b.name)).toEqual([
      'Netflix', 'Spotify', 'Adobe', 'Amazon Prime', 'Hulu', 'Disney+',
      'Max', 'Paramount+', 'Peacock', 'Apple subscriptions', 'iCloud+',
      'YouTube Premium', 'Google One', 'Microsoft 365', 'Xbox Game Pass',
      'PlayStation Plus', 'Nintendo Switch Online', 'Audible', 'Patreon',
      'Canva', 'Notion', 'Dropbox', 'NYT', 'WSJ', 'Gym membership',
      'Domain renewal', 'Disney+ Hotstar', 'Jio', 'SonyLIV', 'ZEE5',
      'Airtel', 'Gaana', 'Prime Video', 'Swiggy One', 'Zomato Gold',
      'cult.fit',
    ]);
    const gym = parse.find((b) => b.name === 'Gym membership')!;
    expect(gym.kind).toBe('membership');
    const domain = parse.find((b) => b.name === 'Domain renewal')!;
    expect(domain.kind).toBe('domain');
  });

  test('statement detection still behaves identically', () => {
    const { detected } = scanStatement(SAMPLE_STATEMENT);
    const names = detected.map((d) => d.merchant);
    expect(names).toContain('Netflix');
    expect(names).toContain('Domain renewal');
    expect(names).toContain('Gym membership');
  });

  test('the godaddy mark is logo-only — parsing never says GoDaddy', () => {
    const gd = BRANDS.find((b) => b.id === 'godaddy')!;
    expect(gd.logoOnly).toBe(true);
    const { detected } = scanStatement(
      [
        '2026-01-10,"GO DADDY COM 4805058877",-21.99',
        '2026-02-10,"GO DADDY COM 4805058877",-21.99',
        '2026-03-10,"GO DADDY COM 4805058877",-21.99',
      ].join('\n')
    );
    expect(detected.map((d) => d.merchant)).toContain('Domain renewal');
  });
});

describe('logo lookup', () => {
  test('brand display names match their logos', () => {
    expect(logoIdFor('Netflix')).toBe('netflix');
    expect(logoIdFor('Disney+ Hotstar')).toBe('hotstar');
    expect(logoIdFor('Spotify')).toBe('spotify');
    expect(logoIdFor('ZEE5')).toBe('zee5');
    expect(logoIdFor('SonyLIV')).toBe('sonyliv');
  });

  test('typed item names match through fragments and aliases', () => {
    expect(logoIdFor('NYT All Access')).toBe('nyt');
    expect(logoIdFor('Apple subscriptions')).toBe('apple');
    expect(logoIdFor('YouTube Premium')).toBe('youtube');
    expect(logoIdFor('GoDaddy domain renewals')).toBe('godaddy');
    expect(logoIdFor('My Netflix plan')).toBe('netflix');
    expect(logoIdFor('JioCinema annual')).toBe('jio');
  });

  test('raw merchant keys sharpen the match for grouped entries', () => {
    // The parser groups registrars under "Domain renewal"; the raw key
    // still names the brand, and the card shows the real mark.
    expect(logoIdFor('Domain renewal', 'GO DADDY')).toBe('godaddy');
  });

  test('unknown merchants get no mark', () => {
    expect(logoIdFor('CSA Farm Box')).toBeNull();
    expect(logoIdFor('Corner bakery')).toBeNull();
    expect(logoIdFor('')).toBeNull();
  });

  test('shared-payment charges carry recognizable brands', () => {
    const { parse } = scanSharedText(
      'Paid ₹349 to Netflix via UPI\nRef no 4021\nPaid ₹299 to Disney+ Hotstar'
    );
    for (const c of parse.charges) {
      expect(logoIdFor(c.merchant, c.key)).not.toBeNull();
    }
  });
});

describe('logo data integrity', () => {
  test('every logo has exactly one mark and a well-formed color', () => {
    expect(() => {
      for (const b of BRANDS) {
        if (!b.logo) continue;
        expect(Boolean(b.logo.path) !== Boolean(b.logo.letter)).toBe(true);
        expect(b.logo.color).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    }).not.toThrow();
  });

  test('logoById resolves and rejects cleanly', () => {
    expect(logoById('netflix')?.path).toBeTruthy();
    expect(logoById('hotstar')?.path).toBeTruthy();
    expect(logoById(null)).toBeUndefined();
    expect(logoById('nope')).toBeUndefined();
  });
});
