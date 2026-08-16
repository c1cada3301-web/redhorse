import { useEffect, useRef, useState } from 'react'
import type { Container } from '../../types'

/** Столько же точек, сколько держит поток метрик — графики выглядят однородно. */
const POINTS = 40

/** Совпадает с периодом сброса живых метрик. */
const SAMPLE_MS = 1000

export interface HostFlow {
  netRx: number[]
  netTx: number[]
  blkRead: number[]
  blkWrite: number[]
}

const EMPTY: HostFlow = { netRx: [], netTx: [], blkRead: [], blkWrite: [] }

const push = (series: number[], value: number): number[] => [...series, value].slice(-POINTS)

/**
 * История приёма/передачи и чтения/записи по хосту.
 * В `Container.history` сеть и диск лежат уже сложенными, поэтому разложенные
 * ряды копим здесь сами — раз в секунду по суммам текущих метрик.
 */
export function useHostFlow(containers: Container[]): HostFlow {
  const [flow, setFlow] = useState<HostFlow>(EMPTY)
  const latest = useRef<Container[]>(containers)

  useEffect(() => {
    latest.current = containers
  }, [containers])

  useEffect(() => {
    const timer = window.setInterval(() => {
      const totals = latest.current.reduce(
        (acc, container) => ({
          netRx: acc.netRx + container.stats.netRx,
          netTx: acc.netTx + container.stats.netTx,
          blkRead: acc.blkRead + container.stats.blkRead,
          blkWrite: acc.blkWrite + container.stats.blkWrite,
        }),
        { netRx: 0, netTx: 0, blkRead: 0, blkWrite: 0 },
      )

      setFlow((prev) => ({
        netRx: push(prev.netRx, totals.netRx),
        netTx: push(prev.netTx, totals.netTx),
        blkRead: push(prev.blkRead, totals.blkRead),
        blkWrite: push(prev.blkWrite, totals.blkWrite),
      }))
    }, SAMPLE_MS)

    return () => window.clearInterval(timer)
  }, [])

  return flow
}
