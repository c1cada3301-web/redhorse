import { useMemo, useState } from 'react'
import { Network } from 'lucide-react'
import { useContainersQuery, useNetworksQuery } from '../../api/queries'
import type { ApiContainer, DockerNetwork } from '../../api/types'
import { NETWORK_GRID, NetworkRow } from './NetworkRow'
import type { NetworkView } from './NetworkRow'

const COLUMNS = ['Сеть', 'Драйвер', 'Область', 'Подсети', 'Контейнеры', '']

/** Знакомые драйверы идут первыми, остальные — как пришли с хоста. */
const DRIVER_ORDER = ['bridge', 'host', 'overlay', 'null', 'macvlan', 'ipvlan']

interface NetworksPageProps {
  search: string
}

/**
 * Список сетей не всегда содержит подключённые контейнеры (Docker отдаёт их
 * только при подробном запросе), поэтому имена добираем из списка контейнеров:
 * у каждого контейнера есть имена его сетей.
 */
function buildViews(networks: DockerNetwork[], containers: ApiContainer[]): NetworkView[] {
  const byNetwork = new Map<string, string[]>()

  for (const container of containers) {
    for (const name of container.networks) {
      byNetwork.set(name, [...(byNetwork.get(name) ?? []), container.name])
    }
  }

  return networks.map((network) => ({
    ...network,
    members: [...new Set([...network.containers, ...(byNetwork.get(network.name) ?? [])])].sort(),
  }))
}

function matches(network: NetworkView, needle: string): boolean {
  if (needle === '') return true

  const haystack = [network.name, network.driver, network.scope, network.id, ...network.subnets, ...network.members]
    .join(' ')
    .toLowerCase()

  return haystack.includes(needle.toLowerCase())
}

export function NetworksPage({ search }: NetworksPageProps) {
  const networksQuery = useNetworksQuery()
  const containersQuery = useContainersQuery()
  const [driver, setDriver] = useState('all')
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set())

  const views = useMemo(
    () => buildViews(networksQuery.data ?? [], containersQuery.data ?? []),
    [networksQuery.data, containersQuery.data],
  )

  const counts = useMemo(() => {
    const map = new Map<string, number>([['all', views.length]])

    for (const view of views) {
      map.set(view.driver, (map.get(view.driver) ?? 0) + 1)
    }

    return map
  }, [views])

  // Чипы строим только из тех драйверов, что реально есть на хосте.
  const drivers = useMemo(() => {
    const present = [...new Set(views.map((view) => view.driver))]

    return present.sort((a, b) => {
      const left = DRIVER_ORDER.indexOf(a)
      const right = DRIVER_ORDER.indexOf(b)

      if (left === right) return a.localeCompare(b)

      return (left === -1 ? DRIVER_ORDER.length : left) - (right === -1 ? DRIVER_ORDER.length : right)
    })
  }, [views])

  const visible = useMemo(
    () => views.filter((view) => (driver === 'all' || view.driver === driver) && matches(view, search)),
    [views, driver, search],
  )

  const attached = views.reduce((sum, view) => sum + view.members.length, 0)

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)

      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }

      return next
    })

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-2 px-4 pt-4">
        {['all', ...drivers].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setDriver(key)}
            className={[
              'flex h-8 items-center gap-2 rounded-lg border px-3 text-[12px] transition-colors',
              driver === key
                ? 'border-[var(--color-ember-500)]/45 bg-[var(--color-ember-500)]/12 text-[var(--color-ember-300)]'
                : 'border-white/8 bg-white/[0.02] text-white/50 hover:text-white/85',
            ].join(' ')}
          >
            {key === 'all' ? 'Все' : key}
            <span className="rounded bg-black/30 px-1 font-[family-name:var(--font-mono)] text-[10px] text-white/40">
              {counts.get(key) ?? 0}
            </span>
          </button>
        ))}

        <span className="ml-auto font-[family-name:var(--font-mono)] text-[11px] text-white/30">
          подключений контейнеров {attached}
        </span>
      </div>

      <div className={`${NETWORK_GRID} shrink-0 px-7 pt-4 pb-2`}>
        {COLUMNS.map((column, index) => (
          <div
            key={column === '' ? `col-${index}` : column}
            className="text-[10px] tracking-wider text-white/25 uppercase"
          >
            {column}
          </div>
        ))}
      </div>

      <div className="rh-scroll min-h-0 flex-1 space-y-1.5 overflow-y-auto px-4 pb-4">
        <NetworksBody
          loading={networksQuery.isLoading}
          error={networksQuery.error}
          visible={visible}
          expanded={expanded}
          onToggle={toggle}
        />
      </div>
    </div>
  )
}

interface NetworksBodyProps {
  loading: boolean
  error: Error | null
  visible: NetworkView[]
  expanded: ReadonlySet<string>
  onToggle: (id: string) => void
}

function NetworksBody({ loading, error, visible, expanded, onToggle }: NetworksBodyProps) {
  if (loading) {
    return <p className="px-3 pt-6 text-sm text-white/35">Загружаем сети…</p>
  }

  if (error !== null) {
    return <p className="px-3 pt-6 text-sm text-[var(--color-danger)]">Не удалось получить сети: {error.message}</p>
  }

  if (visible.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-white/35">
        <Network className="h-6 w-6" />
        <p className="text-sm">Ничего не найдено</p>
      </div>
    )
  }

  return (
    <>
      {visible.map((network) => (
        <NetworkRow
          key={network.id}
          network={network}
          expanded={expanded.has(network.id)}
          onToggle={() => onToggle(network.id)}
        />
      ))}
    </>
  )
}
