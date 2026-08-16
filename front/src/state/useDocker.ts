import { useCallback, useMemo } from 'react'
import { useContainerAction, useContainersQuery, useRemoveContainer } from '../api/queries'
import type { ContainerAction } from '../api/types'
import type { Container, ContainerHistory, ContainerStats } from '../types'
import { useLiveStats } from './useLiveStats'

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

export interface DockerApi {
  containers: Container[]
  loading: boolean
  error: Error | null
  /** Жив ли поток метрик — в шапке показываем этим статус подключения. */
  connected: boolean
  start: (id: string) => void
  stop: (id: string) => void
  restart: (id: string) => void
  /** На запущенном — пауза, на приостановленном — снятие паузы. */
  pause: (id: string) => void
  remove: (id: string) => void
}

export function useDocker(): DockerApi {
  const query = useContainersQuery()
  const live = useLiveStats()
  const action = useContainerAction()
  const removal = useRemoveContainer()

  const containers = useMemo<Container[]>(() => {
    const raw = query.data ?? []

    return raw.map((item) => ({
      ...item,
      stats: live.stats[item.id] ?? EMPTY_STATS,
      history: live.history[item.id] ?? EMPTY_HISTORY,
    }))
  }, [query.data, live.stats, live.history])

  const run = useCallback(
    (id: string, name: ContainerAction) => action.mutate({ id, action: name }),
    [action],
  )

  const pause = useCallback(
    (id: string) => {
      const target = containers.find((item) => item.id === id)
      run(id, target?.state === 'paused' ? 'unpause' : 'pause')
    },
    [containers, run],
  )

  return {
    containers,
    loading: query.isPending,
    error: query.error,
    connected: live.connected,
    start: useCallback((id: string) => run(id, 'start'), [run]),
    stop: useCallback((id: string) => run(id, 'stop'), [run]),
    restart: useCallback((id: string) => run(id, 'restart'), [run]),
    pause,
    remove: useCallback((id: string) => removal.mutate({ id }), [removal]),
  }
}
