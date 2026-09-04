import type { Container } from '../../types'

export type SortKey = 'name' | 'state' | 'cpu' | 'mem' | 'net' | 'blk' | 'size' | 'uptime' | 'restarts'
export type HealthFilter = 'any' | 'healthy' | 'unhealthy' | 'starting' | 'none'

export interface ContainerFilterState {
  /** null — без ограничения по этому признаку. */
  stack: string | null
  image: string | null
  network: string | null
  health: HealthFilter
  /** Только контейнеры с проброшенными наружу портами. */
  publishedOnly: boolean
  sort: SortKey
  desc: boolean
}

export const DEFAULT_FILTERS: ContainerFilterState = {
  stack: null,
  image: null,
  network: null,
  health: 'any',
  publishedOnly: false,
  sort: 'name',
  desc: false,
}

/** Образ без тега: `postgres:17-alpine` → `postgres`. Тегов у одного образа много, группировать удобнее по имени. */
export function imageName(image: string): string {
  const withoutDigest = image.split('@')[0]
  const lastColon = withoutDigest.lastIndexOf(':')
  const lastSlash = withoutDigest.lastIndexOf('/')
  return lastColon > lastSlash ? withoutDigest.slice(0, lastColon) : withoutDigest
}

/** Сколько ограничений выбрано — число на значке воронки. Сортировка ограничением не считается. */
export function countActive(filters: ContainerFilterState): number {
  return [
    filters.stack !== null,
    filters.image !== null,
    filters.network !== null,
    filters.health !== 'any',
    filters.publishedOnly,
  ].filter(Boolean).length
}

export interface FilterOptions {
  stacks: string[]
  images: string[]
  networks: string[]
}

/** Списки для выпадающих меню собираем из того, что реально есть на хосте. */
export function collectOptions(containers: Container[]): FilterOptions {
  const stacks = new Set<string>()
  const images = new Set<string>()
  const networks = new Set<string>()

  for (const container of containers) {
    if (container.stack !== null && container.stack !== '') stacks.add(container.stack)
    images.add(imageName(container.image))
    for (const network of container.networks) networks.add(network)
  }

  const sorted = (values: Set<string>) => [...values].sort((a, b) => a.localeCompare(b))
  return { stacks: sorted(stacks), images: sorted(images), networks: sorted(networks) }
}

function uptimeOf(container: Container): number {
  // Остановленные аптайма не имеют — держим их в конце при любой сортировке по времени.
  return container.startedAt === null ? 0 : container.startedAt
}

function compare(a: Container, b: Container, key: SortKey): number {
  switch (key) {
    case 'state':
      return a.state.localeCompare(b.state)
    case 'cpu':
      return a.stats.cpu - b.stats.cpu
    case 'net':
      return a.stats.netRx + a.stats.netTx - (b.stats.netRx + b.stats.netTx)
    case 'blk':
      return a.stats.blkRead + a.stats.blkWrite - (b.stats.blkRead + b.stats.blkWrite)
    case 'mem':
      return a.stats.mem - b.stats.mem
    case 'size':
      return a.sizeRootFs - b.sizeRootFs
    case 'uptime':
      return uptimeOf(a) - uptimeOf(b)
    case 'restarts':
      return a.restarts - b.restarts
    default:
      return a.name.localeCompare(b.name)
  }
}

export function applyFilters(containers: Container[], filters: ContainerFilterState): Container[] {
  const kept = containers.filter((container) => {
    if (filters.stack !== null && container.stack !== filters.stack) return false
    if (filters.image !== null && imageName(container.image) !== filters.image) return false
    if (filters.network !== null && !container.networks.includes(filters.network)) return false
    if (filters.health !== 'any' && container.health !== filters.health) return false
    if (filters.publishedOnly && container.ports.length === 0) return false
    return true
  })

  // Копия: sort мутирует массив, а исходный список приходит из состояния.
  const sorted = [...kept].sort((a, b) => compare(a, b, filters.sort))
  return filters.desc ? sorted.reverse() : sorted
}
