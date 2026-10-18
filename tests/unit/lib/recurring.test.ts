import { describe, expect, it } from 'vitest';
import { describeCadence, formatDateOnly, ordinal, weekdayName } from '@/lib/recurring';

describe('weekdayName', () => {
  it('reads the ISO weekday the API sends', () => {
    expect(weekdayName(1)).toBe('Monday');
    expect(weekdayName(4)).toBe('Thursday');
    expect(weekdayName(7)).toBe('Sunday');
  });

  it('also tolerates 0 as Sunday, and refuses a value it cannot read', () => {
    expect(weekdayName(0)).toBe('Sunday');
    expect(weekdayName(9)).toBeNull();
    expect(weekdayName(null)).toBeNull();
  });
});

describe('ordinal', () => {
  it('uses the right suffix, including the teens', () => {
    expect(ordinal(1)).toBe('1st');
    expect(ordinal(2)).toBe('2nd');
    expect(ordinal(3)).toBe('3rd');
    expect(ordinal(4)).toBe('4th');
    expect(ordinal(11)).toBe('11th');
    expect(ordinal(12)).toBe('12th');
    expect(ordinal(13)).toBe('13th');
    expect(ordinal(21)).toBe('21st');
    expect(ordinal(31)).toBe('31st');
  });
});

describe('describeCadence', () => {
  it('says what a person would say', () => {
    expect(describeCadence('daily', null, null)).toBe('Every day');
    expect(describeCadence('weekly', 4, null)).toBe('Every Thursday');
    expect(describeCadence('monthly', null, 31)).toBe('Every month on the 31st');
  });

  it('never invents a selector the API did not send', () => {
    expect(describeCadence('weekly', null, null)).toBe('Every week');
    expect(describeCadence('monthly', null, null)).toBe('Every month');
    expect(describeCadence('monthly', null, 0)).toBe('Every month');
    expect(describeCadence('monthly', null, 45)).toBe('Every month');
  });
});

describe('formatDateOnly', () => {
  it('reads a date-only string as a local date, not a UTC instant', () => {
    // Parsed as UTC midnight, 2026-10-22 would read as the 21st west of Greenwich.
    const formatted = formatDateOnly('2026-10-22');

    expect(formatted).toContain('22');
    expect(formatted).toContain('2026');
  });

  it('passes a missing value through as null', () => {
    expect(formatDateOnly(null)).toBeNull();
  });
});
