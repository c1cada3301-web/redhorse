import type { TimeRange } from './lib/timeRange'

export type ContainerState = 'running' | 'exited' | 'paused' | 'restarting' | 'created'

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export type LogStream = 'stdout' | 'stderr'

export interface ContainerStats {
  /** Загрузка CPU в процентах (может быть > 100 на многоядерных). */
  cpu: number
  /** Использованная память в байтах. */
  mem: number
  /** Лимит памяти в байтах. */
  memLimit: number
  /** Скорость сети, байт/с. */
  netRx: number
  netTx: number
  /** Дисковый ввод-вывод, байт/с. */
  blkRead: number
  blkWrite: number
}

export interface ContainerHistory {
  cpu: number[]
  mem: number[]
  net: number[]
  blk: number[]
}

export interface Container {
  id: string
  name: string
  image: string
  state: ContainerState
  status: string
  createdAt: number
  startedAt: number | null
  ports: string[]
  networks: string[]
  /** Размер writable-слоя контейнера, байт. */
  sizeRw: number
  /** Размер контейнера вместе с образом, байт. */
  sizeRootFs: number
  health: 'healthy' | 'unhealthy' | 'starting' | 'none'
  restarts: number
  stats: ContainerStats
  history: ContainerHistory
  stack: string | null
  /** Команда, с которой запущен контейнер. */
  command: string
}

export interface LogLine {
  id: number
  ts: number
  level: LogLevel
  stream: LogStream
  text: string
}

export interface LogViewOptions {
  search: string
  levels: Record<LogLevel, boolean>
  wrap: boolean
  showTimestamps: boolean
  fontSize: number
  follow: boolean
  paused: boolean
  /** Прятать секреты точками. Переключается «глазиком» в тулбаре. */
  masked: boolean
}

export interface FloatingRect {
  x: number
  y: number
  w: number
  h: number
}

export interface LogSession {
  id: string
  containerId: string
  containerName: string
  lines: LogLine[]
  options: LogViewOptions
  /** Живой хвост или срез за период — от этого зависит, открыт ли вебсокет. */
  range: TimeRange
  connection: 'connecting' | 'open' | 'closed'
  loading: boolean
  floating: boolean
  rect: FloatingRect
}

export type DockLayout = 'tabs' | 'grid'
