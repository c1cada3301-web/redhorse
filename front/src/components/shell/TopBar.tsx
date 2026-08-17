import { Activity, RefreshCw, Search, Server } from 'lucide-react'
import { formatBytes, formatPercent } from '../../lib/format'

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
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-fg/6 px-4">
      {/* Нижняя граница нужна: иначе растянутый поиск выдавливает заголовок в ноль. */}
      <div className="min-w-[120px] shrink">
        <h1 className="truncate text-[15px] font-semibold text-fg">{title}</h1>
        <p className="truncate text-[11px] text-fg/35">{subtitle}</p>
      </div>

      <div className="relative ml-4 min-w-[150px] flex-1">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-fg/30" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Поиск по имени, образу, порту…"
          className="h-9 w-full rounded-lg border border-fg/8 bg-bg/25 pr-3 pl-8 text-[13px] text-fg/85 outline-none placeholder:text-fg/25 focus:border-[var(--color-ember-500)]/50"
        />
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <Metric icon={<Activity className="h-3.5 w-3.5" />} label="CPU" value={formatPercent(totalCpu, 0)} />
        <Metric label="RAM" value={formatBytes(totalMem, 1)} />
        <Metric label="NET" value={`${formatBytes(totalNet, 0)}/s`} />

        <button
          type="button"
          onClick={onRefresh}
          className="grid h-9 w-9 place-items-center rounded-lg border border-fg/8 bg-bg/25 text-fg/50 transition-colors hover:text-fg"
          aria-label="Обновить"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>

        <div
          title={connected ? 'Поток метрик активен' : 'Нет связи с Docker Engine'}
          className="flex h-9 items-center gap-2 rounded-lg border border-fg/8 bg-bg/25 px-3 text-[13px] text-fg/70"
        >
          <Server className="h-4 w-4 text-[var(--color-ember-400)]" />
          <span className="max-w-40 truncate">{hostName}</span>
          <span
            className={[
              'h-1.5 w-1.5 rounded-full',
              connected ? 'rh-pulse bg-[var(--color-mint-400)]' : 'bg-[var(--color-danger)]',
            ].join(' ')}
          />
        </div>
      </div>
    </header>
  )
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-fg/6 bg-bg/20 px-2.5">
      {icon !== undefined && <span className="text-[var(--color-ember-400)]">{icon}</span>}
      <span className="text-[10px] tracking-wider text-fg/30">{label}</span>
      <span className="font-[family-name:var(--font-mono)] text-[12px] text-fg/80">{value}</span>
    </div>
  )
}
