import { useState } from 'react'
import { Pause, Play, RotateCw, ScrollText, Square, Trash2 } from 'lucide-react'
import type { Container } from '../../types'
import { formatBytes, formatPercent, formatRate, formatUptime, shortId } from '../../lib/format'
import { Sparkline } from '../ui/Sparkline'
import { IconButton } from '../ui/IconButton'
import { useT } from '@/state/settings'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { StateBadge } from './StateBadge'

export const ROW_GRID =
  'grid grid-cols-[minmax(220px,1.7fr)_104px_124px_148px_118px_118px_88px_78px_216px] items-center gap-3'

interface ContainerRowProps {
  container: Container
  logsOpen: boolean
  onOpenLogs: () => void
  onOpenDetails: () => void
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
  onOpenDetails,
  onStart,
  onStop,
  onRestart,
  onPause,
  onRemove,
}: ContainerRowProps) {
  const t = useT()
  const [confirming, setConfirming] = useState(false)
  const running = container.state === 'running'
  const memPercent = container.stats.memLimit > 0 ? (container.stats.mem / container.stats.memLimit) * 100 : 0

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpenDetails}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenDetails()
        }
      }}
      title={t('containers.openDetails')}
      className={`${ROW_GRID} cursor-pointer border-b border-border px-3 py-2.5 text-left transition-colors hover:bg-foreground/4 focus-visible:bg-foreground/5 focus-visible:outline-none`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="truncate text-base font-medium text-foreground">{container.name}</span>
          {container.health === 'unhealthy' && (
            <span className="rounded bg-[var(--color-danger)]/12 px-1 text-2xs text-[var(--color-danger)]">
              unhealthy
            </span>
          )}
          {container.restarts > 3 && (
            <span className="rounded bg-[var(--color-amber-ok)]/12 px-1 text-2xs text-[var(--color-amber-ok)]">
              ×{container.restarts}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex items-center gap-2 truncate font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
          <span className="truncate">{container.image}</span>
          <span className="text-muted-foreground">·</span>
          <span>{shortId(container.id)}</span>
          {container.ports.length > 0 && (
            <>
              <span className="text-muted-foreground">·</span>
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

      <div className="text-right font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
        {formatBytes(container.sizeRootFs)}
      </div>

      <div className="text-right font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
        {formatUptime(container.startedAt)}
      </div>

      <div
        className="flex items-center justify-end gap-0.5"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onOpenLogs}
          className={[
            'mr-1 flex h-7 items-center gap-1.5 rounded-md border px-2 text-xs transition-colors',
            logsOpen
              ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/15 text-[var(--color-ember-300)]'
              : 'border-border bg-fg/5 text-foreground/75 hover:border-border hover:text-foreground',
          ].join(' ')}
        >
          <ScrollText className="h-3.5 w-3.5" />
          {t('containers.action.logs')}
        </button>

        {running ? (
          <IconButton label={t('containers.action.stop')} onClick={onStop}>
            <Square className="h-4 w-4" />
          </IconButton>
        ) : (
          <IconButton label={t('containers.action.start')} tone="accent" onClick={onStart}>
            <Play className="h-4 w-4" />
          </IconButton>
        )}

        <IconButton label={t('containers.action.pause')} onClick={onPause} disabled={!running}>
          <Pause className="h-4 w-4" />
        </IconButton>

        <IconButton label={t('containers.action.restart')} onClick={onRestart}>
          <RotateCw className="h-4 w-4" />
        </IconButton>

        <IconButton label={t('containers.action.remove')} tone="danger" onClick={() => setConfirming(true)}>
          <Trash2 className="h-4 w-4" />
        </IconButton>
      </div>

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t('containers.remove.title')}
        description={
          running
            ? t('containers.remove.textRunning')
            : t('containers.remove.text')
        }
        subject={`${container.name} · ${container.image}`}
        onConfirm={onRemove}
      />
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
        <div className="truncate font-[family-name:var(--font-mono)] text-xs text-foreground/75">
          {value}
        </div>
        {hint !== undefined && (
          <div className="truncate font-[family-name:var(--font-mono)] text-2xs text-muted-foreground">
            {hint}
          </div>
        )}
      </div>
    </div>
  )
}
