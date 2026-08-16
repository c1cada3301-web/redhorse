import { Pause, Play, RotateCw, ScrollText, Square, Trash2 } from 'lucide-react'
import type { Container } from '../../types'
import { formatBytes, formatPercent, formatRate, formatUptime, shortId } from '../../lib/format'
import { Sparkline } from '../ui/Sparkline'
import { IconButton } from '../ui/IconButton'
import { StateBadge } from './StateBadge'

export const ROW_GRID =
  'grid grid-cols-[minmax(220px,1.7fr)_104px_124px_148px_118px_118px_88px_78px_216px] items-center gap-3'

interface ContainerRowProps {
  container: Container
  logsOpen: boolean
  onOpenLogs: () => void
  onStart: () => void
  onStop: () => void
  onRestart: () => void
  onPause: () => void
  onRemove: () => void
}

export function ContainerRow({
  container,
  logsOpen,
  onOpenLogs,
  onStart,
  onStop,
  onRestart,
  onPause,
  onRemove,
}: ContainerRowProps) {
  const running = container.state === 'running'
  const memPercent = container.stats.memLimit > 0 ? (container.stats.mem / container.stats.memLimit) * 100 : 0

  return (
    <div
      className={`${ROW_GRID} rounded-xl border border-white/6 bg-white/[0.015] px-3 py-2.5 transition-colors hover:border-white/12 hover:bg-white/[0.035]`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onOpenLogs}
            className="truncate text-[13px] font-medium text-white hover:text-[var(--color-ember-300)]"
          >
            {container.name}
          </button>
          {container.health === 'unhealthy' && (
            <span className="rounded bg-[var(--color-danger)]/12 px-1 text-[9px] text-[var(--color-danger)]">
              unhealthy
            </span>
          )}
          {container.restarts > 3 && (
            <span className="rounded bg-[var(--color-amber-ok)]/12 px-1 text-[9px] text-[var(--color-amber-ok)]">
              ×{container.restarts}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate font-[family-name:var(--font-mono)] text-[11px] text-white/35">
          <span className="truncate">{container.image}</span>
          <span className="text-white/15">·</span>
          <span>{shortId(container.id)}</span>
          {container.ports.length > 0 && (
            <>
              <span className="text-white/15">·</span>
              <span className="truncate text-[var(--color-sky-400)]/60">{container.ports[0]}</span>
            </>
          )}
        </div>
      </div>

      <StateBadge state={container.state} />

      <MetricCell
        value={formatPercent(container.stats.cpu, 1)}
        series={container.history.cpu}
        color="var(--color-ember-400)"
      />

      <MetricCell
        value={`${formatBytes(container.stats.mem)} · ${memPercent.toFixed(0)}%`}
        series={container.history.mem}
        color="var(--color-sky-400)"
      />

      <MetricCell
        value={`↓${formatRate(container.stats.netRx)}`}
        hint={`↑${formatRate(container.stats.netTx)}`}
        series={container.history.net}
        color="var(--color-mint-400)"
      />

      <MetricCell
        value={`r ${formatRate(container.stats.blkRead)}`}
        hint={`w ${formatRate(container.stats.blkWrite)}`}
        series={container.history.blk}
        color="var(--color-amber-ok)"
      />

      <div className="text-right font-[family-name:var(--font-mono)] text-[11px] text-white/55">
        {formatBytes(container.sizeRootFs)}
      </div>

      <div className="text-right font-[family-name:var(--font-mono)] text-[11px] text-white/45">
        {formatUptime(container.startedAt)}
      </div>

      <div className="flex items-center justify-end gap-0.5">
        <button
          type="button"
          onClick={onOpenLogs}
          className={[
            'mr-1 flex h-7 items-center gap-1.5 rounded-md border px-2 text-[11px] transition-colors',
            logsOpen
              ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)]'
              : 'border-white/10 bg-white/5 text-white/60 hover:border-[var(--color-ember-500)]/40 hover:text-[var(--color-ember-300)]',
          ].join(' ')}
        >
          <ScrollText className="h-3.5 w-3.5" />
          Логи
        </button>

        {running ? (
          <IconButton label="Остановить" onClick={onStop}>
            <Square className="h-4 w-4" />
          </IconButton>
        ) : (
          <IconButton label="Запустить" tone="accent" onClick={onStart}>
            <Play className="h-4 w-4" />
          </IconButton>
        )}

        <IconButton label="Пауза" onClick={onPause} disabled={!running}>
          <Pause className="h-4 w-4" />
        </IconButton>

        <IconButton label="Перезапустить" onClick={onRestart}>
          <RotateCw className="h-4 w-4" />
        </IconButton>

        <IconButton label="Удалить" tone="danger" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>
    </div>
  )
}

interface MetricCellProps {
  value: string
  hint?: string
  series: number[]
  color: string
}

function MetricCell({ value, hint, series, color }: MetricCellProps) {
  return (
    <div className="flex items-center gap-2">
      <Sparkline values={series} color={color} width={44} height={22} />
      <div className="min-w-0 leading-tight">
        <div className="truncate font-[family-name:var(--font-mono)] text-[11px] text-white/75">
          {value}
        </div>
        {hint !== undefined && (
          <div className="truncate font-[family-name:var(--font-mono)] text-[10px] text-white/30">
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}
