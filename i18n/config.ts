export const locales = [
  'en',
  'zh',
  'de',
  'fr',
  'ro',
  'es',
  'pt-BR',
  'id',
  'vi',
  'ja',
  'hi',
  'tr',
] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  zh: '中文',
  de: 'Deutsch',
  fr: 'Français',
  ro: 'Română',
  es: 'Español',
  'pt-BR': 'Português (BR)',
  id: 'Bahasa Indonesia',
  vi: 'Tiếng Việt',
  ja: '日本語',
  hi: 'हिन्दी',
  tr: 'Türkçe',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  zh: '🇨🇳',
  de: '🇩🇪',
  fr: '🇫🇷',
  ro: '🇷🇴',
  es: '🇪🇸',
  'pt-BR': '🇧🇷',
  id: '🇮🇩',
  vi: '🇻🇳',
  ja: '🇯🇵',
  hi: '🇮🇳',
  tr: '🇹🇷',
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (locales as readonly string[]).includes(value);
}
