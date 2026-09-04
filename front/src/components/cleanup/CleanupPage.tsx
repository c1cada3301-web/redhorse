import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Boxes,
  Database,
  Hammer,
  HardDrive,
  Layers,
  Loader2,
  Network,
  RefreshCw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from 'lucide-react'
import { useDiskUsage, usePrune, usePrunePreview } from '../../api/queries'
import type { PruneTarget } from '../../api/types'
import { formatBytes } from '../../lib/format'
import { ConfirmDialog } from '../ui/ConfirmDialog'
import { CandidateList } from './CandidateList'
import { CleanupTile } from './CleanupTile'
import { ImagePruneDialog } from './ImagePruneDialog'
import { ResultBanner } from './ResultBanner'
import type { CleanupOutcome } from './ResultBanner'
import type { PruneGroup } from './groups'
import {
  PRUNE_ORDER,
  buildGroups,
  describeGroups,
  hasWork,
  pruneErrorText,
  totalCandidates,
  totalReclaimable,
} from './groups'
import { useT } from '@/state/settings'

const ICONS: Record<PruneTarget, ReactNode> = {
  containers: <Boxes className="h-4 w-4" />,
  images: <Layers className="h-4 w-4" />,
  volumes: <Database className="h-4 w-4" />,
  networks: <Network className="h-4 w-4" />,
  builder: <Hammer className="h-4 w-4" />,
}

/** Сколько плашка результата висит на экране. */
const BANNER_MS = 6000

type Scope = PruneTarget | 'all'

export function CleanupPage() {
  const t = useT()
  const preview = usePrunePreview()
  const disk = useDiskUsage()
  const prune = usePrune()

  const [expanded, setExpanded] = useState<ReadonlySet<PruneTarget>>(() => new Set())
  const [pending, setPending] = useState<Scope | null>(null)
  const [running, setRunning] = useState<Scope | null>(null)
  const [allUnused, setAllUnused] = useState(false)
  const [result, setResult] = useState<CleanupOutcome | null>(null)
  const [error, setError] = useState<string | null>(null)

  const groups = useMemo(
    () => (preview.data === undefined ? [] : buildGroups(preview.data)),
    [preview.data],
  )

  const total = totalReclaimable(groups)
  const candidates = totalCandidates(groups)
  const occupied =
    disk.data === undefined
      ? 0
      : disk.data.images + disk.data.containers + disk.data.volumes + disk.data.buildCache

  const pendingGroup = groups.find((group) => group.target === pending)
  const workGroups = groups.filter(hasWork)

  // Плашка итога уходит сама — держать её на экране незачем.
  useEffect(() => {
    if (result === null && error === null) return

    const timer = setTimeout(() => {
      setResult(null)
      setError(null)
    }, BANNER_MS)

    return () => clearTimeout(timer)
  }, [result, error])

  function toggle(target: PruneTarget) {
    setExpanded((current) => {
      const next = new Set(current)

      if (next.has(target)) next.delete(target)
      else next.add(target)

      return next
    })
  }

  async function run(scope: Scope) {
    const targets =
      scope === 'all'
        ? PRUNE_ORDER.filter((target) => workGroups.some((group) => group.target === target))
        : [scope]

    setRunning(scope)
    setError(null)
    setResult(null)

    try {
      // Последовательно, чтобы Docker не спорил сам с собой из-за зависимостей.
      const outcome = await targets.reduce(
        async (accPromise, target) => {
          const acc = await accPromise
          const step = await prune.mutateAsync({
            target,
            allUnused: target === 'images' ? allUnused : false,
          })

          return { deleted: acc.deleted + step.deleted, reclaimed: acc.reclaimed + step.reclaimed }
        },
        Promise.resolve<CleanupOutcome>({ deleted: 0, reclaimed: 0 }),
      )

      setResult(outcome)
    } catch (cause) {
      setError(pruneErrorText(cause))
    } finally {
      setRunning(null)
    }
  }

  if (preview.isPending) {
    return <Centered icon={<Loader2 className="h-5 w-5 animate-spin" />} text={t('cleanup.counting')} />
  }

  if (preview.data === undefined) {
    return (
      <Centered
        icon={<TriangleAlert className="h-5 w-5 text-[var(--color-danger)]" />}
        text={pruneErrorText(preview.error)}
        action={
          <button
            type="button"
            onClick={() => void preview.refetch()}
            className="mt-3 flex h-8 items-center gap-1.5 rounded-lg border border-border bg-fg/5 px-3 text-sm text-foreground/75 transition-colors hover:text-foreground"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Повторить
          </button>
        }
      />
    )
  }

  const locked = running !== null

  return (
    <div className="rh-scroll h-full space-y-3 overflow-y-auto p-4">
      <ResultBanner result={result} error={error} />

      <div className="rh-panel flex flex-wrap items-end gap-4 px-4 py-3">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-[var(--color-ember-400)]">
              <Trash2 className="h-4 w-4" />
            </span>
            <span className="text-xs">{t('cleanup.freeable')}</span>
          </div>
          <div className="mt-1 font-[family-name:var(--font-mono)] text-3xl leading-none text-[var(--color-ember-300)]">
            {formatBytes(total)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {candidates > 0 ? t('cleanup.candidates', { count: candidates }) : t('cleanup.noNamed')}
          </div>
        </div>

        <div className="ml-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-muted-foreground">
              <HardDrive className="h-4 w-4" />
            </span>
            <span className="text-xs">{t('cleanup.usedNow')}</span>
          </div>
          <div className="mt-1 font-[family-name:var(--font-mono)] text-2xl leading-none text-foreground/90">
            {disk.data === undefined ? '—' : formatBytes(occupied)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            {occupied > 0 ? `освободится ${((total / occupied) * 100).toFixed(0)}%` : '—'}
          </div>
        </div>

        <button
          type="button"
          disabled={workGroups.length === 0 || locked}
          onClick={() => setPending('all')}
          className={[
            'ml-auto flex h-9 items-center gap-2 rounded-lg border px-4 text-base transition-colors',
            workGroups.length > 0 && !locked
              ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)] hover:bg-[var(--color-ember-500)]/22'
              : 'cursor-not-allowed border-border bg-fg/[0.02] text-muted-foreground',
          ].join(' ')}
        >
          {running === 'all' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Trash2 className="h-4 w-4" />
          )}
          Очистить всё
        </button>
      </div>

      {workGroups.length === 0 ? (
        <Centered
          icon={<Sparkles className="h-5 w-5 text-[var(--color-mint-400)]" />}
          text={t('cleanup.clean')}
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {groups.map((group) => (
              <CleanupTile
                key={group.target}
                group={group}
                icon={ICONS[group.target]}
                running={running === group.target}
                locked={locked}
                onClean={() => setPending(group.target)}
              />
            ))}
          </div>

          <div className="space-y-2">
            {groups
              .filter((group) => !group.aggregateOnly && group.count > 0)
              .map((group) => (
                <CandidateList
                  key={group.target}
                  group={group}
                  expanded={expanded.has(group.target)}
                  onToggle={() => toggle(group.target)}
                />
              ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={pending !== null && pending !== 'all' && pending !== 'images'}
        title={`Очистить: ${pendingGroup?.title.toLowerCase() ?? ''}`}
        description={t('cleanup.warning')}
        subject={pendingGroup === undefined ? '' : subjectOf(pendingGroup)}
        confirmLabel="Очистить"
        onConfirm={() => {
          if (pending !== null) void run(pending)
        }}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      />

      <ImagePruneDialog
        open={pending === 'all' || pending === 'images'}
        title={pending === 'all' ? t('cleanup.runAll') : t('cleanup.runImages')}
        description={t('cleanup.warning')}
        subject={
          pending === 'all'
            ? `${describeGroups(groups)} · освободится ${formatBytes(total)}`
            : pendingGroup === undefined
              ? ''
              : subjectOf(pendingGroup)
        }
        allUnused={allUnused}
        onAllUnusedChange={setAllUnused}
        onConfirm={() => {
          if (pending !== null) void run(pending)
        }}
        onOpenChange={(open) => {
          if (!open) setPending(null)
        }}
      />
    </div>
  )
}

/** Точный предмет удаления для диалога: у кеша сборки счёта объектов нет. */
function subjectOf(group: PruneGroup): string {
  return group.aggregateOnly
    ? `весь кеш сборки · освободится ${formatBytes(group.size)}`
    : `${group.count} шт. · освободится ${formatBytes(group.size)}`
}

function Centered({ icon, text, action }: { icon: ReactNode; text: string; action?: ReactNode }) {
  return (
    <div className="flex h-full min-h-[220px] items-center justify-center p-8">
      <div className="rh-panel flex max-w-md flex-col items-center px-8 py-7 text-center">
        <span className="text-muted-foreground">{icon}</span>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">{text}</p>
        {action}
      </div>
    </div>
  )
}
