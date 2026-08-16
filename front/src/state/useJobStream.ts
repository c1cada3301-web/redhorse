import { useEffect, useState } from 'react'
import { useSocket } from '../api/socket'
import type { JobEvent } from '../api/types'

export interface JobStream {
  events: JobEvent[]
  state: 'running' | 'success' | 'error'
  error: string | null
}

/** Кадры, которые шлёт `/images/jobs/{id}/stream`. */
type JobFrame =
  | { type: 'event'; ts: number; text: string; stream?: 'stdout' | 'stderr' }
  | { type: 'done'; state: 'success' | 'error'; error: string | null }

/** Сборка может дать десятки тысяч строк — держим только хвост. */
const MAX_EVENTS = 5000

const EMPTY: JobStream = { events: [], state: 'running', error: null }

function reduce(previous: JobStream, frame: JobFrame): JobStream {
  if (frame.type === 'done') {
    return { ...previous, state: frame.state, error: frame.error }
  }

  const event: JobEvent = {
    ts: frame.ts,
    text: frame.text,
    stream: frame.stream === 'stderr' ? 'stderr' : 'stdout',
  }

  const events = [...previous.events, event]

  return { ...previous, events: events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events }
}

/**
 * Живой лог задачи сборки или загрузки образа.
 *
 * При каждом подключении сервер заново отдаёт весь накопленный лог,
 * поэтому на старте соединения локальный буфер обнуляем — иначе строки задвоятся.
 */
export function useJobStream(jobId: string | null): JobStream {
  const [stream, setStream] = useState<JobStream>(EMPTY)

  // Задача завершилась — отключаемся, иначе useSocket будет вечно переподключаться.
  const socketState = useSocket<JobFrame>({
    path: jobId === null || stream.state !== 'running' ? null : `/images/jobs/${jobId}/stream`,
    onMessage: (frame) => setStream((previous) => reduce(previous, frame)),
  })

  // Новая задача — новый лог с нуля.
  useEffect(() => {
    setStream(EMPTY)
  }, [jobId])

  // `connecting` выставляется до первого кадра нового соединения — тут и чистим буфер.
  useEffect(() => {
    if (socketState !== 'connecting') return

    setStream(EMPTY)
  }, [socketState])

  return stream
}
