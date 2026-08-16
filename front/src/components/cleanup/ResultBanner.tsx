import { CircleCheck, TriangleAlert } from 'lucide-react'
import { formatBytes } from '../../lib/format'

export interface CleanupOutcome {
  deleted: number
  reclaimed: number
}

interface ResultBannerProps {
  result: CleanupOutcome | null
  error: string | null
}

/** Плашка итога: держится несколько секунд, таймер живёт в CleanupPage. */
export function ResultBanner({ result, error }: ResultBannerProps) {
  if (error !== null) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[var(--color-danger)]/40 bg-[var(--color-danger)]/12 px-3 py-2.5 text-[13px] text-[var(--color-danger)]">
        <TriangleAlert className="h-4 w-4 shrink-0" />
        <span className="truncate">Очистка не удалась: {error}</span>
      </div>
    )
  }

  if (result === null) return null

  return (
    <div className="flex items-center gap-2 rounded-xl border border-[var(--color-mint-400)]/40 bg-[var(--color-mint-400)]/12 px-3 py-2.5 text-[13px] text-[var(--color-mint-400)]">
      <CircleCheck className="h-4 w-4 shrink-0" />
      <span>
        Удалено объектов:{' '}
        <span className="font-[family-name:var(--font-mono)]">{result.deleted}</span>, освобождено{' '}
        <span className="font-[family-name:var(--font-mono)]">{formatBytes(result.reclaimed)}</span>
      </span>
    </div>
  )
}
