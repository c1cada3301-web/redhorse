import { ApiError } from '../../api/client'
import type { PruneCandidate, PrunePreview, PruneTarget } from '../../api/types'

/** Один тип объектов на странице очистки: плитка + список кандидатов. */
export interface PruneGroup {
  target: PruneTarget
  title: string
  /** Короткое пояснение: что именно попадает под удаление. */
  hint: string
  candidates: PruneCandidate[]
  count: number
  size: number
  /** Кеш сборки поштучно не разбирается — только суммарный размер. */
  aggregateOnly: boolean
}

const TITLES: Record<PruneTarget, string> = {
  containers: 'Контейнеры',
  images: 'Образы без тега',
  volumes: 'Тома',
  networks: 'Сети',
  builder: 'Кеш сборки',
}

const HINTS: Record<PruneTarget, string> = {
  containers: 'остановленные и завершённые',
  images: 'висячие слои <none>, не занятые контейнерами',
  volumes: 'не подключены ни к одному контейнеру',
  networks: 'без подключённых контейнеров',
  builder: 'Docker отдаёт только суммарный размер — поимённого списка слоёв нет',
}

/** Порядок обхода при «Очистить всё»: сначала мелочь, кеш сборки последним. */
export const PRUNE_ORDER: PruneTarget[] = ['containers', 'networks', 'images', 'volumes', 'builder']

function sumSize(candidates: PruneCandidate[]): number {
  return candidates.reduce((sum, item) => sum + item.size, 0)
}

function listGroup(target: PruneTarget, candidates: PruneCandidate[]): PruneGroup {
  return {
    target,
    title: TITLES[target],
    hint: HINTS[target],
    candidates,
    count: candidates.length,
    size: sumSize(candidates),
    aggregateOnly: false,
  }
}

export function buildGroups(preview: PrunePreview): PruneGroup[] {
  return [
    listGroup('containers', preview.containers),
    listGroup('images', preview.images),
    listGroup('volumes', preview.volumes),
    listGroup('networks', preview.networks),
    {
      target: 'builder',
      title: TITLES.builder,
      hint: HINTS.builder,
      candidates: [],
      count: preview.builder.length,
      size: preview.builderSize,
      aggregateOnly: true,
    },
  ]
}

/** Плитку имеет смысл жать, если есть что удалять: объекты или занятые байты. */
export function hasWork(group: PruneGroup): boolean {
  return group.count > 0 || group.size > 0
}

export function totalReclaimable(groups: PruneGroup[]): number {
  return groups.reduce((sum, group) => sum + group.size, 0)
}

export function totalCandidates(groups: PruneGroup[]): number {
  return groups.reduce((sum, group) => sum + group.count, 0)
}

/** «Контейнеров: 3, томов: 8» — текст для диалога подтверждения. */
export function describeGroups(groups: PruneGroup[]): string {
  const parts = groups
    .filter(hasWork)
    .map((group) => `${group.title.toLowerCase()} — ${group.aggregateOnly ? 'весь' : group.count}`)

  return parts.length === 0 ? 'нечего удалять' : parts.join(', ')
}

/** «16.08.2026 20:33» из unix-времени в миллисекундах; 0 — время неизвестно. */
export function formatCreated(ts: number): string {
  if (!Number.isFinite(ts) || ts <= 0) return '—'

  const date = new Date(ts)
  if (Number.isNaN(date.getTime())) return '—'

  const pad = (value: number) => String(value).padStart(2, '0')

  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`
}

/** Человекочитаемая ошибка мутации: причина лежит в `detail` ответа. */
export function pruneErrorText(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message

  return 'Не удалось выполнить очистку'
}
