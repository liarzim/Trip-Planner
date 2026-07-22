export interface CurrencyInfo {
  code: string;             // e.g. "USD"
  symbol: string;           // e.g. "$"
  defaultRateToILS: number; // e.g. 3.70
}

export const SUPPORTED_CURRENCIES: CurrencyInfo[] = [
  { code: 'USD', symbol: '$', defaultRateToILS: 3.70 },
  { code: 'ILS', symbol: '₪', defaultRateToILS: 1.00 },
  { code: 'EUR', symbol: '€', defaultRateToILS: 4.05 },
  { code: 'GBP', symbol: '£', defaultRateToILS: 4.70 },
  { code: 'CAD', symbol: '$', defaultRateToILS: 2.70 },
  { code: 'AUD', symbol: '$', defaultRateToILS: 2.45 },
  { code: 'JPY', symbol: '¥', defaultRateToILS: 0.024 },
  { code: 'CHF', symbol: 'Fr', defaultRateToILS: 4.20 },
  { code: 'CNY', symbol: '¥', defaultRateToILS: 0.51 },
  { code: 'NZD', symbol: '$', defaultRateToILS: 2.25 },
  { code: 'THB', symbol: '฿', defaultRateToILS: 0.10 },
  { code: 'INR', symbol: '₹', defaultRateToILS: 0.044 },
  { code: 'AED', symbol: 'د.إ', defaultRateToILS: 1.01 },
  { code: 'SEK', symbol: 'kr', defaultRateToILS: 0.35 },
  { code: 'NOK', symbol: 'kr', defaultRateToILS: 0.34 },
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
