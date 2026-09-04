import type { Container } from '../../types'
import { formatBytes, formatPercent, formatRate } from '../../lib/format'

export type MetricKey = 'cpu' | 'mem' | 'net' | 'blk'

export interface MetricDef {
  key: MetricKey
  /** Ключ перевода: подпись берётся при отрисовке. */
  label: string
  color: string
  /** Текущее значение метрики у контейнера. */
  value: (container: Container) => number
  /** Ряд истории для спарклайна. */
  series: (container: Container) => number[]
  format: (value: number) => string
}

export const METRICS: MetricDef[] = [
  {
    key: 'cpu',
    label: 'mon.metric.cpu',
    color: 'var(--color-ember-400)',
    value: (container) => container.stats.cpu,
    series: (container) => container.history.cpu,
    format: (value) => formatPercent(value, 1),
  },
  {
    key: 'mem',
    label: 'mon.metric.mem',
    color: 'var(--color-sky-400)',
    value: (container) => container.stats.mem,
    series: (container) => container.history.mem,
    format: (value) => formatBytes(value),
  },
  {
    key: 'net',
    label: 'mon.metric.net',
    color: 'var(--color-mint-400)',
    value: (container) => container.stats.netRx + container.stats.netTx,
    series: (container) => container.history.net,
    format: (value) => formatRate(value),
  },
  {
    key: 'blk',
    label: 'mon.metric.blk',
    color: 'var(--color-amber-ok)',
    value: (container) => container.stats.blkRead + container.stats.blkWrite,
    series: (container) => container.history.blk,
    format: (value) => formatRate(value),
  },
]

export function metricByKey(key: MetricKey): MetricDef {
  return METRICS.find((item) => item.key === key) ?? METRICS[0]
}

/**
 * Поточечная сумма рядов с выравниванием по правому краю:
 * ряды приходят разной длины, но самая свежая точка у всех одна и та же.
 */
export function sumAligned(rows: number[][]): number[] {
  const length = rows.reduce((longest, row) => Math.max(longest, row.length), 0)
  if (length === 0) return []

  return Array.from({ length }, (_, index) =>
    rows.reduce((sum, row) => {
      const value = row[index - (length - row.length)]
      return value === undefined ? sum : sum + value
    }, 0),
  )
}
