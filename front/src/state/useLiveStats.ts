import { useCallback, useEffect, useRef, useState } from 'react'
import { useSocket } from '../api/socket'
import type { StatsMessage } from '../api/types'
import type { ContainerHistory, ContainerStats } from '../types'

/** Сколько точек метрик держим для спарклайнов. */
const HISTORY_LENGTH = 40

/** Сообщения от Docker сыплются чаще, чем нужно перерисовывать. Копим и сбрасываем пачкой. */
const FLUSH_MS = 1000

export interface LiveStats {
  stats: Record<string, ContainerStats>
  history: Record<string, ContainerHistory>
  connected: boolean
}

const EMPTY_STATS: ContainerStats = {
  cpu: 0,
  mem: 0,
  memLimit: 0,
  netRx: 0,
  netTx: 0,
  blkRead: 0,
  blkWrite: 0,
}

const EMPTY_HISTORY: ContainerHistory = { cpu: [], mem: [], net: [], blk: [] }

const push = (series: number[], value: number): number[] => [...series, value].slice(-HISTORY_LENGTH)

export function useLiveStats(): LiveStats {
  const [snapshot, setSnapshot] = useState<Omit<LiveStats, 'connected'>>({ stats: {}, history: {} })

  const pending = useRef<Map<string, StatsMessage>>(new Map())
  const dirty = useRef(false)

  const handleMessage = useCallback((message: StatsMessage) => {
    pending.current.set(message.id, message)
    dirty.current = true
  }, [])

  const state = useSocket<StatsMessage>({ path: '/system/stats/stream', onMessage: handleMessage })

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!dirty.current) return

      const batch = pending.current
      pending.current = new Map()
      dirty.current = false

      setSnapshot((prev) => applyBatch(prev, batch))
    }, FLUSH_MS)

    return () => window.clearInterval(timer)
  }, [])

  return { ...snapshot, connected: state === 'open' }
}

function applyBatch(
  prev: Omit<LiveStats, 'connected'>,
  batch: Map<string, StatsMessage>,
): Omit<LiveStats, 'connected'> {
  const stats = { ...prev.stats }
  const history = { ...prev.history }

  for (const [id, message] of batch) {
    if (message.gone === true) {
      delete stats[id]
      delete history[id]
      continue
    }

    const next: ContainerStats = { ...EMPTY_STATS, ...stripId(message) }
    const previous = history[id] ?? EMPTY_HISTORY

    stats[id] = next
    history[id] = {
      cpu: push(previous.cpu, next.cpu),
      mem: push(previous.mem, next.mem),
      net: push(previous.net, next.netRx + next.netTx),
      blk: push(previous.blk, next.blkRead + next.blkWrite),
    }
  }

  return { stats, history }
}

function stripId(message: StatsMessage): Partial<ContainerStats> {
  const { id: _id, gone: _gone, ...rest } = message
  return rest
}
