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

/** Откуда брать контекст сборки: редактор в браузере или адрес репозитория. */
export type BuildSource = 'editor' | 'url'

export interface BuildRequest {
  tag: string
  /** Дополнительные теги: Docker при сборке принимает один, остальные вешаются следом. */
  extraTags?: string[]
  source?: BuildSource
  dockerfile?: string
  files?: Record<string, string>
  /** source=url: адрес git-репозитория или tar-архива. */
  contextUrl?: string
  /** Путь к Dockerfile внутри контекста, если он не в корне. */
  dockerfilePath?: string
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

export interface EnvVar {
  key: string
  value: string
}

export interface MountPoint {
  type: string
  source: string
  destination: string
  mode: string
  rw: boolean
}

export interface NetworkAttachment {
  name: string
  ipAddress: string
  gateway: string
  macAddress: string
  aliases: string[]
}

export interface ResourceLimits {
  memory: number
  nanoCpus: number
  cpuShares: number
}

/** Полный инспект контейнера — то, что показывает детальная страница. */
export interface ContainerDetails extends ApiContainer {
  entrypoint: string[]
  workingDir: string
  user: string
  platform: string
  driver: string
  logPath: string
  env: EnvVar[]
  mounts: MountPoint[]
  labels: Record<string, string>
  networkDetails: NetworkAttachment[]
  restartPolicy: string
  restartPolicyRetries: number
  limits: ResourceLimits
  privileged: boolean
  exitCode: number
  error: string
  oomKilled: boolean
  pid: number
  finishedAt: number | null
  healthLog: string[]
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

// --- создание контейнера ----------------------------------------------------

export type RestartPolicyName = 'no' | 'always' | 'on-failure' | 'unless-stopped'

export interface PortBinding {
  containerPort: number
  /** Пусто — Docker выберет свободный порт хоста сам. */
  hostPort?: number | null
  protocol: 'tcp' | 'udp'
  hostIp?: string
}

export interface VolumeBinding {
  source: string
  target: string
  readOnly?: boolean
}

export interface DeviceBinding {
  hostPath: string
  containerPath?: string
  /** r — чтение, w — запись, m — mknod. */
  permissions: string
}

export interface LogConfig {
  driver: string
  options?: Record<string, string>
}

export interface CreateContainerRequest {
  name?: string
  image: string
  alwaysPull?: boolean
  command?: string
  entrypoint?: string
  workingDir?: string
  user?: string
  hostname?: string
  ports?: PortBinding[]
  publishAll?: boolean
  volumes?: VolumeBinding[]
  env?: Record<string, string>
  labels?: Record<string, string>
  network?: string
  restartPolicy?: { name: RestartPolicyName; maximumRetry?: number }
  memoryMb?: number
  memoryReservationMb?: number
  cpus?: number
  privileged?: boolean
  init?: boolean
  tty?: boolean
  stdinOpen?: boolean
  autoRemove?: boolean
  capAdd?: string[]
  capDrop?: string[]
  devices?: DeviceBinding[]
  sysctls?: Record<string, string>
  /** Размер /dev/shm в мегабайтах, 0 — умолчание Docker. */
  shmSizeMb?: number
  runtime?: string
  logConfig?: LogConfig
  domainname?: string
  dns?: string[]
  extraHosts?: Record<string, string>
  /** Запустить сразу после создания. */
  start?: boolean
}

export interface HubImage {
  name: string
  description: string
  stars: number
  official: boolean
}
