export type Language = 'ru' | 'en'

export interface LanguageOption {
  code: Language
  /** Название языка на английском — для отладки и подписей второго уровня. */
  label: string
  /** Название языка на нём самом — то, что видит пользователь. */
  nativeLabel: string
}

export const LANGUAGES: readonly LanguageOption[] = [
  { code: 'ru', label: 'Russian', nativeLabel: 'Русский' },
  { code: 'en', label: 'English', nativeLabel: 'English' },
]

/** Плоский словарь: ключ вида `nav.containers` → готовая строка. */
export type Dictionary = Record<string, string>
