export type SupportedCurrency = 'CDF' | 'USD' | 'EUR';

export const fmtMoney = (n: number, currency: SupportedCurrency = 'CDF') => {
  const locale = currency === 'USD' ? 'en-US' : 'fr-CD';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    currencyDisplay: 'code',
    minimumFractionDigits: currency === 'CDF' ? 0 : 2,
    maximumFractionDigits: currency === 'CDF' ? 0 : 2,
  }).format(n || 0);
};

export const fmtMoneyShort = (n: number, currency: SupportedCurrency = 'CDF') => {
  const abs = Math.abs(n);
  const suffix = currency;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')} M ${suffix}`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace('.0', '')} k ${suffix}`;
  return fmtMoney(n, currency);
};

export const fmtCDF = (n: number) => fmtMoney(n, 'CDF');
export const fmtCDFShort = (n: number) => fmtMoneyShort(n, 'CDF');
export const fmtEUR = fmtCDF;
export const fmtEURShort = fmtCDFShort;
export const fmtUSD = (n: number) => fmtMoney(n, 'USD');

export const fmtPct = (n: number) => `${(n || 0).toFixed(1).replace('.0', '')} %`;

export const fmtDate = (d: string | Date | null) => {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
};

export const fmtDateShort = (d: string | Date | null) => {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return '-';
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' }).format(date);
};

export const initials = (s: string) =>
  (s || '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');


const WORD_UNITS = ['zero', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf', 'dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize'];
const WORD_TENS: Record<number, string> = {
  20: 'vingt',
  30: 'trente',
  40: 'quarante',
  50: 'cinquante',
  60: 'soixante',
  80: 'quatre-vingt',
};

function numberUnderHundredToWords(n: number): string {
  if (n < 17) return WORD_UNITS[n];
  if (n < 20) return 'dix-' + WORD_UNITS[n - 10];
  if (n < 70) {
    const ten = Math.floor(n / 10) * 10;
    const unit = n % 10;
    if (unit === 0) return WORD_TENS[ten];
    if (unit === 1) return WORD_TENS[ten] + ' et un';
    return WORD_TENS[ten] + '-' + WORD_UNITS[unit];
  }
  if (n < 80) {
    if (n === 71) return 'soixante et onze';
    return 'soixante-' + numberUnderHundredToWords(n - 60);
  }
  if (n === 80) return 'quatre-vingts';
  if (n < 100) return 'quatre-vingt-' + numberUnderHundredToWords(n - 80);
  return '';
}

function numberUnderThousandToWords(n: number): string {
  if (n < 100) return numberUnderHundredToWords(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  const hundredLabel = hundred === 1 ? 'cent' : WORD_UNITS[hundred] + ' cent';
  if (rest === 0) return hundred > 1 ? hundredLabel + 's' : hundredLabel;
  return hundredLabel + ' ' + numberUnderHundredToWords(rest);
}

function integerToFrenchWords(n: number): string {
  if (n === 0) return 'zero';
  const parts: string[] = [];
  const scales: Array<{ value: number; singular: string; plural: string }> = [
    { value: 1_000_000_000, singular: 'milliard', plural: 'milliards' },
    { value: 1_000_000, singular: 'million', plural: 'millions' },
    { value: 1_000, singular: 'mille', plural: 'mille' },
  ];
  let remaining = n;
  for (const scale of scales) {
    if (remaining >= scale.value) {
      const count = Math.floor(remaining / scale.value);
      remaining %= scale.value;
      if (scale.value === 1_000) {
        parts.push(count === 1 ? 'mille' : numberUnderThousandToWords(count) + ' mille');
      } else {
        parts.push((count === 1 ? 'un' : numberUnderThousandToWords(count)) + ' ' + (count > 1 ? scale.plural : scale.singular));
      }
    }
  }
  if (remaining > 0) parts.push(numberUnderThousandToWords(remaining));
  return parts.join(' ').replace(/s+/g, ' ').trim();
}

export const fmtMoneyWords = (n: number, currency: SupportedCurrency = 'CDF') => {
  const amount = Number(n || 0);
  const whole = Math.floor(Math.abs(amount));
  const decimals = Math.round((Math.abs(amount) - whole) * 100);
  const unitLabel = currency === 'USD' ? (whole > 1 ? 'dollars americains' : 'dollar americain') : 'francs congolais';
  const decimalLabel = decimals > 1 ? 'centimes' : 'centime';
  const sign = amount < 0 ? 'moins ' : '';
  const wholeWords = integerToFrenchWords(whole);
  if (decimals === 0) return sign + wholeWords + ' ' + unitLabel;
  return sign + wholeWords + ' ' + unitLabel + ' et ' + integerToFrenchWords(decimals) + ' ' + decimalLabel;
};

