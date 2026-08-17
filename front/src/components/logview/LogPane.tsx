import { useCallback, useMemo } from 'react'
import { Maximize2, Minimize2, PictureInPicture2, PinOff, X } from 'lucide-react'
import type { LogSession, LogViewOptions } from '../../types'
import type { TimeRange } from '../../lib/timeRange'
import { filterLines } from '../../lib/logFilter'
import { IconButton } from '../ui/IconButton'
import { LogToolbar } from './LogToolbar'
import { LogLines } from './LogLines'

interface LogPaneProps {
  session: LogSession
  /** Как отрисован контейнер панели — влияет на набор кнопок в шапке. */
  variant: 'dock' | 'floating' | 'fullscreen'
  active?: boolean
  onFocus?: () => void
  onUpdateOptions: (patch: Partial<LogViewOptions>) => void
  onRangeChange: (range: TimeRange) => void
  onClear: () => void
  onClose: () => void
  onMaximize?: () => void
  onRestore?: () => void
  onDetach?: () => void
  onAttach?: () => void
  /** Заголовок панели: во floating-окне его рисует само окно. */
  header?: boolean
}

export function LogPane({
  session,
  variant,
  active = false,
  onFocus,
  onUpdateOptions,
  onRangeChange,
  onClear,
  onClose,
  onMaximize,
  onRestore,
  onDetach,
  onAttach,
  header = true,
}: LogPaneProps) {
  const filtered = useMemo(
    () => filterLines(session.lines, session.options),
    [session.lines, session.options],
  )

  // Пользователь прокрутил вверх — выключаем follow, вернулся вниз — включаем.
  const handleUserScroll = useCallback(
    (atBottom: boolean) => {
      if (atBottom !== session.options.follow) {
        onUpdateOptions({ follow: atBottom })
      }
    },
    [session.options.follow, onUpdateOptions],
  )

  return (
    <section
      onMouseDown={onFocus}
      className={[
        'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-[var(--color-ink-900)]/85',
        active
          ? 'border-[var(--color-ember-500)]/45 shadow-[0_0_0_1px_rgba(244,85,43,0.15)]'
          : 'border-fg/8',
      ].join(' ')}
    >
      {header && (
        <header className="flex h-9 shrink-0 items-center gap-2 border-b border-fg/6 bg-fg/[0.02] px-2">
          <span
            className={[
              'h-1.5 w-1.5 rounded-full',
              session.options.paused
                ? 'bg-fg/30'
                : 'rh-pulse bg-[var(--color-mint-400)]',
            ].join(' ')}
          />
          <h3 className="truncate text-xs font-medium text-fg/85">{session.containerName}</h3>
          <span className="rounded bg-fg/6 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[10px] text-fg/40">
            {session.connection === 'open' ? 'logs -f' : session.loading ? 'загрузка…' : 'срез'}
          </span>

          <div className="ml-auto flex items-center gap-0.5">
            {variant === 'dock' && onDetach && (
              <IconButton label="Открепить в отдельное окно" onClick={onDetach}>
                <PictureInPicture2 className="h-4 w-4" />
              </IconButton>
            )}
            {variant === 'floating' && onAttach && (
              <IconButton label="Вернуть в панель снизу" onClick={onAttach}>
                <PinOff className="h-4 w-4" />
              </IconButton>
            )}
            {variant !== 'fullscreen' && onMaximize && (
              <IconButton label="Во весь экран" onClick={onMaximize}>
                <Maximize2 className="h-4 w-4" />
              </IconButton>
            )}
            {variant === 'fullscreen' && onRestore && (
              <IconButton label="Свернуть из полноэкранного" onClick={onRestore}>
                <Minimize2 className="h-4 w-4" />
              </IconButton>
            )}
            <IconButton label="Закрыть лог" tone="danger" onClick={onClose}>
              <X className="h-4 w-4" />
            </IconButton>
          </div>
        </header>
      )}

      <LogToolbar
        options={session.options}
        allLines={session.lines}
        filteredCount={filtered.length}
        containerName={session.containerName}
        range={session.range}
        onRangeChange={onRangeChange}
        onChange={onUpdateOptions}
        onClear={onClear}
      />

      <div className="min-h-0 flex-1 bg-[var(--color-ink-950)]/60">
        <LogLines lines={filtered} options={session.options} onUserScroll={handleUserScroll} />
      </div>
    </section>
  )
}
