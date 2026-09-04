import { useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useT } from '@/state/settings'

export interface Toast {
  id: number
  text: string
  tone: 'error' | 'info'
}

/** Через сколько само пропадает уведомление. */
const LIFETIME_MS = 8000

interface ToastsProps {
  items: Toast[]
  onDismiss: (id: number) => void
}

export function Toasts({ items, onDismiss }: ToastsProps) {
  const t = useT()
  useEffect(() => {
    if (items.length === 0) return

    const timers = items.map((item) => window.setTimeout(() => onDismiss(item.id), LIFETIME_MS))
    return () => timers.forEach((timer) => window.clearTimeout(timer))
  }, [items, onDismiss])

  if (items.length === 0) return null

  return (
    <div className="pointer-events-none fixed right-4 bottom-4 z-100 flex w-[min(420px,calc(100vw-2rem))] flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={[
            'rh-panel rh-fade-in pointer-events-auto flex items-start gap-2 px-3 py-2.5',
            item.tone === 'error' ? 'border-[var(--color-danger)]/35' : '',
          ].join(' ')}
        >
          <span
            className={
              item.tone === 'error' ? 'text-[var(--color-danger)]' : 'text-[var(--color-sky-400)]'
            }
          >
            <AlertTriangle className="mt-0.5 h-4 w-4" />
          </span>

          <p className="min-w-0 flex-1 text-sm leading-relaxed break-words text-fg/75">
            {item.text}
          </p>

          <button
            type="button"
            onClick={() => onDismiss(item.id)}
            aria-label={t('common.hide')}
            className="text-fg/30 transition-colors hover:text-fg"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
