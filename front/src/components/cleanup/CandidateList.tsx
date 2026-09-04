import { ChevronDown, ChevronRight } from 'lucide-react'
import type { PruneCandidate } from '../../api/types'
import { formatBytes, shortId } from '../../lib/format'
import type { PruneGroup } from './groups'
import { formatCreated } from './groups'
import { useT } from '@/state/settings'

const ROW_GRID =
  'grid grid-cols-[minmax(160px,1.3fr)_minmax(150px,1.6fr)_104px_130px_86px] items-center gap-3'

/** Вторая колонка зависит от типа: у контейнера образ, у тома — точка монтирования. */
function detailOf(target: PruneGroup['target'], candidate: PruneCandidate): string {
  if (target === 'containers') return candidate.image ?? '—'
  if (target === 'volumes') return candidate.mountpoint ?? '—'
  if (target === 'networks') return candidate.driver ?? '—'

  return shortId(candidate.id)
}

interface CandidateListProps {
  group: PruneGroup
  expanded: boolean
  onToggle: () => void
}

export function CandidateList({ group, expanded, onToggle }: CandidateListProps) {
  const t = useT()
  return (
    <section className="rh-panel overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-fg/[0.02]"
      >
        <span className="text-muted-foreground">
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>

        <span className="text-base text-foreground/90">{group.title}</span>

        <span className="rounded bg-bg/30 px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-2xs text-muted-foreground">
          {group.count}
        </span>

        <span className="ml-auto font-[family-name:var(--font-mono)] text-sm text-[var(--color-ember-300)]">
          {group.size > 0 ? formatBytes(group.size) : '—'}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-border px-3 pt-2 pb-3">
          <div className={`${ROW_GRID} px-3 pb-1.5`}>
            {['cleanup.col.name', detailColumn(group.target), 'cleanup.col.status', 'cleanup.col.created', 'cleanup.col.size'].map((column) => (
              <div key={column} className="text-2xs tracking-wider text-muted-foreground uppercase">
                {t(column)}
              </div>
            ))}
          </div>

          <div className="space-y-1">
            {group.candidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`${ROW_GRID} rounded-md bg-foreground/3 px-3 py-2 transition-colors hover:border-border`}
              >
                <span
                  title={candidate.name}
                  className="truncate font-[family-name:var(--font-mono)] text-sm text-foreground/90"
                >
                  {candidate.name === '' ? shortId(candidate.id) : candidate.name}
                </span>

                <span
                  title={detailOf(group.target, candidate)}
                  className="truncate font-[family-name:var(--font-mono)] text-xs text-muted-foreground"
                >
                  {detailOf(group.target, candidate)}
                </span>

                <span className="truncate text-xs text-muted-foreground">{candidate.status ?? '—'}</span>

                <span className="font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
                  {formatCreated(candidate.createdAt)}
                </span>

                <span className="text-right font-[family-name:var(--font-mono)] text-xs text-foreground/75">
                  {candidate.size > 0 ? formatBytes(candidate.size) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  )
}

function detailColumn(target: PruneGroup['target']): string {
  if (target === 'containers') return 'cleanup.col.image'
  if (target === 'volumes') return 'cleanup.col.mountpoint'
  if (target === 'networks') return 'cleanup.col.driver'

  return 'ID'
}
