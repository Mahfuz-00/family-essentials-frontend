/**
 * Money, in one place.
 *
 * The API sends every amount as an integer number of minor units
 * (`amount_minor`) alongside a currency code, and never as a decimal. These two
 * functions are the only place that conversion happens, so no screen does
 * arithmetic on money: `formatMoney` renders minor units for a human and
 * `parseMoneyToMinor` turns what a human typed back into minor units.
 *
 * No float appears in either direction — the major/minor split is string and
 * integer work, so 0.1 + 0.2 style drift cannot reach a row or a request body.
 */

/** Minor units in one major unit. Every currency this build serves uses 1/100. */
const MINOR_UNITS = 100;

/**
 * Standard 1-character (or direct symbol) map for household localization.
 */
export const CURRENCY_SYMBOLS: Record<string, string> = {
  BDT: '৳',
  USD: '$',
  EUR: '€',
  GBP: '£',
  INR: '₹',
  JPY: '¥',
  CNY: '¥',
  KRW: '₩',
  PHP: '₱',
  THB: '฿',
  VND: '₫',
  ILS: '₪',
  NGN: '₦',
  TRY: '₺',
  UAH: '₴',
  RUB: '₽',
  CAD: '$',
  AUD: '$',
  SGD: '$',
  NZD: '$',
  CHF: '₣',
  ZAR: 'R',
  SAR: '﷼',
  PKR: '₨',
  BRL: '$',
  MXN: '$',
  AED: 'د.إ',
};

/**
 * Resolves the 1-character currency sign.
 */
export function getCurrencySign(currency?: string): string {
  if (!currency || currency.trim() === '') {
    try {
      const stored = localStorage.getItem('family_essentials_currency');
      if (stored && CURRENCY_SYMBOLS[stored.trim().toUpperCase()]) {
        return CURRENCY_SYMBOLS[stored.trim().toUpperCase()];
      }
    } catch {
      // ignore
    }
    return '$';
  }

  const code = currency.trim().toUpperCase();
  if (CURRENCY_SYMBOLS[code]) {
    return CURRENCY_SYMBOLS[code];
  }

  if (currency.length <= 2 && !/^[A-Za-z]+$/.test(currency)) {
    return currency;
  }

  if (/^[A-Za-z]{3}$/.test(code)) {
    return `${code} `;
  }

  return CURRENCY_SYMBOLS['USD'];
}

/**
 * The one message both amount fields raise, so the recurring form and the
 * ledger form cannot drift apart in what they tell a person.
 */
export const AMOUNT_INPUT_ERROR =
  'Enter the amount in major units, with at most two decimals (for example 12.50).';

/** Grouping/formatting is pinned so the numbers read the same on every machine. */
const LOCALE = 'en-US';

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Integer minor units + a currency code → a display string.
 *
 * `formatMoney(1250, 'BDT')` → `'৳12.50'`.
 * `formatMoney(1250, 'USD')` → `'$12.50'`.
 */
export function formatMoney(minor: number, currency: string = 'USD'): string {
  if (!Number.isSafeInteger(minor)) {
    return '—';
  }

  const negative = minor < 0;
  const absolute = Math.abs(minor);
  const whole = Math.trunc(absolute / MINOR_UNITS);
  const fraction = String(absolute % MINOR_UNITS).padStart(2, '0');
  const prefix = getCurrencySign(currency);

  return `${negative ? '-' : ''}${prefix}${groupDigits(whole)}.${fraction}`;
}

/**
 * What a person typed in major units → integer minor units for the API.
 *
 * Returns `null` rather than a float or a guess. Rejected: an empty field,
 * anything that is not digits with at most two decimals (`'12.345'`, `'12,50'`,
 * `'-4'`, `'1.2.3'`, `'abc'`), and a value too large to be a safe integer.
 */
export function parseMoneyToMinor(input: string): number | null {
  const match = AMOUNT_PATTERN.exec(input.trim());

  if (!match) {
    return null;
  }

  const whole = Number(match[1]);
  // A single decimal digit means tenths, so '12.5' is 1250 minor units.
  const fraction = Number((match[2] ?? '').padEnd(2, '0'));
  const minor = whole * MINOR_UNITS + fraction;

  return Number.isSafeInteger(minor) ? minor : null;
}

/** Thousands separators, without letting Intl see a fractional value. */
function groupDigits(whole: number): string {
  return new Intl.NumberFormat(LOCALE).format(whole);
}
