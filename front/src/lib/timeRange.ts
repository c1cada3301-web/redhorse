import { format, formatDistanceStrict } from 'date-fns'
import { ru } from 'date-fns/locale/ru'

/** Живой хвост (следим за потоком) либо фиксированное окно в прошлом. */
export type TimeRange =
  | { mode: 'live'; sinceMs: number | null }
  | { mode: 'window'; from: number; to: number }

export interface RangePreset {
  key: string
  label: string
  /** Сколько миллисекунд назад начинать: null — только новые, Infinity — всё время. */
  sinceMs: number | null
}

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

export const PRESETS: readonly RangePreset[] = [
  { key: 'new', label: 'Только новые', sinceMs: null },
  { key: '15m', label: '15 минут', sinceMs: 15 * MINUTE },
  { key: '1h', label: 'Час', sinceMs: HOUR },
  { key: '6h', label: '6 часов', sinceMs: 6 * HOUR },
  { key: '24h', label: 'Сутки', sinceMs: DAY },
  { key: 'all', label: 'Всё время', sinceMs: Number.POSITIVE_INFINITY },
] as const

/** Подписи для живого режима — «Последние …» в правильном падеже. */
const LIVE_LABELS: Readonly<Record<string, string>> = {
  new: 'Только новые',
  '15m': 'Последние 15 минут',
  '1h': 'Последний час',
  '6h': 'Последние 6 часов',
  '24h': 'Последние сутки',
  all: 'Всё время',
}

export const DEFAULT_RANGE: TimeRange = { mode: 'live', sinceMs: 15 * MINUTE }

/** Пресет с таким же смещением, если он есть в списке. */
function findPreset(sinceMs: number | null): RangePreset | undefined {
  return PRESETS.find((preset) => preset.sinceMs === sinceMs)
}

/** «17 авг 14:30» — короткая метка без точки после месяца. */
function stamp(ms: number): string {
  return format(ms, 'd MMM HH:mm', { locale: ru }).replace('.', '')
}

export function isLive(range: TimeRange): boolean {
  return range.mode === 'live'
}

/** Короткая подпись для кнопки пикера. */
export function describeRange(range: TimeRange): string {
  if (range.mode === 'window') return `${stamp(range.from)} — ${stamp(range.to)}`

  const preset = findPreset(range.sinceMs)

  if (preset !== undefined) return LIVE_LABELS[preset.key] ?? preset.label
  if (range.sinceMs === null) return 'Только новые'
  if (!Number.isFinite(range.sinceMs)) return 'Всё время'

  return `Последние ${formatDistanceStrict(0, range.sinceMs, { locale: ru })}`
}

/** Параметры для бэкенда: epoch в миллисекундах. Без `since` бэкенд отдаёт всё. */
export function toQuery(range: TimeRange, now: number = Date.now()): { since?: number; until?: number } {
  if (range.mode === 'window') return { since: range.from, until: range.to }
  if (range.sinceMs === null) return { since: now }
  if (!Number.isFinite(range.sinceMs)) return {}

  return { since: now - range.sinceMs }
}

const LOCAL_DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/

/** Значение <input type="datetime-local"> → epoch мс. null, если строка битая. */
export function parseLocalDateTime(value: string): number | null {
  const parts = LOCAL_DATE_TIME.exec(value.trim())

  if (parts === null) return null

  const [, year, month, day, hours, minutes, seconds = '0'] = parts
  const date = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hours),
    Number(minutes),
    Number(seconds),
    0,
  )

  // Отсеиваем несуществующие даты вроде 2026-02-31, которые Date молча переносит
  if (date.getFullYear() !== Number(year) || date.getMonth() !== Number(month) - 1) return null
  if (date.getDate() !== Number(day)) return null

  const ms = date.getTime()

  return Number.isNaN(ms) ? null : ms
}

/** epoch мс → значение для <input type="datetime-local">. */
export function toLocalDateTimeValue(ms: number): string {
  if (!Number.isFinite(ms)) return ''

  return format(ms, "yyyy-MM-dd'T'HH:mm")
}
