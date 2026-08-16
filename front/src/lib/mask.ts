export type SecretKind =
  | 'telegram-token'
  | 'jwt'
  | 'bearer'
  | 'api-key'
  | 'password'
  | 'url-credentials'
  | 'private-key'
  | 'ipv4'
  | 'email'
  | 'uuid'
  | 'hex'

export interface Secret {
  start: number
  end: number
  kind: SecretKind
}

/** Фиксированная длина маски — чтобы не выдавать длину секрета. */
const MASK_LENGTH = 8
const MASK = '•'.repeat(MASK_LENGTH)

const QUOTES = new Set(['"', "'", '`'])

/** Ключевые слова присваиваний. Длинные варианты идут первыми — иначе `token` съест `access_token`. */
const API_KEY_WORDS =
  'api[_-]?key|access[_-]?key|secret[_-]?key|private[_-]?key|client[_-]?secret|api[_-]?secret|auth[_-]?token|access[_-]?token|refresh[_-]?token|bot[_-]?token|id[_-]?token|token|secret|apikey'

const PASSWORD_WORDS = 'password|passwd|pwd|pass'

/** Значение присваивания: либо в кавычках, либо до пробела/разделителя. */
const ASSIGNED_VALUE = '"[^"\\n]*"|\'[^\'\\n]*\'|`[^`\\n]*`|[^\\s"\'`,;&]+'

interface Pattern {
  readonly kind: SecretKind
  readonly re: RegExp
  /**
   * Номер группы со значением, которое надо спрятать (0 — всё совпадение).
   * Группы 1..valueGroup-1 считаются префиксом и в маску не попадают.
   */
  readonly valueGroup?: number
  /** Снять обрамляющие кавычки со значения. */
  readonly unquote?: boolean
}

/**
 * Порядок = приоритет: при пересечении побеждает паттерн, объявленный выше.
 * От самого специфичного к самому шумному.
 */
const PATTERNS: readonly Pattern[] = [
  {
    kind: 'private-key',
    re: /(-----BEGIN [A-Z0-9 ]*KEY-----\s*)([\s\S]*?)(\s*-----END [A-Z0-9 ]*KEY-----)/g,
    valueGroup: 2,
  },
  {
    kind: 'telegram-token',
    // (?<!\d) отсекает хвост длинного числа, но пропускает `/bot<токен>` в URL Bot API
    re: /(?<!\d)\d{8,10}:[A-Za-z0-9_-]{35}(?![A-Za-z0-9_-])/g,
  },
  {
    kind: 'jwt',
    re: /(?<![A-Za-z0-9_-])eyJ[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]{4,}\.[A-Za-z0-9_-]*(?![A-Za-z0-9_-])/g,
  },
  {
    // scheme://user:PASSWORD@host — прячем только пароль
    kind: 'url-credentials',
    re: /([A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s:/@]+:)([^\s/@]+)@/g,
    valueGroup: 2,
  },
  {
    kind: 'bearer',
    re: /\b(Bearer\s+)([A-Za-z0-9._~+/=-]+)/g,
    valueGroup: 2,
  },
  {
    // Authorization: <схема> <токен> — слово-схема остаётся видимым
    kind: 'bearer',
    re: /\b(Authorization["']?\s*[:=]\s*["']?)([A-Za-z][A-Za-z0-9_-]*\s+)?([^\s"'`]+)/gi,
    valueGroup: 3,
  },
  {
    kind: 'password',
    re: new RegExp(`(?<![A-Za-z0-9_-])((?:${PASSWORD_WORDS})["']?\\s*[:=]\\s*)(${ASSIGNED_VALUE})`, 'gi'),
    valueGroup: 2,
    unquote: true,
  },
  {
    kind: 'api-key',
    re: new RegExp(`(?<![A-Za-z0-9_-])((?:${API_KEY_WORDS})["']?\\s*[:=]\\s*)(${ASSIGNED_VALUE})`, 'gi'),
    valueGroup: 2,
    unquote: true,
  },
  {
    kind: 'uuid',
    re: /(?<![A-Za-z0-9-])[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(?![A-Za-z0-9-])/gi,
  },
  {
    kind: 'email',
    re: /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}(?![A-Za-z0-9.-])/g,
  },
  {
    kind: 'ipv4',
    re: /(?<![\d.])(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}(?![\d.])/g,
  },
  {
    kind: 'hex',
    re: /(?<![A-Za-z0-9])[0-9a-f]{32,}(?![A-Za-z0-9])/gi,
  },
]

export const DEFAULT_KINDS: ReadonlySet<SecretKind> = new Set<SecretKind>([
  'telegram-token',
  'jwt',
  'bearer',
  'api-key',
  'password',
  'url-credentials',
  'private-key',
])

export const KIND_LABELS: Record<SecretKind, string> = {
  'telegram-token': 'Токены Telegram',
  jwt: 'JWT-токены',
  bearer: 'Заголовок Authorization',
  'api-key': 'API-ключи',
  password: 'Пароли',
  'url-credentials': 'Пароли в URL',
  'private-key': 'Приватные ключи',
  ipv4: 'IP-адреса',
  email: 'Почта',
  uuid: 'UUID',
  hex: 'Длинные hex-строки',
}

/**
 * Находит секреты в строке.
 * Диапазоны не пересекаются и отсортированы по `start` — можно напрямую резать текст на куски.
 */
export function findSecrets(text: string, kinds: ReadonlySet<SecretKind> = DEFAULT_KINDS): Secret[] {
  if (text === '' || kinds.size === 0) return []

  const found: Secret[] = []

  for (const pattern of PATTERNS) {
    if (!kinds.has(pattern.kind)) continue

    // регулярки общие для всех вызовов — обязательно сбрасываем позицию
    pattern.re.lastIndex = 0

    let match = pattern.re.exec(text)

    while (match !== null) {
      // пустое совпадение зациклило бы exec
      if (match[0] === '') {
        pattern.re.lastIndex += 1
      } else {
        const secret = toSecret(match, pattern)
        if (secret !== null && !overlaps(found, secret)) found.push(secret)
      }

      match = pattern.re.exec(text)
    }

    pattern.re.lastIndex = 0
  }

  return found.sort((a, b) => a.start - b.start)
}

/** Заменяет каждый секрет на маску фиксированной длины. */
export function maskText(text: string, kinds: ReadonlySet<SecretKind> = DEFAULT_KINDS): string {
  const secrets = findSecrets(text, kinds)

  if (secrets.length === 0) return text

  let result = ''
  let cursor = 0

  for (const secret of secrets) {
    result += text.slice(cursor, secret.start) + MASK
    cursor = secret.end
  }

  return result + text.slice(cursor)
}

function toSecret(match: RegExpExecArray, pattern: Pattern): Secret | null {
  const valueGroup = pattern.valueGroup ?? 0
  const value = match[valueGroup]

  if (value === undefined || value === '') return null

  // длины предшествующих групп дают смещение значения без флага `d`
  let start = match.index
  for (let i = 1; i < valueGroup; i += 1) start += match[i]?.length ?? 0

  let end = start + value.length

  if (pattern.unquote && value.length >= 2 && QUOTES.has(value[0]) && value.at(-1) === value[0]) {
    start += 1
    end -= 1
  }

  if (start >= end) return null

  return { start, end, kind: pattern.kind }
}

function overlaps(found: readonly Secret[], candidate: Secret): boolean {
  return found.some((secret) => candidate.start < secret.end && secret.start < candidate.end)
}
