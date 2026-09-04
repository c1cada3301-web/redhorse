import { en } from './en'
import { ru } from './ru'
import type { Dictionary, Language } from './types'

export type { Dictionary, Language, LanguageOption } from './types'
export { LANGUAGES } from './types'

const DICTIONARIES: Record<Language, Dictionary> = { ru, en }

/** Ключи, о пропаже которых уже предупредили — чтобы не засорять консоль. */
const warned = new Set<string>()

export function getDictionary(language: Language): Dictionary {
  return DICTIONARIES[language]
}

/**
 * Текущий словарь вне React.
 *
 * Хук useT доступен только в компонентах-функциях, а перевод нужен и классовому
 * ErrorBoundary, и модулям без React. Провайдер настроек обновляет это значение
 * при смене языка, остальные читают его через `t`.
 */
let current: Dictionary = ru

export function setCurrentLanguage(language: Language): void {
  current = DICTIONARIES[language]
}

/** Перевод вне компонентов. В компонентах используйте useT. */
export function t(key: string, params?: Record<string, string | number>): string {
  return translate(current, key, params)
}

/**
 * Достаёт строку по ключу и подставляет параметры вида `{count}`.
 * Пропавший ключ возвращается как есть — дырку в переводе видно прямо в UI.
 */
export function translate(
  dict: Dictionary,
  key: string,
  params?: Record<string, string | number>,
): string {
  const template = dict[key]

  if (template === undefined) {
    if (import.meta.env.DEV && !warned.has(key)) {
      warned.add(key)
      console.warn(`[i18n] нет перевода для ключа: ${key}`)
    }

    return key
  }

  if (params === undefined) return template

  return template.replace(/\{(\w+)\}/g, (match: string, name: string) => {
    const value = params[name]

    return value === undefined ? match : String(value)
  })
}
