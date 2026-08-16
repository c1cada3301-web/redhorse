import { useCallback, useEffect, useRef, useState } from 'react'
import { request, wsUrl } from '../api/client'
import type { Container, DockLayout, LogLine, LogSession, LogViewOptions } from '../types'
import { DEFAULT_RANGE, isLive, toQuery, type TimeRange } from '../lib/timeRange'
import { useSettings } from './settings'

/** Запас буфера на случай, если настройки не прочитались. */
const FALLBACK_MAX_LINES = 20_000

/** Логи приходят пачками по несколько сотен строк в секунду — копим и рисуем реже. */
const FLUSH_MS = 200

const RETRY_BASE_MS = 800
const RETRY_MAX_MS = 15_000

const BASE_OPTIONS: LogViewOptions = {
  search: '',
  levels: { debug: true, info: true, warn: true, error: true },
  wrap: false,
  showTimestamps: true,
  fontSize: 12,
  follow: true,
  paused: false,
  masked: true,
}

interface LogPage {
  lines: LogLine[]
  truncated: boolean
}

function makeRect(index: number) {
  return { x: 140 + (index % 4) * 42, y: 120 + (index % 4) * 36, w: 720, h: 420 }
}

export interface LogSessionsApi {
  sessions: LogSession[]
  activeId: string | null
  layout: DockLayout
  dockHeight: number
  collapsed: boolean
  maximizedId: string | null
  open: (container: Container) => void
  close: (sessionId: string) => void
  closeAll: () => void
  focus: (sessionId: string) => void
  setLayout: (layout: DockLayout) => void
  setDockHeight: (height: number) => void
  setCollapsed: (collapsed: boolean) => void
  maximize: (sessionId: string | null) => void
  detach: (sessionId: string) => void
  attach: (sessionId: string) => void
  moveWindow: (sessionId: string, rect: LogSession['rect']) => void
  updateOptions: (sessionId: string, patch: Partial<LogViewOptions>) => void
  setRange: (sessionId: string, range: TimeRange) => void
  clear: (sessionId: string) => void
  isOpen: (containerId: string) => boolean
}

interface Connection {
  socket: WebSocket | null
  retryTimer: number | undefined
  attempt: number
  /** Ключ режима: при смене диапазона соединение пересоздаётся. */
  key: string
  disposed: boolean
}

export function useLogSessions(): LogSessionsApi {
  const { settings } = useSettings()
  const [sessions, setSessions] = useState<LogSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [layout, setLayout] = useState<DockLayout>('tabs')
  const [dockHeight, setDockHeight] = useState(360)
  const [collapsed, setCollapsed] = useState(false)
  const [maximizedId, setMaximizedId] = useState<string | null>(null)

  const prefs = useRef(settings)
  prefs.current = settings

  const connections = useRef(new Map<string, Connection>())
  const inbox = useRef(new Map<string, LogLine[]>())
  const nextLineId = useRef(new Map<string, number>())

  // Активная вкладка всегда должна указывать на существующую сессию.
  useEffect(() => {
    if (sessions.length === 0) {
      if (activeId !== null) setActiveId(null)
      return
    }

    if (!sessions.some((session) => session.id === activeId)) {
      setActiveId(sessions[sessions.length - 1].id)
    }
  }, [sessions, activeId])

  const patchSession = useCallback((sessionId: string, patch: (session: LogSession) => LogSession) => {
    setSessions((prev) => prev.map((session) => (session.id === sessionId ? patch(session) : session)))
  }, [])

  const enqueue = useCallback((sessionId: string, lines: LogLine[]) => {
    const bucket = inbox.current.get(sessionId) ?? []
    const start = nextLineId.current.get(sessionId) ?? 0

    // Сервер нумерует stdout и stderr раздельно — переклеиваем на сквозную нумерацию.
    bucket.push(...lines.map((line, index) => ({ ...line, id: start + index })))

    nextLineId.current.set(sessionId, start + lines.length)
    inbox.current.set(sessionId, bucket)
  }, [])

  // Сброс накопленных строк в состояние — редкими пачками, чтобы не душить рендер.
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (inbox.current.size === 0) return

      const batches = inbox.current
      inbox.current = new Map()

      setSessions((prev) =>
        prev.map((session) => {
          const fresh = batches.get(session.id)
          if (fresh === undefined || fresh.length === 0) return session
          if (session.options.paused) return session

          const limit = prefs.current.logBufferSize || FALLBACK_MAX_LINES

          return { ...session, lines: [...session.lines, ...fresh].slice(-limit) }
        }),
      )
    }, FLUSH_MS)

    return () => window.clearInterval(timer)
  }, [])

  const disconnect = useCallback((sessionId: string) => {
    const connection = connections.current.get(sessionId)
    if (connection === undefined) return

    connection.disposed = true
    window.clearTimeout(connection.retryTimer)
    connection.socket?.close()
    connections.current.delete(sessionId)
  }, [])

  /** Открывает живой поток либо подтягивает исторический срез — по режиму диапазона. */
  const connect = useCallback(
    (session: LogSession) => {
      const key = JSON.stringify(session.range)
      const existing = connections.current.get(session.id)

      if (existing !== undefined && existing.key === key) return

      disconnect(session.id)
      nextLineId.current.set(session.id, 0)
      inbox.current.delete(session.id)

      patchSession(session.id, (item) => ({ ...item, lines: [], loading: true }))

      if (!isLive(session.range)) {
        void loadWindow(session, patchSession, prefs.current.logBufferSize || FALLBACK_MAX_LINES)
        return
      }

      const connection: Connection = { socket: null, retryTimer: undefined, attempt: 0, key, disposed: false }
      connections.current.set(session.id, connection)

      const openSocket = () => {
        if (connection.disposed) return

        const { since } = toQuery(session.range)
        const socket = new WebSocket(
          wsUrl(`/containers/${session.containerId}/logs/stream`, { since, tail: 1000 }),
        )

        connection.socket = socket

        socket.onopen = () => {
          connection.attempt = 0
          patchSession(session.id, (item) => ({ ...item, connection: 'open', loading: false }))
        }

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data as string) as { type: string; lines?: LogLine[] }
            if (message.type === 'lines' && message.lines !== undefined) {
              enqueue(session.id, message.lines)
            }
          } catch {
            // Битый кадр пропускаем, поток из-за него рвать не стоит.
          }
        }

        socket.onclose = () => {
          if (connection.disposed) return

          patchSession(session.id, (item) => ({ ...item, connection: 'closed' }))
          connection.attempt += 1

          const delay = Math.min(RETRY_BASE_MS * 2 ** (connection.attempt - 1), RETRY_MAX_MS)
          connection.retryTimer = window.setTimeout(openSocket, delay)
        }

        socket.onerror = () => socket.close()
      }

      patchSession(session.id, (item) => ({ ...item, connection: 'connecting' }))
      openSocket()
    },
    [disconnect, enqueue, patchSession],
  )

  // Держим по соединению на каждую живую сессию и гасим лишние.
  useEffect(() => {
    for (const session of sessions) {
      connect(session)
    }

    for (const sessionId of connections.current.keys()) {
      if (!sessions.some((session) => session.id === sessionId)) {
        disconnect(sessionId)
      }
    }
  }, [sessions, connect, disconnect])

  useEffect(() => {
    const active = connections.current
    return () => {
      for (const connection of active.values()) {
        connection.disposed = true
        window.clearTimeout(connection.retryTimer)
        connection.socket?.close()
      }
      active.clear()
    }
  }, [])

  const open = useCallback((container: Container) => {
    // Одна сессия на контейнер — id выводим из id контейнера, без счётчиков.
    const sessionId = `log-${container.id}`

    setSessions((prev) => {
      if (prev.some((session) => session.id === sessionId)) return prev

      const session: LogSession = {
        id: sessionId,
        containerId: container.id,
        containerName: container.name,
        lines: [],
        options: {
          ...BASE_OPTIONS,
          levels: { ...BASE_OPTIONS.levels },
          masked: prefs.current.maskSecrets,
          showTimestamps: prefs.current.logTimestamps,
          fontSize: prefs.current.logFontSize,
        },
        range: DEFAULT_RANGE,
        connection: 'connecting',
        loading: true,
        floating: false,
        rect: makeRect(prev.length),
      }

      return [...prev, session]
    })

    setActiveId(sessionId)
    setCollapsed(false)
  }, [])

  const close = useCallback(
    (sessionId: string) => {
      disconnect(sessionId)
      setSessions((prev) => prev.filter((session) => session.id !== sessionId))
      setMaximizedId((current) => (current === sessionId ? null : current))
    },
    [disconnect],
  )

  const closeAll = useCallback(() => {
    for (const sessionId of [...connections.current.keys()]) disconnect(sessionId)
    setSessions([])
    setActiveId(null)
    setMaximizedId(null)
  }, [disconnect])

  const updateOptions = useCallback(
    (sessionId: string, patch: Partial<LogViewOptions>) => {
      patchSession(sessionId, (session) => ({ ...session, options: { ...session.options, ...patch } }))
    },
    [patchSession],
  )

  const setRange = useCallback(
    (sessionId: string, range: TimeRange) => {
      patchSession(sessionId, (session) => ({ ...session, range }))
    },
    [patchSession],
  )

  const detach = useCallback(
    (sessionId: string) => {
      patchSession(sessionId, (session) => ({ ...session, floating: true }))
      setMaximizedId((current) => (current === sessionId ? null : current))
    },
    [patchSession],
  )

  const attach = useCallback(
    (sessionId: string) => {
      patchSession(sessionId, (session) => ({ ...session, floating: false }))
      setActiveId(sessionId)
      setCollapsed(false)
    },
    [patchSession],
  )

  const moveWindow = useCallback(
    (sessionId: string, rect: LogSession['rect']) => {
      patchSession(sessionId, (session) => ({ ...session, rect }))
    },
    [patchSession],
  )

  const clear = useCallback(
    (sessionId: string) => {
      inbox.current.delete(sessionId)
      patchSession(sessionId, (session) => ({ ...session, lines: [] }))
    },
    [patchSession],
  )

  const isOpen = useCallback(
    (containerId: string) => sessions.some((session) => session.containerId === containerId),
    [sessions],
  )

  return {
    sessions,
    activeId,
    layout,
    dockHeight,
    collapsed,
    maximizedId,
    open,
    close,
    closeAll,
    focus: setActiveId,
    setLayout,
    setDockHeight,
    setCollapsed,
    maximize: setMaximizedId,
    detach,
    attach,
    moveWindow,
    updateOptions,
    setRange,
    clear,
    isOpen,
  }
}

/** Исторический срез: живого потока нет, Docker сам отдаёт нужное окно. */
async function loadWindow(
  session: LogSession,
  patchSession: (sessionId: string, patch: (session: LogSession) => LogSession) => void,
  limit: number,
): Promise<void> {
  try {
    const { since, until } = toQuery(session.range)
    const page = await request<LogPage>(`/containers/${session.containerId}/logs`, {
      query: { since, until, tail: limit },
    })

    patchSession(session.id, (item) => ({
      ...item,
      lines: page.lines,
      loading: false,
      connection: 'closed',
    }))
  } catch {
    patchSession(session.id, (item) => ({ ...item, loading: false, connection: 'closed' }))
  }
}
