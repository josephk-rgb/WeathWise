export const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar' },
  EUR: { symbol: '€', name: 'Euro' },
  GBP: { symbol: '£', name: 'British Pound' },
  JPY: { symbol: '¥', name: 'Japanese Yen' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { symbol: 'A$', name: 'Australian Dollar' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc' },
  CNY: { symbol: '¥', name: 'Chinese Yuan' },
  INR: { symbol: '₹', name: 'Indian Rupee' },
  KES: { symbol: 'KSh', name: 'Kenyan Shilling' },
  ZAR: { symbol: 'R', name: 'South African Rand' },
  NGN: { symbol: '₦', name: 'Nigerian Naira' },
  EGP: { symbol: 'E£', name: 'Egyptian Pound' },
  BRL: { symbol: 'R$', name: 'Brazilian Real' },
  MXN: { symbol: '$', name: 'Mexican Peso' },
  RUB: { symbol: '₽', name: 'Russian Ruble' },
  KRW: { symbol: '₩', name: 'South Korean Won' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar' },
  SEK: { symbol: 'kr', name: 'Swedish Krona' },
  NOK: { symbol: 'kr', name: 'Norwegian Krone' },
  DKK: { symbol: 'kr', name: 'Danish Krone' },
  PLN: { symbol: 'zł', name: 'Polish Złoty' },
  CZK: { symbol: 'Kč', name: 'Czech Koruna' },
  HUF: { symbol: 'Ft', name: 'Hungarian Forint' },
  ILS: { symbol: '₪', name: 'Israeli Shekel' },
  AED: { symbol: 'د.إ', name: 'UAE Dirham' },
  SAR: { symbol: '﷼', name: 'Saudi Riyal' },
  TRY: { symbol: '₺', name: 'Turkish Lira' },
  THB: { symbol: '฿', name: 'Thai Baht' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit' },
  IDR: { symbol: 'Rp', name: 'Indonesian Rupiah' },
  PHP: { symbol: '₱', name: 'Philippine Peso' },
  VND: { symbol: '₫', name: 'Vietnamese Dong' },
  TWD: { symbol: 'NT$', name: 'Taiwan Dollar' },
  CLP: { symbol: '$', name: 'Chilean Peso' },
  COP: { symbol: '$', name: 'Colombian Peso' },
  PEN: { symbol: 'S/', name: 'Peruvian Sol' },
};

export const formatCurrency = (amount: number | undefined | null, currency: string = 'USD'): string => {
  // Handle undefined, null, or NaN values
  if (amount === undefined || amount === null || isNaN(amount)) {
    const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
    const symbol = currencyInfo?.symbol || '$';
    return `${symbol}0.00`;
  }
  
  const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
  if (!currencyInfo) return `$${amount.toLocaleString()}`;
  
  return `${currencyInfo.symbol}${amount.toLocaleString()}`;
};

export const getCurrencySymbol = (currency: string = 'USD'): string => {
  const currencyInfo = CURRENCIES[currency as keyof typeof CURRENCIES];
  return currencyInfo?.symbol || '$';
};

// Mock currency conversion rates (in production, fetch from API)
export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  EUR: 0.85,
  GBP: 0.73,
  JPY: 110.0,
  CAD: 1.25,
  AUD: 1.35,
  CHF: 0.92,
  CNY: 6.45,
  INR: 74.5,
  KES: 108.5,
  ZAR: 14.8,
  NGN: 411.0,
  EGP: 15.7,
  BRL: 5.2,
  MXN: 20.1,
  RUB: 73.5,
  KRW: 1180.0,
  SGD: 1.35,
  HKD: 7.8,
  NZD: 1.42,
  SEK: 8.6,
  NOK: 8.5,
  DKK: 6.4,
  PLN: 3.9,
  CZK: 21.5,
  HUF: 295.0,
  ILS: 3.2,
  AED: 3.67,
  SAR: 3.75,
  TRY: 8.5,
  THB: 31.0,
  MYR: 4.15,
  IDR: 14250.0,
  PHP: 50.5,
  VND: 22800.0,
  TWD: 28.0,
  CLP: 800.0,
  COP: 3800.0,
  PEN: 3.6,
};

export const convertCurrency = (amount: number, fromCurrency: string, toCurrency: string): number => {
  if (fromCurrency === toCurrency) return amount;
  
  const fromRate = EXCHANGE_RATES[fromCurrency] || 1;
  const toRate = EXCHANGE_RATES[toCurrency] || 1;
  
  // Convert to USD first, then to target currency
  const usdAmount = amount / fromRate;
  return usdAmount * toRate;
};