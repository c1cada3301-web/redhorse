import { findSecrets } from './mask'

/**
 * Чувствительна ли переменная окружения.
 *
 * Два независимых признака. Первый — имя: `DB_PASSWORD` секретна, даже если
 * значение выглядит безобидно. Второй — само значение: `ALL_PROXY` именем ничего
 * не выдаёт, но строка `socks5://user:pass@host` внутри содержит пароль.
 */

/** Куски имён, после которых значение прячем целиком. */
const SENSITIVE_NAME_PARTS = [
  'PASSWORD',
  'PASSWD',
  'SECRET',
  'TOKEN',
  'APIKEY',
  'API_KEY',
  'ACCESS_KEY',
  'PRIVATE_KEY',
  'CREDENTIAL',
  'AUTH',
  'SALT',
  'SIGNATURE',
  'SESSION_KEY',
  'DSN',
  'WEBHOOK',
] as const

/** Имена, которые содержат «KEY» или «URL», но секретами не являются. */
const SAFE_NAMES = new Set([
  'KEYBOARD_LAYOUT',
  'LANG',
  'LANGUAGE',
  'PATH',
  'PWD',
  'HOME',
  'TERM',
  'SHELL',
  'HOSTNAME',
  'TZ',
])

/** Имена, кончающиеся на KEY: SSH_KEY, SIGNING_KEY, ENCRYPTION_KEY и прочие. */
const KEY_SUFFIX = /(^|_)KEY$/

export function isSensitiveName(key: string): boolean {
  const upper = key.toUpperCase()

  if (SAFE_NAMES.has(upper)) return false
  if (KEY_SUFFIX.test(upper)) return true

  return SENSITIVE_NAME_PARTS.some((part) => upper.includes(part))
}

/** Значение прячем, если о нём говорит имя переменной либо само содержимое. */
export function isSensitiveEnv(key: string, value: string): boolean {
  if (value.trim() === '') return false
  if (isSensitiveName(key)) return true

  return findSecrets(value).length > 0
}

/** Ровная маска: длина не выдаёт длину секрета. */
export const HIDDEN_VALUE = '••••••••'

export function displayEnvValue(key: string, value: string, revealed: boolean): string {
  if (revealed || !isSensitiveEnv(key, value)) return value

  return HIDDEN_VALUE
}
