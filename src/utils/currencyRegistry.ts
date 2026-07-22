export interface CurrencyInfo {
  code: string;             // e.g. "USD"
  symbol: string;           // e.g. "$"
  rateToILS: number;        // e.g. 3.70
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', rateToILS: 3.70 },
  { code: 'ILS', symbol: '₪', rateToILS: 1.00 },
  { code: 'EUR', symbol: '€', rateToILS: 4.05 },
  { code: 'GBP', symbol: '£', rateToILS: 4.70 },
  { code: 'CAD', symbol: '$', rateToILS: 2.70 },
  { code: 'AUD', symbol: '$', rateToILS: 2.45 },
  { code: 'JPY', symbol: '¥', rateToILS: 0.024 },
  { code: 'CHF', symbol: 'Fr', rateToILS: 4.20 },
  { code: 'CNY', symbol: '¥', rateToILS: 0.51 },
  { code: 'NZD', symbol: '$', rateToILS: 2.25 },
  { code: 'THB', symbol: '฿', rateToILS: 0.10 },
  { code: 'INR', symbol: '₹', rateToILS: 0.044 },
  { code: 'AED', symbol: 'د.إ', rateToILS: 1.01 },
  { code: 'SEK', symbol: 'kr', rateToILS: 0.35 },
  { code: 'NOK', symbol: 'kr', rateToILS: 0.34 },
];

export const getCurrencySymbol = (code: string): string => {
  if (!code) return '$';
  const found = SUPPORTED_CURRENCIES.find(c => c.code.toUpperCase() === code.trim().toUpperCase());
  return found ? found.symbol : code;
};

export const formatCurrencyLabel = (code: string, symbol?: string): string => {
  if (!code) return 'USD ($)';
  const sym = symbol || getCurrencySymbol(code);
  return `${code.toUpperCase()} (${sym})`;
};
