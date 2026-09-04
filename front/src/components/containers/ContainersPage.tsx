import { useMemo, useState } from 'react'
import { Layers, ScrollText } from 'lucide-react'
import type { Container, ContainerState } from '../../types'
import type { DockerApi } from '../../state/useDocker'
import type { LogSessionsApi } from '../../state/useLogSessions'
import { formatBytes } from '../../lib/format'
import { ContainerRow, ROW_GRID } from './ContainerRow'
import { Button } from '@/components/ui/button'
import { useT } from '@/state/settings'
import { ColumnHeader } from './ColumnHeader'
import type { SortKey } from './filters'
import { FilterMenu } from './FilterMenu'
import {
  DEFAULT_FILTERS,
  applyFilters,
  collectOptions,
  countActive,
  type ContainerFilterState,
} from './filters'

const FILTERS: { key: ContainerState | 'all'; labelKey: string }[] = [
  { key: 'all', labelKey: 'containers.filter.all' },
  { key: 'running', labelKey: 'containers.filter.running' },
  { key: 'exited', labelKey: 'containers.filter.exited' },
  { key: 'paused', labelKey: 'containers.filter.paused' },
  { key: 'restarting', labelKey: 'containers.filter.restarting' },
]

interface Column {
  labelKey: string
  /** Без ключа колонка не сортируется — например блок кнопок справа. */
  sort?: SortKey
  align?: 'left' | 'right'
}

const COLUMNS: Column[] = [
  { labelKey: 'containers.col.container', sort: 'name' },
  { labelKey: 'containers.col.status', sort: 'state' },
  { labelKey: 'containers.col.cpu', sort: 'cpu' },
  { labelKey: 'containers.col.memory', sort: 'mem' },
  { labelKey: 'containers.col.net', sort: 'net' },
  { labelKey: 'containers.col.disk', sort: 'blk' },
  { labelKey: 'containers.col.size', sort: 'size', align: 'right' },
  { labelKey: 'containers.col.uptime', sort: 'uptime', align: 'right' },
  { labelKey: '' },
]

interface ContainersPageProps {
  docker: DockerApi
  logs: LogSessionsApi
  search: string
  onOpenDetails: (containerId: string) => void
}

function matches(container: Container, needle: string): boolean {
  if (needle === '') return true

  const haystack = [
    container.name,
    container.image,
    container.id,
    container.stack ?? '',
    ...container.ports,
    ...container.networks,
  ]
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle.toLowerCase())
}

export function ContainersPage({ docker, logs, search, onOpenDetails }: ContainersPageProps) {
  const t = useT()
  const [filter, setFilter] = useState<ContainerState | 'all'>('all')
  const [filters, setFilters] = useState<ContainerFilterState>(DEFAULT_FILTERS)

  const options = useMemo(() => collectOptions(docker.containers), [docker.containers])

  const sortBy = (key: SortKey) => {
    setFilters((current) =>
      current.sort === key ? { ...current, desc: !current.desc } : { ...current, sort: key, desc: false },
    )
  }

  const visible = useMemo(() => {
    const byStateAndSearch = docker.containers.filter(
      (container) => (filter === 'all' || container.state === filter) && matches(container, search),
    )
    return applyFilters(byStateAndSearch, filters)
  }, [docker.containers, filter, search, filters])

  const running = docker.containers.filter((container) => container.state === 'running')
  const totalSize = docker.containers.reduce((sum, container) => sum + container.sizeRootFs, 0)

  const counts = useMemo(() => {
    const map = new Map<ContainerState | 'all', number>()
    map.set('all', docker.containers.length)

    for (const container of docker.containers) {
      map.set(container.state, (map.get(container.state) ?? 0) + 1)
    }

    return map
  }, [docker.containers])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pt-4">
        {FILTERS.map((item) => (
          <Button
            key={item.key}
            variant={filter === item.key ? 'default' : 'outline'}
            onClick={() => setFilter(item.key)}
          >
            {t(item.labelKey)}
            <span
              className={[
                'rounded px-1 font-mono text-2xs',
                filter === item.key ? 'bg-black/20' : 'bg-foreground/8 text-muted-foreground',
              ].join(' ')}
            >
              {counts.get(item.key) ?? 0}
            </span>
          </Button>
        ))}

        <FilterMenu value={filters} onChange={setFilters} options={options} />

        <div className="ml-auto flex items-center gap-2">
          <span className="font-mono text-xs text-muted-foreground">
            {t('containers.diskTotal', { size: formatBytes(totalSize) })}
          </span>

          <Button variant="outline" onClick={() => running.forEach((container) => logs.open(container))}>
            <Layers />
            {t('containers.openAllLogs')}
          </Button>
        </div>
      </div>

      <div className="rh-scroll min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {/* Шапка внутри той же прокрутки, что и строки: только так ширина
            колонок совпадает — иначе полосу прокрутки видят строки, но не она. */}
        <div
          className={`${ROW_GRID} sticky top-0 z-10 border-x border-b border-x-transparent border-b-border bg-background/92 px-3 pt-4 pb-2 backdrop-blur`}
        >
          {COLUMNS.map((column, index) => (
            <ColumnHeader
              key={column.labelKey === '' ? `col-${index}` : column.labelKey}
              label={column.labelKey === '' ? '' : t(column.labelKey)}
              sortKey={column.sort}
              align={column.align}
              active={filters.sort}
              desc={filters.desc}
              onSort={sortBy}
              className={column.align === 'right' ? 'justify-self-end' : ''}
            />
          ))}
        </div>

        <div>
        {visible.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
            <ScrollText className="h-6 w-6" />
            <p className="text-sm">{t('common.empty')}</p>
            {countActive(filters) > 0 && (
              <Button
                variant="link"
                size="sm"
                onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort, desc: filters.desc })}
              >
                {t('containers.resetFilters')}
              </Button>
            )}
          </div>
        ) : (
          visible.map((container) => (
            <ContainerRow
              key={container.id}
              container={container}
              logsOpen={logs.isOpen(container.id)}
              onOpenLogs={() => logs.open(container)}
              onOpenDetails={() => onOpenDetails(container.id)}
              onStart={() => docker.start(container.id)}
              onStop={() => docker.stop(container.id)}
              onRestart={() => docker.restart(container.id)}
              onPause={() => docker.pause(container.id)}
              onRemove={() => docker.remove(container.id)}
            />
            ))
          )}
        </div>
      </div>
    </div>
  )
}
