export const LOCALES = ['en', 'pt-BR', 'zh-CN', 'es'] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';

export function parseLocale(value: unknown): Locale | null {
  return LOCALES.find((locale) => locale === value) ?? null;
}

export function localeOf(value: unknown): Locale {
  return parseLocale(value) ?? DEFAULT_LOCALE;
}

export function acceptedLocale(header: string | null | undefined): Locale {
  for (const part of (header ?? '').split(',')) {
    const language = part.split(';')[0].trim();
    const base = language.split('-')[0];
    const match =
      parseLocale(language) ??
      LOCALES.find((locale) => locale.split('-')[0] === base);

    if (match) {
      return match;
    }
  }

  return DEFAULT_LOCALE;
}
