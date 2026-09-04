import { Activity, RefreshCw, Search, Server } from 'lucide-react'
import { formatBytes, formatPercent } from '../../lib/format'
import { useT } from '../../state/settings'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface TopBarProps {
  title: string
  subtitle: string
  search: string
  onSearch: (value: string) => void
  totalCpu: number
  totalMem: number
  totalNet: number
  /** Жив ли поток метрик от Docker Engine. */
  connected: boolean
  hostName: string
  refreshing: boolean
  onRefresh: () => void
}

export function TopBar({
  title,
  subtitle,
  search,
  onSearch,
  totalCpu,
  totalMem,
  totalNet,
  connected,
  hostName,
  refreshing,
  onRefresh,
}: TopBarProps) {
  const t = useT()

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4">
      {/* Нижняя граница нужна: иначе растянутый поиск выдавливает заголовок в ноль. */}
      <div className="min-w-[120px] shrink">
        <h1 className="truncate text-xl font-semibold text-foreground">{title}</h1>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>

      <div className="relative ml-4 min-w-[150px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder={t('top.searchPlaceholder')}
          className="h-9 pr-3 pl-8 text-base"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Metric icon={<Activity className="h-3.5 w-3.5" />} label="CPU" value={formatPercent(totalCpu, 0)} />
        <Metric label="RAM" value={formatBytes(totalMem, 1)} />
        <Metric label="NET" value={`${formatBytes(totalNet, 0)}/s`} />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" size="icon" onClick={onRefresh} aria-label={t('top.refresh')} className="size-9">
              <RefreshCw className={`size-4 ${refreshing ? 'animate-spin' : ''}`} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{t('top.refreshHint')}</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex h-9 items-center gap-2 rounded-md bg-foreground/4 px-3 text-base text-foreground/75">
              <Server className="size-4 text-primary" />
              <span className="max-w-40 truncate">{hostName}</span>
              <span
                className={[
                  'size-1.5 rounded-full',
                  connected ? 'rh-pulse bg-success' : 'bg-destructive',
                ].join(' ')}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {connected ? t('top.streamOn') : t('top.streamOff')}
          </TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-md bg-foreground/4 px-2.5">
      {icon !== undefined && <span className="text-primary">{icon}</span>}
      <span className="text-2xs tracking-wider text-muted-foreground">{label}</span>
      <span className="font-mono text-sm text-foreground/85 tabular-nums">{value}</span>
    </div>
  )
}
