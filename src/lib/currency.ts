/**
 * Currency formatting utilities for Finora
 * Supports ARS, USD, and EUR with locale formatting and privacy masking
 */

export function formatCurrency(
  amount: number,
  currency: string = 'ARS',
  privacyMode: boolean = false
): string {
  if (privacyMode) {
    if (currency === 'EUR') return '€ ••••••';
    if (currency === 'USD') return 'US$ ••••••';
    return '$ ••••••';
  }

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);

  try {
    const locale = currency === 'EUR' ? 'es-ES' : currency === 'USD' ? 'en-US' : 'es-AR';
    const formatted = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(absAmount);

    return isNegative ? `-${formatted}` : formatted;
  } catch {
    // Fallback
    const formatted = absAmount.toLocaleString('es-AR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    const sym = currency === 'EUR' ? '€' : currency === 'USD' ? 'US$' : '$';
    return `${isNegative ? '-' : ''}${sym} ${formatted}`;
  }
}

/**
 * Format compact currency for small badges and charts (e.g. $ 120k)
 */
export function formatCompactCurrency(
  amount: number,
  currency: string = 'ARS',
  privacyMode: boolean = false
): string {
  if (privacyMode) return '••••';

  const sym = currency === 'EUR' ? '€' : currency === 'USD' ? 'US$' : '$';

  if (Math.abs(amount) >= 1_000_000) {
    return `${sym} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(amount) >= 1_000) {
    return `${sym} ${(amount / 1_000).toFixed(1)}k`;
  }
  return formatCurrency(amount, currency, false);
}

/**
 * Parses user text inputs into clean numbers
 */
export function parseCurrencyInput(value: string): number {
  if (!value) return 0;
  // Replace comma with dot if needed and remove non-digit non-dot chars
  const clean = value.replace(/\./g, '').replace(/,/g, '.').replace(/[^\d.-]/g, '');
  const parsed = parseFloat(clean);
  return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100;
}
