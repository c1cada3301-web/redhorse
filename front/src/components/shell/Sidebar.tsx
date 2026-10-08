import {
  Boxes,
  ChevronLeft,
  Container as ContainerIcon,
  Gauge,
  HardDrive,
  LayoutDashboard,
  Network,
  LogOut,
  Settings,
  Trash2,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { NavLink } from 'react-router'
import { useSettings, useT } from '../../state/settings'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

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
  runningCount: number
  totalCount: number
  /** Имя вошедшего пользователя. */
  username: string
  onSignOut: () => void
}

export function Sidebar({
  current,
  runningCount,
  totalCount,
  username,
  onSignOut,
}: SidebarProps) {
  const { settings, update } = useSettings()
  const t = useT()

  const collapsed = settings.sidebarCollapsed
  const toggleLabel = t(collapsed ? 'nav.expand' : 'nav.collapse')

  return (
    <aside
      className={[
        'relative flex shrink-0 flex-col border-r border-border bg-card/60 transition-[width] duration-200',
        collapsed ? 'w-[60px]' : 'w-[212px]',
      ].join(' ')}
    >
      {/* Кнопка сидит на самой границе — она нужна и в свёрнутом виде, где места в шапке нет. */}
      <Button
        variant="outline"
        size="icon-sm"
        onClick={() => update({ sidebarCollapsed: !collapsed })}
        title={toggleLabel}
        aria-label={toggleLabel}
        aria-expanded={!collapsed}
        className="absolute top-[46px] -right-3 z-30 rounded-full bg-popover"
      >
        <ChevronLeft className={`transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`} />
      </Button>

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
            <div className="truncate text-base font-semibold tracking-tight text-foreground">RedHorse</div>
            <div className="truncate text-2xs text-muted-foreground">{t('nav.tagline')}</div>
          </div>
        )}
      </div>

      <nav className={`flex flex-1 flex-col gap-0.5 py-2 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        {NAV.map((item) => {
          const Icon = item.icon
          const active = item.key === current
          const label = t(`nav.${item.key}`)

          return (
            // Настоящая ссылка, а не кнопка: адрес можно скопировать,
            // открыть в новой вкладке и переслать.
            <NavLink
              key={item.key}
              to={`/${item.key}`}
              title={collapsed ? label : undefined}
              aria-label={label}
              className={[
                'relative flex items-center rounded-lg py-2 text-base transition-colors',
                collapsed ? 'justify-center px-0' : 'gap-2.5 px-2.5',
                active
                  ? 'bg-foreground/6 text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/3 hover:text-foreground/85',
              ].join(' ')}
            >
              {active && (
                <span className="absolute top-1/2 left-0 h-4 w-[3px] -translate-y-1/2 rounded-r bg-[var(--color-ember-500)]" />
              )}
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div
        title={collapsed ? t('nav.runningOf', { running: runningCount, total: totalCount }) : undefined}
        className={[
          'm-2 rounded-lg bg-foreground/4',
          collapsed ? 'flex flex-col items-center gap-1 px-0 py-2' : 'px-3 py-2.5',
        ].join(' ')}
      >
        <div className="flex items-center gap-2">
          <span className="rh-pulse h-1.5 w-1.5 rounded-full bg-[var(--color-mint-400)]" />
          {!collapsed && <span className="text-xs text-foreground/70">{t('nav.socket')}</span>}
        </div>

        {collapsed ? (
          <span className="font-mono text-2xs text-muted-foreground">
            {runningCount}/{totalCount}
          </span>
        ) : (
          <div className="mt-1 font-mono text-xs text-muted-foreground">
            {t('nav.runningOf', { running: runningCount, total: totalCount })}
          </div>
        )}
      </div>

      <div className={`mb-2 ${collapsed ? 'px-1.5' : 'px-2'}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onSignOut}
              aria-label={t('auth.signOut')}
              className={collapsed ? 'w-full justify-center px-0' : 'w-full justify-start gap-2.5'}
            >
              <LogOut className="size-4 shrink-0" />
              {!collapsed && <span className="truncate">{username}</span>}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">{t('auth.signOut')} — {username}</TooltipContent>
        </Tooltip>
      </div>
    </aside>
  )
}
