// Currency utility functions

export const CURRENCY_SYMBOLS: Record<string, string> = {
  'INR': '₹',
  'USD': '$',
  'EUR': '€',
  'GBP': '£',
  'JPY': '¥',
  'CAD': 'C$',
  'AUD': 'A$',
};

export const CURRENCY_FORMATS: Record<string, Intl.NumberFormat> = {
  'INR': new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }),
  'USD': new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  'EUR': new Intl.NumberFormat('en-EU', { style: 'currency', currency: 'EUR' }),
  'GBP': new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }),
  'JPY': new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
  'CAD': new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }),
  'AUD': new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }),
};

export function getCurrencySymbol(currency: string = 'INR'): string {
  return CURRENCY_SYMBOLS[currency] || '₹';
}

export function formatCurrency(amount: number, currency: string = 'INR'): string {
  const formatter = CURRENCY_FORMATS[currency];
  if (formatter) {
    return formatter.format(amount);
  }
  
  // Fallback formatting
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
}

export function getDefaultCurrency(): string {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('company_currency');
    if (saved) return saved;
  }
  return 'INR';
}

export function setDefaultCurrency(currency: string): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem('company_currency', currency);
  }
}
