import { ApiError } from '../../api/client'

/** Человекочитаемый текст ошибки мутации: бэкенд кладёт причину в `detail`. */
export function errorText(error: unknown): string {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message

  return 'Не удалось выполнить операцию'
}

/** Docker отвечает 409, когда образ занят контейнером — тогда помогает force. */
export function isConflict(error: unknown): boolean {
  return error instanceof ApiError && error.status === 409
}
