import type { RecurringCadence, RecurringRule } from '@/types';

/**
 * Recurring rules, phrased the way a person would say them.
 *
 * The API sends a cadence plus whichever selector it uses — `weekday` for
 * weekly, `day_of_month` for monthly — so the wording lives here rather than in
 * a screen, and a row can never disagree with the form that created it.
 */

export const CADENCES: { value: RecurringCadence; label: string }[] = [
  { value: 'daily', label: 'Every day' },
  { value: 'weekly', label: 'Every week' },
  { value: 'monthly', label: 'Every month' },
];

/**
 * ISO-8601 weekdays (1 = Monday … 7 = Sunday), which is what the API sends.
 * `weekdayName` also accepts 0 as Sunday, and refuses anything else.
 */
export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
];

const WEEKDAY_NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

/** 1–7 ISO, tolerating 0 as Sunday; null for a value the client cannot read. */
export function weekdayName(weekday: number | null | undefined): string | null {
  if (weekday == null) {
    return null;
  }

  if (weekday === 7 || weekday === 0) {
    return 'Sunday';
  }

  if (weekday >= 1 && weekday <= 6) {
    return WEEKDAY_NAMES[weekday];
  }

  return null;
}

const ORDINAL_SUFFIXES = ['th', 'st', 'nd', 'rd'];

/** 1 → '1st', 2 → '2nd', 3 → '3rd', 11 → '11th', 21 → '21st'. */
export function ordinal(day: number): string {
  const withinHundred = day % 100;
  const suffix =
    withinHundred >= 11 && withinHundred <= 13 ? 'th' : (ORDINAL_SUFFIXES[day % 10] ?? 'th');

  return `${day}${suffix}`;
}

/**
 * "Every day" · "Every Thursday" · "Every month on the 31st".
 *
 * A weekly rule with no weekday says "Every week" and a monthly rule with no
 * day says "Every month" — the client never invents a selector the API did not
 * send, and never renders "undefined".
 */
export function describeCadence(
  cadence: RecurringCadence,
  weekday: number | null,
  dayOfMonth: number | null,
): string {
  switch (cadence) {
    case 'daily':
      return 'Every day';

    case 'weekly': {
      const name = weekdayName(weekday);

      return name ? `Every ${name}` : 'Every week';
    }

    case 'monthly':
      return dayOfMonth != null && dayOfMonth >= 1 && dayOfMonth <= 31
        ? `Every month on the ${ordinal(dayOfMonth)}`
        : 'Every month';

    default:
      return 'Repeats';
  }
}

/** Convenience for a rule object straight off the API. */
export function ruleCadence(rule: Pick<RecurringRule, 'cadence' | 'weekday' | 'day_of_month'>): string {
  return describeCadence(rule.cadence, rule.weekday, rule.day_of_month);
}

/**
 * A date-only string as a local date. `new Date('2026-10-22')` is UTC midnight,
 * which reads as the 21st west of Greenwich, so the parts are parsed by hand.
 */
export function formatDateOnly(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const [year, month, day] = value.slice(0, 10).split('-').map(Number);

  if (!year || !month || !day) {
    return value;
  }

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
