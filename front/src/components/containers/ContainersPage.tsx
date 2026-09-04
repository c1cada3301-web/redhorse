import { useMemo, useState } from 'react'
import { Layers, ScrollText } from 'lucide-react'
import type { Container, ContainerState } from '../../types'
import type { DockerApi } from '../../state/useDocker'
import type { LogSessionsApi } from '../../state/useLogSessions'
import { formatBytes } from '../../lib/format'
import { ContainerRow, ROW_GRID } from './ContainerRow'
import { FilterMenu } from './FilterMenu'
import {
  DEFAULT_FILTERS,
  applyFilters,
  collectOptions,
  countActive,
  type ContainerFilterState,
} from './filters'

const FILTERS: { key: ContainerState | 'all'; label: string }[] = [
  { key: 'all', label: 'Все' },
  { key: 'running', label: 'Запущенные' },
  { key: 'exited', label: 'Остановленные' },
  { key: 'paused', label: 'На паузе' },
  { key: 'restarting', label: 'Перезапуск' },
]

const COLUMNS = ['Контейнер', 'Статус', 'CPU', 'Память', 'Сеть', 'Диск I/O', 'Размер', 'Аптайм', '']

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
  const [filter, setFilter] = useState<ContainerState | 'all'>('all')
  const [filters, setFilters] = useState<ContainerFilterState>(DEFAULT_FILTERS)

  const options = useMemo(() => collectOptions(docker.containers), [docker.containers])

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
          <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            className={[
              'flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] transition-colors',
              filter === item.key
                ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
                : 'border-fg/8 bg-fg/[0.02] text-fg/50 hover:text-fg/85',
            ].join(' ')}
          >
            {item.label}
            <span className="rounded bg-bg/30 px-1 font-[family-name:var(--font-mono)] text-[10px] text-fg/40">
              {counts.get(item.key) ?? 0}
            </span>
          </button>
        ))}

        <FilterMenu value={filters} onChange={setFilters} options={options} />

        <div className="ml-auto flex items-center gap-2">
          <span className="font-[family-name:var(--font-mono)] text-[11px] text-fg/30">
            всего на диске {formatBytes(totalSize)}
          </span>

          <button
            type="button"
            onClick={() => running.forEach((container) => logs.open(container))}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-fg/10 bg-fg/5 px-3 text-[12px] text-fg/70 transition-colors hover:border-[var(--color-ember-500)]/40 hover:text-[var(--color-ember-300)]"
          >
            <Layers className="h-3.5 w-3.5" />
            Открыть логи всех запущенных
          </button>
        </div>
      </div>

      <div className={`${ROW_GRID} shrink-0 px-7 pt-4 pb-2`}>
        {COLUMNS.map((column, index) => (
          <div
            key={column === '' ? `col-${index}` : column}
            className={[
              'text-[10px] tracking-wider text-fg/25 uppercase',
              index >= 6 && index <= 7 ? 'text-right' : '',
            ].join(' ')}
          >
            {column}
          </div>
        ))}
      </div>

      <div className="rh-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
        {visible.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-fg/35">
            <ScrollText className="h-6 w-6" />
            <p className="text-sm">Ничего не найдено</p>
            {countActive(filters) > 0 && (
              <button
                type="button"
                onClick={() => setFilters({ ...DEFAULT_FILTERS, sort: filters.sort, desc: filters.desc })}
                className="text-[12px] text-[var(--color-ember-300)] transition-colors hover:text-[var(--color-ember-400)]"
              >
                Сбросить фильтры
              </button>
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
  )
}
