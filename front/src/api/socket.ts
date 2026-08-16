import { useEffect, useRef, useState } from 'react'
import { wsUrl } from './client'

export type SocketState = 'connecting' | 'open' | 'closed'

const RETRY_BASE_MS = 800
const RETRY_MAX_MS = 15_000

interface UseSocketOptions<T> {
  /** null — не подключаться (например, пока не выбран контейнер). */
  path: string | null
  query?: Record<string, string | number | boolean | undefined | null>
  onMessage: (message: T) => void
  /** Пересоздать соединение при смене этих значений. */
  deps?: unknown[]
}

/**
 * Вебсокет с автопереподключением и растущей паузой.
 *
 * `onMessage` держим в ref: колбэк почти всегда пересоздаётся на каждый рендер,
 * а рвать из-за этого соединение нельзя.
 */
export function useSocket<T>({ path, query, onMessage, deps = [] }: UseSocketOptions<T>): SocketState {
  const [state, setState] = useState<SocketState>('closed')
  const handlerRef = useRef(onMessage)
  handlerRef.current = onMessage

  const queryKey = JSON.stringify(query ?? {})

  useEffect(() => {
    if (path === null) {
      setState('closed')
      return
    }

    let socket: WebSocket | null = null
    let retryTimer: number | undefined
    let attempt = 0
    let disposed = false

    const connect = () => {
      if (disposed) return

      setState('connecting')
      socket = new WebSocket(wsUrl(path, query))

      socket.onopen = () => {
        attempt = 0
        setState('open')
      }

      socket.onmessage = (event) => {
        try {
          handlerRef.current(JSON.parse(event.data as string) as T)
        } catch {
          // Битый кадр пропускаем: рвать поток из-за одной строки не стоит.
        }
      }

      socket.onclose = () => {
        setState('closed')
        if (disposed) return

        attempt += 1
        const delay = Math.min(RETRY_BASE_MS * 2 ** (attempt - 1), RETRY_MAX_MS)
        retryTimer = window.setTimeout(connect, delay)
      }

      socket.onerror = () => socket?.close()
    }

    connect()

    return () => {
      disposed = true
      window.clearTimeout(retryTimer)
      socket?.close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, queryKey, ...deps])

  return state
}
