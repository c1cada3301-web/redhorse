import { Activity } from 'lucide-react'
import type { Container } from '../../types'
import { shortId } from '../../lib/format'
import { Sparkline } from '../ui/Sparkline'
import { StateBadge } from '../containers/StateBadge'
import type { MetricDef } from './metrics'
import { useT } from '@/state/settings'

const ROW_GRID =
  'grid grid-cols-[minmax(200px,1.6fr)_112px_92px_128px_60px_minmax(80px,1fr)] items-center gap-3'

const COLUMNS = ['mon.col.container', 'mon.col.state', 'mon.col.history', 'mon.col.value', 'mon.col.share', '']

interface ContainerMetricTableProps {
  containers: Container[]
  metric: MetricDef
  /** Сумма метрики по всем контейнерам — от неё считаем долю строки. */
  total: number
}

export function ContainerMetricTable({ containers, metric, total }: ContainerMetricTableProps) {
  const t = useT()
  return (
    <section className="rh-panel p-3">
      <div className={`${ROW_GRID} px-3 pb-2`}>
        {COLUMNS.map((column, index) => (
          <div
            key={column === '' ? `col-${index}` : column}
            className={[
              'text-2xs tracking-wider text-muted-foreground uppercase',
              index === 3 || index === 4 ? 'text-right' : '',
            ].join(' ')}
          >
            {t(column)}
          </div>
        ))}
      </div>

      {containers.length === 0 ? (
        <div className="flex h-28 flex-col items-center justify-center gap-2 text-muted-foreground">
          <Activity className="h-5 w-5" />
          <p className="text-sm">{t('mon.nothing')}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {containers.map((container) => (
            <MetricRow
              key={container.id}
              container={container}
              metric={metric}
              share={total > 0 ? (metric.value(container) / total) * 100 : 0}
              grid={ROW_GRID}
            />
          ))}
        </div>
      )}
    </section>
  )
}

interface MetricRowProps {
  container: Container
  metric: MetricDef
  share: number
  grid: string
}

function MetricRow({ container, metric, share, grid }: MetricRowProps) {
  const series = metric.series(container)

  return (
    <div
      className={`${grid} rounded-lg bg-foreground/3 px-3 py-2 transition-colors hover:border-border hover:bg-fg/[0.035]`}
    >
      <div className="min-w-0">
        <div className="truncate text-base text-foreground/90">{container.name}</div>
        <div className="truncate font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
          {container.image} · {shortId(container.id)}
        </div>
      </div>

      <StateBadge state={container.state} />

      <Sparkline values={series} color={metric.color} width={88} height={22} />

      <div className="text-right font-[family-name:var(--font-mono)] text-sm text-foreground/90">
        {metric.format(metric.value(container))}
      </div>

      <div className="text-right font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
        {share.toFixed(0)}%
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-fg/6">
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${Math.min(100, Math.max(0, share))}%`, background: metric.color }}
        />
      </div>
    </div>
  )
}
