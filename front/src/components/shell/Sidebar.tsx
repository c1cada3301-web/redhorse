import {
  Boxes,
  ChevronLeft,
  Container as ContainerIcon,
  Gauge,
  HardDrive,
  LayoutDashboard,
  Network,
  Settings,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useSettings, useT } from '../../state/settings'

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
  icon: LucideIcon
}

const NAV: NavItem[] = [
  { key: 'dashboard', icon: LayoutDashboard },
  { key: 'containers', icon: ContainerIcon },
  { key: 'images', icon: Boxes },
  { key: 'volumes', icon: HardDrive },
  { key: 'networks', icon: Network },
  { key: 'monitoring', icon: Gauge },
  { key: 'cleanup', icon: Trash2 },
  { key: 'settings', icon: Settings },
]

interface SidebarProps {
  current: NavKey
  onNavigate: (key: NavKey) => void
  runningCount: number
  totalCount: number
}

export function Sidebar({ current, onNavigate, runningCount, totalCount }: SidebarProps) {
  const { settings, update } = useSettings()
  const t = useT()

  const collapsed = settings.sidebarCollapsed
  const toggleLabel = t(collapsed ? 'nav.expand' : 'nav.collapse')

  return (
    <aside
      className={[
        'relative flex shrink-0 flex-col border-r border-white/6 bg-[var(--color-ink-900)]/60 transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[212px]',
      ].join(' ')}
    >
      {/* Кнопка сидит на самой границе — она нужна и в свёрнутом виде, где места в шапке нет. */}
      <button
        type="button"
        onClick={() => update({ sidebarCollapsed: !collapsed })}
        title={toggleLabel}
        aria-label={toggleLabel}
        aria-expanded={!collapsed}
        className="absolute top-[46px] -right-3 z-30 grid h-6 w-6 place-items-center rounded-full border border-white/10 bg-[var(--color-ink-850)] text-white/45 transition-colors hover:border-[var(--color-ember-500)]/50 hover:text-[var(--color-ember-300)]"
      >
        <ChevronLeft className={`h-3.5 w-3.5 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
      </button>

      <div className={`flex h-14 items-center gap-2.5 ${collapsed ? 'justify-center px-0' : 'px-4'}`}>
        <img
          src="/logo-192.png"
          alt=""
          width={32}
          height={32}
          className="h-8 w-8 shrink-0 object-contain"
        />
        {!collapsed && (
          <div className="min-w-0 leading-tight">
            <div className="truncate text-sm font-semibold tracking-tight text-white">RedHorse</div>
            <div className="truncate text-[10px] text-white/35">{t('nav.tagline')}</div>
          </div>
        )}
      </div>

      <nav className={`flex flex-1 flex-col gap-0.5 py-2 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        {NAV.map((item) => {
          const Icon = item.icon
          const active = item.key === current
          const label = t(`nav.${item.key}`)

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={[
                'relative flex items-center rounded-lg py-2 text-[13px] transition-colors',
                collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
                active
                  ? 'bg-white/[0.06] text-white'
                  : 'text-white/50 hover:bg-white/[0.03] hover:text-white/80',
              ].join(' ')}
            >
              {active && (
                <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r bg-[var(--color-ember-500)]" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </button>
          )
        })}
      </nav>

      <div
        title={collapsed ? t('nav.runningOf', { running: runningCount, total: totalCount }) : undefined}
        className={[
          'm-2 rounded-lg border border-white/6 bg-black/25',
          collapsed ? 'flex flex-col items-center gap-1 px-0 py-2' : 'px-3 py-2.5',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <span className="rh-pulse h-1.5 w-1.5 rounded-full bg-[var(--color-mint-400)]" />
          {!collapsed && <span className="text-[11px] text-white/60">{t('nav.socket')}</span>}
        </div>

        {collapsed ? (
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-white/40">
            {runningCount}/{totalCount}
          </span>
        ) : (
          <div className="mt-1 font-[family-name:var(--font-mono)] text-[11px] text-white/30">
            {t('nav.runningOf', { running: runningCount, total: totalCount })}
          </div>
        )}
      </div>
    </aside>
  )
}
