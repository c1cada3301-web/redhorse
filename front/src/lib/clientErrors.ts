/**
 * Сбор ошибок браузера в одном месте.
 *
 * ErrorBoundary ловит только падения рендера. Ошибка в обработчике события,
 * оборванный промис или битый WebSocket-кадр до него не доходят и оседают
 * в консоли — то есть остаются незамеченными, пока её специально не откроешь.
 * Здесь всё это собирается в общий буфер, который показывает панель на странице.
 */

export type ClientErrorKind = 'render' | 'window' | 'rejection'

export interface ClientError {
  id: number
  kind: ClientErrorKind
  message: string
  stack?: string
  /** Где именно упало: файл и строка, если браузер их дал. */
  source?: string
  at: number
  /** Сколько раз повторилась одна и та же ошибка. */
  count: number
}

/** Держим в памяти только последние: иначе цикл рендера съест её всю. */
const LIMIT = 25

let entries: ClientError[] = []
let nextId = 1
const listeners = new Set<(errors: ClientError[]) => void>()

function emit(): void {
  // Копия — подписчики сравнивают ссылку, чтобы понять, что список сменился.
  const snapshot = [...entries]
  for (const listener of listeners) listener(snapshot)
}

export function subscribe(listener: (errors: ClientError[]) => void): () => void {
  listeners.add(listener)
  listener([...entries])
  return () => {
    listeners.delete(listener)
  }
}

export function clearErrors(): void {
  entries = []
  emit()
}

export function pushError(error: Omit<ClientError, 'id' | 'at' | 'count'>): void {
  // Одна и та же ошибка в цикле рендера повторяется десятки раз в секунду —
  // копим счётчик вместо того, чтобы забивать список одинаковыми строками.
  const twin = entries.find((item) => item.kind === error.kind && item.message === error.message)

  if (twin !== undefined) {
    twin.count += 1
    twin.at = Date.now()
    emit()
    return
  }

  entries = [{ ...error, id: nextId++, at: Date.now(), count: 1 }, ...entries].slice(0, LIMIT)
  emit()
}

function messageOf(reason: unknown): string {
  if (typeof reason === 'string') return reason
  if (reason instanceof Error) return reason.message
  try {
    return JSON.stringify(reason)
  } catch {
    return String(reason)
  }
}

function stackOf(reason: unknown): string | undefined {
  return reason instanceof Error ? reason.stack : undefined
}

let installed = false

export function installClientErrorHandlers(): void {
  if (installed) return
  installed = true

  window.addEventListener('error', (event) => {
    // Сбой загрузки картинки или скрипта тоже приходит сюда, но без error —
    // такие показываем как есть, с адресом ресурса.
    const target = event.target as HTMLElement | null
    if (event.error === undefined && target !== null && target !== (window as unknown as HTMLElement)) {
      const url = target.getAttribute?.('src') ?? target.getAttribute?.('href')
      if (url !== null && url !== undefined) {
        pushError({ kind: 'window', message: `Не загрузился ресурс: ${url}` })
        return
      }
    }

    pushError({
      kind: 'window',
      message: messageOf(event.error) || event.message || 'Неизвестная ошибка',
      stack: stackOf(event.error),
      source: event.filename === '' ? undefined : `${event.filename}:${event.lineno}:${event.colno}`,
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    pushError({
      kind: 'rejection',
      message: messageOf(event.reason) || 'Промис отклонён без обработки',
      stack: stackOf(event.reason),
    })
  })
}
