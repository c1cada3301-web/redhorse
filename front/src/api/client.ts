/** Базовый адрес API. В проде фронт и API за одним nginx, в дев-режиме проксирует Vite. */
const BASE = '/api'

/** Сессия отвалилась: слушает оболочка, чтобы вернуть экран входа. */
export const UNAUTHORIZED_EVENT = 'dala:unauthorized'

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE' | 'PUT'
  body?: unknown
  query?: Record<string, string | number | boolean | undefined | null>
  signal?: AbortSignal
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, query, signal } = options
  const url = `${BASE}${path}${buildQuery(query)}`

  const response = await fetch(url, {
    method,
    signal,
    // Сессия живёт в httpOnly-cookie: её нельзя прочитать из JS, поэтому
    // единственный способ авторизовать запрос — попросить браузер её приложить.
    credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
    // Сессия истекла или отозвана — оболочка должна показать экран входа,
    // а не сыпать ошибками на каждом запросе.
    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT))
    }
    throw new ApiError(await readError(response), response.status)
  }

  // 204 и пустые ответы — валидный результат, но JSON в них нет.
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return undefined as T
  }

  return (await response.json()) as T
}

function buildQuery(query: RequestOptions['query']): string {
  if (query === undefined) return ''

  const params = new URLSearchParams()

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    params.set(key, String(value))
  }

  const serialized = params.toString()
  return serialized === '' ? '' : `?${serialized}`
}

async function readError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as { detail?: unknown }
    if (typeof payload.detail === 'string') return payload.detail
    return JSON.stringify(payload.detail ?? payload)
  } catch {
    return `${response.status} ${response.statusText}`
  }
}

/** Собирает адрес вебсокета от текущего origin — работает и за https. */
export function wsUrl(path: string, query?: RequestOptions['query']): string {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}${BASE}${path}${buildQuery(query)}`
}
