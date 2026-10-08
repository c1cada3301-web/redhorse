import { request } from './client'

export interface Account {
  username: string
  isAdmin: boolean
}

export interface AuthState {
  /** false — в базе нет ни одного пользователя, нужен экран первичной настройки. */
  initialized: boolean
  /** Окно создания первого администратора после старта ещё открыто. */
  setupOpen: boolean
}

export function fetchAuthState(): Promise<AuthState> {
  return request<AuthState>('/auth/state')
}

export function fetchMe(): Promise<Account> {
  // На старте ответ 401 ожидаем: он означает «ещё не вошли».
  return request<Account>('/auth/me', { expectUnauthorized: true })
}

export function login(username: string, password: string): Promise<Account> {
  return request<Account>('/auth/login', { method: 'POST', body: { username, password } })
}

export function bootstrap(username: string, password: string): Promise<Account> {
  return request<Account>('/auth/bootstrap', { method: 'POST', body: { username, password } })
}

export function logout(): Promise<void> {
  return request<void>('/auth/logout', { method: 'POST' })
}
