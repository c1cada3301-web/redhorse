import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { LANGUAGES, getDictionary, setCurrentLanguage, translate } from '../lib/i18n'
import type { Language } from '../lib/i18n'

const STORAGE_KEY = 'redhorse.settings'
// Ключ до переименования панели: читаем его, чтобы не сбросить настройки.
const LEGACY_STORAGE_KEY = 'dala.settings'

export type Theme = 'dark' | 'light' | 'system'

export const THEMES: readonly Theme[] = ['dark', 'light', 'system']

export interface Settings {
  language: Language
  /** Тема оформления. system — следовать настройке операционной системы. */
  theme: Theme
  /** Сколько строк лога держать в буфере сессии. */
  logBufferSize: number
  /** Период опроса списка контейнеров, мс. 0 — только вручную. */
  pollInterval: number
  /** Показывать метки времени в логах по умолчанию. */
  logTimestamps: boolean
  /** Размер шрифта логов по умолчанию. */
  logFontSize: number
  /** Боковое меню свёрнуто до иконок. */
  sidebarCollapsed: boolean
}

/** Допустимые значения полей — заодно границы валидации при чтении из localStorage. */
export const LOG_BUFFER_OPTIONS: readonly number[] = [5_000, 10_000, 20_000, 50_000]
export const POLL_OPTIONS: readonly number[] = [2_000, 4_000, 10_000, 0]
export const LOG_FONT_MIN = 9
export const LOG_FONT_MAX = 22

export type Translate = (key: string, params?: Record<string, string | number>) => string

interface SettingsApi {
  settings: Settings
  update: (patch: Partial<Settings>) => void
  reset: () => void
}

interface SettingsContextValue extends SettingsApi {
  t: Translate
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

/** Русский, если система русская; во всех остальных случаях английский. */
function detectLanguage(): Language {
  if (typeof navigator === 'undefined') return 'en'

  return navigator.language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

function defaultSettings(): Settings {
  return {
    language: detectLanguage(),
    theme: 'dark',
    logBufferSize: 20_000,
    pollInterval: 4_000,
    logTimestamps: true,
    logFontSize: 12,
    sidebarCollapsed: false,
  }
}

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && LANGUAGES.some((item) => item.code === value)
}

function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && (THEMES as readonly string[]).includes(value)
}

function pickBoolean(raw: Record<string, unknown>, key: string, fallback: boolean): boolean {
  const value = raw[key]

  return typeof value === 'boolean' ? value : fallback
}

function pickChoice(raw: Record<string, unknown>, key: string, allowed: readonly number[], fallback: number): number {
  const value = raw[key]

  return typeof value === 'number' && allowed.includes(value) ? value : fallback
}

function pickRange(raw: Record<string, unknown>, key: string, min: number, max: number, fallback: number): number {
  const value = raw[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback

  const rounded = Math.round(value)

  return rounded >= min && rounded <= max ? rounded : fallback
}

/** Битый JSON, чужие поля и отсутствующее хранилище не должны ронять приложение. */
function loadSettings(): Settings {
  const fallback = defaultSettings()

  try {
    const stored =
      window.localStorage.getItem(STORAGE_KEY) ?? window.localStorage.getItem(LEGACY_STORAGE_KEY)
    if (stored === null) return fallback

    const parsed: unknown = JSON.parse(stored)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return fallback

    const raw = parsed as Record<string, unknown>

    return {
      language: isLanguage(raw.language) ? raw.language : fallback.language,
      theme: isTheme(raw.theme) ? raw.theme : fallback.theme,
      logBufferSize: pickChoice(raw, 'logBufferSize', LOG_BUFFER_OPTIONS, fallback.logBufferSize),
      pollInterval: pickChoice(raw, 'pollInterval', POLL_OPTIONS, fallback.pollInterval),
      logTimestamps: pickBoolean(raw, 'logTimestamps', fallback.logTimestamps),
      logFontSize: pickRange(raw, 'logFontSize', LOG_FONT_MIN, LOG_FONT_MAX, fallback.logFontSize),
      sidebarCollapsed: pickBoolean(raw, 'sidebarCollapsed', fallback.sidebarCollapsed),
    }
  } catch {
    // Приватный режим или повреждённая запись — работаем на значениях по умолчанию.
    return fallback
  }
}

function saveSettings(settings: Settings): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Хранилище недоступно — настройки живут только в памяти вкладки.
  }
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(loadSettings)

  const update = useCallback((patch: Partial<Settings>) => {
    setSettings((current) => ({ ...current, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setSettings(defaultSettings())
  }, [])

  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  useEffect(() => {
    document.documentElement.lang = settings.language
    // Тот же язык — модулям вне React: классовому ErrorBoundary и журналу ошибок.
    setCurrentLanguage(settings.language)
  }, [settings.language])

  // В режиме «как в системе» слушаем медиа-запрос: тема должна меняться
  // вместе с системной, без перезагрузки вкладки.
  useEffect(() => {
    const root = document.documentElement

    if (settings.theme !== 'system') {
      root.dataset.theme = settings.theme
      return
    }

    const media = window.matchMedia('(prefers-color-scheme: light)')
    const apply = () => {
      root.dataset.theme = media.matches ? 'light' : 'dark'
    }

    apply()
    media.addEventListener('change', apply)

    return () => media.removeEventListener('change', apply)
  }, [settings.theme])

  const t = useMemo<Translate>(() => {
    const dict = getDictionary(settings.language)

    return (key, params) => translate(dict, key, params)
  }, [settings.language])

  const value = useMemo<SettingsContextValue>(
    () => ({ settings, update, reset, t }),
    [settings, update, reset, t],
  )

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

function useSettingsContext(): SettingsContextValue {
  const value = useContext(SettingsContext)

  if (value === null) {
    throw new Error('useSettings должен вызываться внутри <SettingsProvider>')
  }

  return value
}

export function useSettings(): SettingsApi {
  const { settings, update, reset } = useSettingsContext()

  return useMemo(() => ({ settings, update, reset }), [settings, update, reset])
}

export function useT(): Translate {
  return useSettingsContext().t
}
