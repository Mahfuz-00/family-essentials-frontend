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
export const MINOR_UNITS = 100;

/**
 * The one message both amount fields raise, so the recurring form and the
 * ledger form cannot drift apart in what they tell a person.
 */
export const AMOUNT_INPUT_ERROR =
  'Enter the amount in major units, with at most two decimals (for example 12.50).';

/** Grouping/formatting is pinned so the numbers read the same on every machine. */
const LOCALE = 'en-US';

const AMOUNT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;
const CURRENCY_PATTERN = /^[A-Za-z]{3}$/;

/**
 * Integer minor units + a currency code → a display string.
 *
 * `formatMoney(1250, 'USD')` → `'$12.50'`. An unknown or malformed code is not
 * a crash: the code itself becomes the prefix (`'ZZZ 12.50'`), which is honest
 * about what the API sent.
 */
export function formatMoney(minor: number, currency: string): string {
  if (!Number.isSafeInteger(minor)) {
    return '—';
  }

  const negative = minor < 0;
  const absolute = Math.abs(minor);
  const whole = Math.trunc(absolute / MINOR_UNITS);
  const fraction = String(absolute % MINOR_UNITS).padStart(2, '0');
  const prefix = currencyPrefix(currency);

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

/**
 * The currency token for `currency`, taken from Intl so the client never keeps
 * a hand-written symbol table. A code Intl does not recognise formats as the
 * three letters themselves, and is given a space so it does not touch the digits.
 */
function currencyPrefix(currency: string): string {
  const code = currency.trim().toUpperCase();

  if (!CURRENCY_PATTERN.test(code)) {
    return code === '' ? '' : `${code} `;
  }

  const symbol = new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: code,
    currencyDisplay: 'narrowSymbol',
  })
    .formatToParts(0)
    .filter((part) => part.type === 'currency')
    .map((part) => part.value)
    .join('');

  // A letter-only token is a code rather than a symbol ('BDT', 'ZZZ'): space it.
  return /^[A-Za-z]{3}$/.test(symbol) ? `${symbol} ` : symbol;
}
