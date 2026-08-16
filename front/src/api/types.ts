import type { Container, ContainerStats } from '../types'

/** Контейнер, как его отдаёт бэкенд: без метрик — те приходят отдельным потоком. */
export type ApiContainer = Omit<Container, 'stats' | 'history'>

export interface StatsMessage extends Partial<ContainerStats> {
  id: string
  /** Контейнер остановлен или удалён — метрики больше не придут. */
  gone?: boolean
}

export interface ApiImage {
  id: string
  tags: string[]
  size: number
  createdAt: number
  dangling: boolean
  containers: number
}

export interface JobEvent {
  ts: number
  text: string
  stream: 'stdout' | 'stderr'
}

export interface JobStatus {
  id: string
  kind: 'build' | 'pull'
  state: 'running' | 'success' | 'error'
  startedAt: number
  finishedAt: number | null
  error: string | null
  events: JobEvent[]
}

export interface BuildRequest {
  tag: string
  dockerfile: string
  files?: Record<string, string>
  buildArgs?: Record<string, string>
  noCache?: boolean
  pull?: boolean
}

export interface SystemInfo {
  name: string
  serverVersion: string
  operatingSystem: string
  architecture: string
  cpus: number
  memory: number
  containers: number
  containersRunning: number
  containersStopped: number
  images: number
}

export interface DiskUsage {
  images: number
  containers: number
  volumes: number
  buildCache: number
}

export interface DockerNetwork {
  id: string
  name: string
  driver: string
  scope: string
  internal: boolean
  containers: string[]
  subnets: string[]
}

export interface DockerVolume {
  name: string
  driver: string
  mountpoint: string
  createdAt: string
  size: number
  labels: Record<string, string>
}

export type ContainerAction = 'start' | 'stop' | 'restart' | 'pause' | 'unpause' | 'kill'

export type PruneTarget = 'containers' | 'images' | 'volumes' | 'networks' | 'builder'

export interface PruneCandidate {
  id: string
  name: string
  size: number
  createdAt: number
  image?: string
  status?: string
  driver?: string
  mountpoint?: string
}

export interface PrunePreview {
  containers: PruneCandidate[]
  images: PruneCandidate[]
  volumes: PruneCandidate[]
  networks: PruneCandidate[]
  builder: PruneCandidate[]
  /** Кеш сборки поштучно не разбираем — Docker отдаёт только суммарный размер. */
  builderSize: number
}

export interface PruneResult {
  deleted: number
  reclaimed: number
}
