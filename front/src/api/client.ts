/** Базовый адрес API. В проде фронт и API за одним nginx, в дев-режиме проксирует Vite. */
const BASE = '/api'

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
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  if (!response.ok) {
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
