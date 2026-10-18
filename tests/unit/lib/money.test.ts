import { describe, expect, it } from 'vitest';
import { formatMoney, parseMoneyToMinor } from '@/lib/money';

describe('formatMoney', () => {
  it('renders integer minor units as a currency string', () => {
    expect(formatMoney(1250, 'USD')).toBe('$12.50');
    expect(formatMoney(0, 'USD')).toBe('$0.00');
    expect(formatMoney(5, 'EUR')).toBe('€0.05');
  });

  it('groups thousands without ever rounding a fraction', () => {
    expect(formatMoney(123_456_789, 'GBP')).toBe('£1,234,567.89');
    expect(formatMoney(100, 'USD')).toBe('$1.00');
  });

  it('keeps the sign outside the symbol', () => {
    expect(formatMoney(-1250, 'USD')).toBe('-$12.50');
  });

  it('accepts a lower-case code and names a code it has no symbol for', () => {
    expect(formatMoney(1000, 'usd')).toBe('$10.00');
    expect(formatMoney(1000, 'ZZZ')).toBe('ZZZ 10.00');
  });

  it('refuses to invent a value for something that is not an integer', () => {
    // A float reaching this helper is a bug upstream, not a number to round.
    expect(formatMoney(12.5, 'USD')).toBe('—');
    expect(formatMoney(Number.NaN, 'USD')).toBe('—');
  });
});

describe('parseMoneyToMinor', () => {
  it('turns major units into integer minor units', () => {
    expect(parseMoneyToMinor('12.50')).toBe(1250);
    expect(parseMoneyToMinor('12.5')).toBe(1250);
    expect(parseMoneyToMinor('12')).toBe(1200);
    expect(parseMoneyToMinor('0.05')).toBe(5);
    expect(parseMoneyToMinor(' 7.25 ')).toBe(725);
    expect(parseMoneyToMinor('1000.00')).toBe(100_000);
  });

  it('does not go through a float, so tenths survive', () => {
    // 0.1 * 100 is 10.000000000000002 in binary floating point.
    expect(parseMoneyToMinor('0.1')).toBe(10);
    expect(parseMoneyToMinor('0.29')).toBe(29);
    expect(parseMoneyToMinor('1.13')).toBe(113);
  });

  it('rejects more than two decimals rather than rounding them away', () => {
    expect(parseMoneyToMinor('12.345')).toBeNull();
    expect(parseMoneyToMinor('12.505')).toBeNull();
  });

  it('rejects anything that is not a plain positive amount', () => {
    expect(parseMoneyToMinor('')).toBeNull();
    expect(parseMoneyToMinor('   ')).toBeNull();
    expect(parseMoneyToMinor('abc')).toBeNull();
    expect(parseMoneyToMinor('1.2.3')).toBeNull();
    expect(parseMoneyToMinor('12,50')).toBeNull();
    expect(parseMoneyToMinor('-4')).toBeNull();
    expect(parseMoneyToMinor('$5')).toBeNull();
  });

  it('refuses a value that could not be a safe integer', () => {
    expect(parseMoneyToMinor('999999999999999999')).toBeNull();
  });

  it('round-trips through formatMoney', () => {
    const minor = parseMoneyToMinor('1234.56');

    expect(minor).toBe(123_456);
    expect(formatMoney(minor as number, 'USD')).toBe('$1,234.56');
  });
});
