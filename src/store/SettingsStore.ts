import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
  CURRENCY: '@settings_currency',
  THEME: '@settings_theme',
  FIRST_DAY: '@settings_first_day',
  DEFAULT_TYPE: '@settings_default_type',
  USER_NAME: '@settings_user_name',
  DB_VERSION: '@settings_db_version',
};

export interface Currency {
  code: string;
  symbol: string;
  locale: string;
  name: string;
}

export const CURRENCIES: Currency[] = [
  { code: 'MXN', symbol: '$', locale: 'es-MX', name: 'Peso Mexicano' },
  { code: 'USD', symbol: '$', locale: 'en-US', name: 'Dolar美国' },
  { code: 'EUR', symbol: '\u20AC', locale: 'es-ES', name: 'Euro' },
  { code: 'GBP', symbol: '\u00A3', locale: 'en-GB', name: 'Libra Esterlina' },
  { code: 'JPY', symbol: '\u00A5', locale: 'ja-JP', name: 'Yen Japones' },
  { code: 'BRL', symbol: 'R$', locale: 'pt-BR', name: 'Real Brasileño' },
  { code: 'ARS', symbol: '$', locale: 'es-AR', name: 'Peso Argentino' },
  { code: 'COP', symbol: '$', locale: 'es-CO', name: 'Peso Colombiano' },
  { code: 'CLP', symbol: '$', locale: 'es-CL', name: 'Peso Chileno' },
  { code: 'PEN', symbol: 'S/', locale: 'es-PE', name: 'Sol Peruano' },
];

export type ThemeMode = 'light' | 'dark';
export type FirstDay = 'monday' | 'sunday';
export type DefaultType = 'income' | 'expense';

export interface Settings {
  currency: Currency;
  theme: ThemeMode;
  firstDay: FirstDay;
  defaultType: DefaultType;
  userName: string;
  dbVersion: number;
}

const defaultSettings: Settings = {
  currency: CURRENCIES[0],
  theme: 'light',
  firstDay: 'monday',
  defaultType: 'expense',
  userName: '',
  dbVersion: 1,
};

let cachedSettings: Settings | null = null;

export async function loadSettings(): Promise<Settings> {
  try {
    const raw = await AsyncStorage.getItem('@settings_all');
    if (raw) {
      const parsed = JSON.parse(raw);
      const currency = CURRENCIES.find(c => c.code === parsed.currency) || defaultSettings.currency;
      cachedSettings = {
        currency,
        theme: parsed.theme || 'light',
        firstDay: parsed.firstDay || 'monday',
        defaultType: parsed.defaultType || 'expense',
        userName: parsed.userName || '',
        dbVersion: parsed.dbVersion || 1,
      };
      return cachedSettings;
    }
  } catch {}
  cachedSettings = { ...defaultSettings };
  return cachedSettings;
}

export async function saveSettings(settings: Settings): Promise<void> {
  cachedSettings = settings;
  await AsyncStorage.setItem('@settings_all', JSON.stringify({
    currency: settings.currency.code,
    theme: settings.theme,
    firstDay: settings.firstDay,
    defaultType: settings.defaultType,
    userName: settings.userName,
    dbVersion: settings.dbVersion,
  }));
}

export function getCachedSettings(): Settings {
  return cachedSettings || defaultSettings;
}

export function formatCurrency(amount: number, currency?: Currency): string {
  const cur = currency || getCachedSettings().currency;
  if (cur.code === 'JPY') {
    return cur.symbol + Math.round(amount).toLocaleString(cur.locale);
  }
  return cur.symbol + amount.toLocaleString(cur.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0,
  PEN: 3.75,
  EUR: 0.92,
};

export function convertCurrency(amount: number, fromCode: string, toCode: string): number {
  const fromRate = EXCHANGE_RATES[fromCode] || 1.0;
  const toRate = EXCHANGE_RATES[toCode] || 1.0;
  // Convert from fromCode to USD, then from USD to toCode
  const inUSD = amount / fromRate;
  return inUSD * toRate;
}
