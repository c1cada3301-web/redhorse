import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { FloatingRect, LogSession, LogViewOptions } from '../../types'
import type { TimeRange } from '../../lib/timeRange'
import { LogPane } from './LogPane'

type Direction = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'

const MIN_WIDTH = 360
const MIN_HEIGHT = 220

/** Класс + курсор для каждой из восьми ручек ресайза. */
const HANDLES: { dir: Direction; className: string }[] = [
  { dir: 'n', className: 'top-0 right-3 left-3 h-1.5 cursor-ns-resize' },
  { dir: 's', className: 'right-3 bottom-0 left-3 h-1.5 cursor-ns-resize' },
  { dir: 'w', className: 'top-3 bottom-3 left-0 w-1.5 cursor-ew-resize' },
  { dir: 'e', className: 'top-3 right-0 bottom-3 w-1.5 cursor-ew-resize' },
  { dir: 'nw', className: 'top-0 left-0 h-3 w-3 cursor-nwse-resize' },
  { dir: 'ne', className: 'top-0 right-0 h-3 w-3 cursor-nesw-resize' },
  { dir: 'sw', className: 'bottom-0 left-0 h-3 w-3 cursor-nesw-resize' },
  { dir: 'se', className: 'right-0 bottom-0 h-3 w-3 cursor-nwse-resize' },
]

function resize(rect: FloatingRect, dir: Direction, dx: number, dy: number): FloatingRect {
  let { x, y, w, h } = rect

  if (dir.includes('e')) w = Math.max(MIN_WIDTH, rect.w + dx)
  if (dir.includes('s')) h = Math.max(MIN_HEIGHT, rect.h + dy)

  if (dir.includes('w')) {
    w = Math.max(MIN_WIDTH, rect.w - dx)
    x = rect.x + (rect.w - w)
  }

  if (dir.includes('n')) {
    h = Math.max(MIN_HEIGHT, rect.h - dy)
    y = rect.y + (rect.h - h)
  }

  return { x, y, w, h }
}

interface FloatingLogWindowProps {
  session: LogSession
  zIndex: number
  active: boolean
  onFocus: () => void
  onRectChange: (rect: FloatingRect) => void
  onUpdateOptions: (patch: Partial<LogViewOptions>) => void
  onRangeChange: (range: TimeRange) => void
  onClear: () => void
  onClose: () => void
  onAttach: () => void
  onMaximize: () => void
}

export function FloatingLogWindow({
  session,
  zIndex,
  active,
  onFocus,
  onRectChange,
  onUpdateOptions,
  onRangeChange,
  onClear,
  onClose,
  onAttach,
  onMaximize,
}: FloatingLogWindowProps) {
  const dragging = useRef(false)

  const beginDrag = (event: ReactPointerEvent, mode: 'move' | Direction) => {
    if (event.button !== 0) return

    event.preventDefault()
    onFocus()
    dragging.current = true

    const startX = event.clientX
    const startY = event.clientY
    const startRect = session.rect

    const handleMove = (moveEvent: PointerEvent) => {
      const dx = moveEvent.clientX - startX
      const dy = moveEvent.clientY - startY

      if (mode === 'move') {
        onRectChange({
          ...startRect,
          x: Math.max(-startRect.w + 120, Math.min(window.innerWidth - 120, startRect.x + dx)),
          y: Math.max(0, Math.min(window.innerHeight - 48, startRect.y + dy)),
        })
        return
      }

      onRectChange(resize(startRect, mode, dx, dy))
    }

    const handleUp = () => {
      dragging.current = false
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }

  return (
    <div
      className={[
        'rh-fade-in fixed flex flex-col overflow-hidden rounded-xl border shadow-2xl shadow-black/60',
        'bg-[var(--color-ink-900)]/95 backdrop-blur-xl',
        active ? 'border-[var(--color-ember-500)]/50' : 'border-border',
      ].join(' ')}
      style={{
        left: session.rect.x,
        top: session.rect.y,
        width: session.rect.w,
        height: session.rect.h,
        zIndex,
      }}
      onMouseDown={onFocus}
    >
      {/* Полоса перетаскивания поверх шапки; справа оставлено место под кнопки. */}
      <div
        onPointerDown={(event) => beginDrag(event, 'move')}
        onDoubleClick={onMaximize}
        className="absolute top-0 left-0 z-10 h-9 cursor-grab active:cursor-grabbing"
        style={{ right: 132 }}
      />

      <div className="flex min-h-0 flex-1 flex-col [&>section]:rounded-none [&>section]:border-0">
        <LogPane
          session={session}
          variant="floating"
          active={active}
          onUpdateOptions={onUpdateOptions}
          onRangeChange={onRangeChange}
          onClear={onClear}
          onClose={onClose}
          onAttach={onAttach}
          onMaximize={onMaximize}
        />
      </div>

      {HANDLES.map((handle) => (
        <div
          key={handle.dir}
          onPointerDown={(event) => beginDrag(event, handle.dir)}
          className={`absolute ${handle.className}`}
        />
      ))}
    </div>
  )
}
