import type { PointerEvent as ReactPointerEvent } from 'react'
import { ChevronDown, ChevronUp, Columns2, Rows3, Terminal, X } from 'lucide-react'
import type { LogSession } from '../../types'
import type { LogSessionsApi } from '../../state/useLogSessions'
import { IconButton } from '../ui/IconButton'
import { LogPane } from './LogPane'

const MIN_HEIGHT = 180
const COLLAPSED_HEIGHT = 38

function gridColumns(count: number): string {
  if (count <= 1) return 'grid-cols-1'
  if (count === 2) return 'grid-cols-2'
  if (count <= 4) return 'grid-cols-2'
  return 'grid-cols-3'
}

interface LogDockProps {
  api: LogSessionsApi
}

export function LogDock({ api }: LogDockProps) {
  const docked = api.sessions.filter((session) => !session.floating)

  if (api.sessions.length === 0) return null

  const activeSession =
    docked.find((session) => session.id === api.activeId) ?? docked[docked.length - 1]

  const beginResize = (event: ReactPointerEvent) => {
    if (event.button !== 0) return

    event.preventDefault()
    const startY = event.clientY
    const startHeight = api.dockHeight

    const handleMove = (moveEvent: PointerEvent) => {
      const next = startHeight - (moveEvent.clientY - startY)
      api.setDockHeight(Math.max(MIN_HEIGHT, Math.min(window.innerHeight - 160, next)))
    }

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  const height = api.collapsed || docked.length === 0 ? COLLAPSED_HEIGHT : api.dockHeight

  return (
    <div
      className="relative flex shrink-0 flex-col border-t border-fg/8 bg-[var(--color-ink-900)]/80 backdrop-blur-xl"
      style={{ height }}
    >
      <div
        onPointerDown={beginResize}
        className="absolute -top-1 right-0 left-0 z-20 h-2 cursor-ns-resize hover:bg-[var(--color-ember-500)]/40"
      />

      <div className="flex h-[38px] shrink-0 items-center gap-1 px-2">
        <Terminal className="h-3.5 w-3.5 shrink-0 text-[var(--color-ember-400)]" />

        <div className="rh-scroll flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
          {api.sessions.map((session) => (
            <DockTab
              key={session.id}
              session={session}
              active={session.id === activeSession?.id && !session.floating}
              onSelect={() => (session.floating ? api.attach(session.id) : api.focus(session.id))}
              onClose={() => api.close(session.id)}
            />
          ))}
        </div>

        <div className="ml-1 flex shrink-0 items-center gap-0.5">
          <IconButton
            label="Одна панель (вкладки)"
            active={api.layout === 'tabs'}
            onClick={() => api.setLayout('tabs')}
          >
            <Rows3 className="h-4 w-4" />
          </IconButton>
          <IconButton
            label="Плитка — все логи сразу"
            active={api.layout === 'grid'}
            onClick={() => api.setLayout('grid')}
          >
            <Columns2 className="h-4 w-4" />
          </IconButton>

          <div className="mx-0.5 h-4 w-px bg-fg/8" />

          <IconButton
            label={api.collapsed ? 'Развернуть панель' : 'Свернуть панель'}
            onClick={() => api.setCollapsed(!api.collapsed)}
          >
            {api.collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Закрыть все логи" tone="danger" onClick={api.closeAll}>
            <X className="h-4 w-4" />
          </IconButton>
        </div>
      </div>

      {!api.collapsed && docked.length > 0 && (
        <div className="min-h-0 flex-1 px-2 pb-2">
          {api.layout === 'tabs' && activeSession ? (
            <div className="h-full">
              <PaneForSession api={api} session={activeSession} />
            </div>
          ) : (
            <div
              className={`grid h-full gap-2 ${gridColumns(docked.length)} [grid-auto-rows:minmax(0,1fr)]`}
            >
              {docked.map((session) => (
                <PaneForSession key={session.id} api={api} session={session} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PaneForSession({ api, session }: { api: LogSessionsApi; session: LogSession }) {
  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col [&>section]:h-full">
      <LogPane
        session={session}
        variant="dock"
        active={session.id === api.activeId}
        onFocus={() => api.focus(session.id)}
        onUpdateOptions={(patch) => api.updateOptions(session.id, patch)}
        onRangeChange={(range) => api.setRange(session.id, range)}
        onClear={() => api.clear(session.id)}
        onClose={() => api.close(session.id)}
        onMaximize={() => api.maximize(session.id)}
        onDetach={() => api.detach(session.id)}
      />
    </div>
  )
}

interface DockTabProps {
  session: LogSession
  active: boolean
  onSelect: () => void
  onClose: () => void
}

function DockTab({ session, active, onSelect, onClose }: DockTabProps) {
  return (
    <div
      onClick={onSelect}
      className={[
        'group flex h-6 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border px-2 text-xs transition-colors',
        active
          ? 'border-[var(--color-ember-500)]/40 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
          : 'border-fg/8 bg-fg/[0.03] text-fg/55 hover:text-fg/85',
      ].join(' ')}
    >
      <span
        className={[
          'h-1 w-1 rounded-full',
          session.options.paused ? 'bg-fg/30' : 'bg-[var(--color-mint-400)]',
        ].join(' ')}
      />
      <span className="max-w-40 truncate">{session.containerName}</span>
      {session.floating && <span className="text-[10px] text-fg/30">окно</span>}
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onClose()
        }}
        className="opacity-0 transition-opacity group-hover:opacity-100 hover:text-[var(--color-danger)]"
        aria-label={`Закрыть лог ${session.containerName}`}
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  )
}
