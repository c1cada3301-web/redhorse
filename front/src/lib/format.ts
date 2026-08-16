const BYTE_UNITS = ['B', 'KB', 'MB', 'GB', 'TB'] as const

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'

  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1)
  const value = bytes / 1024 ** exponent

  return `${value.toFixed(exponent === 0 ? 0 : digits)} ${BYTE_UNITS[exponent]}`
}

export function formatRate(bytesPerSecond: number): string {
  return `${formatBytes(bytesPerSecond, 0)}/s`
}

export function formatPercent(value: number, digits = 1): string {
  return `${value.toFixed(digits)}%`
}

/** «2 ч 14 мин» — человекочитаемый аптайм. */
export function formatUptime(startedAt: number | null, now: number = Date.now()): string {
  if (startedAt === null) return '—'

  const seconds = Math.max(0, Math.floor((now - startedAt) / 1000))
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days} д ${hours} ч`
  if (hours > 0) return `${hours} ч ${minutes} мин`
  if (minutes > 0) return `${minutes} мин`

  return `${seconds} с`
}

export function formatTime(ts: number): string {
  const date = new Date(ts)
  const pad = (n: number, size = 2) => String(n).padStart(size, '0')

  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${pad(
    date.getMilliseconds(),
    3,
  )}`
}

export function shortId(id: string): string {
  return id.slice(0, 12)
}
