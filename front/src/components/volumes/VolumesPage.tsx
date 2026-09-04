import { useMemo, useState } from 'react'
import { HardDrive } from 'lucide-react'
import { useVolumesQuery } from '../../api/queries'
import type { DockerVolume } from '../../api/types'
import { formatBytes } from '../../lib/format'
import { VOLUME_GRID, VolumeRow, isOrphan } from './VolumeRow'
import { useT } from '@/state/settings'

type Filter = 'all' | 'used' | 'orphan'

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'all', label: 'common.all' },
  { key: 'used', label: 'volumes.filter.used' },
  { key: 'orphan', label: 'volumes.filter.orphan' },
]

const COLUMNS = [
  'volumes.col.volume',
  'volumes.col.driver',
  'volumes.col.size',
  'volumes.col.created',
  'volumes.col.mountpoint',
]

interface VolumesPageProps {
  search: string
}

function matches(volume: DockerVolume, needle: string): boolean {
  if (needle === '') return true

  const haystack = [volume.name, volume.driver, volume.mountpoint, ...Object.values(volume.labels)]
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle.toLowerCase())
}

function inFilter(volume: DockerVolume, filter: Filter): boolean {
  if (filter === 'all') return true
  if (filter === 'orphan') return isOrphan(volume)

  return !isOrphan(volume)
}

export function VolumesPage({ search }: VolumesPageProps) {
  const t = useT()
  const query = useVolumesQuery()
  const [filter, setFilter] = useState<Filter>('all')

  const volumes = useMemo(() => query.data ?? [], [query.data])

  const counts = useMemo(() => {
    const map = new Map<Filter, number>([
      ['all', volumes.length],
      ['orphan', volumes.filter(isOrphan).length],
    ])

    map.set('used', volumes.length - (map.get('orphan') ?? 0))

    return map
  }, [volumes])

  const visible = useMemo(
    () => volumes.filter((volume) => inFilter(volume, filter) && matches(volume, search)),
    [volumes, filter, search],
  )

  const totalSize = volumes.reduce((sum, volume) => sum + volume.size, 0)

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pt-4">
        {FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={[
              'flex h-8 items-center gap-2 rounded-lg border px-3 text-sm transition-colors',
              filter === item.key
                ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
                : 'border-border bg-fg/[0.02] text-muted-foreground hover:text-foreground/90',
            ].join(' ')}
          >
            {t(item.label)}
            <span className="rounded bg-bg/30 px-1 font-[family-name:var(--font-mono)] text-2xs text-muted-foreground">
              {counts.get(item.key) ?? 0}
            </span>
          </button>
        ))}

        <span className="ml-auto font-[family-name:var(--font-mono)] text-xs text-muted-foreground">
          суммарный размер {formatBytes(totalSize)}
        </span>
      </div>

      <div className={`${VOLUME_GRID} shrink-0 px-7 pt-4 pb-2`}>
        {COLUMNS.map((column) => (
          <div key={column} className="text-2xs tracking-wider text-muted-foreground uppercase">
            {t(column)}
          </div>
        ))}
      </div>

      <div className="rh-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        <VolumesBody loading={query.isLoading} error={query.error} visible={visible} />
      </div>
    </div>
  )
}

interface VolumesBodyProps {
  loading: boolean
  error: Error | null
  visible: DockerVolume[]
}

function VolumesBody({ loading, error, visible }: VolumesBodyProps) {
  const t = useT()
  if (loading) {
    return <p className="px-3 pt-6 text-sm text-muted-foreground">{t('volumes.loading')}</p>
  }

  if (error !== null) {
    return <p className="px-3 pt-6 text-sm text-[var(--color-danger)]">{t('volumes.error', { message: error.message })}</p>
  }

  if (visible.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
        <HardDrive className="h-6 w-6" />
        <p className="text-sm">{t('common.empty')}</p>
      </div>
    )
  }

  return (
    <>
      {visible.map((volume) => (
        <VolumeRow key={volume.name} volume={volume} />
      ))}
    </>
  )
}
