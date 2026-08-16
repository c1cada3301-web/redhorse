import {
  Boxes,
  Container as ContainerIcon,
  Gauge,
  HardDrive,
  LayoutDashboard,
  Network,
  Settings,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export type NavKey =
  | 'dashboard'
  | 'containers'
  | 'images'
  | 'volumes'
  | 'networks'
  | 'monitoring'
  | 'cleanup'
  | 'settings'

interface NavItem {
  key: NavKey
  label: string
  icon: LucideIcon
  ready: boolean
}

const NAV: NavItem[] = [
  { key: 'dashboard', label: 'Обзор', icon: LayoutDashboard, ready: false },
  { key: 'containers', label: 'Контейнеры', icon: ContainerIcon, ready: true },
  { key: 'images', label: 'Образы', icon: Boxes, ready: false },
  { key: 'volumes', label: 'Тома', icon: HardDrive, ready: false },
  { key: 'networks', label: 'Сети', icon: Network, ready: false },
  { key: 'monitoring', label: 'Мониторинг', icon: Gauge, ready: false },
  { key: 'cleanup', label: 'Очистка', icon: Trash2, ready: false },
  { key: 'settings', label: 'Настройки', icon: Settings, ready: false },
]

interface SidebarProps {
  current: NavKey
  onNavigate: (key: NavKey) => void
  runningCount: number
  totalCount: number
}

export function Sidebar({ current, onNavigate, runningCount, totalCount }: SidebarProps) {
  return (
    <aside className="flex w-[212px] shrink-0 flex-col border-r border-white/6 bg-[var(--color-ink-900)]/60">
      <div className="flex h-14 items-center gap-2.5 px-4">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-[var(--color-ember-400)] to-[var(--color-ember-600)] text-sm font-black text-white shadow-lg shadow-[var(--color-ember-600)]/30">
          R
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight text-white">Redhorse</div>
          <div className="text-[10px] text-white/35">docker control</div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-0.5 px-2 py-2">
        {NAV.map((item) => {
          const Icon = item.icon
          const active = item.key === current

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={[
                'group relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                active
                  ? 'bg-white/[0.06] text-white'
                  : 'text-white/50 hover:bg-white/[0.03] hover:text-white/80',
              ].join(' ')}
            >
              {active && (
                <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r bg-[var(--color-ember-500)]" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
              {!item.ready && (
                <span className="ml-auto rounded bg-white/6 px-1 text-[9px] tracking-wide text-white/30">
                  скоро
                </span>
              )}
            </button>
          )
        })}
      </nav>

      <div className="m-2 rounded-lg border border-white/6 bg-black/25 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <span className="rh-pulse h-1.5 w-1.5 rounded-full bg-[var(--color-mint-400)]" />
          <span className="text-[11px] text-white/60">local · unix socket</span>
        </div>
        <div className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-white/30">
          {runningCount}/{totalCount} контейнеров запущено
        </div>
      </div>
    </aside>
  )
}
