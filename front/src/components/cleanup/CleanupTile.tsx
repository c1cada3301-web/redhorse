import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'
import { formatBytes } from '../../lib/format'
import type { PruneGroup } from './groups'
import { hasWork } from './groups'
import { useT } from '@/state/settings'

interface CleanupTileProps {
  group: PruneGroup
  icon: ReactNode
  running: boolean
  /** Пока идёт любая очистка, кнопки остальных плиток блокируем. */
  locked: boolean
  onClean: () => void
}

export function CleanupTile({ group, icon, running, locked, onClean }: CleanupTileProps) {
  const t = useT()
  const active = hasWork(group)

  return (
    <div className={`rh-panel flex flex-col px-3 py-2.5 ${active ? '' : 'opacity-45'}`}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className={active ? 'text-[var(--color-ember-400)]' : 'text-muted-foreground'}>{icon}</span>
        <span className="truncate text-xs">{group.title}</span>
      </div>

      <div className="mt-1 flex items-baseline gap-2">
        <span className="font-[family-name:var(--font-mono)] text-2xl text-foreground">
          {group.aggregateOnly ? formatBytes(group.size) : group.count}
        </span>
        {!group.aggregateOnly && (
          <span className="font-[family-name:var(--font-mono)] text-sm text-[var(--color-ember-300)]">
            {group.size > 0 ? formatBytes(group.size) : '—'}
          </span>
        )}
      </div>

      <p className="mt-0.5 line-clamp-2 min-h-[26px] text-xs leading-snug text-muted-foreground">
        {group.hint}
      </p>

      <button
        type="button"
        disabled={!active || locked}
        onClick={onClean}
        className={[
          'mt-2 flex h-8 items-center justify-center gap-1.5 rounded-lg border text-sm transition-colors',
          active && !locked
            ? 'border-[var(--color-danger)]/35 bg-[var(--color-danger)]/10 text-[var(--color-danger)] hover:bg-[var(--color-danger)]/20'
            : 'cursor-not-allowed border-border bg-fg/[0.02] text-muted-foreground',
        ].join(' ')}
      >
        {running && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {running ? t('cleanup.working') : t('cleanup.run')}
      </button>
    </div>
  )
}
