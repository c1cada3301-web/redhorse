import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { formatBytes } from '../../lib/format'
import type { PruneGroup } from './groups'
import { hasWork } from './groups'

interface CleanupTileProps {
  group: PruneGroup
  icon: ReactNode
  running: boolean
  /** Пока идёт любая очистка, кнопки остальных плиток блокируем. */
  locked: boolean
  onClean: () => void
}

export function CleanupTile({ group, icon, running, locked, onClean }: CleanupTileProps) {
  const active = hasWork(group)

  return (
    <div className={`rh-panel flex flex-col px-3 py-2.5 ${active ? '' : 'opacity-45'}`}>
      <div className="flex items-center gap-2 text-fg/35">
        <span className={active ? 'text-[var(--color-ember-400)]' : 'text-fg/25'}>{icon}</span>
        <span className="truncate text-[11px]">{group.title}</span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-mono)] text-[20px] text-fg">
          {group.aggregateOnly ? formatBytes(group.size) : group.count}
        </span>
        {!group.aggregateOnly && (
          <span className="font-[family-name:var(--font-mono)] text-[12px] text-[var(--color-ember-300)]">
            {group.size > 0 ? formatBytes(group.size) : '—'}
          </span>
        )}
      </div>

      <p className="mt-0.5 line-clamp-2 min-h-[26px] text-[11px] leading-snug text-fg/30">
        {group.hint}
      </p>

      <button
        type="button"
        disabled={!active || locked}
        onClick={onClean}
        className={[
          'mt-2 flex h-8 items-center justify-center gap-1.5 rounded-lg border text-[12px] transition-colors',
          active && !locked
            ? 'border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20'
            : 'cursor-not-allowed border-fg/8 bg-fg/[0.02] text-fg/25',
        ].join(' ')}
      >
        {running && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {running ? 'Чистим…' : 'Очистить'}
      </button>
    </div>
  )
}
