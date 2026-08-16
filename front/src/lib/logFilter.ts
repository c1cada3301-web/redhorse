import type { LogLevel, LogLine, LogViewOptions } from '../types'
import { visibleText } from './maskCache'

export function filterLines(lines: LogLine[], options: LogViewOptions): LogLine[] {
  const needle = options.search.trim().toLowerCase()
  const allLevels = (Object.values(options.levels) as boolean[]).every(Boolean)

  if (needle === '' && allLevels) return lines

  return lines.filter((line) => {
    if (!options.levels[line.level]) return false
    if (needle === '') return true

    // Ищем по тому, что видно на экране: под маской секрет искать бессмысленно.
    return visibleText(line, options.masked).toLowerCase().includes(needle)
  })
}

export function countByLevel(lines: LogLine[]): Record<LogLevel, number> {
  const counts: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 }

  for (const line of lines) {
    counts[line.level] += 1
  }

  return counts
}

export function linesToText(lines: LogLine[], withTimestamps: boolean, masked = false): string {
  return lines
    .map((line) => {
      const text = visibleText(line, masked)
      return withTimestamps ? `${new Date(line.ts).toISOString()} ${text}` : text
    })
    .join('\n')
}
