import { Activity, ChevronDown, RefreshCw, Search, Server } from 'lucide-react'
import { formatBytes, formatPercent } from '../../lib/format'

interface TopBarProps {
  title: string
  subtitle: string
  search: string
  onSearch: (value: string) => void
  totalCpu: number
  totalMem: number
  totalNet: number
}

export function TopBar({
  title,
  subtitle,
  search,
  onSearch,
  totalCpu,
  totalMem,
  totalNet,
}: TopBarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/6 px-4">
      <div className="min-w-0">
        <h1 className="truncate text-[15px] font-semibold text-white">{title}</h1>
        <p className="truncate text-[11px] text-white/35">{subtitle}</p>
      </div>

      <div className="relative ml-4 w-72">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 h-4 w-4 -translate-y-1/2 text-white/30" />
        <input
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Поиск по имени, образу, порту…"
          className="h-9 w-full rounded-lg border border-white/8 bg-black/25 pr-3 pl-8 text-[13px] text-white/85 outline-none placeholder:text-white/25 focus:border-[var(--color-ember-500)]/50"
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Metric icon={<Activity className="h-3.5 w-3.5" />} label="CPU" value={formatPercent(totalCpu, 0)} />
        <Metric label="RAM" value={formatBytes(totalMem, 1)} />
        <Metric label="NET" value={`${formatBytes(totalNet, 0)}/s`} />

        <button
          type="button"
          className="grid h-9 w-9 place-items-center rounded-lg border border-white/8 bg-black/25 text-white/50 transition-colors hover:text-white"
          aria-label="Обновить"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        <button
          type="button"
          className="flex h-9 items-center gap-2 rounded-lg border border-white/8 bg-black/25 px-3 text-[13px] text-white/70 transition-colors hover:text-white"
        >
          <Server className="h-4 w-4 text-[var(--color-ember-400)]" />
          local
          <ChevronDown className="h-3.5 w-3.5 text-white/35" />
        </button>
      </div>
    </header>
  )
}

function Metric({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex h-9 items-center gap-2 rounded-lg border border-white/6 bg-black/20 px-2.5">
      {icon !== undefined && <span className="text-[var(--color-ember-400)]">{icon}</span>}
      <span className="text-[10px] tracking-wider text-white/30">{label}</span>
      <span className="font-[family-name:var(--font-mono)] text-[12px] text-white/80">{value}</span>
    </div>
  )
}
