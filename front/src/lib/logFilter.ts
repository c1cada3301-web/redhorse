import type { LogLevel, LogLine, LogViewOptions } from '../types'

export function filterLines(lines: LogLine[], options: LogViewOptions): LogLine[] {
  const needle = options.search.trim().toLowerCase()
  const allLevels = (Object.values(options.levels) as boolean[]).every(Boolean)

  if (needle === '' && allLevels) return lines

  return lines.filter((line) => {
    if (!options.levels[line.level]) return false
    if (needle === '') return true

    return line.text.toLowerCase().includes(needle)
  })
}

export function countByLevel(lines: LogLine[]): Record<LogLevel, number> {
  const counts: Record<LogLevel, number> = { debug: 0, info: 0, warn: 0, error: 0 }

  for (const line of lines) {
    counts[line.level] += 1
  }

  return counts
}

export function linesToText(lines: LogLine[], withTimestamps: boolean): string {
  return lines
    .map((line) => (withTimestamps ? `${new Date(line.ts).toISOString()} ${line.text}` : line.text))
    .join('\n')
}
